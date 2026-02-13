import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

const reviewSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1),
  type: z.enum(['product', 'service', 'suggestion']),
});

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = reviewSchema.parse(req.body);
    const userId = req.user.id;

    // Verify the order exists and belongs to the user
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId: userId,
        status: 'DELIVERED', // Only allow reviews for delivered orders
      },
    });

    if (!order) {
      throw new AppError(
        'Order not found or not eligible for review. Only delivered orders can be reviewed.',
        400
      );
    }

    // Check if this order has already been reviewed by this user
    const existingReview = await prisma.review.findFirst({
      where: {
        orderId: data.orderId,
        userId: userId,
      },
    });

    if (existingReview) {
      throw new AppError('You have already reviewed this order', 400);
    }

    const review = await prisma.review.create({
      data: {
        ...data,
        userId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.id },
      include: {
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const review = await prisma.review.update({
      where: { id },
      data: { status, adminResponse },
    });

    res.json({
      success: true,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};
