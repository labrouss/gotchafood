import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ── helper: generate next employee ID ──────────────────────────────────────
async function nextEmployeeId(): Promise<string> {
  const last = await prisma.staffProfile.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { employeeId: true },
  });
  if (!last) return 'EMP-001';
  const num = parseInt(last.employeeId.replace('EMP-', ''), 10);
  return `EMP-${String(num + 1).padStart(3, '0')}`;
}

// ── GET all staff with profiles ────────────────────────────────────────────
export const getAllStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['STAFF', 'ADMIN'] } },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, phone: true, role: true,
        isActive: true, routingRole: true,
        lastLoginAt: true, createdAt: true,
        staffProfile: {
          include: { shifts: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Attach performance summary for each
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const month = new Date(today); month.setDate(1);

    const enriched = await Promise.all(users.map(async (u) => {
      const [todayItems, monthItems, todayDeliveries, monthDeliveries] = await Promise.all([
        prisma.orderItem.count({ where: { completedBy: u.id, completedAt: { gte: today } } }),
        prisma.orderItem.count({ where: { completedBy: u.id, completedAt: { gte: month } } }),
        prisma.order.count({ where: { deliveredBy: u.id, deliveredAt: { gte: today } } }),
        prisma.order.count({ where: { deliveredBy: u.id, deliveredAt: { gte: month } } }),
      ]);
      return { ...u, performance: { todayItems, monthItems, todayDeliveries, monthDeliveries } };
    }));

    res.json({ success: true, data: { staff: enriched } });
  } catch (error) { next(error); }
};

// ── HIRE: create user + profile ────────────────────────────────────────────
export const hireStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      firstName:     z.string().min(2),
      lastName:      z.string().min(2),
      email:         z.string().email(),
      phone:         z.string().optional(),
      password:      z.string().min(6),
      role:          z.enum(['STAFF', 'ADMIN']).default('STAFF'),
      routingRole:   z.string().optional(),
      contractType:  z.enum(['full-time','part-time','hourly']).default('full-time'),
      hourlyRate:    z.number().positive().optional(),
      emergencyName: z.string().optional(),
      emergencyPhone:z.string().optional(),
      notes:         z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Check email not taken
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new AppError('Email already in use', 409);

    const hashed = await bcrypt.hash(data.password, 12);
    const empId  = await nextEmployeeId();

    const user = await prisma.user.create({
      data: {
        firstName:    data.firstName,
        lastName:     data.lastName,
        email:        data.email,
        phone:        data.phone,
        password:     hashed,
        role:         data.role,
        routingRole:  data.routingRole,
        isActive:     true,
        emailVerified:true,
        staffProfile: {
          create: {
            employeeId:    empId,
            hiredAt:       new Date(),
            contractType:  data.contractType,
            hourlyRate:    data.hourlyRate,
            emergencyName: data.emergencyName,
            emergencyPhone:data.emergencyPhone,
            notes:         data.notes,
          },
        },
      },
      include: { staffProfile: { include: { shifts: true } } },
    });

    const { password: _, ...safeUser } = user as any;
    res.status(201).json({
      success: true,
      message: `${data.firstName} ${data.lastName} hired as ${empId}`,
      data: { staff: safeUser },
    });
  } catch (error) { next(error); }
};

// ── UPDATE staff details ───────────────────────────────────────────────────
export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      firstName:     z.string().min(2).optional(),
      lastName:      z.string().min(2).optional(),
      phone:         z.string().optional(),
      role:          z.enum(['STAFF','ADMIN']).optional(),
      routingRole:   z.string().nullable().optional(),
      contractType:  z.enum(['full-time','part-time','hourly']).optional(),
      hourlyRate:    z.number().positive().nullable().optional(),
      emergencyName: z.string().optional(),
      emergencyPhone:z.string().optional(),
      notes:         z.string().optional(),
    });

    const data = schema.parse(req.body);
    const { contractType, hourlyRate, emergencyName, emergencyPhone, notes, ...userFields } = data;

    if (Object.keys(userFields).length > 0) {
      await prisma.user.update({ where: { id }, data: userFields as any });
    }

    const profileData: any = {};
    if (contractType  !== undefined) profileData.contractType  = contractType;
    if (hourlyRate    !== undefined) profileData.hourlyRate    = hourlyRate;
    if (emergencyName !== undefined) profileData.emergencyName = emergencyName;
    if (emergencyPhone!== undefined) profileData.emergencyPhone= emergencyPhone;
    if (notes         !== undefined) profileData.notes         = notes;

    if (Object.keys(profileData).length > 0) {
      await prisma.staffProfile.upsert({
        where: { userId: id },
        update: profileData,
        create: { userId: id, employeeId: await nextEmployeeId(), hiredAt: new Date(), ...profileData },
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { staffProfile: { include: { shifts: true } } },
    });

    res.json({ success: true, message: 'Staff updated', data: { staff: updated } });
  } catch (error) { next(error); }
};

// ── DISABLE / ENABLE login ─────────────────────────────────────────────────
export const toggleStaffLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true, firstName: true, lastName: true } });
    if (!user) throw new AppError('Staff member not found', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, firstName: true, lastName: true, isActive: true },
    });

    res.json({
      success: true,
      message: `Login ${updated.isActive ? 'enabled' : 'disabled'} for ${updated.firstName} ${updated.lastName}`,
      data: { staff: updated },
    });
  } catch (error) { next(error); }
};

// ── FIRE staff ─────────────────────────────────────────────────────────────
export const fireStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const schema = z.object({ reason: z.string().min(3) });
    const { reason } = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id },
      include: { staffProfile: true },
    });
    if (!user) throw new AppError('Staff member not found', 404);

    // Disable login + demote to CUSTOMER + record termination
    await prisma.user.update({
      where: { id },
      data: { isActive: false, role: 'CUSTOMER', routingRole: null },
    });

    if (user.staffProfile) {
      await prisma.staffProfile.update({
        where: { userId: id },
        data: { firedAt: new Date(), firedReason: reason },
      });
      // Deactivate all shifts
      await prisma.workShift.updateMany({
        where: { profileId: user.staffProfile.id },
        data: { isActive: false },
      });
    }

    res.json({
      success: true,
      message: `${user.firstName} ${user.lastName} has been terminated`,
      data: {},
    });
  } catch (error) { next(error); }
};

// ── REHIRE (re-enable fired staff) ─────────────────────────────────────────
export const rehireStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const schema = z.object({ role: z.enum(['STAFF','ADMIN']).default('STAFF'), routingRole: z.string().optional() });
    const { role, routingRole } = schema.parse(req.body);

    await prisma.user.update({
      where: { id },
      data: { isActive: true, role, routingRole: routingRole ?? null },
    });

    if (await prisma.staffProfile.findUnique({ where: { userId: id } })) {
      await prisma.staffProfile.update({
        where: { userId: id },
        data: { firedAt: null, firedReason: null },
      });
    }

    res.json({ success: true, message: 'Staff member re-hired', data: {} });
  } catch (error) { next(error); }
};

// ── RESET PASSWORD ─────────────────────────────────────────────────────────
export const resetStaffPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const schema = z.object({ password: z.string().min(6) });
    const { password } = schema.parse(req.body);

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    res.json({ success: true, message: 'Password reset successfully', data: {} });
  } catch (error) { next(error); }
};

// ── SCHEDULE: upsert weekly shifts ────────────────────────────────────────
export const upsertSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;   // userId

    const schema = z.object({
      shifts: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime:   z.string().regex(/^\d{2}:\d{2}$/),
        station:   z.string().optional(),
      })),
    });

    const { shifts } = schema.parse(req.body);

    // Ensure profile exists
    let profile = await prisma.staffProfile.findUnique({ where: { userId: id } });
    if (!profile) {
      profile = await prisma.staffProfile.create({
        data: { userId: id, employeeId: await nextEmployeeId(), hiredAt: new Date() },
      });
    }

    // Replace all active shifts
    await prisma.workShift.deleteMany({ where: { profileId: profile.id } });

    const created = await prisma.workShift.createMany({
      data: shifts.map(s => ({
        profileId: profile!.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime:   s.endTime,
        station:   s.station,
        isActive:  true,
      })),
    });

    const result = await prisma.workShift.findMany({
      where: { profileId: profile.id, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json({
      success: true,
      message: `Schedule saved (${created.count} shifts)`,
      data: { shifts: result },
    });
  } catch (error) { next(error); }
};

// ── GET weekly schedule for all active staff ───────────────────────────────
export const getWeeklySchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await prisma.staffProfile.findMany({
      where: { firedAt: null, user: { isActive: true } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, routingRole: true, role: true } },
        shifts: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
      },
    });

    // Build a grid: days 0-6 -> list of staff+shifts
    const grid = Array.from({ length: 7 }, (_, day) => ({
      day, dayName: DAY_NAMES[day],
      entries: profiles
        .map(p => ({ staff: p.user, shift: p.shifts.find(s => s.dayOfWeek === day) }))
        .filter(e => e.shift),
    }));

    res.json({ success: true, data: { profiles, grid } });
  } catch (error) { next(error); }
};
