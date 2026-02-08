import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: adminAPI.getCustomers,
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: adminAPI.toggleCustomerStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      alert('✅ Customer status updated!');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminAPI.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      alert('✅ User role updated!');
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const customers = data?.data?.customers || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">👥 Διαχείριση Πελατών</h1>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Πελάτης</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Τηλέφωνο</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Ρόλος</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Παραγγελίες</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Τελευταία Σύνδεση</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Κατάσταση</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((customer: any) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold">
                    {customer.firstName} {customer.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm">{customer.email}</td>
                  <td className="px-6 py-4 text-sm">{customer.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <select
                      value={customer.role}
                      onChange={(e) => {
                        if (
                          confirm(
                            `Change role to ${e.target.value}? This will change user permissions.`
                          )
                        ) {
                          updateRoleMutation.mutate({
                            id: customer.id,
                            role: e.target.value,
                          });
                        }
                      }}
                      disabled={updateRoleMutation.isPending}
                      className="border rounded px-2 py-1 text-sm font-semibold"
                    >
                      <option value="CUSTOMER">👤 Customer</option>
                      <option value="STAFF">⚙️ Staff</option>
                      <option value="ADMIN">👑 Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                      {customer._count.orders}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.lastLoginAt ? (
                      <div>
                        <div>
                          {new Date(customer.lastLoginAt).toLocaleDateString('el-GR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(customer.lastLoginAt).toLocaleTimeString('el-GR')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Ποτέ</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatusMutation.mutate(customer.id)}
                      disabled={toggleStatusMutation.isPending}
                      className={`px-3 py-1 rounded text-sm font-semibold ${
                        customer.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } transition disabled:opacity-50`}
                    >
                      {customer.isActive ? '✅ Ενεργός' : '❌ Ανενεργός'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν πελάτες
            </div>
          )}
        </div>
      )}
    </div>
  );
}
