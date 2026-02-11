import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const STOCK_DIR = path.join(process.cwd(), 'public', 'stock-images');

export const getStockImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(STOCK_DIR)) {
      fs.mkdirSync(STOCK_DIR, { recursive: true });
    }

    const files = fs.readdirSync(STOCK_DIR);
    const images = files
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map(f => ({
        name: f,
        url: `/stock-images/${f}`,
      }));

    res.json({ success: true, data: { images } });
  } catch (error) {
    next(error);
  }
};
