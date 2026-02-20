import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// ── Get all tiers ─────────────────────────────────────────────────────────
export const getAllTiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tiers = await prisma.loyaltyTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, data: { tiers } });
  } catch (error) {
    console.error('[DEBUG] getAllTiers Error:', error);
    next(error);
  }
};

// ── Create tier ───────────────────────────────────────────────────────────
export const createTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      minPoints: z.number().min(0),
      maxPoints: z.number().optional().nullable(),
      color: z.string().default('#6b7280'),
      icon: z.string().default('🏆'),
      discount: z.number().min(0).max(100).default(0),
      pointsMultiplier: z.number().min(1).default(1),
      sortOrder: z.number().default(0),
    });

    const data = schema.parse(req.body);

    // Check if tier with same name already exists
    const existing = await prisma.loyaltyTier.findUnique({
      where: { name: data.name }
    });

    if (existing) {
      res.status(409).json({ success: false, message: 'Tier with this name already exists' });
      return;
    }

    const tier = await prisma.loyaltyTier.create({ data });

    res.status(201).json({ success: true, data: { tier } });
  } catch (error) {
    next(error);
  }
};

// ── Update tier ───────────────────────────────────────────────────────────
export const updateTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      name: z.string().min(1).optional(),
      minPoints: z.number().min(0).optional(),
      maxPoints: z.number().optional().nullable(),
      color: z.string().optional(),
      icon: z.string().optional(),
      discount: z.number().min(0).max(100).optional(),
      pointsMultiplier: z.number().min(1).optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    if (data.name) {
      const existing = await prisma.loyaltyTier.findUnique({
        where: { name: data.name }
      });

      if (existing && existing.id !== id) {
        res.status(409).json({ success: false, message: 'Tier with this name already exists' });
        return;
      }
    }

    const tier = await prisma.loyaltyTier.update({ where: { id }, data });

    res.json({ success: true, data: { tier } });
  } catch (error) {
    next(error);
  }
};

// ── Delete tier ───────────────────────────────────────────────────────────
export const deleteTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.loyaltyTier.delete({ where: { id } });
    res.json({ success: true, message: 'Tier deleted' });
  } catch (error) {
    next(error);
  }
};

// ── Initialize default tiers ──────────────────────────────────────────────
export const initializeDefaultTiers = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const defaults = [
      { name: 'Bronze', minPoints: 0, maxPoints: 499, color: '#cd7f32', icon: '🥉', discount: 0, pointsMultiplier: 1.0, sortOrder: 1 },
      { name: 'Silver', minPoints: 500, maxPoints: 1499, color: '#c0c0c0', icon: '🥈', discount: 5, pointsMultiplier: 1.25, sortOrder: 2 },
      { name: 'Gold', minPoints: 1500, maxPoints: 2999, color: '#ffd700', icon: '🥇', discount: 10, pointsMultiplier: 1.5, sortOrder: 3 },
      { name: 'Platinum', minPoints: 3000, maxPoints: null, color: '#e5e4e2', icon: '💎', discount: 15, pointsMultiplier: 2.0, sortOrder: 4 },
    ];

    const created = [];
    for (const tier of defaults) {
      const existing = await prisma.loyaltyTier.findUnique({ where: { name: tier.name } });
      if (!existing) {

        const newTier = await prisma.loyaltyTier.create({ data: tier });
        created.push(newTier);
      } else {

      }
    }



    res.json({ success: true, data: { created: created.length, message: `${created.length} default tiers initialized` } });
  } catch (error) {
    console.error('[DEBUG] initializeDefaultTiers Error:', error);
    next(error);
  }
};
