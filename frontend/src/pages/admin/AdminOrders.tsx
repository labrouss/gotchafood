import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import { printContent, generateReceiptHTML } from '../../utils/print.util';

const statusColors: any = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: any = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () => adminAPI.getOrders(statusFilter !== 'ALL' ? statusFilter : undefined),
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => adminAPI.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      addToast('Order status updated!');
    },
    onError: () => {
      addToast('Failed to update order status');
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const orders = data?.data?.orders || [];

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeDiff = (start: string, end: string) => {
    if (!start || !end) return null;
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return diff;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">📋 Order Management</h1>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${statusFilter === status
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
                }`}
            >
              {status === 'ALL' ? 'All' : statusLabels[status]}
            </button>
          )
        )}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No orders found</h3>
          <p className="text-gray-600">Try changing the filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              {/* Order Header */}
              <div
                className="p-6 cursor-pointer"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        #{order.orderNumber}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-semibold">Customer:</span>{' '}
                        {order.user
                          ? `${order.user.firstName} ${order.user.lastName} (${order.user.email})`
                          : order.tableNumber
                            ? `Table ${order.tableNumber}${order.loyaltyPhone ? ` · ${order.loyaltyPhone}` : ''}`
                            : 'Walk-in / Waiter Order'}
                      </div>
                      <div>
                        <span className="font-semibold">Placed:</span> {formatDate(order.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      €{parseFloat(order.totalAmount).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <button className="text-gray-400 hover:text-gray-600">
                    {expandedOrder === order.id ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  {/* Staff Activity Trail */}
                  <div className="mb-6 bg-white rounded-lg p-4 border-2 border-blue-200">
                    <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                      <span>👥</span>
                      <span>Staff Activity Trail</span>
                    </h4>

                    <div className="space-y-3">
                      {/* Order Placed */}
                      <div className="flex items-start gap-3">
                        <div className="w-32 text-sm text-gray-600 flex-shrink-0">
                          {formatDate(order.placedAt || order.createdAt)}
                        </div>
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs">📝</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">Order Placed</div>
                          <div className="text-sm text-gray-600">
                            {order.user ? `By customer: ${order.user.firstName} ${order.user.lastName}` : order.tableNumber ? `Table ${order.tableNumber}` : 'Waiter / Walk-in order'}
                          </div>
                        </div>
                      </div>

                      {/* Confirmed */}
                      {order.confirmedAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-32 text-sm text-gray-600 flex-shrink-0">
                            {formatDate(order.confirmedAt)}
                            {(() => {
                              const diff = getTimeDiff(order.placedAt || order.createdAt, order.confirmedAt);
                              return diff !== null ? (
                                <div className="text-xs text-blue-600">({diff} min)</div>
                              ) : null;
                            })()}
                          </div>
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-white">✓</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">Confirmed</div>
                            {order.confirmedByUser ? (
                              <div className="text-sm text-gray-600">
                                By: {order.confirmedByUser.firstName} {order.confirmedByUser.lastName}
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                  {order.confirmedByUser.role}
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic">Staff member not recorded</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Started Preparing */}
                      {order.startedAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-32 text-sm text-gray-600 flex-shrink-0">
                            {formatDate(order.startedAt)}
                            {(() => {
                              const diff = getTimeDiff(order.confirmedAt, order.startedAt);
                              return diff !== null ? (
                                <div className="text-xs text-purple-600">({diff} min)</div>
                              ) : null;
                            })()}
                          </div>
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-white">🍳</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">Preparation Started</div>
                            <div className="text-sm text-gray-600">Kitchen began preparing order</div>
                          </div>
                        </div>
                      )}

                      {/* Ready for Delivery */}
                      {order.readyAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-32 text-sm text-gray-600 flex-shrink-0">
                            {formatDate(order.readyAt)}
                            {(() => {
                              const diff = getTimeDiff(order.startedAt, order.readyAt);
                              return diff !== null ? (
                                <div className="text-xs text-indigo-600">({diff} min prep)</div>
                              ) : null;
                            })()}
                          </div>
                          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-white">📦</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">Ready for Delivery</div>
                            <div className="text-sm text-gray-600">Order packaged and ready</div>
                          </div>
                        </div>
                      )}

                      {/* Delivered */}
                      {order.deliveredAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-32 text-sm text-gray-600 flex-shrink-0">
                            {formatDate(order.deliveredAt)}
                            {(() => {
                              const diff = getTimeDiff(order.readyAt, order.deliveredAt);
                              return diff !== null ? (
                                <div className="text-xs text-green-600">({diff} min delivery)</div>
                              ) : null;
                            })()}
                          </div>
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-white">✓</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">Delivered</div>
                            {order.deliveredByUser ? (
                              <div className="text-sm text-gray-600">
                                By: {order.deliveredByUser.firstName} {order.deliveredByUser.lastName}
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                  {order.deliveredByUser.role}
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic">Delivery person not recorded</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Total Time */}
                      {order.deliveredAt && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">Total Time:</span>
                            <span className="text-lg font-bold text-green-600">
                              {getTimeDiff(order.placedAt || order.createdAt, order.deliveredAt)} minutes
                            </span>
                            <span className="text-sm text-gray-500">
                              (from order to delivery)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-6">
                    <h4 className="font-bold text-lg text-gray-800 mb-3">Order Items</h4>
                    <div className="space-y-2">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded">
                          <div className="flex-1">
                            <span className="font-semibold">{item.quantity}x</span> {item.menuItem.name}
                            {item.notes && (
                              <div className="text-sm text-orange-600 mt-1">
                                Note: {item.notes}
                              </div>
                            )}
                          </div>
                          <div className="font-semibold">€{parseFloat(item.subtotal).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {order.address && (
                    <div className="mb-6">
                      <h4 className="font-bold text-lg text-gray-800 mb-3">Delivery Address</h4>
                      <div className="bg-white p-3 rounded">
                        <p>
                          {order.address.street} {order.address.number}, {order.address.city}{' '}
                          {order.address.postalCode}
                        </p>
                        {order.address.floor && <p>Floor: {order.address.floor}</p>}
                        {order.address.notes && <p className="text-sm text-gray-600 mt-1">{order.address.notes}</p>}
                      </div>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="bg-white p-4 rounded">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>€{parseFloat(order.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span>€{parseFloat(order.deliveryFee).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-red-600">€{parseFloat(order.totalAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="mt-6 space-y-3">
                    {/* Workflow buttons - only show for non-final statuses */}
                    {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const html = generateReceiptHTML(order);
                            printContent(html, `Order_${order.orderNumber}`);
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold"
                        >
                          🖨️ Print Receipt
                        </button>
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'CONFIRMED' })}
                            disabled={updateStatusMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                          >
                            Confirm Order
                          </button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'PREPARING' })}
                            disabled={updateStatusMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                          >
                            Start Preparing
                          </button>
                        )}
                        {order.status === 'PREPARING' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'OUT_FOR_DELIVERY' })}
                            disabled={updateStatusMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                          >
                            Ready for Delivery
                          </button>
                        )}
                        {order.status === 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'DELIVERED' })}
                            disabled={updateStatusMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                          >
                            Mark as Delivered
                          </button>
                        )}
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'CANCELLED' })}
                          disabled={updateStatusMutation.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}

                    {/* Manual status override dropdown - ALWAYS available */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <label className="text-sm font-semibold text-gray-600">Change status to:</label>
                      <select
                        value={order.status}
                        onChange={(e) => {
                          if (e.target.value !== order.status && confirm(`Change status from ${statusLabels[order.status]} to ${statusLabels[e.target.value]}?`)) {
                            updateStatusMutation.mutate({ id: order.id, status: e.target.value });
                          }
                        }}
                        disabled={updateStatusMutation.isPending}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PREPARING">Preparing</option>
                        <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
