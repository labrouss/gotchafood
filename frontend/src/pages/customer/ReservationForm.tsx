import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';


const reservationsAPI = {
  getAvailableTables: (date: string, time: string, partySize: number) =>
    fetch(`${API_URL}/api/tables/available?date=${date}&time=${time}&partySize=${partySize}`)
      .then(r => r.json()),
  
  create: (data: any) => fetch(`${API_URL}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token && {
        'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`
      })
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),
};

export default function ReservationForm() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState(1); // 1: DateTime, 2: Table Selection, 3: Contact Info
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    partySize: 2,
    tableId: '',
    customerName: user ? `${user.firstName} ${user.lastName}` : '',
    customerPhone: user?.phone || '',
    customerEmail: user?.email || '',
    specialRequests: '',
  });

  const { data: tablesData, isLoading: loadingTables } = useQuery({
    queryKey: ['availableTables', formData.date, formData.time, formData.partySize],
    queryFn: () => reservationsAPI.getAvailableTables(formData.date, formData.time, formData.partySize),
    enabled: step === 2 && !!formData.date && !!formData.time,
  });

  const createMutation = useMutation({
    mutationFn: reservationsAPI.create,
    onSuccess: () => {
      addToast('Reservation created! We will confirm shortly.');
      navigate(user ? '/my-reservations' : '/');
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to create reservation');
    },
  });

  const availableTables = tablesData?.data?.tables || [];

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.time) {
      addToast('Please select date and time');
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = () => {
    if (!formData.tableId) {
      addToast('Please select a table');
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone) {
      addToast('Please fill in your contact information');
      return;
    }

    createMutation.mutate({
      tableId: formData.tableId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      partySize: formData.partySize,
      reservationDate: formData.date,
      reservationTime: formData.time,
      specialRequests: formData.specialRequests,
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Generate time slots (11:00 AM to 10:00 PM, every 30 minutes)
  const timeSlots = [];
  for (let hour = 11; hour <= 22; hour++) {
    for (let minute of [0, 30]) {
      if (hour === 22 && minute === 30) break;
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🍽️ Make a Reservation</h1>
          <p className="text-gray-600">Book your table in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-center">
            <div className={`flex items-center ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="ml-2 font-semibold">Date & Time</span>
            </div>
            
            <div className={`h-1 w-24 mx-4 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="ml-2 font-semibold">Select Table</span>
            </div>
            
            <div className={`h-1 w-24 mx-4 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span className="ml-2 font-semibold">Contact Info</span>
            </div>
          </div>
        </div>

        {/* Step 1: Date & Time Selection */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">When would you like to dine?</h2>
              
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={minDate}
                    max={maxDateStr}
                    className="w-full border-2 rounded-lg px-4 py-3 text-lg"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Reservations available starting tomorrow
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full border-2 rounded-lg px-4 py-3 text-lg"
                    required
                  >
                    <option value="">Select a time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>
                        {formatTime(time)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Party Size *
                  </label>
                  <select
                    value={formData.partySize}
                    onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) })}
                    className="w-full border-2 rounded-lg px-4 py-3 text-lg"
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(size => (
                      <option key={size} value={size}>
                        {size} {size === 1 ? 'person' : 'people'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700"
                >
                  Find Available Tables →
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 2: Table Selection */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Select Your Table</h2>
                <button
                  onClick={() => setStep(1)}
                  className="text-indigo-600 hover:underline"
                >
                  ← Change Date/Time
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-800">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="font-semibold">
                      {new Date(formData.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-sm">
                      {formatTime(formData.time)} · Party of {formData.partySize}
                    </div>
                  </div>
                </div>
              </div>

              {loadingTables ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <p className="mt-4 text-gray-600">Finding available tables...</p>
                </div>
              ) : availableTables.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">😔</div>
                  <h3 className="text-xl font-bold mb-2">No Tables Available</h3>
                  <p className="text-gray-600 mb-6">
                    Unfortunately, we don't have any tables available for this time slot.
                  </p>
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Try Different Time
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {availableTables.map((table: any) => (
                      <div
                        key={table.id}
                        onClick={() => setFormData({ ...formData, tableId: table.id })}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                          formData.tableId === table.id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-400'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold">{table.tableNumber}</h3>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                            ✅ Available
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          📍 {table.location || 'Main Area'}
                        </div>
                        <div className="text-sm text-gray-600">
                          👥 Seats {table.capacity}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleStep2Submit}
                    disabled={!formData.tableId}
                    className="w-full py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Contact Info →
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Contact Information */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Your Contact Information</h2>
                <button
                  onClick={() => setStep(2)}
                  className="text-indigo-600 hover:underline"
                >
                  ← Back to Tables
                </button>
              </div>

              <form onSubmit={handleFinalSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full border-2 rounded-lg px-4 py-3"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full border-2 rounded-lg px-4 py-3"
                    placeholder="+30 123 456 7890"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    We'll use this to confirm your reservation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full border-2 rounded-lg px-4 py-3"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                    className="w-full border-2 rounded-lg px-4 py-3"
                    rows={3}
                    placeholder="Allergies, seating preferences, celebration, etc."
                  />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Reservation Summary</h3>
                  <div className="text-sm space-y-1">
                    <div>📅 {new Date(formData.date).toLocaleDateString()} at {formatTime(formData.time)}</div>
                    <div>👥 Party of {formData.partySize}</div>
                    <div>🍽️ Table {availableTables.find((t: any) => t.id === formData.tableId)?.tableNumber}</div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating Reservation...' : '✓ Confirm Reservation'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  By confirming, you agree to our reservation policy. Your reservation will be pending until confirmed by our staff.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
