import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStaffPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to today if no dates provided
    const start = startDate 
      ? new Date(startDate as string) 
      : new Date(new Date().setHours(0, 0, 0, 0));
    
    const end = endDate 
      ? new Date(endDate as string) 
      : new Date(new Date().setHours(23, 59, 59, 999));

    // Get all staff and admins
    const staffUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['STAFF', 'ADMIN'],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        routingRole: true,
      },
    });

    // Get statistics for each staff member
    const performanceData = await Promise.all(
      staffUsers.map(async (user) => {
        // Count orders confirmed
        const ordersConfirmed = await prisma.order.count({
          where: {
            confirmedBy: user.id,
            confirmedAt: {
              gte: start,
              lte: end,
            },
          },
        });

        // Count orders delivered
        const ordersDelivered = await prisma.order.count({
          where: {
            deliveredBy: user.id,
            deliveredAt: {
              gte: start,
              lte: end,
            },
          },
        });

        // Count items prepared (completed)
        const itemsPrepared = await prisma.orderItem.count({
          where: {
            completedBy: user.id,
            completedAt: {
              gte: start,
              lte: end,
            },
          },
        });

        // Get total revenue from delivered orders
        const deliveredOrders = await prisma.order.findMany({
          where: {
            deliveredBy: user.id,
            deliveredAt: {
              gte: start,
              lte: end,
            },
            status: 'DELIVERED',
          },
          select: {
            totalAmount: true,
          },
        });

        const totalRevenue = deliveredOrders.reduce(
          (sum, order) => sum + parseFloat(order.totalAmount.toString()),
          0
        );

        // Get average delivery time
        const deliveryStats = await prisma.order.findMany({
          where: {
            deliveredBy: user.id,
            deliveredAt: {
              gte: start,
              lte: end,
            },
            readyAt: { not: null },
            status: 'DELIVERED',
          },
          select: {
            readyAt: true,
            deliveredAt: true,
          },
        });

        let avgDeliveryTime = 0;
        if (deliveryStats.length > 0) {
          const totalDeliveryMinutes = deliveryStats.reduce((sum, order) => {
            if (order.readyAt && order.deliveredAt) {
              const minutes = Math.floor(
                (new Date(order.deliveredAt).getTime() - new Date(order.readyAt).getTime()) / 60000
              );
              return sum + minutes;
            }
            return sum;
          }, 0);
          avgDeliveryTime = Math.round(totalDeliveryMinutes / deliveryStats.length);
        }

        // Get average prep time for items
        const prepStats = await prisma.orderItem.findMany({
          where: {
            completedBy: user.id,
            completedAt: {
              gte: start,
              lte: end,
            },
            startedAt: { not: null },
          },
          select: {
            startedAt: true,
            completedAt: true,
          },
        });

        let avgPrepTime = 0;
        if (prepStats.length > 0) {
          const totalPrepMinutes = prepStats.reduce((sum, item) => {
            if (item.startedAt && item.completedAt) {
              const minutes = Math.floor(
                (new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()) / 60000
              );
              return sum + minutes;
            }
            return sum;
          }, 0);
          avgPrepTime = Math.round(totalPrepMinutes / prepStats.length);
        }

        return {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            routingRole: user.routingRole,
          },
          stats: {
            ordersConfirmed,
            ordersDelivered,
            itemsPrepared,
            totalRevenue,
            avgDeliveryTime,
            avgPrepTime,
            totalActions: ordersConfirmed + ordersDelivered + itemsPrepared,
          },
        };
      })
    );

    // Sort by total actions descending
    performanceData.sort((a, b) => b.stats.totalActions - a.stats.totalActions);

    res.json({
      success: true,
      data: {
        startDate: start,
        endDate: end,
        performance: performanceData,
      },
    });
  } catch (error) {
    next(error);
  }
};
