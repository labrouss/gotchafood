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
