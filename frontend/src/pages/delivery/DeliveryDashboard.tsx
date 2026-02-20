import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';

export default function DeliveryDashboard() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: () => adminAPI.getOrders(),
    // add filter for waiter orders
    orderNumber: { not: { startsWith: 'WTR-' } },
    refetchInterval: 10000,
  });


  const deliverMutation = useMutation({
    mutationFn: (orderId: string) =>
      adminAPI.updateOrderStatus(orderId, 'DELIVERED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      addToast('Order marked as delivered!');
    },
  });

  if (user?.routingRole !== 'delivery' && user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Access Denied - Delivery personnel only
        </div>
      </div>
    );
  }

  const orders = (data?.data?.orders || [])
    .filter((o: any) => o.status === 'OUT_FOR_DELIVERY')
    .filter((o: any) => o.orderNumber?.startsWith('ONL-'));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🚗 Delivery Dashboard</h1>
        <button
          onClick={() => navigate('/admin')}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          ← Back
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-2xl font-bold">No deliveries pending</h2>
          <p className="text-gray-600">All orders have been delivered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    #{order.orderNumber.split('-')[1]}
                  </div>
                  <div className="text-lg font-semibold">
                    {order.user.firstName} {order.user.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{order.user.phone}</div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  €{parseFloat(order.totalAmount).toFixed(2)}
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <div className="font-semibold mb-2">📍 Delivery Address</div>
                <div className="text-sm">
                  <div>{order.address.street} {order.address.number}</div>
                  {order.address.floor && <div>Floor: {order.address.floor}</div>}
                  <div>{order.address.city} {order.address.postalCode}</div>
                </div>
              </div>

              {order.notes && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-4">
                  <div className="font-semibold mb-1">⚠️ Special Instructions</div>
                  <div className="text-sm">{order.notes}</div>
                </div>
              )}

              <div className="mb-4">
                <div className="font-semibold mb-2">Items:</div>
                <div className="space-y-1">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.menuItem.name}</span>
                      <span className="font-semibold">€{parseFloat(item.subtotal).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm('Confirm delivery of this order?')) {
                    deliverMutation.mutate(order.id);
                  }
                }}
                disabled={deliverMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold disabled:opacity-50"
              >
                ✅ Mark as Delivered
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
