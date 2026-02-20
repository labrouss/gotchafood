import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import { Link } from 'react-router-dom';
import PaymentModal from '../../components/PaymentModal';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';

const waiterAPI = {
  getDashboard: () => fetch(`${API_URL}/api/waiter/dashboard`, {
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),

  clockIn: () => fetch(`${API_URL}/api/waiter/clock-in`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),

  clockOut: () => fetch(`${API_URL}/api/waiter/clock-out`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),

  startSession: (data: any) => fetch(`${API_URL}/api/waiter/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  endSession: (id: string) => fetch(`${API_URL}/api/waiter/sessions/${id}/end`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),
};

const reservationsAPI = {
  seat: (id: string) => fetch(`${API_URL}/api/reservations/${id}/seat`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),
};

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const [paymentSession, setPaymentSession] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['waiterDashboard'],
    queryFn: waiterAPI.getDashboard,
    enabled: !!user && user.role === 'STAFF',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const startSessionMutation = useMutation({
    mutationFn: (data: { tableId: string; partySize: number; notes?: string }) => waiterAPI.startSession(data),
    onSuccess: (data) => {
      addToast('Walk-in session started!');
      queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });

      if (data?.data?.session?.id) {
        navigate(`/waiter/take-order/${data.data.session.id}`);
      }
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to start session');
    },
  });

  const clockInMutation = useMutation({
    mutationFn: waiterAPI.clockIn,
    onSuccess: () => {
      addToast('Clocked in successfully!');
      refetch();
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to clock in');
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: waiterAPI.clockOut,
    onSuccess: () => {
      addToast('Clocked out successfully!');
      refetch();
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to clock out');
    },
  });

  const seatMutation = useMutation({
    mutationFn: reservationsAPI.seat,
    onSuccess: (data) => {
      addToast('Customer seated!');
      queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });

      // Navigate to take order if session was created
      if (data?.data?.session?.id) {
        navigate(`/waiter/take-order/${data.data.session.id}`);
      }
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to seat customer');
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: waiterAPI.endSession,
    onSuccess: () => {
      addToast('✅ Session completed! Table is now available.');
      queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
      setPaymentSession(null);
    },
    onError: (error: any) => {
      console.error('Session close error:', error);
      addToast(`❌ Failed to close session: ${error.message || 'Unknown error'}`);
    },
  });

  if (!user || user.role !== 'STAFF') {
    navigate('/');
    return null;
  }

  const dashboard = data?.data || {};
  const sessions = dashboard.sessions || [];
  const shift = dashboard.shift;
  const pendingReservations = dashboard.pendingReservations || [];
  const stats = dashboard.stats || {};

  const formatTime = (time: string) => {
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600';
      case 'CONFIRMED': return 'text-blue-600';
      case 'PREPARING': return 'text-orange-600';
      case 'OUT_FOR_DELIVERY': return 'text-purple-600';
      case 'DELIVERED': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            👔 Waiter Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Hello {user.firstName}! {shift?.status === 'ACTIVE' ? '🟢 On Shift' : '⚪ Off Shift'}
          </p>
        </div>

        {/* Clock In/Out */}
        <div>
          {!shift || shift.status === 'SCHEDULED' ? (
            <button
              onClick={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              🟢 Clock In
            </button>
          ) : shift.status === 'ACTIVE' ? (
            <button
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            >
              🔴 Clock Out
            </button>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-blue-600 text-sm">Active Tables</div>
          <div className="text-3xl font-bold text-blue-700">{stats.activeTables || 0}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-green-600 text-sm">Today's Revenue</div>
          <div className="text-3xl font-bold text-green-700">
            €{(stats.totalRevenue || 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-yellow-600 text-sm">Pending Reservations</div>
          <div className="text-3xl font-bold text-yellow-700">{pendingReservations.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Sessions - Main Area */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4">🍽️ Active Tables ({sessions.length})</h2>

            {sessions.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🪑</div>
                <h3 className="text-xl font-bold mb-2">No Active Tables</h3>
                <p className="text-gray-600">Seat customers from pending reservations or start a walk-in session</p>

                <button
                  onClick={() => {
                    navigate('/admin/tables-management');
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  🪑 View Tables & Start Walk-in
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                  //onClick={() => navigate(`/waiter/session/${session.id}`)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-2xl font-bold">{session.table.tableNumber}</h3>
                          <p className="text-sm text-gray-600">{session.table.location}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Party of</div>
                          <div className="text-2xl font-bold">{session.partySize}</div>
                        </div>
                      </div>

                      {session.reservation && (
                        <div className="text-sm mb-2">
                          👤 {session.reservation.customerName}
                        </div>
                      )}

                      <div className="text-sm text-gray-600 mb-3">
                        ⏱️ Started {new Date(session.startedAt).toLocaleTimeString()}
                      </div>

                      {/* Orders */}
                      {session.orders && session.orders.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-sm font-semibold mb-2">
                            Orders ({session.orders.length})
                          </div>
                          <div className="space-y-1">
                            {session.orders.map((order: any) => (
                              <Link
                                key={order.id}
                                to={`/waiter/order/${order.id}`}
                                className="block text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                              >
                                {order.orderNumber} - {order.status} - €{Number(order.totalAmount).toFixed(2)}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/waiter/take-order/${session.id}`);
                          }}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          📋 View Details / Take Order
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Complete this session?')) {
                              setPaymentSession(session);
                            }
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          ✓ Complete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Reservations Sidebar */}
          <div>
            <h2 className="text-xl font-bold mb-4">📅 Today's Reservations</h2>

            {pendingReservations.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-sm text-gray-600">No pending reservations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReservations.map((reservation: any) => (
                  <div key={reservation.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-lg font-bold">
                        {formatTime(reservation.reservationTime)}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        CONFIRMED
                      </span>
                    </div>

                    <div className="text-sm space-y-1 mb-3">
                      <div>👤 {reservation.customerName}</div>
                      <div>🍽️ Table {reservation.table.tableNumber}</div>
                      <div>👥 Party of {reservation.partySize}</div>
                    </div>

                    <button
                      onClick={() => seatMutation.mutate(reservation.id)}
                      disabled={seatMutation.isPending}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      🪑 Seat Customer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {paymentSession && (
        <PaymentModal
          session={paymentSession}
          onConfirm={() => {
            endSessionMutation.mutate(paymentSession.id);
          }}
          onCancel={() => setPaymentSession(null)}
          isProcessing={endSessionMutation.isPending}
        />
      )}
    </div>
  );
}

