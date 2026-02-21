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
        confirmedByUser: { select: { id: true, firstName: true, lastName: true } },
        deliveredByUser: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            completedUser: { select: { id: true, firstName: true, lastName: true } },
            assignedUser: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { placedAt: 'asc' },
    });

    // Revenue calculation helper for finalized orders
    const getOrderRevenue = (orderList: any[]) =>
      orderList.reduce((sum, o) => sum + parseFloat(o.totalAmount.toString()), 0);

    const finalizedStatuses = ['READY', 'SERVED', 'DELIVERED', 'COMPLETED'];
    const delivered = orders.filter((o: any) => o.status === 'DELIVERED');
    const finalizedOrders = orders.filter((o: any) => finalizedStatuses.includes(o.status));

    // Revenue Breakdowns
    const waiterOrders = finalizedOrders.filter((o: any) => o.orderType === 'WAITER' || o.orderNumber?.startsWith('WTR-'));
    const counterOrders = finalizedOrders.filter((o: any) => o.orderType === 'COUNTER' || o.orderNumber?.startsWith('CNT-'));
    const onlineOrders = finalizedOrders.filter((o: any) => (o.orderType === 'DELIVERY' || o.orderType === 'DINE_IN') && !o.orderNumber?.startsWith('WTR-') && !o.orderNumber?.startsWith('CNT-'));

    const waiterRevenue = getOrderRevenue(waiterOrders);
    const counterRevenue = getOrderRevenue(counterOrders);
    const onlineRevenue = getOrderRevenue(onlineOrders);

    const waiterOrderCount = waiterOrders.length;
    const counterOrderCount = counterOrders.length;
    const onlineOrderCount = onlineOrders.length;

    // 1. TIMING (Based on delivered orders only for delivery metrics)
    const confirmTimes: number[] = [];
    const prepTimes: number[] = [];
    const deliveryTimes: number[] = [];
    const totalTimes: number[] = [];

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
      avgConfirmMin: avg(confirmTimes),
      avgPrepMin: avg(prepTimes),
      avgDeliveryMin: avg(deliveryTimes),
      avgTotalMin: avg(totalTimes),
      onTimeRate: pct(totalTimes, 40),
      fastOrderRate: pct(totalTimes, 25),
      confirmSamples: confirmTimes.length,
      prepSamples: prepTimes.length,
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
      avgConfirmTime: avg(s.confirmTimes),
      avgDeliveryTime: avg(s.deliveryTimes),
      avgItemPrepTime: avg(s.itemPrepTimes),
      totalActions: s.confirmCount + s.deliveryCount + s.itemCount,
    })).sort((a: any, b: any) => b.totalActions - a.totalActions);

    // 3. BOTTLENECKS
    const slowConfirm = delivered.filter(o => { const t = diffMin(o.placedAt, o.confirmedAt); return t !== null && t > 5; });
    const slowPrep = delivered.filter(o => { const t = diffMin(o.confirmedAt, o.readyAt); return t !== null && t > 25; });
    const slowDelivery = delivered.filter(o => { const t = diffMin(o.readyAt, o.deliveredAt); return t !== null && t > 20; });

    const cAvg = avg(confirmTimes) ?? 0;
    const pAvg = avg(prepTimes) ?? 0;
    const dAvg = avg(deliveryTimes) ?? 0;
    const maxAvg = Math.max(cAvg, pAvg, dAvg);

    const bottlenecks = {
      slowConfirmRate: delivered.length ? Math.round((slowConfirm.length / delivered.length) * 100) : 0,
      slowPrepRate: delivered.length ? Math.round((slowPrep.length / delivered.length) * 100) : 0,
      slowDeliveryRate: delivered.length ? Math.round((slowDelivery.length / delivered.length) * 100) : 0,
      worstStage: maxAvg === 0 ? null : maxAvg === pAvg ? 'preparation' : maxAvg === dAvg ? 'delivery' : 'confirmation',
      slowConfirmCount: slowConfirm.length,
      slowPrepCount: slowPrep.length,
      slowDeliveryCount: slowDelivery.length,
    };

    // 4. HOURLY HEATMAP
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h, label: `${String(h).padStart(2, '0')}:00`, orders: 0, avgMin: null as number | null,
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
      daily[key] = {
        date: key, orders: 0, delivered: 0, revenue: 0, avgMin: null,
        waiterOrders: 0, waiterRevenue: 0,
        counterOrders: 0, counterRevenue: 0,
        onlineOrders: 0, onlineRevenue: 0
      };
    }
    for (const o of orders) {
      const key = new Date(o.placedAt).toISOString().split('T')[0];
      if (daily[key]) {
        daily[key].orders++;
        if (finalizedStatuses.includes(o.status)) {
          daily[key].delivered++; // "Finalized" for trend purposes
          const amt = parseFloat(o.totalAmount.toString());
          daily[key].revenue += amt;

          // Breakdown
          if (o.orderType === 'WAITER' || o.orderNumber?.startsWith('WTR-')) {
            daily[key].waiterOrders++;
            daily[key].waiterRevenue += amt;
          } else if (o.orderType === 'COUNTER' || o.orderNumber?.startsWith('CNT-')) {
            daily[key].counterOrders++;
            daily[key].counterRevenue += amt;
          } else {
            daily[key].onlineOrders++;
            daily[key].onlineRevenue += amt;
          }
        }
      }
    }
    for (const key of Object.keys(daily)) {
      const dayStart = new Date(key); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(key); dayEnd.setHours(23, 59, 59, 999);
      const times = delivered
        .filter((o: any) => { const d = new Date(o.placedAt); return d >= dayStart && d <= dayEnd; })
        .map((o: any) => diffMin(o.placedAt, o.deliveredAt))
        .filter((t: number | null): t is number => t !== null);
      daily[key].avgMin = avg(times);
      daily[key].revenue = Math.round(daily[key].revenue * 100) / 100;
      daily[key].waiterRevenue = Math.round(daily[key].waiterRevenue * 100) / 100;
      daily[key].counterRevenue = Math.round(daily[key].counterRevenue * 100) / 100;
      daily[key].onlineRevenue = Math.round(daily[key].onlineRevenue * 100) / 100;
    }

    // 6. SUMMARY
    const summary = {
      totalOrders: orders.length,
      deliveredCount: delivered.length, // Keep original "delivered" definition for this stat
      finalizedCount: finalizedOrders.length,
      cancelledCount: orders.filter((o: any) => o.status === 'CANCELLED').length,
      totalRevenue: Math.round(finalizedOrders.reduce((s: number, o: any) => s + parseFloat(o.totalAmount.toString()), 0) * 100) / 100,
      periodDays: daysNum,
    };

    res.json({
      success: true,
      data: {
        summary, timing, bottlenecks, staff,
        waiterRevenue, waiterOrderCount,
        counterRevenue, counterOrderCount,
        onlineRevenue, onlineOrderCount,
        hourly: hourly.filter(h => h.orders > 0 || (h.hour >= 8 && h.hour <= 23)),
        daily: Object.values(daily)
      },
    });
  } catch (error) {
    next(error);
  }
};
