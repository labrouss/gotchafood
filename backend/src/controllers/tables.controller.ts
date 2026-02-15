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

// ── Get available tables for time slot ───────────────────────────────────
export const getAvailableTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, time, partySize } = req.query;

    if (!date || !time || !partySize) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and party size are required',
      });
    }

    const reservationDate = new Date(date as string);
    const reservationTime = time as string;

    // Find tables with enough capacity
    const tables = await prisma.table.findMany({
      where: {
        capacity: { gte: parseInt(partySize as string) },
        isActive: true,
        status: { in: ['AVAILABLE', 'RESERVED'] },
      },
      include: {
        reservations: {
          where: {
            reservationDate,
            status: { in: ['CONFIRMED', 'PENDING'] },
          },
        },
      },
    });

    // Filter out tables with conflicting reservations
    const availableTables = tables.filter(table => {
      return !table.reservations.some(reservation => {
        // Check if time slots overlap (within 2 hours)
        const reservedTime = reservation.reservationTime.toString();
        const timeDiff = Math.abs(
          new Date(`2000-01-01 ${reservationTime}`).getTime() -
          new Date(`2000-01-01 ${reservedTime}`).getTime()
        ) / (1000 * 60); // minutes

        return timeDiff < 120; // 2 hour window
      });
    });

    res.json({ success: true, data: { tables: availableTables } });
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
