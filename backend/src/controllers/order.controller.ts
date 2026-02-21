import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';
import { io } from '../server';

const prisma = new PrismaClient();

// Create order from cart
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const schema = z.object({
      addressId: z.string(),
      items: z
        .array(
          z.object({
            menuItemId: z.string(),
            quantity: z.number().int().positive(),
            notes: z.string().optional(),
          })
        )
        .min(1, 'Cart cannot be empty'),
      notes: z.string().optional(),
      paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE']),
    });

    const data = schema.parse(req.body);

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: data.addressId,
        userId: req.user.id,
      },
    });

    if (!address) {
      throw new AppError('Invalid address', 400);
    }

    // Fetch all menu items to validate and calculate prices
    const menuItemIds = data.items.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        isAvailable: true,
      },
    });

    // Validate all items are available
    if (menuItems.length !== menuItemIds.length) {
      throw new AppError('Some items are unavailable', 400);
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = data.items.map((item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
      if (!menuItem) {
        throw new AppError(`Menu item ${item.menuItemId} not found`, 400);
      }

      const price = Number(menuItem.price);
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price,
        subtotal: itemSubtotal,
        notes: item.notes,
        station: menuItem.station, // Copy station from menu item
      };
    });

    // Calculate loyalty discount
    const loyalty = await prisma.loyaltyReward.findUnique({
      where: { userId: req.user.id },
    });

    let discountPercent = 0;
    let appliedTier = null;

    if (loyalty) {
      const tier = await prisma.loyaltyTier.findFirst({
        where: { name: loyalty.tier, isActive: true },
      });
      if (tier) {
        discountPercent = tier.discount;
        appliedTier = tier.name;
      }
    }

    const discountAmount = (subtotal * discountPercent) / 100;

    // Calculate delivery fee (free delivery over €15)
    const deliveryFee = subtotal >= 15 ? 0 : 2.5;
    const totalAmount = subtotal + deliveryFee - discountAmount;

    // Generate unique order number
    const orderNumber = `ONL-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: req.user!.id,
          addressId: data.addressId,
          orderNumber,
          status: 'PENDING',
          subtotal,
          deliveryFee,
          discountAmount,
          appliedTier,
          totalAmount,
          notes: data.notes,
          items: {
            create: orderItems,
          },
          payment: {
            create: {
              amount: totalAmount,
              method: data.paymentMethod,
              status: 'PENDING',
            },
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
          address: true,
          payment: true,
        },
      });

      return newOrder;
    });

    // Emit real-time notification
    io.emit('new-order', order);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// Get user's orders
export const getUserOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        address: true,
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

// Get order by ID
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        address: true,
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

// Cancel order (customer side)
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const schema = z.object({
      reason: z.string().optional(),
    });

    const { reason } = schema.parse(req.body);

    // Find order
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Can only cancel PENDING or CONFIRMED orders
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new AppError(
        'Order cannot be cancelled. It is already being prepared or delivered.',
        400
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: {
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
      message: 'Order cancelled successfully',
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
};
