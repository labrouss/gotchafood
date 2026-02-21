import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { counterAPI, menuAPI, userAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import QRScanner from '../../components/QRScanner';
import { useSettingsStore } from '../../store/settingsStore';

import { printContent, generateReceiptHTML } from '../../utils/print.util';

export default function CounterPOS() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const getSetting = useSettingsStore((state) => state.getSetting);

  const [cart, setCart] = useState<any[]>([]);
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [autoPrint, setAutoPrint] = useState(getSetting('printing.counter_receipt_auto', false));

  // Fetch menu items
  const { data: menuData } = useQuery({
    queryKey: ['menuItems'],
    queryFn: menuAPI.getAll,
  });

  // Fetch today's orders
  const { data: ordersData, refetch: refetchOrders } = useQuery({
    queryKey: ['counterOrders'],
    queryFn: () => counterAPI.getAll(),
    refetchInterval: 5000, // Auto-refresh every 5s
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['counterStats'],
    queryFn: counterAPI.getStats,
    refetchInterval: 10000,
  });

  const createOrderMutation = useMutation({
    mutationFn: counterAPI.create,
    onSuccess: (response: any) => {
      addToast('Order created successfully!');

      const newOrder = response.data.order;
      if (autoPrint && newOrder) {
        const html = generateReceiptHTML(newOrder);
        printContent(html, `Order_${newOrder.orderNumber}`);
      }

      setCart([]);
      setLoyaltyPhone('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
      queryClient.invalidateQueries({ queryKey: ['counterStats'] });
    },
    onError: () => addToast('Failed to create order'),
  });

  const handlePrintLegacy = (order: any) => {
    const html = generateReceiptHTML(order);
    printContent(html, `Order_${order.orderNumber}`);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => counterAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterOrders'] });
      queryClient.invalidateQueries({ queryKey: ['counterStats'] });
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const menuItems = menuData?.data?.menuItems || [];

  const orders = (ordersData?.data?.orders || [])
    .filter((o: any) => o.orderNumber.startsWith('CNT-')); // Only counter orders

  const stats = statsData?.data || {};

  const addToCart = (item: any) => {
    const existing = cart.find(i => i.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(i =>
        i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        price: parseFloat(item.price),
        quantity: 1,
        // Keep name locally for display only, don't send to backend
        displayName: item.name,
      }]);
    }
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(cart.filter(i => i.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(menuItemId);
    } else {
      setCart(cart.map(i =>
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      ));
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      addToast('Cart is empty');
      return;
    }

    // Strip displayName before sending - backend only needs menuItemId, price, quantity
    const itemsForBackend = cart.map(({ menuItemId, price, quantity }) => ({
      menuItemId,
      price,
      quantity,
    }));

    createOrderMutation.mutate({
      items: itemsForBackend,
      loyaltyPhone: loyaltyPhone || undefined,
      paymentMethod,
      notes: notes || undefined,
    });
  };

  const preparing = orders.filter((o: any) => ['CONFIRMED', 'PREPARING'].includes(o.status));
  const ready = orders.filter((o: any) => o.status === 'OUT_FOR_DELIVERY');

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header with Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Today's Orders</div>
          <div className="text-2xl font-bold">{stats.todayOrders || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Today's Revenue</div>
          <div className="text-2xl font-bold">€{Number(stats.todayRevenue || 0).toFixed(2)}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-yellow-700">Preparing</div>
          <div className="text-2xl font-bold text-yellow-800">{stats.preparingCount || 0}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <div className="text-sm text-green-700">Ready</div>
          <div className="text-2xl font-bold text-green-800">{stats.readyCount || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Menu Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Menu</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {menuItems.filter((item: any) => item.isAvailable).map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                >
                  <div className="font-semibold text-sm">{item.name}</div>
                  <div className="text-indigo-600 font-bold">€{parseFloat(item.price).toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Orders */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preparing */}
            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-3">⏳ Preparing ({preparing.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {preparing.map((order: any) => (
                  <div key={order.id} className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold">{order.orderNumber}</div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePrintLegacy(order)}
                          className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                          title="Print Receipt"
                        >
                          🖨️
                        </button>
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'OUT_FOR_DELIVERY' })}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Mark Ready
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="text-sm font-bold text-yellow-800 mt-1">
                      €{Number(order.totalAmount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <h3 className="font-bold text-green-800 mb-3">✅ Ready ({ready.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {ready.map((order: any) => (
                  <div key={order.id} className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold">{order.orderNumber}</div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePrintLegacy(order)}
                          className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                          title="Print Receipt"
                        >
                          🖨️
                        </button>
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'DELIVERED' })}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="text-sm font-bold text-green-800 mt-1">
                      €{Number(order.totalAmount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Current Order / Cart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Current Order</h2>

          {/* Loyalty Phone */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Loyalty Phone (Optional)</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={loyaltyPhone}
                onChange={(e) => setLoyaltyPhone(e.target.value)}
                placeholder="Enter phone number"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowQRScanner(!showQRScanner)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
              >
                📷 Scan
              </button>
            </div>
          </div>

          {/* QR Scanner Modal */}
          {showQRScanner && (
            <QRScanner
              onScan={async (data) => {
                setShowQRScanner(false);
                if (data.includes(':')) {
                  // Advanced QR Code (Encrypted Token)
                  try {
                    const response = await userAPI.identifyCustomer(data);
                    const customer = response.data.user;
                    setLoyaltyPhone(customer.phone);
                    addToast(`Customer ${customer.firstName} ${customer.lastName} identified!`);
                  } catch (err: any) {
                    addToast(err.response?.data?.message || 'Invalid or expired QR code', 'error');
                  }
                } else {
                  // Fallback for legacy phone number QR codes
                  setLoyaltyPhone(data);
                  addToast('Phone number scanned successfully!');
                }
              }}
              onClose={() => setShowQRScanner(false)}
            />
          )}

          {/* Cart Items */}
          <div className="mb-4 max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No items in cart
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="flex items-center justify-between border-b pb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{item.displayName}</div>
                      <div className="text-xs text-gray-500">€{item.price.toFixed(2)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        className="w-6 h-6 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        className="w-6 h-6 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.menuItemId)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile Payment</option>
            </select>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          {/* Total */}
          <div className="border-t pt-4 mb-4">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Total:</span>
              <span className="text-indigo-600">€{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Auto-Print Toggle */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="autoPrint"
              checked={autoPrint}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoPrint(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="autoPrint" className="text-sm font-semibold text-gray-700 cursor-pointer">
              Auto-print receipt after checkout
            </label>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || createOrderMutation.isPending}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createOrderMutation.isPending ? 'Processing...' : 'Place Order'}
          </button>

          <button
            onClick={() => setCart([])}
            className="w-full mt-2 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Clear Cart
          </button>
        </div>
      </div>
    </div>
  );
}
