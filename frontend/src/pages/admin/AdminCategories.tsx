import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import ImageUploader from '../../components/ImageUploader';
import { resolveImageUrl, getImagePlaceholder } from '../../utils/imageUtils';

const BLANK = { name: '', nameEn: '', description: '', slug: '', imageUrl: '', sortOrder: 0, isActive: true };

export default function AdminCategories() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const user        = useAuthStore(s => s.user);
  const addToast    = useToastStore(s => s.addToast);

  const [modal,      setModal]      = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [form,       setForm]       = useState({ ...BLANK });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminAPI.getCategories,
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const createMut = useMutation({
    mutationFn: adminAPI.createCategory,
    onSuccess: () => { invalidate(); closeModal(); addToast('Category created!'); },
    onError: (e: any) => addToast(e.response?.data?.message || 'Failed to create category'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => adminAPI.updateCategory(id, data),
    onSuccess: () => { invalidate(); closeModal(); addToast('Category updated!'); },
    onError: (e: any) => addToast(e.response?.data?.message || 'Failed to update category'),
  });

  const deleteMut = useMutation({
    mutationFn: adminAPI.deleteCategory,
    onSuccess: () => { invalidate(); setDeleteTarget(null); addToast('Category deleted!'); },
    onError: (e: any) => addToast(e.response?.data?.message || 'Failed to delete category'),
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) { navigate('/'); return null; }

  const categories = data?.data?.categories || [];

  const openCreate = () => { setForm({ ...BLANK }); setEditingId(null); setModal(true); };
  const openEdit   = (cat: any) => {
    setForm({ name: cat.name, nameEn: cat.nameEn || '', description: cat.description || '',
      slug: cat.slug, imageUrl: cat.imageUrl || '', sortOrder: cat.sortOrder, isActive: cat.isActive });
    setEditingId(cat.id);
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditingId(null); setForm({ ...BLANK }); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateMut.mutate({ id: editingId, data: form });
    else           createMut.mutate(form);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="container mx-auto px-4 py-8">

      {/* ── header ── */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📂 Category Management</h1>
          <p className="text-gray-500 mt-1">{categories.length} categories</p>
        </div>
        <button onClick={openCreate}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
          ＋ New Category
        </button>
      </div>

      {/* ── table ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-4 text-left font-semibold text-gray-600">Category</th>
                <th className="px-5 py-4 text-left font-semibold text-gray-600">Slug</th>
                <th className="px-5 py-4 text-center font-semibold text-gray-600">Products</th>
                <th className="px-5 py-4 text-center font-semibold text-gray-600">Sort</th>
                <th className="px-5 py-4 text-center font-semibold text-gray-600">Status</th>
                <th className="px-5 py-4 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((cat: any) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {cat.imageUrl ? (
                        <img 
                          src={resolveImageUrl(cat.imageUrl) || getImagePlaceholder('category')} 
                          alt={cat.name} 
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = getImagePlaceholder('category');
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">📂</div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-800">{cat.name}</div>
                        {cat.nameEn && <div className="text-xs text-gray-400">{cat.nameEn}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">{cat.slug}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold">
                      {cat._count?.menuItems ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-gray-500">{cat.sortOrder}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(cat)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
                        ✏️ Edit
                      </button>
                      <button onClick={() => setDeleteTarget(cat)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold">
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📂</div>
              No categories yet — create one above
            </div>
          )}
        </div>
      )}

      {/* ══ CREATE / EDIT MODAL ══════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* modal header */}
            <div className={`px-6 py-4 rounded-t-2xl flex items-center justify-between text-white ${editingId ? 'bg-blue-600' : 'bg-red-600'}`}>
              <h2 className="text-xl font-bold">{editingId ? '✏️ Edit Category' : '➕ New Category'}</h2>
              <button onClick={closeModal} className="text-2xl leading-none hover:opacity-70">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name (Greek) *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name (English)</label>
                  <input value={form.nameEn} onChange={e => set('nameEn', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Slug *</label>
                  <input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g,'-'))} required
                    placeholder="e.g. pizzas" className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
              </div>

              <div>
                <ImageUploader
                  value={form.imageUrl}
                  onChange={url => set('imageUrl', url)}
                  label="Category Image"
                  aspectRatio={16/9}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-semibold text-gray-700">Active category</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending}
                  className={`flex-1 text-white py-2.5 rounded-xl font-bold disabled:opacity-50 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {isPending ? 'Saving…' : (editingId ? '💾 Update Category' : '✅ Create Category')}
                </button>
                <button type="button" onClick={closeModal}
                  className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ══════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold">🗑 Delete Category</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-1">Are you sure you want to delete:</p>
              <p className="font-bold text-gray-900 text-lg mb-1">"{deleteTarget.name}"</p>
              {(deleteTarget._count?.menuItems ?? 0) > 0 && (
                <p className="text-orange-600 text-sm mb-3">⚠️ This category has {deleteTarget._count.menuItems} product(s). Deleting it may affect those products.</p>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={() => deleteMut.mutate(deleteTarget.id)} disabled={deleteMut.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold disabled:opacity-50">
                  {deleteMut.isPending ? 'Deleting…' : '🗑 Yes, Delete'}
                </button>
                <button onClick={() => setDeleteTarget(null)}
                  className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
