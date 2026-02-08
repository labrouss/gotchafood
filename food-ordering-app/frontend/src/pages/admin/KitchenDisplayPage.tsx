import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const statusColors: any = {
  PENDING: 'bg-yellow-400 text-gray-900',
  CONFIRMED: 'bg-blue-500 text-white',
  PREPARING: 'bg-purple-500 text-white',
  OUT_FOR_DELIVERY: 'bg-indigo-600 text-white',
};

export default function KitchenDisplayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch active orders (not delivered or cancelled)
  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => adminAPI.getOrders(),
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
    refetchInterval: autoRefresh ? 10000 : false, // Auto-refresh every 10 seconds
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminAPI.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
  });

  useEffect(() => {
    // Play sound when new order arrives (optional)
    const orders = data?.data?.orders || [];
    const pendingCount = orders.filter((o: any) => o.status === 'PENDING').length;
    if (pendingCount > 0) {
      // Optional: Play notification sound
      // new Audio('/notification.mp3').play();
    }
  }, [data]);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const orders = (data?.data?.orders || []).filter(
    (order: any) => !['DELIVERED', 'CANCELLED'].includes(order.status)
  );

  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING');
  const confirmedOrders = orders.filter((o: any) => o.status === 'CONFIRMED');
  const preparingOrders = orders.filter((o: any) => o.status === 'PREPARING');
  const deliveryOrders = orders.filter((o: any) => o.status === 'OUT_FOR_DELIVERY');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">🍳 Kitchen Display</h1>
          <p className="text-gray-400">
            {orders.length} Active Orders • Last updated:{' '}
            {new Date().toLocaleTimeString('el-GR')}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              autoRefresh ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            {autoRefresh ? '🔄 Auto-Refresh ON' : '⏸️ Auto-Refresh OFF'}
          </button>
          <button
            onClick={() => navigate('/admin/orders')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"
          >
            ← Back to Admin
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-8xl mb-4">✨</div>
          <h2 className="text-3xl font-bold mb-2">No Active Orders</h2>
          <p className="text-gray-400">All caught up! Waiting for new orders...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Pending Column */}
          {pendingOrders.length > 0 && (
            <div>
              <div className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-t-lg font-bold text-lg">
                🔔 NEW ORDERS ({pendingOrders.length})
              </div>
              <div className="space-y-4 mt-2">
                {pendingOrders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={updateStatusMutation.mutate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Column */}
          {confirmedOrders.length > 0 && (
            <div>
              <div className="bg-blue-500 text-white px-4 py-2 rounded-t-lg font-bold text-lg">
                ✅ CONFIRMED ({confirmedOrders.length})
              </div>
              <div className="space-y-4 mt-2">
                {confirmedOrders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={updateStatusMutation.mutate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preparing Column */}
          {preparingOrders.length > 0 && (
            <div>
              <div className="bg-purple-500 text-white px-4 py-2 rounded-t-lg font-bold text-lg">
                👨‍🍳 PREPARING ({preparingOrders.length})
              </div>
              <div className="space-y-4 mt-2">
                {preparingOrders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={updateStatusMutation.mutate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Out for Delivery Column */}
          {deliveryOrders.length > 0 && (
            <div>
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg font-bold text-lg">
                🚗 OUT FOR DELIVERY ({deliveryOrders.length})
              </div>
              <div className="space-y-4 mt-2">
                {deliveryOrders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={updateStatusMutation.mutate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onStatusChange }: any) {
  const timeSinceOrder = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / 1000 / 60
  );

  return (
    <div className="bg-white text-gray-900 rounded-lg shadow-xl p-6">
      {/* Order Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-3xl font-bold text-red-600">
            #{order.orderNumber.split('-')[1]}
          </div>
          <div className="text-sm text-gray-600">
            {order.user.firstName} {order.user.lastName}
          </div>
          <div className="text-xs text-gray-500">{order.user.phone}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">€{parseFloat(order.totalAmount).toFixed(2)}</div>
          <div
            className={`text-xs px-2 py-1 rounded mt-1 ${
              timeSinceOrder > 30
                ? 'bg-red-100 text-red-800'
                : timeSinceOrder > 15
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {timeSinceOrder} min ago
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-4 border-t pt-4">
        {order.items.map((item: any) => (
          <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
            <div className="flex-1">
              <span className="font-bold text-2xl text-red-600">{item.quantity}x</span>
              <span className="ml-3 text-lg font-semibold">{item.menuItem.name}</span>
              {item.notes && (
                <div className="ml-10 text-sm text-gray-600 italic">Note: {item.notes}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Address */}
      <div className="mb-4 text-sm bg-gray-100 p-3 rounded">
        <div className="font-semibold">📍 Delivery Address:</div>
        <div>
          {order.address.street} {order.address.number}
          {order.address.floor && `, Floor ${order.address.floor}`}
        </div>
        <div>
          {order.address.city} {order.address.postalCode}
        </div>
        {order.notes && (
          <div className="mt-2 text-red-600 font-semibold">⚠️ {order.notes}</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {order.status === 'PENDING' && (
          <>
            <button
              onClick={() => onStatusChange({ id: order.id, status: 'CONFIRMED' })}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-lg"
            >
              ✅ Accept
            </button>
            <button
              onClick={() => {
                if (confirm('Cancel this order?')) {
                  onStatusChange({ id: order.id, status: 'CANCELLED' });
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold text-lg"
            >
              ❌ Reject
            </button>
          </>
        )}
        {order.status === 'CONFIRMED' && (
          <button
            onClick={() => onStatusChange({ id: order.id, status: 'PREPARING' })}
            className="col-span-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold text-lg"
          >
            👨‍🍳 Start Preparing
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button
            onClick={() => onStatusChange({ id: order.id, status: 'OUT_FOR_DELIVERY' })}
            className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold text-lg"
          >
            🚗 Ready for Delivery
          </button>
        )}
        {order.status === 'OUT_FOR_DELIVERY' && (
          <button
            onClick={() => onStatusChange({ id: order.id, status: 'DELIVERED' })}
            className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg"
          >
            ✅ Mark Delivered
          </button>
        )}
      </div>
    </div>
  );
}
