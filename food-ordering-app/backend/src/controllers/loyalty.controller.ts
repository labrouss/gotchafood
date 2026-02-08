import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMyLoyalty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loyalty = await prisma.loyaltyReward.findUnique({
      where: { userId: req.user.id },
    });

    const transactions = await prisma.rewardTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: {
        loyalty: loyalty || { points: 0, tier: 'bronze', lifetimePoints: 0 },
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};
