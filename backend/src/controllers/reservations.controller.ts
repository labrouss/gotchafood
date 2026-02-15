import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Get all reservations ──────────────────────────────────────────────────
export const getAllReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, date, tableId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (tableId) where.tableId = tableId;
    if (date) {
      const searchDate = new Date(date as string);
      where.reservationDate = searchDate;
    }

    const reservations = await prisma.tableReservation.findMany({
      where,
      include: {
        table: { select: { tableNumber: true, capacity: true, location: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        confirmedByUser: { select: { firstName: true, lastName: true } },
        seatedByUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: [
        { reservationDate: 'asc' },
        { reservationTime: 'asc' },
      ],
    });

    res.json({ success: true, data: { reservations } });
  } catch (error) {
    next(error);
  }
};

// ── Get single reservation ────────────────────────────────────────────────
export const getReservationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.tableReservation.findUnique({
      where: { id },
      include: {
        table: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        confirmedByUser: { select: { firstName: true, lastName: true } },
        seatedByUser: { select: { firstName: true, lastName: true } },
        sessions: {
          include: {
            orders: {
              select: { id: true, orderNumber: true, totalAmount: true, status: true },
            },
          },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    res.json({ success: true, data: { reservation } });
  } catch (error) {
    next(error);
  }
};

// ── Create reservation (Customer) ─────────────────────────────────────────
export const createReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tableId,
      customerName,
      customerPhone,
      customerEmail,
      partySize,
      reservationDate,
      reservationTime,
      durationMinutes,
      specialRequests,
    } = req.body;

    const userId = (req as any).user?.id; // Optional - may be guest

    // Verify table exists and has capacity
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    if (table.capacity < partySize) {
      return res.status(400).json({
        success: false,
        message: `Table capacity (${table.capacity}) insufficient for party size (${partySize})`,
      });
    }

    // Check for conflicts
    const conflictingReservation = await prisma.tableReservation.findFirst({
      where: {
        tableId,
        reservationDate: new Date(reservationDate),
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (conflictingReservation) {
      const existingTime = conflictingReservation.reservationTime.toString();
      const requestedTime = reservationTime;
      
      // Check if times overlap (within 2 hours)
      const timeDiff = Math.abs(
        new Date(`2000-01-01 ${requestedTime}`).getTime() -
        new Date(`2000-01-01 ${existingTime}`).getTime()
      ) / (1000 * 60);

      if (timeDiff < 120) {
        return res.status(409).json({
          success: false,
          message: 'Table already reserved for this time slot',
        });
      }
    }

    const reservation = await prisma.tableReservation.create({
      data: {
        tableId,
        customerId: userId,
        customerName,
        customerPhone,
        customerEmail,
        partySize,
        reservationDate: new Date(reservationDate),
        reservationTime: new Date(`2000-01-01 ${reservationTime}`),
        durationMinutes: durationMinutes || 90,
        specialRequests,
        status: 'PENDING',
      },
      include: {
        table: { select: { tableNumber: true, location: true } },
      },
    });

    // TODO: Send confirmation email/SMS

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
};

// ── Update reservation ────────────────────────────────────────────────────
export const updateReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      tableId,
      customerName,
      customerPhone,
      customerEmail,
      partySize,
      reservationDate,
      reservationTime,
      durationMinutes,
      specialRequests,
      notes,
    } = req.body;

    const data: any = {};
    if (tableId) data.tableId = tableId;
    if (customerName) data.customerName = customerName;
    if (customerPhone) data.customerPhone = customerPhone;
    if (customerEmail) data.customerEmail = customerEmail;
    if (partySize) data.partySize = partySize;
    if (reservationDate) data.reservationDate = new Date(reservationDate);
    if (reservationTime) data.reservationTime = new Date(`2000-01-01 ${reservationTime}`);
    if (durationMinutes) data.durationMinutes = durationMinutes;
    if (specialRequests !== undefined) data.specialRequests = specialRequests;
    if (notes !== undefined) data.notes = notes;

    const reservation = await prisma.tableReservation.update({
      where: { id },
      data,
      include: {
        table: { select: { tableNumber: true, location: true } },
      },
    });

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
};

// ── Confirm reservation (Admin) ───────────────────────────────────────────
export const confirmReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const reservation = await prisma.tableReservation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: userId,
      },
      include: {
        table: { select: { tableNumber: true } },
        customer: { select: { email: true, phone: true } },
      },
    });

    // TODO: Send confirmation email/SMS

    res.json({
      success: true,
      message: 'Reservation confirmed',
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
};

// ── Seat reservation (Waiter) ─────────────────────────────────────────────
export const seatReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Update reservation
    const reservation = await prisma.tableReservation.update({
      where: { id },
      data: {
        status: 'SEATED',
        seatedAt: new Date(),
        seatedBy: userId,
      },
    });

    // Create table session
    const session = await prisma.tableSession.create({
      data: {
        tableId: reservation.tableId,
        reservationId: reservation.id,
        waiterId: userId,
        partySize: reservation.partySize,
      },
    });

    // Update table status
    await prisma.table.update({
      where: { id: reservation.tableId },
      data: { status: 'OCCUPIED' },
    });

    res.json({
      success: true,
      message: 'Customer seated successfully',
      data: { reservation, session },
    });
  } catch (error) {
    next(error);
  }
};

// ── Cancel reservation ────────────────────────────────────────────────────
export const cancelReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const reservation = await prisma.tableReservation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason,
      },
    });

    res.json({
      success: true,
      message: 'Reservation cancelled',
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
};

// ── Mark as no-show ───────────────────────────────────────────────────────
export const markNoShow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.tableReservation.update({
      where: { id },
      data: { status: 'NO_SHOW' },
    });

    res.json({
      success: true,
      message: 'Reservation marked as no-show',
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
};

// ── Complete reservation ──────────────────────────────────────────────────
export const completeReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.tableReservation.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Reservation completed',
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get customer's reservations ───────────────────────────────────────────
export const getMyReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { status } = req.query;

    const where: any = { customerId: userId };
    if (status) where.status = status;

    const reservations = await prisma.tableReservation.findMany({
      where,
      include: {
        table: { select: { tableNumber: true, capacity: true, location: true } },
      },
      orderBy: [
        { reservationDate: 'desc' },
        { reservationTime: 'desc' },
      ],
    });

    res.json({ success: true, data: { reservations } });
  } catch (error) {
    next(error);
  }
};

// ── Get reservations for date range (Calendar) ────────────────────────────
export const getReservationsByDateRange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const reservations = await prisma.tableReservation.findMany({
      where: {
        reservationDate: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        table: { select: { tableNumber: true, capacity: true, location: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: [
        { reservationDate: 'asc' },
        { reservationTime: 'asc' },
      ],
    });

    // Group by date
    const groupedByDate = reservations.reduce((acc: any, reservation) => {
      const dateKey = reservation.reservationDate.toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(reservation);
      return acc;
    }, {});

    res.json({ success: true, data: { reservations: groupedByDate } });
  } catch (error) {
    next(error);
  }
};
