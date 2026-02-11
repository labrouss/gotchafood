import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, menuAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';

const STATIONS = [
  { value: '',          label: '— None —',   icon: '' },
  { value: 'kitchen',   label: 'Kitchen',    icon: '🍳' },
  { value: 'barista',   label: 'Barista',    icon: '☕' },
  { value: 'cold-prep', label: 'Cold Prep',  icon: '🥗' },
  { value: 'hot-prep',  label: 'Hot Prep',   icon: '🔥' },
];

const BLANK = {
  categoryId: '', name: '', nameEn: '', description: '',
  price: 0, imageUrl: '', isAvailable: true, isPopular: false,
  sortOrder: 0, prepTime: 10, calories: 0, station: '',
};

// ── small reusable helpers ────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const cls = 'w-full border rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:outline-none';

export default function AdminProducts() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const user        = useAuthStore(s => s.user);
  const addToast    = useToastStore(s => s.addToast);

  const [modal,         setModal]         = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<any>(null);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [form,          setForm]          = useState({ ...BLANK });
  const [stationFilter, setStationFilter] = useState('all');
  const [search,        setSearch]        = useState('');

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: catData } = useQuery({ queryKey: ['admin-categories'], queryFn: adminAPI.getCategories });
  const { data: prodData, isLoading } = useQuery({ queryKey: ['menu-items'], queryFn: menuAPI.getAll });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['menu-items'] });

  const createMut = useMutation({
    mutationFn: adminAPI.createMenuItem,
    onSuccess: () => { invalidate(); closeModal(); addToast('Product created!'); },
    onError:   (e: any) => addToast(e.response?.data?.message || 'Failed to create product'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => adminAPI.updateMenuItem(id, data),
    onSuccess: () => { invalidate(); closeModal(); addToast('Product updated!'); },
    onError:   (e: any) => addToast(e.response?.data?.message || 'Failed to update product'),
  });

  const deleteMut = useMutation({
    mutationFn: adminAPI.deleteMenuItem,
    onSuccess: () => { invalidate(); setDeleteTarget(null); addToast('Product deleted!'); },
    onError:   (e: any) => addToast(e.response?.data?.message || 'Failed to delete product'),
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) { navigate('/'); return null; }

  const categories = catData?.data?.categories  || [];
  const allProducts = prodData?.data?.menuItems || [];

  const filtered = allProducts.filter((p: any) => {
    const matchStation = stationFilter === 'all' || p.station === stationFilter;
    const matchSearch  = !search || `${p.name} ${p.nameEn}`.toLowerCase().includes(search.toLowerCase());
    return matchStation && matchSearch;
  });

  const openCreate = () => { setForm({ ...BLANK }); setEditingId(null); setModal(true); };
  const openEdit   = (p: any) => {
    setForm({
      categoryId: p.categoryId, name: p.name, nameEn: p.nameEn || '',
      description: p.description || '', price: parseFloat(p.price),
      imageUrl: p.imageUrl || '', isAvailable: p.isAvailable, isPopular: p.isPopular,
      sortOrder: p.sortOrder, prepTime: p.prepTime || 10, calories: p.calories || 0, station: p.station || '',
    });
    setEditingId(p.id);
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditingId(null); setForm({ ...BLANK }); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateMut.mutate({ id: editingId, data: form });
    else           createMut.mutate(form);
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const stationIcon = (v: string) => STATIONS.find(s => s.value === v)?.icon ?? '';

  return (
    <div className="container mx-auto px-4 py-8">

      {/* ── header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🍽️ Product Management</h1>
          <p className="text-gray-500 mt-1">{filtered.length} of {allProducts.length} products</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
            className="border rounded-lg px-4 py-2 text-sm w-48 focus:outline-none focus:border-red-400" />
          <select value={stationFilter} onChange={e => setStationFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="all">All Stations</option>
            {STATIONS.filter(s => s.value).map(s => (
              <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
            ))}
          </select>
          <button onClick={openCreate}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold">
            ＋ New Product
          </button>
        </div>
      </div>

      {/* ── grid ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-3">🍽️</div>
          <h3 className="text-xl font-bold text-gray-700">No products found</h3>
          <p className="text-gray-400 mt-1 text-sm">Try a different filter or create a new product</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product: any) => (
            <div key={product.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition flex flex-col ${!product.isAvailable ? 'opacity-60' : ''}`}>

              {/* image */}
              {product.imageUrl
                ? <img src={product.imageUrl} alt={product.name} className="w-full h-44 object-cover" />
                : <div className="w-full h-44 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-5xl">🍽️</div>
              }

              <div className="p-4 flex flex-col flex-1">
                {/* name + price */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-gray-800 text-base leading-tight truncate">{product.name}</h3>
                    {product.nameEn && <p className="text-xs text-gray-400 truncate">{product.nameEn}</p>}
                  </div>
                  <span className="text-lg font-extrabold text-red-600 flex-shrink-0">€{parseFloat(product.price).toFixed(2)}</span>
                </div>

                {/* description */}
                {product.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                )}

                {/* meta chips */}
                <div className="flex flex-wrap gap-1.5 mb-3 mt-auto">
                  {product.station && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold">
                      {stationIcon(product.station)} {product.station}
                    </span>
                  )}
                  {product.prepTime && (
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-semibold">
                      ⏱ {product.prepTime}m
                    </span>
                  )}
                  {product.calories > 0 && (
                    <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs font-semibold">
                      🔥 {product.calories}kcal
                    </span>
                  )}
                  {product.isPopular && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-semibold">⭐ Popular</span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${product.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {product.isAvailable ? '✓ Available' : '✕ Unavailable'}
                  </span>
                </div>

                {/* category */}
                <div className="text-xs text-gray-400 mb-3">
                  📂 {product.category?.name || 'No category'}
                </div>

                {/* actions */}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(product)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold">
                    ✏️ Edit
                  </button>
                  <button onClick={() => setDeleteTarget(product)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold">
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ CREATE / EDIT MODAL ════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

            {/* header */}
            <div className={`px-6 py-4 rounded-t-2xl flex items-center justify-between text-white ${editingId ? 'bg-blue-600' : 'bg-red-600'}`}>
              <div>
                <h2 className="text-xl font-bold">{editingId ? '✏️ Edit Product' : '➕ New Product'}</h2>
                {editingId && <p className="text-sm opacity-80 mt-0.5">{form.name}</p>}
              </div>
              <button onClick={closeModal} className="text-3xl leading-none hover:opacity-70">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* ── SECTION: Basic ── */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Basic Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category *">
                    <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required className={cls}>
                      <option value="">Select category</option>
                      {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Price (€) *">
                    <input type="number" step="0.01" min="0" value={form.price}
                      onChange={e => set('price', parseFloat(e.target.value) || 0)} required className={cls} />
                  </Field>
                  <Field label="Name (Greek) *">
                    <input value={form.name} onChange={e => set('name', e.target.value)} required className={cls} />
                  </Field>
                  <Field label="Name (English)">
                    <input value={form.nameEn} onChange={e => set('nameEn', e.target.value)} className={cls} />
                  </Field>
                </div>
              </div>

              {/* ── SECTION: Kitchen ── */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Kitchen & Preparation</div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Station *">
                    <select value={form.station} onChange={e => set('station', e.target.value)} required className={cls}>
                      {STATIONS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Prep Time (min)">
                    <input type="number" min="1" max="120" value={form.prepTime}
                      onChange={e => set('prepTime', parseInt(e.target.value) || 10)} className={cls} />
                  </Field>
                  <Field label="Calories (kcal)">
                    <input type="number" min="0" max="5000" value={form.calories}
                      onChange={e => set('calories', parseInt(e.target.value) || 0)} className={cls} />
                  </Field>
                </div>
              </div>

              {/* ── SECTION: Description & Media ── */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Description & Media</div>
                <div className="space-y-3">
                  <Field label="Description">
                    <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={cls} />
                  </Field>
                  <Field label="Image URL">
                    <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} className={cls} placeholder="https://…" />
                  </Field>
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt="preview" className="h-28 rounded-xl object-cover w-full"
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
              </div>

              {/* ── SECTION: Options ── */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Options</div>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 select-none">
                    <input type="checkbox" checked={form.isAvailable} onChange={e => set('isAvailable', e.target.checked)} className="w-4 h-4" />
                    <div><div className="text-sm font-semibold">Available</div><div className="text-xs text-gray-400">Visible to customers</div></div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 select-none">
                    <input type="checkbox" checked={form.isPopular} onChange={e => set('isPopular', e.target.checked)} className="w-4 h-4" />
                    <div><div className="text-sm font-semibold">⭐ Popular</div><div className="text-xs text-gray-400">Show in highlights</div></div>
                  </label>
                  <Field label="Sort Order">
                    <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', parseInt(e.target.value) || 0)} className={cls} />
                  </Field>
                </div>
              </div>

              {/* ── buttons ── */}
              <div className="flex gap-3 pt-2 border-t">
                <button type="submit" disabled={isPending}
                  className={`flex-1 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {isPending ? 'Saving…' : (editingId ? '💾 Update Product' : '✅ Create Product')}
                </button>
                <button type="button" onClick={closeModal}
                  className="px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold">🗑 Delete Product</h2>
            </div>
            <div className="p-6">
              {deleteTarget.imageUrl && (
                <img src={deleteTarget.imageUrl} alt={deleteTarget.name}
                  className="w-full h-32 object-cover rounded-xl mb-4"
                  onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <p className="text-gray-600 text-sm mb-1">Are you sure you want to delete:</p>
              <p className="font-bold text-gray-900 text-lg mb-4">"{deleteTarget.name}"</p>
              <div className="flex gap-3">
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
