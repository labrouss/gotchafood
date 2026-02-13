import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewAPI, orderAPI } from '../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import { useAuthStore } from '../../store/authStore';

export default function CreateReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToast = useToastStore((state) => state.addToast);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  const [selectedOrder, setSelectedOrder] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [type, setType] = useState('service');
  const [hoveredRating, setHoveredRating] = useState(0);

  // Fetch user's completed orders that haven't been reviewed
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['my-completed-orders'],
    queryFn: orderAPI.getAll,
    enabled: !!user,
  });

  // Fetch existing reviews to filter out already reviewed orders
  const { data: reviewsData } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: reviewAPI.getMyReviews,
    enabled: !!user,
  });

  // Pre-select order from URL parameter
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    if (orderIdFromUrl && !selectedOrder) {
      setSelectedOrder(orderIdFromUrl);
    }
  }, [searchParams, selectedOrder]);

  const createMutation = useMutation({
    mutationFn: reviewAPI.create,
    onSuccess: () => {
      addToast('Ευχαριστούμε για την αξιολόγησή σας!');
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      navigate('/my-reviews');
    },
    onError: (error: any) => {
      addToast(error.response?.data?.message || 'Σφάλμα κατά την υποβολή της αξιολόγησης');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrder) {
      addToast('Παρακαλώ επιλέξτε μια παραγγελία για αξιολόγηση');
      return;
    }

    if (!comment.trim()) {
      addToast('Παρακαλώ προσθέστε ένα σχόλιο');
      return;
    }

    createMutation.mutate({ 
      orderId: selectedOrder,
      rating, 
      comment: comment.trim(), 
      type 
    });
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  // Filter completed and delivered orders
  const allOrders = ordersData?.data?.orders || [];
  const completedOrders = allOrders.filter((order: any) => 
    order.status === 'DELIVERED'
  );

  // Get order IDs that have already been reviewed
  const reviewedOrderIds = new Set(
    (reviewsData?.data?.reviews || [])
      .filter((review: any) => review.orderId)
      .map((review: any) => review.orderId)
  );

  // Filter out already reviewed orders
  const availableOrders = completedOrders.filter(
    (order: any) => !reviewedOrderIds.has(order.id)
  );

  const ratingLabels = ['Πολύ Κακό', 'Κακό', 'Μέτριο', 'Καλό', 'Εξαιρετικό'];

  if (ordersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8">
        <div className="container mx-auto px-4 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-gray-600 mt-4">Φόρτωση παραγγελιών...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/my-reviews')}
            className="text-red-600 hover:text-red-700 font-semibold mb-4 flex items-center gap-2"
          >
            ← Πίσω στις αξιολογήσεις μου
          </button>
          <h1 className="text-4xl font-bold text-gray-800">⭐ Αξιολογήστε μας</h1>
          <p className="text-gray-600 mt-2">Η γνώμη σας μας βοηθά να γίνουμε καλύτεροι!</p>
        </div>

        {/* Check if user has completed orders */}
        {availableOrders.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-6">📦</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Δεν υπάρχουν παραγγελίες για αξιολόγηση
              </h2>
              <p className="text-gray-600 mb-6">
                {completedOrders.length === 0 
                  ? 'Πρέπει να έχετε ολοκληρωμένες παραγγελίες για να γράψετε αξιολόγηση.'
                  : 'Έχετε ήδη αξιολογήσει όλες τις παραγγελίες σας!'}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition"
                >
                  🛍️ Κάντε Παραγγελία
                </button>
                <button
                  onClick={() => navigate('/my-orders')}
                  className="bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-800 px-8 py-3 rounded-xl font-bold transition"
                >
                  📦 Οι Παραγγελίες μου
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Review Form */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <form onSubmit={handleSubmit}>
                {/* Order Selection */}
                <div className="mb-8">
                  <label className="block text-lg font-bold text-gray-800 mb-3">
                    Επιλέξτε Παραγγελία για Αξιολόγηση *
                  </label>
                  <select
                    value={selectedOrder}
                    onChange={(e) => setSelectedOrder(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Επιλέξτε Παραγγελία --</option>
                    {availableOrders.map((order: any) => (
                      <option key={order.id} value={order.id}>
                        #{order.orderNumber} - €{parseFloat(order.totalAmount).toFixed(2)} - {' '}
                        {new Date(order.createdAt).toLocaleDateString('el-GR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600 mt-2">
                    Εμφανίζονται μόνο παραδοθείσες παραγγελίες που δεν έχουν αξιολογηθεί
                  </p>
                </div>

                {/* Selected Order Details */}
                {selectedOrder && (
                  <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                    <div className="font-semibold text-blue-900 mb-2">
                      📦 Λεπτομέρειες Παραγγελίας
                    </div>
                    {(() => {
                      const order = availableOrders.find((o: any) => o.id === selectedOrder);
                      return order ? (
                        <div className="text-sm text-blue-800 space-y-1">
                          <div>Αριθμός: #{order.orderNumber}</div>
                          <div>Ημερομηνία: {new Date(order.createdAt).toLocaleDateString('el-GR')}</div>
                          <div>Σύνολο: €{parseFloat(order.totalAmount).toFixed(2)}</div>
                          {order.items && (
                            <div className="mt-2">
                              <div className="font-semibold">Προϊόντα:</div>
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx}>
                                  • {item.quantity}x {item.menuItem?.name || 'Προϊόν'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Rating Selection */}
                <div className="mb-8">
                  <label className="block text-lg font-bold text-gray-800 mb-4">
                    Πόσο ικανοποιημένοι είστε; *
                  </label>
                  
                  <div className="flex justify-center gap-3 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="text-6xl transition-transform hover:scale-110 focus:outline-none"
                      >
                        {star <= (hoveredRating || rating) ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                  
                  <div className="text-center">
                    <span className="text-xl font-semibold text-red-600">
                      {ratingLabels[rating - 1]}
                    </span>
                  </div>
                </div>

                {/* Type Selection */}
                <div className="mb-8">
                  <label className="block text-lg font-bold text-gray-800 mb-3">
                    Τι θέλετε να αξιολογήσετε; *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setType('service')}
                      className={`p-4 rounded-xl border-2 transition ${
                        type === 'service'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">🙋</div>
                      <div className="font-semibold">Εξυπηρέτηση</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setType('product')}
                      className={`p-4 rounded-xl border-2 transition ${
                        type === 'product'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">🍽️</div>
                      <div className="font-semibold">Προϊόντα</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setType('suggestion')}
                      className={`p-4 rounded-xl border-2 transition ${
                        type === 'suggestion'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">💡</div>
                      <div className="font-semibold">Πρόταση</div>
                    </button>
                  </div>
                </div>

                {/* Comment */}
                <div className="mb-8">
                  <label className="block text-lg font-bold text-gray-800 mb-3">
                    Πείτε μας περισσότερα *
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      type === 'service' 
                        ? 'Πώς ήταν η εξυπηρέτηση; Τι θα θέλατε να βελτιώσουμε;'
                        : type === 'product'
                        ? 'Πώς σας φάνηκαν τα προϊόντα μας; Τι σας άρεσε περισσότερο;'
                        : 'Ποιες είναι οι προτάσεις σας για να γίνουμε καλύτεροι;'
                    }
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 h-40 focus:border-red-500 focus:outline-none resize-none"
                    required
                    maxLength={500}
                  />
                  <div className="text-sm text-gray-500 mt-2">
                    {comment.length} / 500 χαρακτήρες
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💬</div>
                    <div className="text-sm text-blue-800">
                      <strong>Συμβουλή:</strong> Όσο πιο λεπτομερής είναι η αξιολόγησή σας, 
                      τόσο περισσότερο μας βοηθάτε να βελτιωθούμε!
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={createMutation.isPending || !selectedOrder || !comment.trim()}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105"
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Υποβολή...
                    </span>
                  ) : (
                    '✅ Υποβολή Αξιολόγησης'
                  )}
                </button>
              </form>
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-lg mb-3">ℹ️ Σημαντικό</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Μπορείτε να αξιολογήσετε μόνο παραγγελίες που έχετε παραλάβει
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Κάθε παραγγελία μπορεί να αξιολογηθεί μία φορά
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Η αξιολόγησή σας συνδέεται με την συγκεκριμένη παραγγελία
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Μας βοηθάτε να εντοπίσουμε και να διορθώσουμε προβλήματα
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
