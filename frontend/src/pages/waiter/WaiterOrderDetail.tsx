// ============================================================================
// NEW FILE: WaiterOrderDetail.tsx
// ============================================================================
// Location: frontend/src/pages/waiter/WaiterOrderDetail.tsx
// Purpose: View order details and mark as served
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import { printContent, generateReceiptHTML } from '../../utils/print.util';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeader = () => ({
  'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`,
  'Content-Type': 'application/json'
});

const orderAPI = {
  getOrder: (id: string) => fetch(`${API_URL}/api/orders/${id}`, {
    headers: getAuthHeader()
  }).then(r => r.json()),

  markServed: (id: string) => fetch(`${API_URL}/api/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeader(),
    body: JSON.stringify({ status: 'SERVED' })
  }).then(r => r.json()),
};

export default function WaiterOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderAPI.getOrder(orderId!),
    enabled: !!orderId,
  });


  const serveMutation = useMutation({
    mutationFn: () => orderAPI.markServed(orderId!),
    onSuccess: () => {
      addToast('Order marked as served!');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      // Optionally navigate back after serving
      // navigate('/waiter');
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to update order status');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const order = orderData?.data?.order;

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
          <button
            onClick={() => navigate('/waiter')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: any = {
      CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-800', label: '✓ Confirmed' },
      PREPARING: { bg: 'bg-purple-100', text: 'text-purple-800', label: '🍳 Preparing' },
      READY: { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Ready' },
      SERVED: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '👔 Served' },
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const canMarkServed = order.status === 'READY';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Order Details</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const html = generateReceiptHTML(order);
                printContent(html, `Order_${order.orderNumber}`);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              🖨️ Print Receipt
            </button>
            <button
              onClick={() => navigate('/waiter')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Order Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                {order.orderNumber}
              </div>
              <div className="text-sm text-gray-600">
                Table {order.tableNumber || 'N/A'}
              </div>
            </div>
            {getStatusBadge(order.status)}
          </div>

          {/* Status Timeline */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <div className={order.confirmedAt ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                ✓ Confirmed
              </div>
              <div className="flex-1 h-1 bg-gray-300 rounded"></div>
              <div className={order.preparingAt ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                🍳 Preparing
              </div>
              <div className="flex-1 h-1 bg-gray-300 rounded"></div>
              <div className={order.readyAt ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                ✅ Ready
              </div>
              <div className="flex-1 h-1 bg-gray-300 rounded"></div>
              <div className={order.status === 'SERVED' ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                👔 Served
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">Items</h3>
            <div className="space-y-2">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-semibold">
                      {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                    </div>
                    {item.notes && (
                      <div className="text-sm text-gray-600 mt-1">
                        📝 {item.notes}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Station: {item.station || 'kitchen'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      €{Number(item.subtotal).toFixed(2)}
                    </div>
                    {item.completedAt && (
                      <div className="text-xs text-green-600 mt-1">✓ Done</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <div className="font-semibold mb-1">📝 Order Notes</div>
              <div className="text-sm">{order.notes}</div>
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Total</span>
              <span className="text-green-600">
                €{Number(order.totalAmount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {canMarkServed ? (
            <button
              onClick={() => serveMutation.mutate()}
              disabled={serveMutation.isPending}
              className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {serveMutation.isPending ? 'Marking as Served...' : '✓ Mark as Served'}
            </button>
          ) : order.status === 'SERVED' ? (
            <div className="w-full py-4 bg-indigo-100 text-indigo-800 text-center text-lg font-bold rounded-lg">
              👔 Order Already Served
            </div>
          ) : order.status === 'PREPARING' ? (
            <div className="w-full py-4 bg-purple-100 text-purple-800 text-center text-lg font-bold rounded-lg">
              🍳 Kitchen is preparing...
            </div>
          ) : (
            <div className="w-full py-4 bg-blue-100 text-blue-800 text-center text-lg font-bold rounded-lg">
              ⏳ Waiting for kitchen...
            </div>
          )}

          {order.status === 'READY' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-green-800 font-semibold mb-2">
                ✅ Food is ready!
              </div>
              <div className="text-sm text-green-700">
                Pick up from kitchen and serve to table {order.tableNumber}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
