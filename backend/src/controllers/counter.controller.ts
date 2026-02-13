import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Helper to generate order number
const generateOrderNumber = async (prefix: string = 'CO'): Promise<string> => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.order.count({
    where: {
      orderNumber: { startsWith: `${prefix}-${today}` },
      orderSource: prefix === 'CO' ? 'counter' : 'waiter'
    },
  });
  return `${prefix}-${today}-${String(count + 1).padStart(3, '0')}`;
};

// ── Create counter/waiter order ───────────────────────────────────────────
export const createCounterOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      items: z.array(z.object({
        menuItemId: z.string(),
        quantity: z.number().min(1),
        price: z.number(),
      })),
      loyaltyPhone: z.string().optional(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
      tableNumber: z.string().optional(),
      orderSource: z.enum(['counter', 'waiter']).default('counter'),
    });

    const data = schema.parse(req.body);
    const userId = (req as any).user.id;

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmount = subtotal;

    // Check if customer exists by phone
    let customerId: string | null = null;
    let pointsEarned = 0;

    if (data.loyaltyPhone) {
      const customer = await prisma.user.findFirst({
        where: { phone: data.loyaltyPhone },
        include: { loyaltyReward: true },
      });

      if (customer) {
        customerId = customer.id;

        // Calculate points
        const minOrderSetting = await prisma.storeSettings.findUnique({ where: { key: 'loyalty.min_order_for_points' } });
        const pointsPerEuroSetting = await prisma.storeSettings.findUnique({ where: { key: 'loyalty.points_per_euro' } });

        const minOrder = minOrderSetting ? parseFloat(minOrderSetting.value) : 10;
        const pointsPerEuro = pointsPerEuroSetting ? parseFloat(pointsPerEuroSetting.value) : 10;

        if (subtotal >= minOrder) {
          pointsEarned = Math.floor(subtotal * pointsPerEuro);

          if (customer.loyaltyReward) {
            await prisma.loyaltyReward.update({
              where: { id: customer.loyaltyReward.id },
              data: {
                points: { increment: pointsEarned },
                lifetimePoints: { increment: pointsEarned },
              },
            });
          } else {
            await prisma.loyaltyReward.create({
              data: {
                userId: customer.id,
                points: pointsEarned,
                lifetimePoints: pointsEarned,
              },
            });
          }
        }
      }
    }

    const orderNumber = await generateOrderNumber(data.orderSource === 'counter' ? 'CO' : 'WO');

    // Create order without name field in items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerId || userId,
        orderSource: data.orderSource,
        counterStaffId: userId,
        tableNumber: data.tableNumber,
        loyaltyPhone: data.loyaltyPhone,
        subtotal,
        deliveryFee: 0,
        totalAmount,
        pointsEarned,
        paymentMethod: data.paymentMethod,
        isPaid: !!data.paymentMethod,
        notes: data.notes,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: userId,
        items: {
          create: data.items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
          })),
        },
        orderType: data.orderSource === 'waiter' ? 'WAITER' : 'COUNTER', // Explicitly set order type
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        counterStaff: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { menuItem: true } },
      },
    });

    res.status(201).json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
};

// ── Get all counter/waiter orders ─────────────────────────────────────────
export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, date, source } = req.query;

    const where: any = { orderSource: { in: ['counter', 'waiter'] } };
    if (source && source !== 'ALL') where.orderSource = source;
    if (status && status !== 'ALL') where.status = status;
    if (date) {
      const start = new Date(date as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date as string);
      end.setHours(23, 59, 59, 999);
      where.placedAt = { gte: start, lte: end };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        counterStaff: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { menuItem: true } },
      },
      orderBy: { placedAt: 'desc' },
    });

    res.json({ success: true, data: { orders } });
  } catch (error) {
    next(error);
  }
};

// ── Get stats ─────────────────────────────────────────────────────────────
export const getCounterStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, todayRevenue, preparingCount, readyCount] = await Promise.all([
      prisma.order.count({
        where: { placedAt: { gte: today }, orderSource: { in: ['counter', 'waiter'] } }
      }),
      prisma.order.aggregate({
        where: { placedAt: { gte: today }, isPaid: true, orderSource: { in: ['counter', 'waiter'] } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { status: { in: ['CONFIRMED', 'PREPARING'] }, orderSource: { in: ['counter', 'waiter'] } }
      }),
      prisma.order.count({
        where: { status: 'OUT_FOR_DELIVERY', orderSource: { in: ['counter', 'waiter'] } }
      }),
    ]);

    res.json({
      success: true,
      data: {
        todayOrders,
        todayRevenue: todayRevenue._sum.totalAmount || 0,
        preparingCount,
        readyCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Update order status ───────────────────────────────────────────────────
export const updateCounterOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
    });
    const { status } = schema.parse(req.body);
    const userId = (req as any).user.id;

    const timestampUpdates: any = { status, updatedAt: new Date() };

    switch (status) {
      case 'CONFIRMED':
        timestampUpdates.confirmedAt = new Date();
        if (userId) timestampUpdates.confirmedBy = userId;
        break;
      case 'PREPARING':
        timestampUpdates.preparingAt = new Date();
        if (userId) timestampUpdates.preparingBy = userId;
        break;
      case 'OUT_FOR_DELIVERY':
        timestampUpdates.readyAt = new Date();
        if (userId) timestampUpdates.readyBy = userId;
        timestampUpdates.outForDeliveryAt = new Date();
        if (userId) timestampUpdates.outForDeliveryBy = userId;
        break;
      case 'DELIVERED':
        timestampUpdates.deliveredAt = new Date();
        if (userId) timestampUpdates.deliveredBy = userId;
        timestampUpdates.completedAt = new Date();
        await awardLoyaltyPoints(id);
        break;
      case 'CANCELLED':
        timestampUpdates.cancelledAt = new Date();
        break;
    }

    const order = await prisma.order.update({
      where: { id },
      data: timestampUpdates,
      include: {
        items: { include: { menuItem: true } },
      },
    });

    res.json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
};

// Helper function to award loyalty points
async function awardLoyaltyPoints(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, totalAmount: true, orderNumber: true },
    });

    if (!order || !order.userId) return;

    // 1 point per €1 spent
    const points = Math.floor(Number(order.totalAmount));

    const loyalty = await prisma.loyaltyReward.upsert({
      where: { userId: order.userId },
      update: {
        points: { increment: points },
        lifetimePoints: { increment: points },
      },
      create: {
        userId: order.userId,
        points,
        lifetimePoints: points,
      },
    });

    await prisma.rewardTransaction.create({
      data: {
        userId: order.userId,
        orderId,
        points,
        type: 'earned',
        reason: `Order #${order.orderNumber}`,
      },
    });

    // Check for tier upgrade
    let newTier = loyalty.tier;
    const totalPoints = loyalty.lifetimePoints + points;

    if (totalPoints >= 500) newTier = 'platinum';
    else if (totalPoints >= 200) newTier = 'gold';
    else if (totalPoints >= 100) newTier = 'silver';

    if (newTier !== loyalty.tier) {
      await prisma.loyaltyReward.update({
        where: { userId: order.userId },
        data: { tier: newTier },
      });
    }
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
  }
}
