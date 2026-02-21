import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMyLoyalty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loyalty = await prisma.loyaltyReward.findUnique({
      where: { userId: req.user.id },
    });

    let discountPercent = 0;
    if (loyalty) {
      const tier = await prisma.loyaltyTier.findUnique({
        where: { name: loyalty.tier }
      });
      if (tier && tier.isActive) {
        discountPercent = tier.discount;
      }
    }

    const transactions = await prisma.rewardTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: {
        loyalty: loyalty ? { ...loyalty, discountPercent } : { points: 0, tier: 'bronze', lifetimePoints: 0, discountPercent: 0 },
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

import { encrypt } from '../utils/crypto.util';

export const getLoyaltyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    // Token format: userId|timestamp
    const payload = `${userId}|${Date.now()}`;
    const token = encrypt(payload);

    res.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};
