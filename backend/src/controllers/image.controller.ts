import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// ── upload directory ──────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── multer: store in memory, validate mime ────────────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
  },
});

// ── helper: process with sharp and save ──────────────────────────────────
interface ProcessOpts {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality?: number;
  // Crop region in original-image pixels
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
}

async function processAndSave(buffer: Buffer, filename: string, opts: ProcessOpts = {}): Promise<string> {
  const {
    width = 800, height = 800,
    fit = 'cover', quality = 85,
    cropX, cropY, cropW, cropH,
  } = opts;

  const outputPath = path.join(UPLOAD_DIR, filename);
  let pipeline = sharp(buffer);

  // Apply crop first if specified
  if (cropX !== undefined && cropY !== undefined && cropW !== undefined && cropH !== undefined) {
    pipeline = pipeline.extract({ left: Math.round(cropX), top: Math.round(cropY), width: Math.round(cropW), height: Math.round(cropH) });
  }

  await pipeline
    .resize(width, height, { fit, withoutEnlargement: true })
    .webp({ quality })
    .toFile(outputPath);

  return `/uploads/${filename}`;
}

// ── UPLOAD single image (product or category) ─────────────────────────────
export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const ext  = 'webp';
    const name = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // Parse crop params from body if present
    const cropX = req.body.cropX !== undefined ? parseFloat(req.body.cropX) : undefined;
    const cropY = req.body.cropY !== undefined ? parseFloat(req.body.cropY) : undefined;
    const cropW = req.body.cropW !== undefined ? parseFloat(req.body.cropW) : undefined;
    const cropH = req.body.cropH !== undefined ? parseFloat(req.body.cropH) : undefined;
    const width  = req.body.width  ? parseInt(req.body.width)  : 800;
    const height = req.body.height ? parseInt(req.body.height) : 800;

    const url = await processAndSave(req.file.buffer, name, {
      width, height, fit: 'cover', quality: 85,
      cropX, cropY, cropW, cropH,
    });

    res.json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
};

// ── ADD product image to gallery ──────────────────────────────────────────
export const addProductImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;   // menuItem id
    if (!req.file) throw new AppError('No file uploaded', 400);

    const name = `product_${id}_${Date.now()}.webp`;
    const cropX = req.body.cropX !== undefined ? parseFloat(req.body.cropX) : undefined;
    const cropY = req.body.cropY !== undefined ? parseFloat(req.body.cropY) : undefined;
    const cropW = req.body.cropW !== undefined ? parseFloat(req.body.cropW) : undefined;
    const cropH = req.body.cropH !== undefined ? parseFloat(req.body.cropH) : undefined;

    const url = await processAndSave(req.file.buffer, name, {
      width: 800, height: 800, cropX, cropY, cropW, cropH,
    });

    // Count existing images to determine sort order & primary
    const existing = await prisma.productImage.count({ where: { menuItemId: id } });

    const image = await prisma.productImage.create({
      data: { menuItemId: id, url, sortOrder: existing, isPrimary: existing === 0 },
    });

    // If first image, also update the legacy imageUrl field
    if (existing === 0) {
      await prisma.menuItem.update({ where: { id }, data: { imageUrl: url } });
    }

    res.json({ success: true, data: { image } });
  } catch (error) {
    next(error);
  }
};

// ── GET product images ────────────────────────────────────────────────────
export const getProductImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const images = await prisma.productImage.findMany({
      where: { menuItemId: id },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: { images } });
  } catch (error) {
    next(error);
  }
};

// ── DELETE product image ──────────────────────────────────────────────────
export const deleteProductImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.params;


    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new AppError('Image not found', 404);


    // Delete physical file
    const filePath = path.join(process.cwd(), 'public', image.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

    }

    await prisma.productImage.delete({ where: { id: imageId } });


    // Always sync menuItem.imageUrl with current primary or null
    const remaining = await prisma.productImage.findMany({
      where: { menuItemId: image.menuItemId },
      orderBy: { sortOrder: 'asc' },
    });


    if (remaining.length > 0) {
      // Set first remaining as primary if deleted was primary
      if (image.isPrimary) {
        await prisma.productImage.update({
          where: { id: remaining[0].id },
          data: { isPrimary: true },
        });

      }
      // Sync menuItem to current primary
      const primary = remaining.find(img => img.isPrimary) || remaining[0];
      await prisma.menuItem.update({
        where: { id: image.menuItemId },
        data: { imageUrl: primary.url },
      });

    } else {
      // No images left — clear menuItem.imageUrl
      await prisma.menuItem.update({
        where: { id: image.menuItemId },
        data: { imageUrl: null },
      });

    }

    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    next(error);
  }
};

// ── REORDER product images ────────────────────────────────────────────────
export const reorderProductImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { orderedIds } = req.body as { orderedIds: string[] };

    await Promise.all(
      orderedIds.map((imgId, idx) =>
        prisma.productImage.update({
          where: { id: imgId },
          data: { sortOrder: idx, isPrimary: idx === 0 },
        })
      )
    );

    // Sync legacy imageUrl to primary
    if (orderedIds.length > 0) {
      const primary = await prisma.productImage.findUnique({ where: { id: orderedIds[0] } });
      if (primary) await prisma.menuItem.update({ where: { id }, data: { imageUrl: primary.url } });
    }

    const images = await prisma.productImage.findMany({
      where: { menuItemId: id },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, data: { images } });
  } catch (error) {
    next(error);
  }
};

// ── SET PRIMARY image ─────────────────────────────────────────────────────
export const setPrimaryImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, imageId } = req.params;

    await prisma.productImage.updateMany({ where: { menuItemId: id }, data: { isPrimary: false } });
    const updated = await prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } });
    await prisma.menuItem.update({ where: { id }, data: { imageUrl: updated.url } });

    res.json({ success: true, message: 'Primary image updated' });
  } catch (error) {
    next(error);
  }
};
