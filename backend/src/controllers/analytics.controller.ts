import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const diffMin = (a: Date | null, b: Date | null): number | null => {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
};

export const getInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string, 10);

    const since = new Date();
    since.setDate(since.getDate() - daysNum);
    since.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { placedAt: { gte: since } },
      include: {
        confirmedByUser:  { select: { id: true, firstName: true, lastName: true } },
        deliveredByUser:  { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            completedUser: { select: { id: true, firstName: true, lastName: true } },
            assignedUser:  { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { placedAt: 'asc' },
    });

    const delivered = orders.filter((o: any) => o.status === 'DELIVERED');

    // 1. TIMING
    const confirmTimes: number[]  = [];
    const prepTimes: number[]     = [];
    const deliveryTimes: number[] = [];
    const totalTimes: number[]    = [];

    for (const o of delivered) {
      const tC = diffMin(o.placedAt, o.confirmedAt);
      const tP = diffMin(o.confirmedAt, o.readyAt);
      const tD = diffMin(o.readyAt, o.deliveredAt);
      const tT = diffMin(o.placedAt, o.deliveredAt);
      if (tC !== null) confirmTimes.push(tC);
      if (tP !== null) prepTimes.push(tP);
      if (tD !== null) deliveryTimes.push(tD);
      if (tT !== null) totalTimes.push(tT);
    }

    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
    const pct = (arr: number[], threshold: number) =>
      arr.length ? Math.round((arr.filter(v => v <= threshold).length / arr.length) * 100) : null;

    const timing = {
      avgConfirmMin:  avg(confirmTimes),
      avgPrepMin:     avg(prepTimes),
      avgDeliveryMin: avg(deliveryTimes),
      avgTotalMin:    avg(totalTimes),
      onTimeRate:     pct(totalTimes, 40),
      fastOrderRate:  pct(totalTimes, 25),
      confirmSamples:  confirmTimes.length,
      prepSamples:     prepTimes.length,
      deliverySamples: deliveryTimes.length,
    };

    // 2. STAFF PERFORMANCE
    const staffMap: Record<string, any> = {};
    const ensureStaff = (u: { id: string; firstName: string; lastName: string }) => {
      if (!staffMap[u.id]) staffMap[u.id] = {
        id: u.id, name: `${u.firstName} ${u.lastName}`,
        confirmTimes: [], deliveryTimes: [], itemPrepTimes: [],
        confirmCount: 0, deliveryCount: 0, itemCount: 0,
      };
      return staffMap[u.id];
    };

    for (const o of delivered) {
      if (o.confirmedByUser) {
        const s = ensureStaff(o.confirmedByUser);
        s.confirmCount++;
        const t = diffMin(o.placedAt, o.confirmedAt);
        if (t !== null) s.confirmTimes.push(t);
      }
      if (o.deliveredByUser) {
        const s = ensureStaff(o.deliveredByUser);
        s.deliveryCount++;
        const t = diffMin(o.readyAt, o.deliveredAt);
        if (t !== null) s.deliveryTimes.push(t);
      }
      for (const item of o.items) {
        if (item.completedUser && item.startedAt && item.completedAt) {
          const s = ensureStaff(item.completedUser);
          s.itemCount++;
          const t = diffMin(item.startedAt, item.completedAt);
          if (t !== null) s.itemPrepTimes.push(t);
        }
      }
    }

    const staff = Object.values(staffMap).map((s: any) => ({
      id: s.id, name: s.name,
      confirmCount: s.confirmCount, deliveryCount: s.deliveryCount, itemCount: s.itemCount,
      avgConfirmTime:  avg(s.confirmTimes),
      avgDeliveryTime: avg(s.deliveryTimes),
      avgItemPrepTime: avg(s.itemPrepTimes),
      totalActions: s.confirmCount + s.deliveryCount + s.itemCount,
    })).sort((a: any, b: any) => b.totalActions - a.totalActions);

    // 3. BOTTLENECKS
    const slowConfirm  = delivered.filter(o => { const t = diffMin(o.placedAt, o.confirmedAt); return t !== null && t > 5; });
    const slowPrep     = delivered.filter(o => { const t = diffMin(o.confirmedAt, o.readyAt);  return t !== null && t > 25; });
    const slowDelivery = delivered.filter(o => { const t = diffMin(o.readyAt, o.deliveredAt);  return t !== null && t > 20; });

    const cAvg = avg(confirmTimes)  ?? 0;
    const pAvg = avg(prepTimes)     ?? 0;
    const dAvg = avg(deliveryTimes) ?? 0;
    const maxAvg = Math.max(cAvg, pAvg, dAvg);

    const bottlenecks = {
      slowConfirmRate:  delivered.length ? Math.round((slowConfirm.length  / delivered.length) * 100) : 0,
      slowPrepRate:     delivered.length ? Math.round((slowPrep.length     / delivered.length) * 100) : 0,
      slowDeliveryRate: delivered.length ? Math.round((slowDelivery.length / delivered.length) * 100) : 0,
      worstStage: maxAvg === 0 ? null : maxAvg === pAvg ? 'preparation' : maxAvg === dAvg ? 'delivery' : 'confirmation',
      slowConfirmCount:  slowConfirm.length,
      slowPrepCount:     slowPrep.length,
      slowDeliveryCount: slowDelivery.length,
    };

    // 4. HOURLY HEATMAP
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h, label: `${String(h).padStart(2,'0')}:00`, orders: 0, avgMin: null as number | null,
    }));
    for (const o of orders) hourly[new Date(o.placedAt).getHours()].orders++;
    for (let h = 0; h < 24; h++) {
      const times = delivered
        .filter((o: any) => new Date(o.placedAt).getHours() === h)
        .map((o: any) => diffMin(o.placedAt, o.deliveredAt))
        .filter((t: number | null): t is number => t !== null);
      hourly[h].avgMin = avg(times);
    }

    // 5. DAILY TREND
    const daily: Record<string, any> = {};
    for (let i = daysNum - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      daily[key] = { date: key, orders: 0, delivered: 0, revenue: 0, avgMin: null };
    }
    for (const o of orders) {
      const key = new Date(o.placedAt).toISOString().split('T')[0];
      if (daily[key]) {
        daily[key].orders++;
        if (o.status === 'DELIVERED') {
          daily[key].delivered++;
          daily[key].revenue += parseFloat((o.totalAmount as any).toString());
        }
      }
    }
    for (const key of Object.keys(daily)) {
      const dayStart = new Date(key); dayStart.setHours(0,0,0,0);
      const dayEnd   = new Date(key); dayEnd.setHours(23,59,59,999);
      const times = delivered
        .filter((o: any) => { const d = new Date(o.placedAt); return d >= dayStart && d <= dayEnd; })
        .map((o: any) => diffMin(o.placedAt, o.deliveredAt))
        .filter((t: number | null): t is number => t !== null);
      daily[key].avgMin  = avg(times);
      daily[key].revenue = Math.round(daily[key].revenue * 100) / 100;
    }

    // 6. SUMMARY
    const summary = {
      totalOrders:    orders.length,
      deliveredCount: delivered.length,
      cancelledCount: orders.filter((o: any) => o.status === 'CANCELLED').length,
      totalRevenue:   Math.round(delivered.reduce((s: number, o: any) => s + parseFloat(o.totalAmount.toString()), 0) * 100) / 100,
      periodDays:     daysNum,
    };

    res.json({
      success: true,
      data: { summary, timing, bottlenecks, staff, hourly: hourly.filter(h => h.orders > 0 || (h.hour >= 8 && h.hour <= 23)), daily: Object.values(daily) },
    });
  } catch (error) {
    next(error);
  }
};
