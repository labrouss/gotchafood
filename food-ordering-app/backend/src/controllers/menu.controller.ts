import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export const getAllMenuItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { categoryId, search, isPopular, isAvailable } = req.query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { nameEn: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    if (isPopular === 'true') {
      where.isPopular = true;
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: { menuItems },
      count: menuItems.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            slug: true,
          },
        },
      },
    });

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    res.json({
      success: true,
      data: { menuItem },
    });
  } catch (error) {
    next(error);
  }
};

export const getPopularItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const menuItems = await prisma.menuItem.findMany({
      where: {
        isPopular: true,
        isAvailable: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            slug: true,
          },
        },
      },
      take: limit,
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: { menuItems },
      count: menuItems.length,
    });
  } catch (error) {
    next(error);
  }
};
