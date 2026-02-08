import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, menuAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function AdminProducts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    nameEn: '',
    description: '',
    price: 0,
    imageUrl: '',
    isAvailable: true,
    isPopular: false,
    sortOrder: 0,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminAPI.getCategories,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: menuAPI.getAll,
  });

  const createMutation = useMutation({
    mutationFn: adminAPI.createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      resetForm();
      alert('Το προϊόν δημιουργήθηκε!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminAPI.updateMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      resetForm();
      alert('Το προϊόν ενημερώθηκε!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminAPI.deleteMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      alert('Το προϊόν διαγράφηκε!');
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const categories = categoriesData?.data?.categories || [];
  const products = productsData?.data?.menuItems || [];

  const resetForm = () => {
    setFormData({
      categoryId: '',
      name: '',
      nameEn: '',
      description: '',
      price: 0,
      imageUrl: '',
      isAvailable: true,
      isPopular: false,
      sortOrder: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product: any) => {
    setFormData({
      categoryId: product.categoryId,
      name: product.name,
      nameEn: product.nameEn || '',
      description: product.description || '',
      price: parseFloat(product.price),
      imageUrl: product.imageUrl || '',
      isAvailable: product.isAvailable,
      isPopular: product.isPopular,
      sortOrder: product.sortOrder,
    });
    setEditingId(product.id);
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
        <h1 className="text-3xl font-bold">🍽️ Διαχείριση Προϊόντων</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold">
            + Νέο Προϊόν
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Επεξεργασία Προϊόντος' : 'Νέο Προϊόν'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Κατηγορία *</label>
                <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} required className="w-full border rounded-lg px-4 py-2">
                  <option value="">Επιλέξτε κατηγορία</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Τιμή (€) *</label>
                <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} required className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Όνομα (Ελληνικά) *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Όνομα (Αγγλικά)</label>
                <input type="text" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} className="w-full border rounded-lg px-4 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Περιγραφή</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-4 py-2 h-20" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">URL Εικόνας</label>
              <input type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full border rounded-lg px-4 py-2" />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isAvailable} onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })} />
                <span className="text-sm">Διαθέσιμο</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isPopular} onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })} />
                <span className="text-sm">Δημοφιλές</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold">{editingId ? 'Ενημέρωση' : 'Δημιουργία'}</button>
              <button type="button" onClick={resetForm} className="border-2 border-gray-300 px-6 py-2 rounded-lg font-semibold">Ακύρωση</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Προϊόν</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Κατηγορία</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Τιμή</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Κατάσταση</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{product.name}</div>
                    {product.description && <div className="text-sm text-gray-600 truncate max-w-xs">{product.description}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm">{product.category.name}</td>
                  <td className="px-6 py-4 font-semibold">€{parseFloat(product.price).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {product.isAvailable ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">Διαθέσιμο</span> : <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Μη διαθέσιμο</span>}
                      {product.isPopular && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">⭐ Popular</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(product)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm">Edit</button>
                      <button onClick={() => { if (confirm('Διαγραφή;')) deleteMutation.mutate(product.id); }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

