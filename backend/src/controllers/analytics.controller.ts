import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export const getAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { period = 'week' } = req.query; // day, week, month, year

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    // Get orders in period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate revenue over time
    const revenueByDate: { [key: string]: number } = {};
    const ordersByHour: { [key: number]: number } = {};
    
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      const hour = order.createdAt.getHours();
      
      revenueByDate[date] = (revenueByDate[date] || 0) + Number(order.totalAmount);
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
    });

    // Top customers
    const customerOrders: { [key: string]: { count: number; total: number; name: string } } = {};
    
    orders.forEach((order) => {
      const key = order.userId;
      if (!customerOrders[key]) {
        customerOrders[key] = {
          count: 0,
          total: 0,
          name: `${order.user.firstName} ${order.user.lastName}`,
        };
      }
      customerOrders[key].count += 1;
      customerOrders[key].total += Number(order.totalAmount);
    });

    const topCustomers = Object.entries(customerOrders)
      .map(([id, data]) => ({
        userId: id,
        name: data.name,
        orderCount: data.count,
        totalSpent: data.total,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Top products
    const productSales: { [key: string]: { count: number; revenue: number; name: string } } = {};
    
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.menuItemId;
        if (!productSales[key]) {
          productSales[key] = {
            count: 0,
            revenue: 0,
            name: item.menuItem.name,
          };
        }
        productSales[key].count += item.quantity;
        productSales[key].revenue += Number(item.subtotal);
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({
        productId: id,
        name: data.name,
        quantitySold: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Summary stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalOrders,
          totalRevenue,
          averageOrderValue,
        },
        revenueByDate: Object.entries(revenueByDate).map(([date, revenue]) => ({
          date,
          revenue,
        })),
        ordersByHour: Object.entries(ordersByHour).map(([hour, count]) => ({
          hour: parseInt(hour),
          count,
        })),
        topCustomers,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};
