import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Get all tables ────────────────────────────────────────────────────────
export const getAllTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, status, isActive } = req.query;

    const where: any = {};
    if (location) where.location = location;
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const tables = await prisma.table.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            reservations: {
              where: {
                status: { in: ['PENDING', 'CONFIRMED'] },
              },
            },
            sessions: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    // Add computed fields
    const tablesWithStatus = tables.map(table => ({
      ...table,
      hasActiveSession: table._count.sessions > 0,
      pendingReservations: table._count.reservations,
    }));

    res.json({ success: true, data: { tables: tablesWithStatus } });
  } catch (error) {
    next(error);
  }
};

// ── Get single table ──────────────────────────────────────────────────────
export const getTableById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
          },
          orderBy: { reservationDate: 'asc' },
          take: 10,
        },
        sessions: {
          where: { status: 'ACTIVE' },
          include: {
            waiter: {
              select: { id: true, firstName: true, lastName: true },
            },
            orders: {
              select: { id: true, orderNumber: true, totalAmount: true, status: true },
            },
          },
        },
      },
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.json({ success: true, data: { table } });
  } catch (error) {
    next(error);
  }
};

// ── Create table ──────────────────────────────────────────────────────────
export const createTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, capacity, location, qrCode, notes, sortOrder } = req.body;

    // Check for duplicate table number
    const existing = await prisma.table.findUnique({
      where: { tableNumber },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Table number already exists',
      });
    }

    const table = await prisma.table.create({
      data: {
        tableNumber,
        capacity,
        location,
        qrCode,
        notes,
        sortOrder: sortOrder || 0,
        status: 'AVAILABLE',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      data: { table },
    });
  } catch (error) {
    next(error);
  }
};

// ── Update table ──────────────────────────────────────────────────────────
export const updateTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { tableNumber, capacity, location, status, qrCode, notes, sortOrder, isActive } = req.body;

    // If updating table number, check for duplicates
    if (tableNumber) {
      const existing = await prisma.table.findFirst({
        where: {
          tableNumber,
          id: { not: id },
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Table number already exists',
        });
      }
    }

    const table = await prisma.table.update({
      where: { id },
      data: {
        tableNumber,
        capacity,
        location,
        status,
        qrCode,
        notes,
        sortOrder,
        isActive,
      },
    });

    res.json({
      success: true,
      message: 'Table updated successfully',
      data: { table },
    });
  } catch (error) {
    next(error);
  }
};

// ── Delete table ──────────────────────────────────────────────────────────
export const deleteTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if table has active sessions or future reservations
    const activeSession = await prisma.tableSession.findFirst({
      where: { tableId: id, status: 'ACTIVE' },
    });

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete table with active session',
      });
    }

    const futureReservations = await prisma.tableReservation.count({
      where: {
        tableId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        reservationDate: { gte: new Date() },
      },
    });

    if (futureReservations > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete table with ${futureReservations} future reservation(s)`,
      });
    }

    await prisma.table.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Table deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ── Update table status ───────────────────────────────────────────────────
export const updateTableStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const table = await prisma.table.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      message: `Table status updated to ${status}`,
      data: { table },
    });
  } catch (error) {
    next(error);
  }
};


// ── Generate QR code for table ────────────────────────────────────────────
export const generateTableQR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const table = await prisma.table.findUnique({ where: { id } });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    // Generate QR code URL (frontend will display this)
    const qrData = `${process.env.FRONTEND_URL}/menu?table=${table.tableNumber}`;

    await prisma.table.update({
      where: { id },
      data: { qrCode: qrData },
    });

    res.json({
      success: true,
      data: { qrCode: qrData },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get floor plan (all tables with layout) ──────────────────────────────
export const getFloorPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await prisma.table.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          include: {
            waiter: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        reservations: {
          where: {
            status: 'CONFIRMED',
            reservationDate: new Date(),
          },
          take: 1,
        },
      },
    });

    // Group by location
    const floorPlan = tables.reduce((acc: any, table) => {
      const location = table.location || 'Main';
      if (!acc[location]) acc[location] = [];
      acc[location].push(table);
      return acc;
    }, {});

    res.json({ success: true, data: { floorPlan } });
  } catch (error) {
    next(error);
  }
};

// ── REPLACEMENT for getAvailableTables in tables.controller.ts ─────────────
// Replace the existing getAvailableTables function with this fixed version
// The bug was: time comparison used string parsing that fails with ISO datetime strings

export const getAvailableTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, time, partySize, durationMinutes = 90 } = req.query;

    if (!date || !time || !partySize) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and party size are required',
      });
    }

    // Parse the requested time into minutes since midnight
    const [reqHours, reqMinutes] = (time as string).split(':').map(Number);
    const reqTimeMinutes = reqHours * 60 + reqMinutes;
    const reqDuration = parseInt(durationMinutes as string) || 90;

    // Requested window: [reqTimeMinutes, reqTimeMinutes + duration]
    const reqWindowStart = reqTimeMinutes;
    const reqWindowEnd = reqTimeMinutes + reqDuration;

    // Build reservation date range (full day)
    const startOfDay = new Date(date as string);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date as string);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Find tables with enough capacity
    const tables = await prisma.table.findMany({
      where: {
        capacity: { gte: parseInt(partySize as string) },
        isActive: true,
        status: { notIn: ['MAINTENANCE'] },
      },
      include: {
        reservations: {
          where: {
            reservationDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: { in: ['CONFIRMED', 'PENDING', 'SEATED'] },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Filter out tables with conflicting reservations
    const availableTables = tables.filter(table => {
      return !table.reservations.some(reservation => {
        // Extract time from ISO string: "1970-01-01T11:00:00.000Z" → 11 hours, 0 minutes
        const resTimeStr = reservation.reservationTime.toISOString();
        let resHours: number, resMinutes: number;

        if (resTimeStr.includes('T')) {
          // ISO format: "1970-01-01T11:00:00.000Z"
          const timePart = resTimeStr.split('T')[1]; // "11:00:00.000Z"
          [resHours, resMinutes] = timePart.split(':').map(Number);
        } else {
          // Plain time format: "11:00" or "11:00:00"
          [resHours, resMinutes] = resTimeStr.split(':').map(Number);
        }

        const resTimeMinutes = resHours * 60 + resMinutes;
        const resDuration = reservation.durationMinutes || 90;
        const resWindowStart = resTimeMinutes;
        const resWindowEnd = resTimeMinutes + resDuration;

        // Check if windows overlap
        // Overlap if: reqStart < resEnd AND reqEnd > resStart
        const overlaps = reqWindowStart < resWindowEnd && reqWindowEnd > resWindowStart;
        return overlaps;
      });
    });

    // Remove reservations from response (don't expose other bookings)
    const cleanedTables = availableTables.map(({ reservations, ...table }) => table);

    res.json({ success: true, data: { tables: cleanedTables } });
  } catch (error) {
    next(error);
  }
};


// ── NEW: Get availability windows for a specific table ──────────────────────
// Add this NEW function to tables.controller.ts
// Also add to tables.routes.ts: GET /:id/availability

export const getTableAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const table = await prisma.table.findUnique({
      where: { id },
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    // Get all reservations for this table on this date
    const startOfDay = new Date(date as string);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date as string);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const reservations = await prisma.tableReservation.findMany({
      where: {
        tableId: id,
        reservationDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ['CONFIRMED', 'PENDING', 'SEATED'] },
      },
      orderBy: { reservationTime: 'asc' },
    });

    // Build time slots (11:00 AM - 10:00 PM, 30 min intervals)
    const slots = [];
    for (let hour = 11; hour <= 22; hour++) {
      for (const minute of [0, 30]) {
        if (hour === 22 && minute === 30) break;

        const slotMinutes = hour * 60 + minute;
        const slotEnd = slotMinutes + 90; // 90 min default duration

        // Check if this slot conflicts with any reservation

	const conflict = reservations.find(reservation => {
  // Extract hours and minutes directly from Date object
  const resDate = new Date(reservation.reservationTime);
  const resHours = resDate.getUTCHours();
  const resMinutes = resDate.getUTCMinutes();
  
  const resStart = resHours * 60 + resMinutes;
  const resDuration = reservation.durationMinutes || 90;
  const resEnd = resStart + resDuration;

  const overlaps = slotMinutes < resEnd && slotEnd > resStart;
  
  return overlaps;
});
        // Format time as HH:MM
        const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        slots.push({
          time: timeLabel,
          available: !conflict,
          reservation: conflict ? {
            id: conflict.id,
            customerName: conflict.customerName,
            partySize: conflict.partySize,
            status: conflict.status,
            durationMinutes: conflict.durationMinutes,
          } : null,
        });
      }
    }

    res.json({
      success: true,
      data: {
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          location: table.location,
        },
        date,
        slots,
        reservations: reservations.map(r => ({
          id: r.id,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          partySize: r.partySize,
          reservationTime: r.reservationTime,
          durationMinutes: r.durationMinutes,
          status: r.status,
          specialRequests: r.specialRequests,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

