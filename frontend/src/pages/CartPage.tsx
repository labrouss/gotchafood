import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function CartPage() {
  const navigate = useNavigate();
  const cart = useCartStore();
  const user = useAuthStore((state) => state.user);
  const items = cart.items;
  
  const subtotal = cart.getTotal();
  const deliveryFee = subtotal >= 15 ? 0 : 2.5;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-3xl font-bold mb-4">Το καλάθι σας είναι άδειο</h1>
          <p className="text-gray-600 mb-8">
            Προσθέστε προϊόντα από το μενού για να ξεκινήσετε την παραγγελία σας
          </p>
          <button
            onClick={() => navigate('/menu')}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            Περιηγηθείτε στο Μενού
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Το Καλάθι μου</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.menuItemId}
              className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded flex items-center justify-center text-3xl">
                🍽️
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-gray-600">€{item.price.toFixed(2)}</p>
                {item.notes && (
                  <p className="text-sm text-gray-500 italic">Note: {item.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => cart.updateQuantity(item.menuItemId, item.quantity - 1)}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => cart.updateQuantity(item.menuItemId, item.quantity + 1)}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>

              <div className="text-right">
                <p className="font-bold text-lg">
                  €{(item.price * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => cart.removeItem(item.menuItemId)}
                  className="text-red-600 hover:text-red-700 text-sm mt-1"
                >
                  Αφαίρεση
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Σύνοψη Παραγγελίας</h2>
            
            <div className="space-y-3 mb-4 pb-4 border-b">
              <div className="flex justify-between">
                <span>Υποσύνολο</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Κόστος παράδοσης</span>
                <span>{deliveryFee === 0 ? 'Δωρεάν' : `€${deliveryFee.toFixed(2)}`}</span>
              </div>
              {deliveryFee > 0 && (
                <p className="text-xs text-gray-500">
                  Δωρεάν παράδοση για παραγγελίες άνω των €15
                </p>
              )}
            </div>

            <div className="flex justify-between font-bold text-xl mb-6">
              <span>Σύνολο</span>
              <span className="text-red-600">€{total.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold text-lg"
            >
              Ολοκλήρωση Παραγγελίας
            </button>

            <button
              onClick={() => navigate('/menu')}
              className="w-full mt-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 py-3 rounded-lg font-semibold"
            >
              Συνέχεια Αγορών
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
