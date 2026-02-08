import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminAPI.getDashboard,
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const stats = data?.data?.stats;
  const popularItems = data?.data?.popularItems || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">📊 Admin Dashboard</h1>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-semibold">
                    Σύνολο Παραγγελιών
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {stats?.totalOrders || 0}
                  </p>
                </div>
                <div className="text-5xl opacity-50">📦</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-semibold">
                    Σήμερα
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {stats?.todayOrders || 0}
                  </p>
                </div>
                <div className="text-5xl opacity-50">📈</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-semibold">
                    Συνολικά Έσοδα
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    €{stats?.totalRevenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="text-5xl opacity-50">💰</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-semibold">
                    Σε Αναμονή
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {stats?.pendingOrders || 0}
                  </p>
                </div>
                <div className="text-5xl opacity-50">⏳</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <button
              onClick={() => navigate('/admin/kitchen')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-2 border-white rounded-lg p-6 text-left transition shadow-lg"
            >
              <div className="text-4xl mb-2">🍳</div>
              <h3 className="font-bold text-lg">Kitchen Display</h3>
              <p className="text-sm text-purple-100">Live order view</p>
            </button>

            <button
              onClick={() => navigate('/admin/categories')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-left transition"
            >
              <div className="text-3xl mb-2">📂</div>
              <h3 className="font-bold text-lg">Κατηγορίες</h3>
              <p className="text-sm text-gray-600">Διαχείριση κατηγοριών</p>
            </button>

            <button
              onClick={() => navigate('/admin/products')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-left transition"
            >
              <div className="text-3xl mb-2">🍽️</div>
              <h3 className="font-bold text-lg">Προϊόντα</h3>
              <p className="text-sm text-gray-600">Διαχείριση μενού</p>
            </button>

            <button
              onClick={() => navigate('/admin/orders')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-left transition"
            >
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-bold text-lg">Παραγγελίες</h3>
              <p className="text-sm text-gray-600">Διαχείριση παραγγελιών</p>
            </button>

            <button
              onClick={() => navigate('/admin/customers')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-left transition"
            >
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-bold text-lg">Πελάτες</h3>
              <p className="text-sm text-gray-600">Διαχείριση πελατών</p>
            </button>
          </div>

          {/* Popular Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">⭐ Δημοφιλή Προϊόντα</h2>
            <div className="space-y-3">
              {popularItems.map((item: any, index: number) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-400">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        €{item.price?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {item.ordersCount} παραγγελίες
                    </p>
                    <p className="text-sm text-gray-600">
                      {item.totalQuantity} τεμάχια
                    </p>
                  </div>
                </div>
              ))}
              {popularItems.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Δεν υπάρχουν δεδομένα ακόμα
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
