import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============= DASHBOARD =============
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      totalCustomers,
      pendingOrders,
      popularItems,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { 
          createdAt: { gte: today },
          status: { not: 'CANCELLED' }
        },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.orderItem.groupBy({
        by: ['menuItemId'],
        _count: { menuItemId: true },
        _sum: { quantity: true },
        orderBy: { _count: { menuItemId: 'desc' } },
        take: 5,
      }),
    ]);

    // Get popular items details
    const popularItemsDetails = await Promise.all(
      popularItems.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { id: true, name: true, price: true },
        });
        return {
          ...menuItem,
          ordersCount: item._count.menuItemId,
          totalQuantity: item._sum.quantity,
        };
      })
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          todayOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          todayRevenue: todayRevenue._sum.totalAmount || 0,
          totalCustomers,
          pendingOrders,
        },
        popularItems: popularItemsDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============= CATEGORY MANAGEMENT =============
export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { menuItems: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      nameEn: z.string().optional(),
      description: z.string().optional(),
      slug: z.string().min(2),
      imageUrl: z.string().url().or(z.string().startsWith('/')).optional().or(z.literal('')),
      sortOrder: z.number().default(0),
      isActive: z.boolean().default(true),
    });

    const data = schema.parse(req.body);

    const category = await prisma.category.create({
      data,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const schema = z.object({
      name: z.string().min(2).optional(),
      nameEn: z.string().optional(),
      description: z.string().optional(),
      slug: z.string().min(2).optional(),
      imageUrl: z.string().url().or(z.string().startsWith('/')).optional().or(z.literal('')),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if category has menu items
    const itemCount = await prisma.menuItem.count({
      where: { categoryId: id },
    });

    if (itemCount > 0) {
      throw new AppError(
        'Cannot delete category with existing menu items. Please reassign or delete the items first.',
        400
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============= MENU ITEM MANAGEMENT =============
export const createMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const schema = z.object({
      categoryId: z.string(),
      name: z.string().min(2),
      nameEn: z.string().optional(),
      description: z.string().optional(),
      price: z.number().positive(),
      imageUrl: z.string().url().or(z.string().startsWith('/')).optional().or(z.literal('')),
      isAvailable: z.boolean().default(true),
      isPopular: z.boolean().default(false),
      sortOrder: z.number().default(0),
      prepTime: z.number().min(1).max(120).default(10),
      calories: z.number().min(0).max(5000).default(0),
      station: z.enum(['kitchen', 'barista', 'cold-prep', 'hot-prep']).optional().or(z.literal('')),
    });

    const data = schema.parse(req.body);

    const menuItem = await prisma.menuItem.create({
      data,
      include: {
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: { menuItem },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const schema = z.object({
      categoryId: z.string().optional(),
      name: z.string().min(2).optional(),
      nameEn: z.string().optional(),
      description: z.string().optional(),
      price: z.number().positive().optional(),
      imageUrl: z.string().url().or(z.string().startsWith('/')).optional().or(z.literal('')),
      isAvailable: z.boolean().optional(),
      isPopular: z.boolean().optional(),
      sortOrder: z.number().optional(),
      prepTime: z.number().min(1).max(120).optional(),
      calories: z.number().min(0).max(5000).optional(),
      station: z.enum(['kitchen', 'barista', 'cold-prep', 'hot-prep']).optional().or(z.literal('')),
    });

    const data = schema.parse(req.body);

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: { menuItem },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.menuItem.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============= CUSTOMER MANAGEMENT =============
export const getAllCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customers = await prisma.user.findMany({
      // Remove the role filter to get ALL users
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        routingRole: true, // Add routingRole
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { customers },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        addresses: true,
        orders: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    res.json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleCustomerStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !customer.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    res.json({
      success: true,
      message: `Customer ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { customer: updated },
    });
  } catch (error) {
    next(error);
  }
};

// ============= ORDER MANAGEMENT =============
export const getAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;

    const where = status && status !== 'ALL' ? { status: status as any } : {};

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        confirmedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        deliveredByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        address: true,
        items: {
          include: {
            menuItem: true,
            assignedUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            completedUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        confirmedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        deliveredByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        address: true,
        items: {
          include: {
            menuItem: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const schema = z.object({
      status: z.enum([
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ]),
      additionalTime: z.number().optional(),
    });

    const { status, additionalTime } = schema.parse(req.body);
    const userId = req.user?.id;

    const timestampUpdates: any = {
      status,
      updatedAt: new Date(),
    };

    // Add timestamp and user for each status
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
        // Award loyalty points on delivery
        await awardLoyaltyPoints(id);
        break;
      case 'CANCELLED':
        timestampUpdates.cancelledAt = new Date();
        break;
    }

    // Handle additional time request
    if (additionalTime !== undefined) {
      timestampUpdates.additionalTime = additionalTime;
    }

    const order = await prisma.order.update({
      where: { id },
      data: timestampUpdates,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
        address: true,
      },
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order },
    });
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

    if (!order) return;

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

      const bonusPoints = newTier === 'platinum' ? 50 : newTier === 'gold' ? 25 : 10;
      await prisma.loyaltyReward.update({
        where: { userId: order.userId },
        data: { points: { increment: bonusPoints } },
      });

      await prisma.rewardTransaction.create({
        data: {
          userId: order.userId,
          points: bonusPoints,
          type: 'milestone',
          reason: `${newTier.toUpperCase()} tier achieved!`,
        },
      });
    }
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    // Don't throw - loyalty points shouldn't fail the order update
  }
}

// Update order item status (for station-based completion)
export const updateOrderItemStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const updates: any = {};

    if (status === 'started') {
      updates.startedAt = new Date();
      if (userId) updates.assignedTo = userId;
    } else if (status === 'completed') {
      updates.completedAt = new Date();
      if (userId) updates.completedBy = userId;
    }

    // Step 1: update the item itself (no nested items — avoids stale snapshot)
    const item = await prisma.orderItem.update({
      where: { id },
      data: updates,
      include: { order: true },
    });

    // Step 2: re-fetch ALL sibling items fresh from DB
    const allSiblingItems = await prisma.orderItem.findMany({
      where: { orderId: item.orderId },
    });

    // Step 3: first item started -> move order to PREPARING
    if (status === 'started' && item.order.status === 'CONFIRMED') {
      await prisma.order.update({
        where: { id: item.orderId },
        data: {
          status: 'PREPARING',
          preparingAt: new Date(),
          ...(userId && { preparingBy: userId }),
        },
      });
    }

    // Step 4: item completed -> check if ALL siblings are now done
    if (status === 'completed') {
      const allDone = allSiblingItems.every((i) => i.completedAt !== null);

      if (allDone && (item.order.status === 'PREPARING' || item.order.status === 'CONFIRMED')) {
        await prisma.order.update({
          where: { id: item.orderId },
          data: {
            status: 'OUT_FOR_DELIVERY',
            readyAt: new Date(),
            ...(userId && { readyBy: userId }),
          },
        });
      }
    }

    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const schema = z.object({
      reason: z.string().optional(),
    });

    const { reason } = schema.parse(req.body);

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// ============ USER ROLE MANAGEMENT ============
export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const schema = z.object({
      role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']),
    });

    const { role } = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRoutingRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const schema = z.object({
      routingRole: z.enum(['delivery', 'counter', 'kitchen', 'hot-prep', 'cold-prep', 'barista']).nullable(),
    });

    const { routingRole } = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { routingRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        routingRole: true,
      },
    });

    res.json({
      success: true,
      message: `Station assignment updated`,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};
