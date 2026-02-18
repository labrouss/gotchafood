import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const statusColors: any = {
  PENDING: 'bg-yellow-400 text-gray-900',
  CONFIRMED: 'bg-blue-500 text-white',
  PREPARING: 'bg-purple-500 text-white',
  READY: 'bg-green-500 text-white',
  OUT_FOR_DELIVERY: 'bg-indigo-600 text-white',
};

const stations = [
  { id: 'all',      name: 'Όλα',     icon: '🏠', color: 'bg-gray-600' },
  { id: 'kitchen',  name: 'Κουζίνα', icon: '🍳', color: 'bg-red-600' },
  { id: 'barista',  name: 'Barista', icon: '☕', color: 'bg-amber-700' },
  { id: 'cold-prep',name: 'Κρύα',    icon: '🥗', color: 'bg-green-600' },
  { id: 'hot-prep', name: 'Ζεστά',   icon: '🔥', color: 'bg-orange-600' },
];

export default function KitchenDisplayPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const user        = useAuthStore((state) => state.user);

  const initialStation = user?.role === 'STAFF' && user?.routingRole ? user.routingRole : 'all';
  const [selectedStation, setSelectedStation] = useState(initialStation);
  const [autoRefresh,     setAutoRefresh]     = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [soundEnabled,    setSoundEnabled]    = useState(true);
  const [soundVolume,     setSoundVolume]     = useState(0.5);
  const [viewMode,        setViewMode]        = useState<'grid' | 'list'>('grid');

  const previousOrderCountRef = useRef(0);
  const audioCtxRef           = useRef<AudioContext | null>(null);

  const isStaffLocked = user?.role === 'STAFF' && !!user?.routingRole;

  /* ── audio ── */
  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  const playBeep = () => {
    if (!soundEnabled || !audioCtxRef.current) return;
    const ctx  = audioCtxRef.current;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(soundVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  };

  /* ── queries ── */
  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => adminAPI.getOrders(),
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  /* ── mutations ── */
  // Whole-order status (PENDING → CONFIRMED only; rest is automatic)
  const orderStatusMutation = useMutation({
    mutationFn: ({ id, status, additionalTime }: { id: string; status: string; additionalTime?: number }) =>
      adminAPI.updateOrderStatus(id, status, additionalTime),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  });

  // Per-item start / complete  ← THE KEY MUTATION
  const itemStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'started' | 'completed' }) =>
      adminAPI.updateOrderItemStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  });

  /* ── sound on new orders ── */
  useEffect(() => {
    const orders = data?.data?.orders || [];
    const count  = orders.filter((o: any) => ['PENDING','CONFIRMED','PREPARING'].includes(o.status)).length;
    if (count > previousOrderCountRef.current && previousOrderCountRef.current > 0) playBeep();
    previousOrderCountRef.current = count;
  }, [data]); // eslint-disable-line

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  /* ── derived data ── */
  const allOrders    = data?.data?.orders || [];
  const activeOrders = allOrders.filter((o: any) => !['DELIVERED','CANCELLED'].includes(o.status));

  const filteredOrders = selectedStation === 'all'
    ? activeOrders
    : activeOrders.filter((o: any) => o.items?.some((i: any) => i.station === selectedStation));

  const grouped = {
    PENDING:          filteredOrders.filter((o: any) => o.status === 'PENDING'),
    CONFIRMED:        filteredOrders.filter((o: any) => o.status === 'CONFIRMED'),
    PREPARING:        filteredOrders.filter((o: any) => o.status === 'PREPARING'),
    READY:            filteredOrders.filter((o: any) => o.status === 'READY'),   
    OUT_FOR_DELIVERY: filteredOrders.filter((o: any) => o.status === 'OUT_FOR_DELIVERY'),
  };

  const minSince = (ts: string) =>
    Math.floor((Date.now() - new Date(ts).getTime()) / 60000);

  const timeColor = (mins: number, est: number, extra: number) => {
    const total = est + extra;
    if (mins > total + 15) return 'text-red-600 font-bold animate-pulse';
    if (mins > total)       return 'text-orange-500 font-semibold';
    return 'text-green-600';
  };

  /* ─────────────────────── ORDER CARD ─────────────────────── */
  const OrderCard = ({ order }: { order: any }) => {
    const elapsed  = minSince(order.placedAt);
    const est      = order.estimatedTime || 15;
    const extra    = order.additionalTime || 0;
    const remaining = (est + extra) - elapsed;

    // Items visible to this station view
    const visibleItems: any[] = selectedStation === 'all'
      ? order.items
      : order.items.filter((i: any) => i.station === selectedStation);

    if (visibleItems.length === 0) return null;

    // Progress for this station's items
    const done    = visibleItems.filter((i: any) => !!i.completedAt).length;
    const started = visibleItems.filter((i: any) => !!i.startedAt && !i.completedAt).length;
    const total   = visibleItems.length;
    const allDone = done === total;

    return (
      <div className={`bg-white rounded-lg shadow-lg p-4 border-l-4 ${
        elapsed > est + extra + 15 ? 'border-red-600 ring-4 ring-red-200'
        : elapsed > est + extra    ? 'border-orange-500'
                                   : 'border-green-500'
      }`}>

        {/* ── card header ── */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              #{order.orderNumber.split('-')[1]}
            </h3>
            <p className="text-sm text-gray-500">{order.user.firstName} {order.user.lastName}</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColors[order.status] ?? 'bg-gray-300'}`}>
              {order.status}
            </span>
            <div className={`text-2xl font-bold mt-1 ${timeColor(elapsed, est, extra)}`}>
              {elapsed} min
            </div>
            <div className="text-xs text-gray-500">
              {remaining > 0 ? `${remaining} min left` : `${Math.abs(remaining)} min over`}
            </div>
          </div>
        </div>

        {/* ── item progress bar ── */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Items: {done}/{total} done</span>
            {started > 0 && <span className="text-purple-600">{started} in progress</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-purple-500'}`}
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* ── items with per-item buttons ── */}
        <div className="space-y-2 mb-4">
          {visibleItems.map((item: any) => {
            const isCompleted = !!item.completedAt;
            const isStarted   = !!item.startedAt && !item.completedAt;
            const isIdle      = !item.startedAt;

            return (
              <div
                key={item.id}
                className={`rounded-lg p-3 border-2 transition ${
                  isCompleted ? 'bg-green-50 border-green-400'
                  : isStarted  ? 'bg-purple-50 border-purple-400'
                               : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* item info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-xl font-bold flex-shrink-0 ${
                      isCompleted ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.quantity}x
                    </span>
                    <div className="min-w-0">
                      <div className={`font-semibold truncate ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                        {item.menuItem.name}
                      </div>
                      {item.notes && (
                        <div className="text-xs text-orange-600 font-semibold">⚠️ {item.notes}</div>
                      )}
                      {/* who is working on it */}
                      {isStarted && item.assignedUser && (
                        <div className="text-xs text-purple-600 mt-0.5">
                          🧑‍🍳 {item.assignedUser.firstName} preparing…
                        </div>
                      )}
                      {isCompleted && item.completedUser && (
                        <div className="text-xs text-green-600 mt-0.5">
                          ✓ {item.completedUser.firstName} · {minSince(item.startedAt)}min prep
                        </div>
                      )}
                    </div>
                  </div>

                  {/* station badge */}
                  {item.station && (
                    <span className="text-xs px-2 py-1 bg-white border rounded flex-shrink-0">
                      {stations.find(s => s.id === item.station)?.icon} {item.station}
                    </span>
                  )}

                  {/* ── per-item action button ── */}
                  {isCompleted ? (
                    <span className="flex-shrink-0 px-3 py-1.5 bg-green-500 text-white rounded font-bold text-sm">
                      ✓ Done
                    </span>
                  ) : isStarted ? (
                    <button
                      onClick={() => itemStatusMutation.mutate({ id: item.id, status: 'completed' })}
                      disabled={itemStatusMutation.isPending}
                      className="flex-shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-sm disabled:opacity-50"
                    >
                      ✓ Ready
                    </button>
                  ) : (
                    <button
                      onClick={() => itemStatusMutation.mutate({ id: item.id, status: 'started' })}
                      disabled={itemStatusMutation.isPending}
                      className="flex-shrink-0 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-sm disabled:opacity-50"
                    >
                      🍳 Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── special instructions ── */}
        {order.notes && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-2 mb-3 text-sm">
            <span className="font-bold text-yellow-900">📝 Note: </span>
            <span className="text-yellow-800">{order.notes}</span>
          </div>
        )}

        {/* ── order-level actions ── */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          {/* Only CONFIRM is an order-level action; everything else is driven by items */}
          {order.status === 'PENDING' && (
            <button
              onClick={() => orderStatusMutation.mutate({ id: order.id, status: 'CONFIRMED' })}
              disabled={orderStatusMutation.isPending}
              className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              ✅ Confirm Order
            </button>
          )}

          {order.status === 'CONFIRMED' && (
            <div className="col-span-2 text-center text-sm text-gray-500 py-1">
              ☝️ Start individual items above to begin preparation
            </div>
          )}

          {order.status === 'PREPARING' && !allDone && (
            <div className="col-span-2 text-center text-sm text-purple-600 font-semibold py-1">
              🍳 {done}/{total} items ready — complete all items to auto-advance
            </div>
          )}

          {order.status === 'PREPARING' && allDone && (
            <div className="col-span-2 text-center text-sm text-green-600 font-semibold py-1">
              ✅ All items done — order advancing to ready…
            </div>
          )}

	  {order.status === 'READY' && (
            <div className="col-span-2 text-center text-sm text-green-600 font-semibold py-1">
              {order.orderNumber?.startsWith('W') ? (
                <>👔 Ready for waiter pickup</>
              ) : (
                <>📦 Ready for pickup</>
              )}
            </div>
          )}

          {order.status === 'OUT_FOR_DELIVERY' && (
            <div className="col-span-2 text-center text-sm text-indigo-600 font-semibold py-1">
              📦 Out for delivery
            </div>
          )}

          {/* +5 min always visible */}
          <button
            onClick={() => orderStatusMutation.mutate({ id: order.id, status: order.status, additionalTime: extra + 5 })}
            disabled={orderStatusMutation.isPending}
            className="col-span-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
          >
            +5 min
          </button>
        </div>
      </div>
    );
  };

  /* ─────────────────────── RENDER ─────────────────────── */
  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 sticky top-0 z-30 shadow-lg">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-2xl font-bold">🍳 Kitchen Display</h1>
              <p className="text-sm opacity-90">
                Active: {activeOrders.length} | Showing: {filteredOrders.length}
              </p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded font-semibold text-sm"
            >
              ← Back
            </button>
          </div>

          {/* Station filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {stations.map((s) => (
              <button
                key={s.id}
                onClick={() => !isStaffLocked && setSelectedStation(s.id)}
                disabled={isStaffLocked && s.id !== selectedStation}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap text-sm flex items-center gap-1 transition ${
                  selectedStation === s.id ? `${s.color} text-white` : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
                {s.id !== 'all' && (
                  <span className="bg-white bg-opacity-30 px-1.5 rounded text-xs">
                    {activeOrders.filter((o: any) => o.items?.some((i: any) => i.station === s.id)).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Settings bar ── */}
      <div className="bg-white border-b px-4 py-2 sticky top-24 z-20 shadow-sm">
        <div className="container mx-auto flex flex-wrap gap-4 items-center justify-between text-sm">
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="w-4 h-4" />
              <span className="font-semibold">Auto-Refresh</span>
            </label>
            {autoRefresh && (
              <select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))} className="border rounded px-2 py-1">
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
            )}
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} className="w-4 h-4" />
              <span className="font-semibold">🔔 Sound</span>
            </label>
            {soundEnabled && (
              <input type="range" min="0" max="1" step="0.1" value={soundVolume}
                onChange={e => setSoundVolume(Number(e.target.value))} className="w-16" />
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded text-sm ${viewMode==='grid'?'bg-red-600 text-white':'bg-gray-200'}`}>Grid</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded text-sm ${viewMode==='list'?'bg-red-600 text-white':'bg-gray-200'}`}>List</button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="container mx-auto p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">All Clear!</h2>
            <p className="text-gray-500">
              {selectedStation === 'all' ? 'No active orders' : `No orders for ${stations.find(s=>s.id===selectedStation)?.name}`}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {(['PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY'] as const).map(status => {
              const sOrders = grouped[status];
              if (sOrders.length === 0) return null;
              return (
                <div key={status}>
                  <h2 className="text-lg font-bold text-gray-800 mb-3">
                    <span className={`px-3 py-1 rounded text-sm ${statusColors[status]}`}>
                      {status.replace(/_/g,' ')} ({sOrders.length})
                    </span>
                  </h2>
                  <div className={viewMode==='grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-4'
                  }>
                    {sOrders.map((order: any) => <OrderCard key={order.id} order={order} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
