import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function AdminCategories() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    slug: '',
    imageUrl: '',
    sortOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminAPI.getCategories,
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
  });

  const createMutation = useMutation({
    mutationFn: adminAPI.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
      alert('Η κατηγορία δημιουργήθηκε!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Σφάλμα κατά τη δημιουργία');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminAPI.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
      alert('Η κατηγορία ενημερώθηκε!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Σφάλμα κατά την ενημέρωση');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminAPI.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      alert('Η κατηγορία διαγράφηκε!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Σφάλμα κατά τη διαγραφή');
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const categories = data?.data?.categories || [];

  const resetForm = () => {
    setFormData({
      name: '',
      nameEn: '',
      description: '',
      slug: '',
      imageUrl: '',
      sortOrder: 0,
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (category: any) => {
    setFormData({
      name: category.name,
      nameEn: category.nameEn || '',
      description: category.description || '',
      slug: category.slug,
      imageUrl: category.imageUrl || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">📂 Διαχείριση Κατηγοριών</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            + Νέα Κατηγορία
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Επεξεργασία Κατηγορίας' : 'Νέα Κατηγορία'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Όνομα (Ελληνικά) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Όνομα (Αγγλικά)
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) =>
                    setFormData({ ...formData, nameEn: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  required
                  placeholder="π.χ. pizzas, salads"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Σειρά Εμφάνισης
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Περιγραφή
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2 h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                URL Εικόνας
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
              <label htmlFor="isActive" className="text-sm">
                Ενεργή κατηγορία
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {editingId ? 'Ενημέρωση' : 'Δημιουργία'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border-2 border-gray-300 hover:border-gray-400 px-6 py-2 rounded-lg font-semibold"
              >
                Ακύρωση
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Όνομα
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Προϊόντα
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Κατάσταση
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((category: any) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{category.name}</div>
                    {category.nameEn && (
                      <div className="text-sm text-gray-600">
                        {category.nameEn}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                      {category._count?.menuItems || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-sm font-semibold ${
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {category.isActive ? 'Ενεργή' : 'Ανενεργή'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm font-semibold"
                      >
                        Επεξεργασία
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Σίγουρα θέλετε να διαγράψετε αυτή την κατηγορία;'
                            )
                          ) {
                            deleteMutation.mutate(category.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm font-semibold disabled:opacity-50"
                      >
                        Διαγραφή
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Δεν υπάρχουν κατηγορίες
            </div>
          )}
        </div>
      )}
    </div>
  );
}
