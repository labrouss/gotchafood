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

  getTables: () => fetch(`${API_URL}/api/tables`, {
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
  const [showTablesPanel, setShowTablesPanel] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionPartySize, setSessionPartySize] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['waiterDashboard'],
    queryFn: waiterAPI.getDashboard,
    enabled: !!user && user.role === 'STAFF',
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: tablesData } = useQuery({
    queryKey: ['waiter-tables'],
    queryFn: waiterAPI.getTables,
    enabled: !!user && user.role === 'STAFF',
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const startSessionMutation = useMutation({
    mutationFn: (data: { tableId: string; partySize: number; notes?: string }) => waiterAPI.startSession(data),
    onSuccess: (data) => {
      if (!data?.success) {
        addToast(data?.message || 'Failed to start session');
        return;
      }
      addToast('Walk-in session started!');
      queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['waiter-tables'] });
      setShowSessionModal(false);
      setShowTablesPanel(false);
      setSelectedTable(null);
      setSessionPartySize('');
      setSessionNotes('');
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
  const allTables = tablesData?.data?.tables || [];
  const availableTables = allTables.filter((t: any) => t.status === 'AVAILABLE');
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
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-20 border-b p-4 mb-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              👔 Waiter Dashboard
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Hello {user.firstName}! {shift?.status === 'ACTIVE' ? '🟢 On Shift' : '⚪ Off Shift'}
            </p>
          </div>

          {/* Clock In/Out & Auto Refresh */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border">
               <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                 <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="w-4 h-4" />
                 <span className="font-semibold text-sm">Auto-Refresh</span>
               </label>
               {autoRefresh && (
                 <select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))} className="border rounded px-1 py-1 text-sm">
                   <option value={3000}>3s</option>
                   <option value={5000}>5s</option>
                   <option value={10000}>10s</option>
                   <option value={30000}>30s</option>
                 </select>
               )}
            </div>
            {!shift || shift.status === 'SCHEDULED' ? (
              <button
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 w-full md:w-auto text-sm"
              >
                🟢 Clock In
              </button>
            ) : shift.status === 'ACTIVE' ? (
              <button
                onClick={() => clockOutMutation.mutate()}
                disabled={clockOutMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 w-full md:w-auto text-sm"
              >
                🔴 Clock Out
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
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
          <div className="lg:col-span-2 space-y-4">

            {/* ── Seat New Table (always visible) ── */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => setShowTablesPanel(p => !p)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🪑</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-800">Seat New Table</div>
                    <div className="text-sm text-gray-500">
                      {availableTables.length} table{availableTables.length !== 1 ? 's' : ''} available
                    </div>
                  </div>
                </div>
                <span className="text-gray-400 text-xl">{showTablesPanel ? '▲' : '▼'}</span>
              </button>

              {showTablesPanel && (
                <div className="border-t px-5 py-4">
                  {availableTables.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <div className="text-4xl mb-2">🔴</div>
                      <p className="font-semibold">No tables available right now</p>
                      <p className="text-sm mt-1">All tables are occupied or under maintenance</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {availableTables.map((table: any) => (
                        <button
                          key={table.id}
                          onClick={() => { setSelectedTable(table); setShowSessionModal(true); }}
                          className="border-2 border-green-200 hover:border-green-500 hover:bg-green-50 rounded-lg p-3 text-left transition group"
                        >
                          <div className="font-bold text-lg text-gray-800 group-hover:text-green-700">
                            {table.tableNumber}
                          </div>
                          <div className="text-xs text-gray-500">{table.location || 'Indoor'}</div>
                          <div className="text-xs text-gray-500 mt-1">👥 Cap. {table.capacity}</div>
                          <div className="mt-2 text-xs font-semibold text-green-600">✅ Available</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Active Sessions ── */}
            <div>
              <h2 className="text-2xl font-bold mb-4">🍽️ Active Tables ({sessions.length})</h2>

              {sessions.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-10 text-center">
                  <div className="text-6xl mb-3">🍽️</div>
                  <h3 className="text-xl font-bold mb-1">No Active Tables</h3>
                  <p className="text-gray-500 text-sm">Use the panel above to seat customers</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition flex flex-col"
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
                          <div className="text-sm mb-2">👤 {session.reservation.customerName}</div>
                        )}

                        <div className="text-sm text-gray-600 mb-3">
                          ⏱️ Started {new Date(session.startedAt).toLocaleTimeString()}
                        </div>

                        {session.orders && session.orders.length > 0 && (
                          <div className="border-t pt-3 mt-3">
                            <div className="text-sm font-semibold mb-2">Orders ({session.orders.length})</div>
                            <div className="space-y-1">
                              {session.orders.map((order: any) => (
                                <Link
                                  key={order.id}
                                  to={`/waiter/order/${order.id}`}
                                  className="block text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                  {order.orderNumber} — {order.status} — €{Number(order.totalAmount).toFixed(2)}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                          <button
                            onClick={() => navigate(`/waiter/take-order/${session.id}`)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700"
                          >
                            📋 View / Order
                          </button>
                          <button
                            onClick={() => { if (confirm('Complete this session?')) setPaymentSession(session); }}
                            className="px-3 py-2 bg-green-600 text-white rounded font-semibold text-sm hover:bg-green-700"
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
      </div>
      {/* Walk-in Session Modal */}
      {showSessionModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold">Start Walk-in Session</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {selectedTable.tableNumber} · {selectedTable.location || 'Indoor'} · Cap. {selectedTable.capacity}
                  </p>
                </div>
                <button onClick={() => { setShowSessionModal(false); setSelectedTable(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Party Size <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={sessionPartySize}
                    onChange={e => setSessionPartySize(e.target.value)}
                    min="1"
                    max={selectedTable.capacity}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder={`1 – ${selectedTable.capacity} guests`}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Notes (optional)</label>
                  <textarea
                    value={sessionNotes}
                    onChange={e => setSessionNotes(e.target.value)}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                    placeholder="Allergies, preferences, special requests…"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    const ps = parseInt(sessionPartySize);
                    if (!ps || ps < 1) { addToast('Please enter a valid party size'); return; }
                    startSessionMutation.mutate({
                      tableId: selectedTable.id,
                      partySize: ps,
                      notes: sessionNotes || undefined,
                    });
                  }}
                  disabled={startSessionMutation.isPending || !sessionPartySize}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startSessionMutation.isPending ? 'Starting…' : '🪑 Start Session'}
                </button>
                <button
                  onClick={() => { setShowSessionModal(false); setSelectedTable(null); setSessionPartySize(''); setSessionNotes(''); }}
                  className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
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
