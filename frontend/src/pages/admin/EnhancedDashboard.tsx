import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function EnhancedDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState('week');

  const { data: dashboardData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminAPI.getDashboard,
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => analyticsAPI.getAnalytics(period),
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const stats = dashboardData?.data?.stats;
  const analytics = analyticsData?.data;

  // Revenue Chart Data
  const revenueChartData = {
    labels: analytics?.revenueByDate?.map((d: any) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('el-GR', { month: 'short', day: 'numeric' });
    }) || [],
    datasets: [
      {
        label: 'Έσοδα (€)',
        data: analytics?.revenueByDate?.map((d: any) => d.revenue) || [],
        borderColor: 'rgb(220, 38, 38)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Orders by Hour Chart Data
  const ordersHourData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Παραγγελίες',
        data: Array.from({ length: 24 }, (_, hour) => {
          const found = analytics?.ordersByHour?.find((o: any) => o.hour === hour);
          return found ? found.count : 0;
        }),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Period Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">📊 Analytics Dashboard</h1>
          <p className="text-gray-600">Αναλυτικά στατιστικά για την επιχείρησή σας</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'day', label: 'Σήμερα' },
            { key: 'week', label: 'Εβδομάδα' },
            { key: 'month', label: 'Μήνας' },
            { key: 'year', label: 'Έτος' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                period === p.key
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90 mb-1">Παραγγελίες</div>
                  <div className="text-3xl font-bold">
                    {analytics?.summary?.totalOrders || 0}
                  </div>
                  <div className="text-xs opacity-75 mt-2">
                    Για την περίοδο: {period === 'day' ? 'σήμερα' : period === 'week' ? 'αυτή την εβδομάδα' : period === 'month' ? 'αυτόν τον μήνα' : 'αυτό το έτος'}
                  </div>
                </div>
                <div className="text-5xl opacity-50">📦</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90 mb-1">Συνολικά Έσοδα</div>
                  <div className="text-3xl font-bold">
                    €{analytics?.summary?.totalRevenue?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-xs opacity-75 mt-2">
                    Καθαρά κέρδη από παραγγελίες
                  </div>
                </div>
                <div className="text-5xl opacity-50">💰</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90 mb-1">Μέση Αξία</div>
                  <div className="text-3xl font-bold">
                    €{analytics?.summary?.averageOrderValue?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-xs opacity-75 mt-2">
                    Ανά παραγγελία
                  </div>
                </div>
                <div className="text-5xl opacity-50">📈</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📊</span>
                Έσοδα ανά Ημέρα
              </h2>
              <div className="h-64">
                {analytics?.revenueByDate?.length > 0 ? (
                  <Line data={revenueChartData} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Δεν υπάρχουν δεδομένα για την περίοδο
                  </div>
                )}
              </div>
            </div>

            {/* Orders by Hour */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>⏰</span>
                Παραγγελίες ανά Ώρα
              </h2>
              <div className="h-64">
                {analytics?.ordersByHour?.length > 0 ? (
                  <Bar data={ordersHourData} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Δεν υπάρχουν δεδομένα για την περίοδο
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Customers */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>🏆</span>
                Top Πελάτες
              </h2>
              {analytics?.topCustomers?.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topCustomers.map((customer: any, index: number) => (
                    <div
                      key={customer.userId}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`font-bold text-lg ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-orange-600' :
                          'text-gray-500'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            {customer.orderCount} {customer.orderCount === 1 ? 'παραγγελία' : 'παραγγελίες'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          €{customer.totalSpent.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          €{(customer.totalSpent / customer.orderCount).toFixed(2)}/παρ.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Δεν υπάρχουν δεδομένα
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>⭐</span>
                Top Προϊόντα
              </h2>
              {analytics?.topProducts?.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topProducts.map((product: any, index: number) => (
                    <div
                      key={product.productId}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`font-bold text-lg ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-orange-600' :
                          'text-gray-500'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            {product.quantitySold} {product.quantitySold === 1 ? 'πώληση' : 'πωλήσεις'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          €{product.revenue.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          €{(product.revenue / product.quantitySold).toFixed(2)}/τεμ.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Δεν υπάρχουν δεδομένα
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-4">Γρήγορες Ενέργειες</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="bg-white hover:bg-gray-100 border-2 border-gray-200 rounded-lg p-4 text-center transition"
              >
                <div className="text-2xl mb-2">🏠</div>
                <div className="text-sm font-semibold">Dashboard</div>
              </button>
              <button
                onClick={() => navigate('/admin/orders')}
                className="bg-white hover:bg-gray-100 border-2 border-gray-200 rounded-lg p-4 text-center transition"
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="text-sm font-semibold">Παραγγελίες</div>
              </button>
              <button
                onClick={() => navigate('/admin/products')}
                className="bg-white hover:bg-gray-100 border-2 border-gray-200 rounded-lg p-4 text-center transition"
              >
                <div className="text-2xl mb-2">🍽️</div>
                <div className="text-sm font-semibold">Προϊόντα</div>
              </button>
              <button
                onClick={() => navigate('/admin/kitchen')}
                className="bg-white hover:bg-gray-100 border-2 border-gray-200 rounded-lg p-4 text-center transition"
              >
                <div className="text-2xl mb-2">🍳</div>
                <div className="text-sm font-semibold">Kitchen</div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
