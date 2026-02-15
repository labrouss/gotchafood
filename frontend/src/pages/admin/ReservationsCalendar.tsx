import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';

const reservationsAPI = {
  getAll: () => fetch(`${API_URL}/api/reservations`, {
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),
  
  getByDate: (date: string) => fetch(`${API_URL}/api/reservations?date=${date}`, {
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),
  
  confirm: (id: string) => fetch(`${API_URL}/api/reservations/${id}/confirm`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),
  
  cancel: (id: string, reason: string) => fetch(`${API_URL}/api/reservations/${id}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`
    },
    body: JSON.stringify({ cancellationReason: reason })
  }).then(r => r.json()),
  
  noShow: (id: string) => fetch(`${API_URL}/api/reservations/${id}/no-show`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` }
  }).then(r => r.json()),
};

export default function ReservationsCalendar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', selectedDate],
    queryFn: () => reservationsAPI.getByDate(selectedDate),
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
  });

  const confirmMutation = useMutation({
    mutationFn: reservationsAPI.confirm,
    onSuccess: () => {
      addToast('Reservation confirmed!');
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to confirm reservation');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: any) => reservationsAPI.cancel(id, reason),
    onSuccess: () => {
      addToast('Reservation cancelled');
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: reservationsAPI.noShow,
    onSuccess: () => {
      addToast('Marked as no-show');
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const reservations = data?.data?.reservations || [];

  const filteredReservations = reservations.filter((r: any) => {
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'CONFIRMED': return 'bg-green-100 text-green-800 border-green-300';
      case 'SEATED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-300';
      case 'NO_SHOW': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return '⏳';
      case 'CONFIRMED': return '✅';
      case 'SEATED': return '🪑';
      case 'COMPLETED': return '✔️';
      case 'CANCELLED': return '❌';
      case 'NO_SHOW': return '👻';
      default: return '❓';
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleConfirm = (id: string) => {
    if (confirm('Confirm this reservation?')) {
      confirmMutation.mutate(id);
    }
  };

  const handleCancel = (id: string) => {
    const reason = prompt('Cancellation reason:');
    if (reason) {
      cancelMutation.mutate({ id, reason });
    }
  };

  const handleNoShow = (id: string) => {
    if (confirm('Mark as no-show?')) {
      noShowMutation.mutate(id);
    }
  };

  // Quick date navigation
  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">📅 Reservations Calendar</h1>
          <p className="text-gray-600 mt-1">Manage customer bookings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-yellow-600 text-sm">Pending</div>
          <div className="text-2xl font-bold text-yellow-700">
            {reservations.filter((r: any) => r.status === 'PENDING').length}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-green-600 text-sm">Confirmed</div>
          <div className="text-2xl font-bold text-green-700">
            {reservations.filter((r: any) => r.status === 'CONFIRMED').length}
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-blue-600 text-sm">Seated</div>
          <div className="text-2xl font-bold text-blue-700">
            {reservations.filter((r: any) => r.status === 'SEATED').length}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4">
          <div className="text-gray-600 text-sm">Completed</div>
          <div className="text-2xl font-bold text-gray-700">
            {reservations.filter((r: any) => r.status === 'COMPLETED').length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-red-600 text-sm">Cancelled</div>
          <div className="text-2xl font-bold text-red-700">
            {reservations.filter((r: any) => r.status === 'CANCELLED').length}
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg shadow p-4">
          <div className="text-orange-600 text-sm">No-Show</div>
          <div className="text-2xl font-bold text-orange-700">
            {reservations.filter((r: any) => r.status === 'NO_SHOW').length}
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeDate(-1)}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            ← Previous
          </button>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 border rounded-lg px-4 py-2 text-center font-semibold text-lg"
          />
          
          <button
            onClick={() => setSelectedDate(today)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Today
          </button>
          
          <button
            onClick={() => changeDate(1)}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Next →
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1 rounded ${filterStatus === '' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1 rounded ${filterStatus === 'PENDING' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('CONFIRMED')}
            className={`px-3 py-1 rounded ${filterStatus === 'CONFIRMED' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setFilterStatus('SEATED')}
            className={`px-3 py-1 rounded ${filterStatus === 'SEATED' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Seated
          </button>
        </div>
      </div>

      {/* Reservations List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold mb-2">No Reservations</h3>
          <p className="text-gray-600">No reservations found for this date</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReservations
            .sort((a: any, b: any) => {
              // Sort by time
              const timeA = new Date(`2000-01-01 ${a.reservationTime}`).getTime();
              const timeB = new Date(`2000-01-01 ${b.reservationTime}`).getTime();
              return timeA - timeB;
            })
            .map((reservation: any) => (
              <div
                key={reservation.id}
                className={`bg-white rounded-lg shadow hover:shadow-lg transition border-l-4 ${getStatusColor(reservation.status)}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left: Main Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(reservation.status)}`}>
                          {getStatusIcon(reservation.status)} {reservation.status}
                        </span>
                        <span className="text-2xl font-bold">{formatTime(reservation.reservationTime)}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <div className="text-sm text-gray-600">Customer</div>
                          <div className="font-semibold">{reservation.customerName}</div>
                          <div className="text-sm text-gray-600">{reservation.customerPhone}</div>
                          {reservation.customerEmail && (
                            <div className="text-sm text-gray-600">{reservation.customerEmail}</div>
                          )}
                        </div>

                        <div>
                          <div className="text-sm text-gray-600">Table & Party</div>
                          <div className="font-semibold">
                            Table {reservation.table?.tableNumber} ({reservation.table?.location})
                          </div>
                          <div className="text-sm text-gray-600">
                            Party of {reservation.partySize}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-600">Duration</div>
                          <div className="font-semibold">{reservation.durationMinutes} minutes</div>
                          {reservation.specialRequests && (
                            <div className="text-sm text-gray-600 mt-1">
                              📝 {reservation.specialRequests}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {reservation.status === 'PENDING' && user.role === 'ADMIN' && (
                        <>
                          <button
                            onClick={() => handleConfirm(reservation.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 whitespace-nowrap"
                          >
                            ✅ Confirm
                          </button>
                          <button
                            onClick={() => handleCancel(reservation.id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 whitespace-nowrap"
                          >
                            ❌ Cancel
                          </button>
                        </>
                      )}

                      {reservation.status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => handleNoShow(reservation.id)}
                            className="px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 whitespace-nowrap"
                          >
                            👻 No-Show
                          </button>
                          <button
                            onClick={() => navigate(`/waiter/table/${reservation.table?.id}`)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 whitespace-nowrap"
                          >
                            🪑 Seat
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setSelectedReservation(reservation)}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 whitespace-nowrap"
                      >
                        👁️ Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Reservation Details</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getStatusColor(selectedReservation.status)}`}>
                      {getStatusIcon(selectedReservation.status)} {selectedReservation.status}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Reservation ID</div>
                    <div className="font-mono text-sm">{selectedReservation.id.substring(0, 8)}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm text-gray-600">Name</div>
                      <div className="font-semibold">{selectedReservation.customerName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Phone</div>
                      <div className="font-semibold">{selectedReservation.customerPhone}</div>
                    </div>
                    {selectedReservation.customerEmail && (
                      <div className="col-span-2">
                        <div className="text-sm text-gray-600">Email</div>
                        <div className="font-semibold">{selectedReservation.customerEmail}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Reservation Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm text-gray-600">Date</div>
                      <div className="font-semibold">
                        {new Date(selectedReservation.reservationDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Time</div>
                      <div className="font-semibold">{formatTime(selectedReservation.reservationTime)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Table</div>
                      <div className="font-semibold">
                        {selectedReservation.table?.tableNumber} ({selectedReservation.table?.location})
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Party Size</div>
                      <div className="font-semibold">{selectedReservation.partySize} people</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Duration</div>
                      <div className="font-semibold">{selectedReservation.durationMinutes} minutes</div>
                    </div>
                  </div>
                </div>

                {selectedReservation.specialRequests && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Special Requests</h3>
                    <p className="text-gray-700">{selectedReservation.specialRequests}</p>
                  </div>
                )}

                {selectedReservation.notes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Internal Notes</h3>
                    <p className="text-gray-700">{selectedReservation.notes}</p>
                  </div>
                )}

                {selectedReservation.confirmedByUser && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Confirmation</h3>
                    <p className="text-sm">
                      Confirmed by {selectedReservation.confirmedByUser.firstName} {selectedReservation.confirmedByUser.lastName}
                      {selectedReservation.confirmedAt && ` on ${new Date(selectedReservation.confirmedAt).toLocaleString()}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
