import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import { useEffect } from 'react';  


import TableAvailabilityModal from '../../components/TableAvailabilityModal';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';


const tablesAPI = {
  getAll: () => fetch(`${API_URL}/api/tables`, {
    headers: {
      'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`,
      'Content-Type': 'application/json'
    }
  }).then(r => r.json()),

  create: (data: any) => fetch(`${API_URL}/api/tables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  update: (id: string, data: any) => fetch(`${API_URL}/api/tables/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  delete: (id: string) => fetch(`${API_URL}/api/tables/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`,
      'Content-Type': 'application/json'
    }
  }).then(r => r.json()),

  updateStatus: (id: string, status: string) => fetch(`${API_URL}/api/tables/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`
    },
    body: JSON.stringify({ status })
  }).then(r => r.json()),

  generateQR: (id: string) => fetch(`${API_URL}/api/tables/${id}/qr`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}`,
      'Content-Type': 'application/json'
    }
  }).then(r => r.json()),
};

export default function TablesManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [availabilityTable, setAvailabilityTable] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  
  const [formData, setFormData] = useState({
    tableNumber: '',
    capacity: 2,
    location: 'Indoor',
    notes: '',
    sortOrder: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: tablesAPI.getAll,
    enabled: !!user && user.role === 'ADMIN', 
  });

  const createMutation = useMutation({
    mutationFn: tablesAPI.create,
    onSuccess: () => {
      addToast('Table created successfully!');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to create table');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => tablesAPI.update(id, data),
    onSuccess: () => {
      addToast('Table updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to update table');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tablesAPI.delete,
    onSuccess: () => {
      addToast('Table deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (error: any) => {
      addToast(error.message || 'Failed to delete table');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => tablesAPI.updateStatus(id, status),
    onSuccess: () => {
      addToast('Table status updated!');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const qrMutation = useMutation({
    mutationFn: tablesAPI.generateQR,
    onSuccess: (data) => {
      addToast('QR code generated!');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      // TODO: Show QR code in modal
    },
  });

  const startSessionMutation = useMutation({
  mutationFn: (data: { tableId: string; partySize: number; notes?: string }) =>
    fetch(`${API_URL}/api/waiter/sessions/start`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }).then(r => r.json()),
  onSuccess: (data) => {
    addToast('Walk-in session started!');
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    setShowSessionModal(false);
    
    if (data?.data?.session?.id) {
      navigate(`/waiter/take-order/${data.data.session.id}`);
    }
  },
});

  // Allow ADMIN and STAFF (waiters)
   useEffect(() => {
     if (!user || !['ADMIN', 'STAFF'].includes(user.role)) {
       navigate('/');
     }
   }, [user, navigate]);
   
   // Loading state
   if (!user) {
     return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
       </div>
     );
   }
   
   // Block unauthorized
   if (!['ADMIN', 'STAFF'].includes(user.role)) {
     return null;
   }
   
  // Show access denied for non-admin
  if (user.role !== 'ADMIN', 'STAFF' ) {
    return null; // Will redirect via useEffect
  }


  const tables = data?.data?.tables || [];

  const filteredTables = tables.filter((table: any) => {
    if (filterLocation && table.location !== filterLocation) return false;
    if (filterStatus && table.status !== filterStatus) return false;
    return true;
  });

  const resetForm = () => {
    setFormData({
      tableNumber: '',
      capacity: 2,
      location: 'Indoor',
      notes: '',
      sortOrder: 0,
    });
    setEditingTable(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (table: any) => {
    setEditingTable(table);
    setFormData({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      location: table.location || 'Indoor',
      notes: table.notes || '',
      sortOrder: table.sortOrder || 0,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this table?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'OCCUPIED': return 'bg-red-100 text-red-800';
      case 'RESERVED': return 'bg-yellow-100 text-yellow-800';
      case 'MAINTENANCE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return '✅';
      case 'OCCUPIED': return '🔴';
      case 'RESERVED': return '📅';
      case 'MAINTENANCE': return '🔧';
      default: return '❓';
    }
  };

  const locations = [...new Set(tables.map((t: any) => t.location).filter(Boolean))];
  if (locations.length === 0) locations.push('Indoor', 'Outdoor', 'Patio');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">🍽️ Tables Management</h1>
          <p className="text-gray-600 mt-1">Manage restaurant tables and floor plan</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
        >
          + Add Table
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-600 text-sm">Total Tables</div>
          <div className="text-2xl font-bold">{tables.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-green-600 text-sm">Available</div>
          <div className="text-2xl font-bold text-green-700">
            {tables.filter((t: any) => t.status === 'AVAILABLE').length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-red-600 text-sm">Occupied</div>
          <div className="text-2xl font-bold text-red-700">
            {tables.filter((t: any) => t.status === 'OCCUPIED').length}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-yellow-600 text-sm">Reserved</div>
          <div className="text-2xl font-bold text-yellow-700">
            {tables.filter((t: any) => t.status === 'RESERVED').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">All Locations</option>
            {locations.map((loc: any) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
        <div className="pt-6">
          <button
            onClick={() => {
              setFilterLocation('');
              setFilterStatus('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-xl font-bold mb-2">No Tables Found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first table</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            + Add Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table: any) => (
            <div key={table.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold">{table.tableNumber}</h3>
                    <p className="text-sm text-gray-600">{table.location || 'No location'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(table.status)}`}>
                    {getStatusIcon(table.status)} {table.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="ml-2 font-semibold">{table.capacity} people</span>
                  </div>
                  {table.hasActiveSession && (
                    <div className="flex items-center text-sm text-orange-600">
                      <span>🔴 Active Session</span>
                    </div>
                  )}
                  {table.pendingReservations > 0 && (
                    <div className="flex items-center text-sm text-blue-600">
                      <span>📅 {table.pendingReservations} reservation(s)</span>
                    </div>
                  )}
                </div>

                {table.notes && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{table.notes}</p>
                )}

                {/* Quick Status Change */}
                <div className="mb-3">
                  <label className="text-xs text-gray-600 block mb-1">Quick Status:</label>
                  <select
                    value={table.status}
                    onChange={(e) => statusMutation.mutate({ id: table.id, status: e.target.value })}
                    className="w-full text-sm border rounded px-2 py-1"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(table)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => qrMutation.mutate(table.id)}
                    className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    title="Generate QR Code"
                  >
                    📱
                  </button>
		  <button
                    onClick={() => setAvailabilityTable(table)}
                    className="px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                    title="View Availability"
                  >
                    📅
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
		   {/* Start Walk-in Session Button */}
                {table.status === 'AVAILABLE' && (
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setShowSessionModal(true);
                    }}
                    className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    🪑 Start Walk-in Session
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Table Number *
                  </label>
                  <input
                    type="text"
                    value={formData.tableNumber}
                    onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="T1, T2, A1, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                    min="1"
                    max="20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Patio">Patio</option>
                    <option value="Bar">Bar</option>
                    <option value="Private">Private Room</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="Special features, restrictions, etc."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingTable
                      ? 'Update Table'
                      : 'Create Table'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
       {/* Availability Modal */}
      {availabilityTable && (
        <TableAvailabilityModal
          table={availabilityTable}
          onClose={() => setAvailabilityTable(null)}
        />
      )}
      {/* Walk-in Session Modal */}
      {showSessionModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">
              Start Walk-in Session
            </h3>
            <p className="text-gray-600 mb-4">
              Table {selectedTable.tableNumber} - {selectedTable.location}
              <br />
              <span className="text-sm">Capacity: {selectedTable.capacity} guests</span>
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const partySize = parseInt(formData.get('partySize') as string);
              const notes = formData.get('notes') as string;

              startSessionMutation.mutate({
                tableId: selectedTable.id,
                partySize,
                notes: notes || undefined,
              });
            }}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Party Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="partySize"
                  min="1"
                  max={selectedTable.capacity}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  placeholder={`Max ${selectedTable.capacity} guests`}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  placeholder="Any special requests or notes..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={startSessionMutation.isPending}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startSessionMutation.isPending ? 'Starting...' : '🪑 Start Session'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSessionModal(false);
                    setSelectedTable(null);
                  }}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
   
    </div>  // ← Final closing div
  );
}
