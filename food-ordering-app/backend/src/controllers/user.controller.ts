import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all user addresses
export const getUserAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: { addresses },
    });
  } catch (error) {
    next(error);
  }
};

// Create new address
export const createAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const schema = z.object({
      label: z.string().optional(),
      street: z.string().min(2, 'Street is required'),
      number: z.string().min(1, 'Number is required'),
      city: z.string().min(2, 'City is required'),
      postalCode: z.string().min(5, 'Postal code is required'),
      floor: z.string().optional(),
      notes: z.string().optional(),
      isDefault: z.boolean().default(false),
    });

    const data = schema.parse(req.body);

    // If setting as default, remove default from other addresses
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: req.user.id,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        ...data,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};

// Update address
export const updateAddress = async (
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
      label: z.string().optional(),
      street: z.string().min(2).optional(),
      number: z.string().min(1).optional(),
      city: z.string().min(2).optional(),
      postalCode: z.string().min(5).optional(),
      floor: z.string().optional(),
      notes: z.string().optional(),
      isDefault: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      throw new AppError('Address not found', 404);
    }

    // If setting as default, remove default from other addresses
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: req.user.id,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};

// Delete address
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      throw new AppError('Address not found', 404);
    }

    await prisma.address.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Set default address
export const setDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      throw new AppError('Address not found', 404);
    }

    // Remove default from all addresses
    await prisma.address.updateMany({
      where: {
        userId: req.user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Set this as default
    const address = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    res.json({
      success: true,
      message: 'Default address updated',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};
