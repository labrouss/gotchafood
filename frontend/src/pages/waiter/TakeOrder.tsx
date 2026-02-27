import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../components/ToastContainer';

const API_URL = 'http://youripaddress:3000';

const getAuthHeader = () => ({
  'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`,
  'Content-Type': 'application/json'
});

const waiterAPI = {
  getSession: (id: string) => fetch(`${API_URL}/api/waiter/sessions/${id}`, {
    headers: getAuthHeader()
  }).then(r => r.json()),
  
  getMenu: () => fetch(`${API_URL}/api/menu`, {
    headers: getAuthHeader()
  }).then(r => r.json()),
  
  createOrder: (sessionId: string, data: any) => fetch(`${API_URL}/api/waiter/sessions/${sessionId}/orders`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(data)
  }).then(r => r.json()),
  
  // NEW: Add items to existing order
  addItemsToOrder: (sessionId: string, orderId: string, data: any) => fetch(
    `${API_URL}/api/waiter/sessions/${sessionId}/orders/${orderId}/items`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(data)
  }).then(r => r.json()),
};

export default function TakeOrder() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [existingOrders, setExistingOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: sessionData, isLoading: loadingSession } = useQuery({
  queryKey: ['session', sessionId],
  queryFn: () => waiterAPI.getSession(sessionId!),
  enabled: !!sessionId,
  onSuccess: (data) => {
    // Extract existing open orders
    const orders = data?.data?.session?.orders || [];
    const openOrders = orders.filter((o: any) => 
      ['CONFIRMED', 'PREPARING', 'READY'].includes(o.status)
    );
    setExistingOrders(openOrders);
  },
});

  const { data: menuData, isLoading: loadingMenu } = useQuery({
    queryKey: ['menu'],
    queryFn: waiterAPI.getMenu,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => waiterAPI.createOrder(sessionId!, data),
    onSuccess: () => {
      addToast('Order sent to kitchen!');
      setCart([]);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
      navigate('/waiter');
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to create order');
    },
  });

  const addItemsToOrderMutation = useMutation({
  mutationFn: (data: any) => waiterAPI.addItemsToOrder(data.sessionId, data.orderId, { items: data.items }),
  onSuccess: () => {
    addToast('Items added to order!');
    setCart([]);
    setNotes('');
    setSelectedOrderId(null);
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
    navigate('/waiter');
  },
  onError: (error: any) => {
    addToast(error.message || 'Failed to add items');
  },
});

  if (!user || user.role !== 'STAFF') {
    navigate('/');
    return null;
  }

  const session = sessionData?.data?.session;

  const menu = menuData?.data?.menuItems || [];
  const categories = [...new Set(menu.map((item: any) => item.category?.name).filter(Boolean))];

  const filteredMenu = selectedCategory
   ? menu.filter((item: any) => item.category?.name === selectedCategory)
   : menu;


   const addToCart = (item: any) => {
   const existingIndex = cart.findIndex(i => i.menuItemId === item.id);

   if (existingIndex >= 0) {
     const newCart = [...cart];
     newCart[existingIndex].quantity += 1;
     newCart[existingIndex].subtotal = newCart[existingIndex].quantity * Number(item.price);
     setCart(newCart);
   } else {
     setCart([...cart, {
       menuItemId: item.id,
       name: item.name,
       quantity: 1,
       price: Number(item.price),
       subtotal: Number(item.price),
       notes: '',
       station: item.station || 'kitchen',
       prepTime: item.prepTime || 10,
     }]);
   }
   addToast(`Added ${item.name}`);
 };

  const updateQuantity = (index: number, change: number) => {
  const newCart = [...cart];
  newCart[index].quantity += change;
  
  if (newCart[index].quantity <= 0) {
    newCart.splice(index, 1);
  } else {
    newCart[index].subtotal = newCart[index].quantity * Number(newCart[index].price);
  }
  
  setCart(newCart);
};

  const updateItemNotes = (index: number, notes: string) => {
    const newCart = [...cart];
    newCart[index].notes = notes;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleSubmitOrder = () => {
  if (cart.length === 0) {
    addToast('Cart is empty');
    return;
  }

  // If adding to existing order
  if (selectedOrderId) {
    addItemsToOrderMutation.mutate({
      sessionId: sessionId!,
      orderId: selectedOrderId,
      items: cart,
    });
  } else {
    // Create new order
    createOrderMutation.mutate({
      items: cart,
      notes,
      loyaltyPhone: loyaltyPhone || undefined,
    });
  }
};

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  if (loadingSession || loadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Session Not Found</h2>
          <button
            onClick={() => navigate('/waiter')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/waiter')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold">🍽️ {session.table.tableNumber}</h1>
              <p className="text-sm text-gray-600">
                {session.reservation?.customerName || `Party of ${session.partySize}`}
              </p>
            </div>

            <button
              onClick={() => setShowCart(!showCart)}
              className="relative px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              🛒 {cart.length}
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-[73px] z-20">
        <div className="container mx-auto px-4 py-3 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedCategory === ''
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              All Items
            </button>
            {categories.map((category: string) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMenu
            .filter((item: any) => item.isAvailable)
            .map((item: any) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-left"
              >
                <h3 className="font-bold text-sm mb-1 line-clamp-2">{item.name}</h3>
                {item.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                    {item.description}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-indigo-600">
                    €{Number(item.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.prepTime}min
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Cart Sidebar/Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowCart(false)}>
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Order Items</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">🛒</div>
                  <p>Cart is empty</p>
                  <p className="text-sm">Add items from the menu</p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-4 mb-6">
                    {cart.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold">{item.name}</h3>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            −
                          </button>
                          <span className="font-semibold w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            +
                          </button>
                          <span className="ml-auto font-bold">
                            €{Number(item.subtotal).toFixed(2)}
                          </span>
                        </div>

                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateItemNotes(index, e.target.value)}
                          placeholder="Special requests (e.g., no onions)"
                          className="w-full text-sm border rounded px-2 py-1"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Order Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      Order Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special instructions for the kitchen..."
                      className="w-full border rounded-lg px-3 py-2"
                      rows={2}
                    />
                  </div>

		  {/* Existing Orders - Add to or Create New */}
                  {existingOrders.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-semibold mb-2">
                        Add to existing order or create new?
                      </label>
                      <select
                        value={selectedOrderId || 'new'}
                        onChange={(e) => setSelectedOrderId(e.target.value === 'new' ? null : e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="new">➕ Create New Order</option>
                        {existingOrders.map((order: any) => (
                          <option key={order.id} value={order.id}>
                            ➕ Add to Order {order.orderNumber} (€{order.totalAmount.toFixed(2)}) - {order.status}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-blue-600 mt-1">
                        {selectedOrderId ? 'Items will be added to existing order' : 'New order will be created'}
                      </p>
                    </div>
                  )}

                  {/* Loyalty Phone */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">
                      Loyalty Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={loyaltyPhone}
                      onChange={(e) => setLoyaltyPhone(e.target.value)}
                      placeholder="+30 123 456 7890"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>Total</span>
                      <span className="text-indigo-600">€{cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
		  <button
                    onClick={handleSubmitOrder}
                    disabled={createOrderMutation.isPending || addItemsToOrderMutation.isPending}
                    className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                    {(createOrderMutation.isPending || addItemsToOrderMutation.isPending) ?
                      'Sending...' :
                      selectedOrderId ? '➕ Add to Existing Order' : '✓ Send New Order to Kitchen'
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button (Mobile) */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-4 right-4 z-30">
          <button
            onClick={() => setShowCart(true)}
            className="px-6 py-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <span className="font-bold">🛒 {cart.length} items</span>
            <span className="font-bold">€{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
