import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useState } from 'react';
import { useToastStore } from '../../components/ToastContainer';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const roles = [
  { value: 'CUSTOMER', label: 'Customer', color: 'bg-gray-500' },
  { value: 'STAFF', label: 'Staff', color: 'bg-blue-500' },
  { value: 'ADMIN', label: 'Admin', color: 'bg-red-500' },
];

const routingRoles = [
  { value: null, label: 'None', icon: '❌', color: 'bg-gray-400' },
  { value: 'delivery', label: 'Delivery', icon: '🚗', color: 'bg-indigo-600' },
  { value: 'counter', label: 'Counter', icon: '🧑‍💼', color: 'bg-teal-600' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳', color: 'bg-red-600' },
  { value: 'hot-prep', label: 'Hot Prep', icon: '🔥', color: 'bg-orange-600' },
  { value: 'cold-prep', label: 'Cold Prep', icon: '🥗', color: 'bg-green-600' },
  { value: 'barista', label: 'Barista', icon: '☕', color: 'bg-amber-700' },
  { value: 'waiter', label: 'Waiter', icon: '☕', color: 'bg-amber-700' },
];

export default function StaffManagement() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  
  const [filterRole, setFilterRole] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPerformance, setShowPerformance] = useState(true);

  const isAuthorized = !!user && (user.role === 'ADMIN' || user.role === 'STAFF');

  const { data, isLoading } = useQuery({
    queryKey: ['all-customers'],
    queryFn: () => adminAPI.getCustomers(),
    enabled: isAuthorized,
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['staff-performance', selectedDate],
    queryFn: () => {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      return adminAPI.getStaffPerformance(start.toISOString(), end.toISOString());
    },
    enabled: isAuthorized && showPerformance,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminAPI.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-customers'] });
      addToast('Role updated successfully!');
    },
    onError: () => {
      addToast('Failed to update role');
    },
  });

  const updateRoutingMutation = useMutation({
    mutationFn: ({ userId, routingRole }: { userId: string; routingRole: string | null }) =>
      adminAPI.updateUserRoutingRole(userId, routingRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-customers'] });
      addToast('Station assignment updated!');
      setEditingUser(null);
    },
    onError: () => {
      addToast('Failed to update station');
    },
  });

  // Redirect if not authorized
  if (!isAuthorized) {
    navigate('/');
    return null;
  }

  const users = data?.data?.customers || [];
  
  // Filter users
  const filteredUsers = users.filter((u: any) => {
    const roleMatch = filterRole === 'all' || u.role === filterRole;
    const stationMatch = filterStation === 'all' || u.routingRole === filterStation;
    return roleMatch && stationMatch;
  });

  // Group by role
  const staffUsers = filteredUsers.filter((u: any) => u.role === 'STAFF' || u.role === 'ADMIN');
  const customerUsers = filteredUsers.filter((u: any) => u.role === 'CUSTOMER');

  const getStationInfo = (routingRole: string | null) => {
    const station = routingRoles.find(r => r.value === routingRole);
    return station || routingRoles[0];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">👥 Staff Management</h1>
        <p className="text-gray-600">Manage user roles and station assignments</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Station
            </label>
            <select
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="all">All Stations</option>
              {routingRoles.filter(r => r.value !== null).map(station => (
                <option key={station.value} value={station.value}>
                  {station.icon} {station.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="bg-gray-50 rounded-lg p-4 w-full">
              <div className="text-2xl font-bold text-gray-800">{filteredUsers.length}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">
            {users.filter((u: any) => u.role === 'ADMIN').length}
          </div>
          <div className="text-sm text-red-600">Admins</div>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">
            {users.filter((u: any) => u.role === 'STAFF').length}
          </div>
          <div className="text-sm text-blue-600">Staff Members</div>
        </div>
        
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">
            {users.filter((u: any) => u.routingRole).length}
          </div>
          <div className="text-sm text-green-600">Assigned to Stations</div>
        </div>
        
        <div className="bg-gray-50 border-l-4 border-gray-500 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-700">
            {users.filter((u: any) => u.role === 'CUSTOMER').length}
          </div>
          <div className="text-sm text-gray-600">Customers</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
          {/* Performance Statistics Section */}
          {showPerformance && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">📊 Daily Performance</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <button
                    onClick={() => setShowPerformance(!showPerformance)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                  >
                    Hide
                  </button>
                </div>
              </div>

              {performanceLoading ? (
                <div className="text-center py-6">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {performanceData?.data?.performance
                    ?.filter((p: any) => p.stats.totalActions > 0)
                    .map((perf: any) => (
                      <div key={perf.user.id} className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">
                              {perf.user.firstName} {perf.user.lastName}
                            </h3>
                            <div className="flex items-center gap-2 text-sm">
                              <span className={`px-2 py-0.5 rounded text-white text-xs font-semibold ${
                                perf.user.role === 'ADMIN' ? 'bg-red-500' : 'bg-blue-500'
                              }`}>
                                {perf.user.role}
                              </span>
                              {perf.user.routingRole && (
                                <span className="text-gray-600">
                                  {routingRoles.find(r => r.value === perf.user.routingRole)?.icon}{' '}
                                  {perf.user.routingRole}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">
                              {perf.stats.totalActions}
                            </div>
                            <div className="text-xs text-gray-600">Actions</div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {perf.stats.ordersConfirmed > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">✓ Orders Confirmed:</span>
                              <span className="font-bold text-gray-800">{perf.stats.ordersConfirmed}</span>
                            </div>
                          )}
                          
                          {perf.stats.itemsPrepared > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">🍳 Items Prepared:</span>
                              <span className="font-bold text-gray-800">{perf.stats.itemsPrepared}</span>
                            </div>
                          )}
                          
                          {perf.stats.ordersDelivered > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">🚗 Orders Delivered:</span>
                              <span className="font-bold text-gray-800">{perf.stats.ordersDelivered}</span>
                            </div>
                          )}

                          {perf.stats.totalRevenue > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="text-gray-600">💰 Revenue:</span>
                              <span className="font-bold text-green-600">
                                €{perf.stats.totalRevenue.toFixed(2)}
                              </span>
                            </div>
                          )}

                          {perf.stats.avgPrepTime > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">⏱️ Avg Prep Time:</span>
                              <span className="font-semibold text-gray-800">{perf.stats.avgPrepTime} min</span>
                            </div>
                          )}

                          {perf.stats.avgDeliveryTime > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">🕐 Avg Delivery:</span>
                              <span className="font-semibold text-gray-800">{perf.stats.avgDeliveryTime} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {performanceData?.data?.performance?.filter((p: any) => p.stats.totalActions > 0).length === 0 && (
                <div className="text-center py-8 bg-white rounded-lg shadow-md">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-gray-600">No activity recorded for this date</p>
                </div>
              )}
            </div>
          )}

          {!showPerformance && (
            <div className="mb-6">
              <button
                onClick={() => setShowPerformance(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                📊 Show Performance Statistics
              </button>
            </div>
          )}

          {/* Staff Section */}
          {staffUsers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                👔 Staff & Admins ({staffUsers.length})
              </h2>
              <div className="space-y-4">
                {staffUsers.map((user: any) => (
                  <div key={user.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">
                            {user.firstName} {user.lastName}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${
                            user.role === 'ADMIN' ? 'bg-red-500' : 'bg-blue-500'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-600">{user.phone || 'No phone'}</p>
                      </div>

                      {/* Current Station */}
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Current Station:</div>
                          <div className={`px-4 py-2 rounded-lg text-white font-bold flex items-center gap-2 ${
                            getStationInfo(user.routingRole).color
                          }`}>
                            <span className="text-xl">{getStationInfo(user.routingRole).icon}</span>
                            <span>{getStationInfo(user.routingRole).label}</span>
                          </div>
                        </div>

                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold"
                        >
                          {editingUser === user.id ? 'Cancel' : 'Edit'}
                        </button>
                      </div>
                    </div>

                    {/* Edit Panel */}
                    {editingUser === user.id && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-4">Update Assignments:</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Role Selection */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              System Role
                            </label>
                            <div className="space-y-2">
                              {roles.map((role) => (
                                <button
                                  key={role.value}
                                  onClick={() => {
                                    if (user.role !== role.value) {
                                      updateRoleMutation.mutate({ 
                                        userId: user.id, 
                                        role: role.value 
                                      });
                                    }
                                  }}
                                  disabled={updateRoleMutation.isPending}
                                  className={`w-full px-4 py-3 rounded-lg font-bold transition ${
                                    user.role === role.value
                                      ? `${role.color} text-white`
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  } disabled:opacity-50`}
                                >
                                  {role.label}
                                  {user.role === role.value && ' ✓'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Station Selection */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Station Assignment
                            </label>
                            <div className="space-y-2">
                              {routingRoles.map((station) => (
                                <button
                                  key={station.value || 'none'}
                                  onClick={() => {
                                    if (user.routingRole !== station.value) {
                                      updateRoutingMutation.mutate({ 
                                        userId: user.id, 
                                        routingRole: station.value 
                                      });
                                    }
                                  }}
                                  disabled={updateRoutingMutation.isPending}
                                  className={`w-full px-4 py-3 rounded-lg font-bold transition flex items-center gap-2 ${
                                    user.routingRole === station.value
                                      ? `${station.color} text-white`
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  } disabled:opacity-50`}
                                >
                                  <span className="text-xl">{station.icon}</span>
                                  <span className="flex-1 text-left">{station.label}</span>
                                  {user.routingRole === station.value && <span>✓</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                          <div className="text-sm text-blue-800">
                            <strong>Note:</strong> Staff members can only access their assigned station in the kitchen display.
                            Admins have access to all stations.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers Section */}
          {filterRole !== 'STAFF' && filterRole !== 'ADMIN' && customerUsers.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                👤 Customers ({customerUsers.length})
              </h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerUsers.slice(0, 10).map((user: any) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              updateRoleMutation.mutate({ userId: user.id, role: 'STAFF' });
                            }}
                            disabled={updateRoleMutation.isPending}
                            className="text-blue-600 hover:text-blue-800 font-semibold disabled:opacity-50"
                          >
                            Promote to Staff
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customerUsers.length > 10 && (
                  <div className="bg-gray-50 px-6 py-3 text-sm text-gray-600 text-center">
                    Showing 10 of {customerUsers.length} customers
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
