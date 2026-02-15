import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';

const reservationsAPI = {
  getMyReservations: () => fetch(`${API_URL}/api/reservations/my-reservations`, {
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
};

export default function MyReservations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [filterStatus, setFilterStatus] = useState('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['myReservations'],
    queryFn: reservationsAPI.getMyReservations,
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: any) => reservationsAPI.cancel(id, reason),
    onSuccess: () => {
      addToast('Reservation cancelled');
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to cancel reservation');
    },
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const reservations = data?.data?.reservations || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingReservations = reservations.filter((r: any) => {
    const resDate = new Date(r.reservationDate);
    return resDate >= today && ['PENDING', 'CONFIRMED'].includes(r.status);
  });

  const pastReservations = reservations.filter((r: any) => {
    const resDate = new Date(r.reservationDate);
    return resDate < today || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(r.status);
  });

  const displayedReservations = filterStatus === 'upcoming' ? upcomingReservations : pastReservations;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'SEATED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const handleCancel = (id: string) => {
    const reason = prompt('Please provide a cancellation reason:');
    if (reason) {
      cancelMutation.mutate({ id, reason });
    }
  };

  const canCancel = (reservation: any) => {
    const resDateTime = new Date(`${reservation.reservationDate} ${reservation.reservationTime}`);
    const now = new Date();
    const hoursUntil = (resDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return ['PENDING', 'CONFIRMED'].includes(reservation.status) && hoursUntil > 2;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">📅 My Reservations</h1>
          <p className="text-gray-600 mt-1">Manage your table bookings</p>
        </div>
        <button
          onClick={() => navigate('/reserve')}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
        >
          + New Reservation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-green-600 text-sm">Upcoming</div>
          <div className="text-2xl font-bold text-green-700">{upcomingReservations.length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4">
          <div className="text-gray-600 text-sm">Past</div>
          <div className="text-2xl font-bold text-gray-700">{pastReservations.length}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-blue-600 text-sm">Total</div>
          <div className="text-2xl font-bold text-blue-700">{reservations.length}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow p-2 mb-6 flex gap-2">
        <button
          onClick={() => setFilterStatus('upcoming')}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            filterStatus === 'upcoming'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Upcoming ({upcomingReservations.length})
        </button>
        <button
          onClick={() => setFilterStatus('past')}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            filterStatus === 'past'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Past ({pastReservations.length})
        </button>
      </div>

      {/* Reservations List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : displayedReservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold mb-2">
            {filterStatus === 'upcoming' ? 'No Upcoming Reservations' : 'No Past Reservations'}
          </h3>
          <p className="text-gray-600 mb-6">
            {filterStatus === 'upcoming' 
              ? "You don't have any upcoming reservations. Book a table now!"
              : "You haven't made any reservations yet."}
          </p>
          {filterStatus === 'upcoming' && (
            <button
              onClick={() => navigate('/reserve')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              Make a Reservation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReservations.map((reservation: any) => (
            <div
              key={reservation.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(reservation.status)}`}>
                        {getStatusIcon(reservation.status)} {reservation.status}
                      </span>
                      <span className="text-2xl font-bold">
                        {new Date(reservation.reservationDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="text-xl font-semibold text-gray-600">
                        @ {formatTime(reservation.reservationTime)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-gray-600">Table</div>
                        <div className="font-semibold text-lg">
                          {reservation.table?.tableNumber}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {reservation.table?.location}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Party Size</div>
                        <div className="font-semibold text-lg">
                          {reservation.partySize} {reservation.partySize === 1 ? 'person' : 'people'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Duration</div>
                        <div className="font-semibold text-lg">
                          {reservation.durationMinutes} min
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Capacity</div>
                        <div className="font-semibold text-lg">
                          {reservation.table?.capacity} seats
                        </div>
                      </div>
                    </div>

                    {reservation.specialRequests && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 font-semibold mb-1">Special Requests</div>
                        <div className="text-sm text-blue-800">{reservation.specialRequests}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 md:w-40">
                    {canCancel(reservation) ? (
                      <button
                        onClick={() => handleCancel(reservation.id)}
                        disabled={cancelMutation.isPending}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    ) : reservation.status === 'PENDING' ? (
                      <div className="text-xs text-yellow-600 text-center">
                        ⏳ Awaiting confirmation
                      </div>
                    ) : reservation.status === 'CONFIRMED' ? (
                      <div className="text-xs text-green-600 text-center font-semibold">
                        ✅ Confirmed!
                        <div className="text-gray-500 mt-1">See you soon!</div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 text-center">
                        {reservation.status}
                      </div>
                    )}

                    {reservation.status === 'CANCELLED' && reservation.cancellationReason && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        Reason: {reservation.cancellationReason}
                      </div>
                    )}

                    {!canCancel(reservation) && ['PENDING', 'CONFIRMED'].includes(reservation.status) && (
                      <div className="text-xs text-gray-500 text-center mt-2">
                        Can't cancel within 2 hours of reservation time
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Created */}
                <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                  Booked on {new Date(reservation.createdAt).toLocaleDateString()} at{' '}
                  {new Date(reservation.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
