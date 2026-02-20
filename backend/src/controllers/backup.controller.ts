import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const createBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.json`;
        const filepath = path.join(BACKUP_DIR, filename);

        const [
            users,
            addresses,
            categories,
            menuItems,
            productImages,
            orders,
            orderItems,
            payments,
            reviews,
            loyaltyRewards,
            rewardTransactions,
            staffProfiles,
            workShifts,
            storeSettings,
            loyaltyTiers,
            tables,
            tableReservations,
            tableSessions,
            waiterShifts
        ] = await Promise.all([
            prisma.user.findMany(),
            prisma.address.findMany(),
            prisma.category.findMany(),
            prisma.menuItem.findMany(),
            prisma.productImage.findMany(),
            prisma.order.findMany(),
            prisma.orderItem.findMany(),
            prisma.payment.findMany(),
            prisma.review.findMany(),
            prisma.loyaltyReward.findMany(),
            prisma.rewardTransaction.findMany(),
            prisma.staffProfile.findMany(),
            prisma.workShift.findMany(),
            prisma.storeSettings.findMany(),
            prisma.loyaltyTier.findMany(),
            prisma.table.findMany(),
            prisma.tableReservation.findMany(),
            prisma.tableSession.findMany(),
            prisma.waiterShift.findMany(),
        ]);

        const backupData = {
            meta: {
                timestamp: new Date().toISOString(),
                version: '1.0',
                tables: 19
            },
            data: {
                users,
                addresses,
                categories,
                menuItems,
                productImages,
                orders,
                orderItems,
                payments,
                reviews,
                loyaltyRewards,
                rewardTransactions,
                staffProfiles,
                workShifts,
                storeSettings,
                loyaltyTiers,
                tables,
                tableReservations,
                tableSessions,
                waiterShifts
            }
        };

        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

        res.json({ success: true, data: { filename, timestamp, size: fs.statSync(filepath).size } });
    } catch (error) {
        next(error);
    }
};

export const listBackups = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
        const backups = files.map(file => {
            const stats = fs.statSync(path.join(BACKUP_DIR, file));
            return {
                filename: file,
                createdAt: stats.birthtime,
                size: stats.size
            };
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        res.json({ success: true, data: { backups } });
    } catch (error) {
        next(error);
    }
};

export const downloadBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filepath)) {
            res.status(404).json({ success: false, message: 'Backup not found' });
            return;
        }

        res.download(filepath);
    } catch (error) {
        next(error);
    }
};

export const restoreBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filepath)) {
            res.status(404).json({ success: false, message: 'Backup not found' });
            return;
        }

        const fileContent = fs.readFileSync(filepath, 'utf-8');
        const backup = JSON.parse(fileContent);
        const { data } = backup;

        await prisma.$transaction(async (tx) => {
            // 1. Delete all data (Order matters for foreign keys!)
            await tx.review.deleteMany();
            await tx.rewardTransaction.deleteMany();
            await tx.loyaltyReward.deleteMany();
            await tx.payment.deleteMany();
            await tx.orderItem.deleteMany();
            await tx.order.deleteMany(); // Deletes associated items via Cascade if configured, but explicit is safer
            await tx.tableSession.deleteMany();
            await tx.tableReservation.deleteMany();
            await tx.table.deleteMany();
            await tx.productImage.deleteMany();
            await tx.waiterShift.deleteMany();
            await tx.workShift.deleteMany();
            await tx.staffProfile.deleteMany(); // Depends on User
            await tx.address.deleteMany(); // Depends on User
            await tx.menuItem.deleteMany(); // Depends on Category
            await tx.category.deleteMany();
            await tx.storeSettings.deleteMany();
            await tx.loyaltyTier.deleteMany();
            await tx.user.deleteMany();

            // 2. Restore data (Order matters!)
            // Users first
            if (data.users?.length) await tx.user.createMany({ data: data.users });

            // Independent tables
            if (data.storeSettings?.length) await tx.storeSettings.createMany({ data: data.storeSettings });
            if (data.loyaltyTiers?.length) await tx.loyaltyTier.createMany({ data: data.loyaltyTiers });
            if (data.categories?.length) await tx.category.createMany({ data: data.categories });
            if (data.tables?.length) await tx.table.createMany({ data: data.tables });

            // Dependent tables
            if (data.menuItems?.length) await tx.menuItem.createMany({ data: data.menuItems });
            if (data.productImages?.length) await tx.productImage.createMany({ data: data.productImages });
            if (data.addresses?.length) await tx.address.createMany({ data: data.addresses });
            if (data.staffProfiles?.length) await tx.staffProfile.createMany({ data: data.staffProfiles });
            if (data.workShifts?.length) await tx.workShift.createMany({ data: data.workShifts });
            if (data.waiterShifts?.length) await tx.waiterShift.createMany({ data: data.waiterShifts });
            if (data.tableReservations?.length) await tx.tableReservation.createMany({ data: data.tableReservations });
            if (data.tableSessions?.length) await tx.tableSession.createMany({ data: data.tableSessions });

            // Orders & dependent
            if (data.orders?.length) await tx.order.createMany({ data: data.orders });
            if (data.orderItems?.length) await tx.orderItem.createMany({ data: data.orderItems });
            if (data.payments?.length) await tx.payment.createMany({ data: data.payments });
            if (data.reviews?.length) await tx.review.createMany({ data: data.reviews });

            // Loyalty
            if (data.loyaltyRewards?.length) await tx.loyaltyReward.createMany({ data: data.loyaltyRewards });
            if (data.rewardTransactions?.length) await tx.rewardTransaction.createMany({ data: data.rewardTransactions });
        });

        res.json({ success: true, message: 'Database restored successfully' });
    } catch (error) {
        console.error('Restore failed:', error);
        res.status(500).json({ success: false, message: 'Restore failed: ' + (error as Error).message });
    }
};
