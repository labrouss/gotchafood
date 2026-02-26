import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { io } from '../server';

const prisma = new PrismaClient();

// ── Get waiter dashboard ──────────────────────────────────────────────────
export const getWaiterDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const waiterId = (req as any).user.id;

    // Get active sessions for this waiter
    const sessions = await prisma.tableSession.findMany({
      where: {
        waiterId,
        status: 'ACTIVE',
      },
      include: {
        table: {
          select: { tableNumber: true, capacity: true, location: true },
        },
        reservation: {
          select: { customerName: true, partySize: true },
        },
        orders: {
          where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                price: true,
                notes: true,
                menuItem: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Get today's shift
    const today = new Date().toISOString().split('T')[0];
    const shift = await prisma.waiterShift.findFirst({
      where: {
        waiterId,
        shiftDate: new Date(today),
        status: { in: ['SCHEDULED', 'ACTIVE'] },
      },
    });

    // ✅ ADD: Get available tables
    const freeTables = await prisma.table.findMany({
      where: {
        status: 'AVAILABLE',
      },
      select: {
        id: true,
        tableNumber: true,
        capacity: true,
        location: true,
        status: true,
      },
    });

    // Get pending reservations assigned to this waiter
    const pendingReservations = await prisma.tableReservation.findMany({
      where: {
        status: 'CONFIRMED',
        reservationDate: new Date(today),
      },
      include: {
        table: {
          select: { tableNumber: true, location: true },
        },
      },
      orderBy: { reservationTime: 'asc' },
    });

    res.json({
      success: true,
      data: {
        sessions,
        shift,
        pendingReservations,
	freeTables,
        stats: {
          activeTables: sessions.length,
          totalRevenue: sessions.reduce((sum, s) => sum + Number(s.totalSpent), 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get available tables for walk-ins
export const getAvailableTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const availableTables = await prisma.table.findMany({
      where: {
        status: 'AVAILABLE',
      },
      orderBy: {
        tableNumber: 'asc',
      },
    });

    res.json({
      success: true,
      data: { tables: availableTables },
    });
  } catch (error) {
    next(error);
  }
};

// ── Start table session ───────────────────────────────────────────────────
export const startTableSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId, partySize, customerId, loyaltyDiscount, notes, reservationId } = req.body;
    const waiterId = (req as any).user.id;

    // Check if table already has active session
    const existingSession = await prisma.tableSession.findFirst({
      where: { tableId, status: 'ACTIVE' },
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'Table already has an active session',
      });
    }

    // Create session
    const session = await prisma.tableSession.create({
      data: {
        tableId,
        reservationId,
        waiterId,
        partySize,
	customerId,
	loyaltyDiscount,
        notes,
	status: 'ACTIVE',
	startedAt: new Date(),
      },
      include: {
        table: true,
        reservation: true,
	customer: true,
      },
    });

    // Update table status
    await prisma.table.update({
      where: { id: tableId },
      data: { status: 'OCCUPIED' },
    });

    // If linked to reservation, update it
    if (reservationId) {
      await prisma.tableReservation.update({
        where: { id: reservationId },
        data: {
          status: 'SEATED',
          seatedAt: new Date(),
          seatedBy: waiterId,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Table session started',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get table session ─────────────────────────────────────────────────────
export const getTableSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const session = await prisma.tableSession.findUnique({
      where: { id },
      include: {
        table: true,
        reservation: true,
        waiter: {
          select: { id: true, firstName: true, lastName: true },
        },
        orders: {
          include: {
            items: {
              include: {
                menuItem: {
                  select: { name: true, price: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, data: { session } });
  } catch (error) {
    next(error);
  }
};

// ── End table session ─────────────────────────────────────────────────────
export const endTableSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Get session with orders
    const session = await prisma.tableSession.findUnique({
      where: { id },
      include: { orders: true },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Calculate total spent
    const totalSpent = session.orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    // Mark all orders as COMPLETED (waiter closes them)
    await prisma.order.updateMany({
      where: {
        tableSessionId: id,
        status: { not: 'CANCELLED' },
      },
      data: {
        status: 'COMPLETED',
      },
    });

    // Update session
    const updatedSession = await prisma.tableSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        totalSpent,
        notes,
      },
    });


    // Update table status back to available
    // Update table status back to available
    try {
      await prisma.table.update({
        where: { id: session.tableId },
        data: { status: 'AVAILABLE' },
      });

    } catch (error) {
      console.error('❌ Table update failed:', error);
    }

    // Update reservation if exists
    if (session.reservationId) {
      await prisma.tableReservation.update({
        where: { id: session.reservationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Table session ended',
      data: { session: updatedSession, totalSpent },
    });
  } catch (error) {
    next(error);
  }
};

// ── Create order for table session ────────────────────────────────────────
export const createSessionOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { items, notes, loyaltyPhone } = req.body;
    const waiterId = (req as any).user.id;

    // Get session
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: { table: true },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Session not active' });
    }

    // Validate items and resolve prices from the database.
    // Never trust client-supplied prices — always use the canonical menu price.
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    const menuItemIds: string[] = items.map((i: any) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, price: true, isAvailable: true, name: true },
    });

    // Build a lookup map and validate every item exists and is available
    const priceMap = new Map(menuItems.map((m) => [m.id, m]));
    for (const item of items) {
      const menu = priceMap.get(item.menuItemId);
      if (!menu) {
        return res.status(400).json({ success: false, message: `Menu item not found: ${item.menuItemId}` });
      }
      if (!menu.isAvailable) {
        return res.status(400).json({ success: false, message: `Item is no longer available: ${menu.name}` });
      }
      // Stamp the canonical price onto the item so downstream code uses it
      item.price = Number(menu.price);
    }

    // Calculate totals using DB prices
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate loyalty discount
    let discountAmount = 0;
    let appliedTier = null;
    let customerIdForOrder: string | null = null; // null for waiter orders without a loyalty customer

    if (loyaltyPhone) {
      const customer = await prisma.user.findFirst({
        where: { phone: loyaltyPhone },
        include: { loyaltyReward: true },
      });

      if (customer) {
        customerIdForOrder = customer.id;
        if (customer.loyaltyReward) {
          const tier = await prisma.loyaltyTier.findFirst({
            where: { name: customer.loyaltyReward.tier, isActive: true },
          });
          if (tier) {
            discountAmount = (subtotal * tier.discount) / 100;
            appliedTier = tier.name;
          }
        }
      }
    }

    // Generate a collision-safe order number: timestamp (last 6 digits) + 3-digit random suffix.
    // Retries up to 5 times in the rare case of a collision on a busy system.
    const generateOrderNumber = () => {
      const ts = Date.now().toString().slice(-6);
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `WTR-${ts}${rand}`;
    };

    let orderNumber = generateOrderNumber();
    let attempts = 0;
    while (await prisma.order.findUnique({ where: { orderNumber } })) {
      if (++attempts > 5) throw new Error('Failed to generate a unique order number after 5 attempts');
      orderNumber = generateOrderNumber();
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: customerIdForOrder, // null for waiter orders without a loyalty customer
        orderNumber,
        orderType: 'WAITER',
        orderSource: 'waiter',
        tableNumber: session.table.tableNumber,
        tableSessionId: sessionId,
        waiterId,
        loyaltyPhone,
        status: 'CONFIRMED',
        subtotal,
        discountAmount,
        appliedTier,
        totalAmount: subtotal - discountAmount,
        notes,
        isPaid: false,
        items: {
          create: items.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
            notes: item.notes,
            station: item.station || 'kitchen',
            prepTime: item.prepTime || 10,
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: { name: true, imageUrl: true },
            },
          },
        },
        // Only include user relation when a customer is linked
        ...(customerIdForOrder
          ? {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            }
          : {}),
      },
    });

    // Emit real-time notification
    io.emit('new-order', order);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// Mark order as served (removes from kitchen display)
export const markOrderServed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Route may supply the order id as :orderId (waiter sessions route)
    // or as :id (orders route called from mobile order-detail screen)
    const orderId = req.params.orderId || req.params.id;
    const waiterId = (req as any).user.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, status: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'READY') {
      return res.status(400).json({
        success: false,
        message: 'Can only mark READY orders as served'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SERVED',
        // Add servedAt field if it exists in schema
        // servedAt: new Date(),
        // servedBy: waiterId,
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Award loyalty points now that the order is served
    await awardLoyaltyPoints(orderId);

    // Emit real-time notification
    io.emit('order-updated', updatedOrder);

    res.json({
      success: true,
      message: 'Order marked as served',
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
};



// ── Add items to existing order ────────────────────────────────────────────
export const addItemsToOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, orderId } = req.params;
    const { items } = req.body;
    const waiterId = (req as any).user.id;

    // Get order and verify it belongs to this session
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        tableSessionId: sessionId,
        status: { in: ['CONFIRMED', 'PREPARING', 'READY'] }, // Can add to these statuses
      },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or cannot be modified',
      });
    }

    // Calculate additional amount
    const additionalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Add items to order
    await prisma.orderItem.createMany({
      data: items.map((item: any) => ({
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        notes: item.notes,
        station: item.station || 'kitchen',
        prepTime: item.prepTime || 10,
      })),
    });

    // Update order totals
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal: { increment: additionalAmount },
        totalAmount: { increment: additionalAmount },
        // Reset to CONFIRMED so kitchen prepares new items
        status: 'CONFIRMED',
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: { name: true, imageUrl: true },
            },
          },
        },
      },
    });

    // Emit real-time notification
    io.emit('order-updated', updatedOrder);

    res.json({
      success: true,
      message: 'Items added to order',
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get active sessions ───────────────────────────────────────────────────
export const getActiveSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { waiterId } = req.query;

    const where: any = { status: 'ACTIVE' };
    if (waiterId) where.waiterId = waiterId;

    const sessions = await prisma.tableSession.findMany({
      where,
      include: {
        table: {
          select: { tableNumber: true, capacity: true, location: true },
        },
        waiter: {
          select: { firstName: true, lastName: true },
        },
        reservation: {
          select: { customerName: true, partySize: true },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    res.json({ success: true, data: { sessions } });
  } catch (error) {
    next(error);
  }
};

// ── Waiter Shifts ─────────────────────────────────────────────────────────

export const getMyShifts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const waiterId = (req as any).user.id;
    const { startDate, endDate } = req.query;

    const where: any = { waiterId };

    if (startDate && endDate) {
      where.shiftDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const shifts = await prisma.waiterShift.findMany({
      where,
      orderBy: { shiftDate: 'desc' },
    });

    res.json({ success: true, data: { shifts } });
  } catch (error) {
    next(error);
  }
};

export const clockIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const waiterId = (req as any).user.id;
    const today = new Date().toISOString().split('T')[0];

    const shift = await prisma.waiterShift.findFirst({
      where: {
        waiterId,
        shiftDate: new Date(today),
        status: 'SCHEDULED',
      },
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'No scheduled shift found for today',
      });
    }

    const updatedShift = await prisma.waiterShift.update({
      where: { id: shift.id },
      data: {
        actualStart: new Date(),
        status: 'ACTIVE',
      },
    });

    res.json({
      success: true,
      message: 'Clocked in successfully',
      data: { shift: updatedShift },
    });
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const waiterId = (req as any).user.id;

    const shift = await prisma.waiterShift.findFirst({
      where: {
        waiterId,
        status: 'ACTIVE',
      },
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'No active shift found',
      });
    }

    // Check for active sessions
    const activeSessions = await prisma.tableSession.count({
      where: { waiterId, status: 'ACTIVE' },
    });

    if (activeSessions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot clock out with ${activeSessions} active table(s)`,
      });
    }

    const updatedShift = await prisma.waiterShift.update({
      where: { id: shift.id },
      data: {
        actualEnd: new Date(),
        status: 'COMPLETED',
      },
    });

    res.json({
      success: true,
      message: 'Clocked out successfully',
      data: { shift: updatedShift },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get waiter performance stats ──────────────────────────────────────────
export const getWaiterStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const waiterId = (req as any).user?.id || req.params.waiterId;
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate ? {
      startedAt: {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      },
    } : {};

    // Get completed sessions
    const sessions = await prisma.tableSession.findMany({
      where: {
        waiterId,
        status: 'COMPLETED',
        ...dateFilter,
      },
      include: {
        orders: {
          select: { totalAmount: true },
        },
      },
    });

    const stats = {
      totalSessions: sessions.length,
      totalRevenue: sessions.reduce((sum, s) => sum + Number(s.totalSpent), 0),
      averageSessionTime: sessions.length > 0
        ? sessions.reduce((sum, s) => {
          const duration = s.endedAt && s.startedAt
            ? (s.endedAt.getTime() - s.startedAt.getTime()) / (1000 * 60)
            : 0;
          return sum + duration;
        }, 0) / sessions.length
        : 0,
      totalOrders: sessions.reduce((sum, s) => sum + s.orders.length, 0),
    };

    res.json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

// Award loyalty points to the customer linked to an order.
// 1 point per EUR1 of totalAmount. Handles tier upgrades automatically.
// Non-fatal: errors are logged but never bubble up to fail the order update.
async function awardLoyaltyPoints(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, totalAmount: true, orderNumber: true, loyaltyPhone: true },
    });

    if (!order) return;

    // Resolve userId from loyaltyPhone if the order was linked by phone only
    let userId = order.userId;
    if (!userId && order.loyaltyPhone) {
      const user = await prisma.user.findFirst({
        where: { phone: order.loyaltyPhone },
        select: { id: true },
      });
      userId = user?.id ?? null;
    }

    if (!userId) return; // No customer linked — nothing to award

    const points = Math.floor(Number(order.totalAmount));
    if (points <= 0) return;

    const loyalty = await prisma.loyaltyReward.upsert({
      where: { userId },
      update: {
        points: { increment: points },
        lifetimePoints: { increment: points },
      },
      create: {
        userId,
        points,
        lifetimePoints: points,
        tier: 'bronze',
      },
    });

    await prisma.rewardTransaction.create({
      data: {
        userId,
        orderId,
        points,
        type: 'earned',
        reason: `Table order #${order.orderNumber}`,
      },
    });

    // Check for tier upgrade
    const totalLifetime = loyalty.lifetimePoints; // already incremented by upsert
    let newTier = loyalty.tier;
    if (totalLifetime >= 500) newTier = 'platinum';
    else if (totalLifetime >= 200) newTier = 'gold';
    else if (totalLifetime >= 100) newTier = 'silver';

    if (newTier !== loyalty.tier) {
      const bonusPoints = newTier === 'platinum' ? 50 : newTier === 'gold' ? 25 : 10;
      await prisma.loyaltyReward.update({
        where: { userId },
        data: { tier: newTier, points: { increment: bonusPoints } },
      });
      await prisma.rewardTransaction.create({
        data: {
          userId,
          points: bonusPoints,
          type: 'milestone',
          reason: `${newTier.charAt(0).toUpperCase() + newTier.slice(1)} tier achieved!`,
        },
      });
    }

    console.log(`Awarded ${points} points to user ${userId} for order #${order.orderNumber}`);
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    // Non-fatal -- do not rethrow
  }
}
