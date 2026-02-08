import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const statusColors: any = { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', PREPARING: 'bg-purple-100 text-purple-800', OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800', DELIVERED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800' };
const statusLabels: any = { PENDING: 'Σε Αναμονή', CONFIRMED: 'Επιβεβαιωμένη', PREPARING: 'Προετοιμασία', OUT_FOR_DELIVERY: 'Σε Παράδοση', DELIVERED: 'Παραδόθηκε', CANCELLED: 'Ακυρώθηκε' };

export default function AdminOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () => adminAPI.getOrders(statusFilter !== 'ALL' ? statusFilter : undefined),
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => adminAPI.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      alert('Η κατάσταση ενημερώθηκε!');
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const orders = data?.data?.orders || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">📋 Διαχείριση Παραγγελιών</h1>

      <div className="flex gap-3 mb-6">
        {['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-lg font-semibold ${statusFilter === status ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
            {status === 'ALL' ? 'Όλες' : statusLabels[status]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
                  <p className="text-sm text-gray-600">{order.user.firstName} {order.user.lastName} - {order.user.phone}</p>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('el-GR')}</p>
                </div>
                <select value={order.status} onChange={(e) => updateStatusMutation.mutate({ id: order.id, status: e.target.value })} className={`px-3 py-1 rounded font-semibold text-sm ${statusColors[order.status]}`}>
                  {Object.keys(statusLabels).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Προϊόντα:</h4>
                    {order.items.map((item: any) => (
                      <div key={item.id} className="text-sm">{item.quantity}x {item.menuItem.name} - €{parseFloat(item.subtotal).toFixed(2)}</div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Διεύθυνση:</h4>
                    <p className="text-sm">{order.address.street} {order.address.number}</p>
                    <p className="text-sm">{order.address.city} {order.address.postalCode}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <div className="text-sm">Πληρωμή: <span className="font-semibold">{order.payment.method}</span></div>
                  <div className="text-lg font-bold text-red-600">Σύνολο: €{parseFloat(order.totalAmount).toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

