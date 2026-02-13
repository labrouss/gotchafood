import { useQuery } from '@tanstack/react-query';
import { orderAPI, reviewAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const statusColors: any = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: any = {
  PENDING: 'Σε Αναμονή',
  CONFIRMED: 'Επιβεβαιωμένη',
  PREPARING: 'Προετοιμασία',
  OUT_FOR_DELIVERY: 'Σε Παράδοση',
  DELIVERED: 'Παραδόθηκε',
  CANCELLED: 'Ακυρώθηκε',
};

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: orderAPI.getAll,
    enabled: !!user,
  });

  // Fetch reviews to check which orders have been reviewed
  const { data: reviewsData } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: reviewAPI.getMyReviews,
    enabled: !!user,
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const orders = data?.data?.orders || [];
  
  // Create a set of reviewed order IDs
  const reviewedOrderIds = new Set(
    (reviewsData?.data?.reviews || [])
      .filter((review: any) => review.orderId)
      .map((review: any) => review.orderId)
  );

  const canReviewOrder = (order: any) => {
    return order.status === 'DELIVERED' && !reviewedOrderIds.has(order.id);
  };

  const hasReviewed = (order: any) => {
    return reviewedOrderIds.has(order.id);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Οι Παραγγελίες μου</h1>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold mb-4">Δεν έχετε παραγγελίες ακόμα</h2>
          <p className="text-gray-600 mb-8">
            Ξεκινήστε την πρώτη σας παραγγελία από το μενού μας!
          </p>
          <button
            onClick={() => navigate('/menu')}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            Περιηγηθείτε στο Μενού
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">
                    Παραγγελία #{order.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('el-GR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    statusColors[order.status]
                  }`}
                >
                  {statusLabels[order.status]}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2 mb-4">
                  {order.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.quantity}x {item.menuItem.name}
                      </span>
                      <span className="font-semibold">
                        €{parseFloat(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Υποσύνολο</span>
                    <span>€{parseFloat(order.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Παράδοση</span>
                    <span>
                      {parseFloat(order.deliveryFee) === 0
                        ? 'Δωρεάν'
                        : `€${parseFloat(order.deliveryFee).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Σύνολο</span>
                    <span className="text-red-600">
                      €{parseFloat(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {order.address && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-semibold mb-1">
                      Διεύθυνση Παράδοσης
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.address.street} {order.address.number},{' '}
                      {order.address.city} {order.address.postalCode}
                    </p>
                  </div>
                )}

                {order.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-semibold mb-1">Σημειώσεις</p>
                    <p className="text-sm text-gray-600">{order.notes}</p>
                  </div>
                )}

                {/* Review Button */}
                {canReviewOrder(order) && (
                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={() => navigate(`/review?orderId=${order.id}`)}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                    >
                      <span>⭐</span>
                      <span>Αξιολογήστε αυτή την παραγγελία</span>
                    </button>
                  </div>
                )}

                {hasReviewed(order) && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 text-green-800">
                        <span className="text-xl">✅</span>
                        <span className="font-semibold">Αξιολογήθηκε</span>
                      </div>
                      <button
                        onClick={() => navigate('/my-reviews')}
                        className="text-green-700 hover:text-green-800 font-semibold text-sm"
                      >
                        Δείτε την αξιολόγηση →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
