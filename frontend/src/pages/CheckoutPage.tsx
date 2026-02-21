import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { addressAPI, orderAPI, loyaltyAPI } from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCartStore();
  const user = useAuthStore((state) => state.user);

  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE'>('CASH');
  const [notes, setNotes] = useState('');

  const { data: loyaltyData } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: loyaltyAPI.getMyLoyalty,
    enabled: !!user,
  });

  const { data: addressesData } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressAPI.getAll,
  });

  const placeOrderMutation = useMutation({
    mutationFn: orderAPI.create,
    onSuccess: () => {
      cart.clearCart();
      alert('Η παραγγελία σας καταχωρήθηκε επιτυχώς!');
      navigate('/my-orders');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Σφάλμα κατά την υποβολή της παραγγελίας');
    },
  });

  const addresses = addressesData?.data?.addresses || [];
  const subtotal = cart.getTotal();
  const loyalty = loyaltyData?.data?.loyalty;
  const discountPercent = loyalty?.discountPercent || 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const deliveryFee = subtotal >= 15 ? 0 : 2.5;
  const total = subtotal + deliveryFee - discountAmount;

  const handlePlaceOrder = () => {
    if (!selectedAddressId) {
      alert('Παρακαλώ επιλέξτε διεύθυνση παράδοσης');
      return;
    }

    const orderData = {
      addressId: selectedAddressId,
      paymentMethod,
      notes,
      items: cart.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };

    placeOrderMutation.mutate(orderData);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Ολοκλήρωση Παραγγελίας</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Διεύθυνση Παράδοσης</h2>

            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Δεν έχετε αποθηκευμένες διευθύνσεις
                </p>
                <button
                  onClick={() => navigate('/my-addresses')}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded"
                >
                  Προσθήκη Διεύθυνσης
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address: any) => (
                  <label
                    key={address.id}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition ${selectedAddressId === address.id
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={address.id}
                      checked={selectedAddressId === address.id}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                      className="mr-3"
                    />
                    <span className="font-semibold">{address.label || 'Διεύθυνση'}</span>
                    <p className="text-sm text-gray-600 ml-6">
                      {address.street} {address.number}, {address.city} {address.postalCode}
                      {address.floor && `, Όροφος ${address.floor}`}
                    </p>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Τρόπος Πληρωμής</h2>
            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-gray-300">
                <input
                  type="radio"
                  name="payment"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mr-3"
                />
                <span className="font-semibold">💵 Μετρητά</span>
              </label>
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-gray-300">
                <input
                  type="radio"
                  name="payment"
                  value="CARD"
                  checked={paymentMethod === 'CARD'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mr-3"
                />
                <span className="font-semibold">💳 Κάρτα στον Courier</span>
              </label>
            </div>
          </div>

          {/* Order Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Σημειώσεις Παραγγελίας</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Προαιρετικές σημειώσεις για την παραγγελία σας..."
              className="w-full border rounded-lg p-3 h-24"
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Σύνοψη</h2>

            <div className="space-y-2 mb-4 pb-4 border-b">
              {cart.items.map((item) => (
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>€{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-4 pb-4 border-b">
              <div className="flex justify-between">
                <span>Υποσύνολο</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Παράδοση</span>
                <span>{deliveryFee === 0 ? 'Δωρεάν' : `€${deliveryFee.toFixed(2)}`}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Έκπτωση Loyalty ({loyalty?.tier})</span>
                  <span>-€{discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-bold text-xl mb-6">
              <span>Σύνολο</span>
              <span className="text-primary">€{total.toFixed(2)}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placeOrderMutation.isPending || !selectedAddressId}
              className="w-full bg-primary hover:bg-opacity-90 text-white py-3 rounded-lg font-semibold text-lg disabled:bg-gray-400 transition"
            >
              {placeOrderMutation.isPending ? 'Υποβολή...' : 'Ολοκλήρωση Παραγγελίας'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
