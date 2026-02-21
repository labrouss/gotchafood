import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// ── Get all settings ──────────────────────────────────────────────────────
export const getAllSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.storeSettings.findMany({
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });



    // Group by category
    const grouped = settings.reduce((acc: any, setting) => {
      if (!acc[setting.category]) acc[setting.category] = [];
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.json({ success: true, data: { settings, grouped } });
  } catch (error) {
    console.error('[DEBUG] getAllSettings Error:', error);
    next(error);
  }
};

// ── Get setting by key ────────────────────────────────────────────────────
export const getSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const setting = await prisma.storeSettings.findUnique({ where: { key } });

    if (!setting) throw new AppError('Setting not found', 404);

    // Parse value based on dataType
    let parsedValue: any = setting.value;
    if (setting.dataType === 'number') parsedValue = parseFloat(setting.value);
    else if (setting.dataType === 'boolean') parsedValue = setting.value === 'true';
    else if (setting.dataType === 'json') parsedValue = JSON.parse(setting.value);

    res.json({ success: true, data: { ...setting, parsedValue } });
  } catch (error) {
    next(error);
  }
};

// ── Update setting ────────────────────────────────────────────────────────
export const updateSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const schema = z.object({ value: z.any() });
    const { value } = schema.parse(req.body);

    const existing = await prisma.storeSettings.findUnique({ where: { key } });
    if (!existing) throw new AppError('Setting not found', 404);

    // Convert value to string based on dataType
    let stringValue: string;
    if (existing.dataType === 'json') stringValue = JSON.stringify(value);
    else stringValue = String(value);

    const updated = await prisma.storeSettings.update({
      where: { key },
      data: { value: stringValue },
    });

    res.json({ success: true, data: { setting: updated } });
  } catch (error) {
    next(error);
  }
};

// ── Bulk update settings ──────────────────────────────────────────────────
export const bulkUpdateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      settings: z.array(z.object({
        key: z.string(),
        value: z.any(),
      })),
    });
    const { settings } = schema.parse(req.body);

    const updates = await Promise.all(
      settings.map(async ({ key, value }) => {
        const existing = await prisma.storeSettings.findUnique({ where: { key } });
        if (!existing) return null;

        let stringValue: string;
        if (existing.dataType === 'json') stringValue = JSON.stringify(value);
        else stringValue = String(value);

        return prisma.storeSettings.update({
          where: { key },
          data: { value: stringValue },
        });
      })
    );

    res.json({ success: true, data: { updated: updates.filter(Boolean).length } });
  } catch (error) {
    next(error);
  }
};

// ── Initialize default settings (run once or on-demand) ───────────────────
export const initializeDefaults = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const defaults = [
      // Loyalty settings
      { key: 'loyalty.min_order_for_points', value: '10', category: 'loyalty', label: 'Minimum Order for Points (€)', dataType: 'number' },
      { key: 'loyalty.points_per_euro', value: '10', category: 'loyalty', label: 'Points per Euro Spent', dataType: 'number' },
      { key: 'loyalty.enabled', value: 'true', category: 'loyalty', label: 'Loyalty Program Enabled', dataType: 'boolean' },

      // Theme settings
      { key: 'theme.primary_color', value: '#dc2626', category: 'theme', label: 'Primary Color', dataType: 'string' },
      { key: 'theme.logo_url', value: '', category: 'theme', label: 'Logo URL', dataType: 'string' },
      { key: 'theme.store_name', value: 'Greek Food Ordering', category: 'theme', label: 'Store Name', dataType: 'string' },

      // General settings
      { key: 'general.currency', value: '€', category: 'general', label: 'Currency Symbol', dataType: 'string' },
      { key: 'general.tax_rate', value: '24', category: 'general', label: 'Tax Rate (%)', dataType: 'number' },
      { key: 'general.counter_orders_enabled', value: 'true', category: 'general', label: 'Counter Orders Enabled', dataType: 'boolean' },

      // Printing settings
      { key: 'printing.counter_receipt_auto', value: 'false', category: 'printing', label: 'Counter POS Auto-print Receipt', dataType: 'boolean' },
      { key: 'printing.kitchen_ticket_auto', value: 'false', category: 'printing', label: 'Kitchen Auto-print Ticket', dataType: 'boolean' },
      { key: 'printing.bar_ticket_auto', value: 'false', category: 'printing', label: 'Bar Auto-print Ticket', dataType: 'boolean' },
    ];

    const created = [];
    for (const setting of defaults) {
      const existing = await prisma.storeSettings.findUnique({ where: { key: setting.key } });
      if (!existing) {

        const newSetting = await prisma.storeSettings.create({ data: setting });
        created.push(newSetting);
      } else {

      }
    }



    res.json({ success: true, data: { created: created.length, message: `${created.length} default settings initialized` } });
  } catch (error) {
    console.error('[DEBUG] initializeDefaults Error:', error);
    next(error);
  }
};
