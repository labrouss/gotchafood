import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

const reviewSchema = z.object({
  orderId: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1),
  type: z.enum(['product', 'service', 'suggestion']),
});

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = reviewSchema.parse(req.body);
    const userId = req.user.id;

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
