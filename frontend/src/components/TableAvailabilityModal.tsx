// ── TableAvailabilityModal.tsx ──────────────────────────────────────────────
// Add this as a new component file or inline in TablesManagement.tsx
// Shows time slots for a table on a selected date

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeader = () => ({
  'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`,
  'Content-Type': 'application/json'
});

interface Props {
  table: any;
  onClose: () => void;
}

export default function TableAvailabilityModal({ table, onClose }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['tableAvailability', table.id, selectedDate],
    queryFn: () => fetch(
      `${API_URL}/api/tables/${table.id}/availability?date=${selectedDate}`,
      { headers: getAuthHeader() }
    ).then(r => r.json()),
  });

  const slots = data?.data?.slots || [];
  const reservations = data?.data?.reservations || [];

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    try {
      if (time.includes('T')) {
        const timePart = time.split('T')[1];
        const [hours, minutes] = timePart.split(':').map(Number);
        const h = hours;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
      }
      const [hours, minutes] = time.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    } catch {
      return time;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'SEATED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                🍽️ Table {table.tableNumber} - Availability
              </h2>
              <p className="text-gray-600">{table.location} · Seats {table.capacity}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => changeDate(-1)}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-center font-semibold"
            />
            <button
              onClick={() => changeDate(1)}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              →
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Reservations for this day */}
              {reservations.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-3">📅 Reservations Today</h3>
                  <div className="space-y-2">
                    {reservations.map((res: any) => (
                      <div key={res.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{res.customerName}</div>
                          <div className="text-sm text-gray-600">
                            📞 {res.customerPhone} · 👥 {res.partySize} people
                          </div>
                          {res.specialRequests && (
                            <div className="text-xs text-blue-600 mt-1">
                              📝 {res.specialRequests}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatTime(res.reservationTime)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {res.durationMinutes} min
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(res.status)}`}>
                            {res.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Slots Grid */}
              <div>
                <h3 className="font-bold text-lg mb-3">🕐 Time Slots</h3>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot: any) => (
                    <div
                      key={slot.time}
                      className={`p-2 rounded-lg text-center text-sm font-semibold ${
                        slot.available
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                      title={slot.reservation ? `${slot.reservation.customerName} (${slot.reservation.partySize} people)` : 'Available'}
                    >
                      <div>{formatTime(slot.time + ':00')}</div>
                      {!slot.available && slot.reservation && (
                        <div className="text-xs mt-1 truncate">
                          {slot.reservation.customerName.split(' ')[0]}
                        </div>
                      )}
                      {slot.available && (
                        <div className="text-xs mt-1">✓ Free</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                    <span>Booked</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
