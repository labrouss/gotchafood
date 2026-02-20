import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyTiersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';

const ICONS = ['🥉', '🥈', '🥇', '💎', '👑', '⭐', '🏆', '🎖️', '🌟', '💫'];

export default function LoyaltyTiers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    minPoints: 0,
    maxPoints: null as number | null,
    color: '#6b7280',
    icon: '🏆',
    discount: 0,
    pointsMultiplier: 1.0,
    sortOrder: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['loyaltyTiers'],
    queryFn: loyaltyTiersAPI.getAll,
    enabled: !!user && user.role === 'ADMIN',
  });

  const createMutation = useMutation({
    mutationFn: loyaltyTiersAPI.create,
    onSuccess: () => {
      addToast('Tier created successfully!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] });
    },
    onError: () => addToast('Failed to create tier'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => loyaltyTiersAPI.update(id, data),
    onSuccess: () => {
      addToast('Tier updated successfully!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] });
    },
    onError: () => addToast('Failed to update tier'),
  });

  const deleteMutation = useMutation({
    mutationFn: loyaltyTiersAPI.delete,
    onSuccess: () => {
      addToast('Tier deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] });
    },
    onError: () => addToast('Failed to delete tier'),
  });

  if (!user || user.role !== 'ADMIN') {
    navigate('/');
    return null;
  }

  const tiers = data?.data?.tiers || [];

  const resetForm = () => {
    setForm({
      name: '',
      minPoints: 0,
      maxPoints: null,
      color: '#6b7280',
      icon: '🏆',
      discount: 0,
      pointsMultiplier: 1.0,
      sortOrder: 0,
    });
    setEditingTier(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (tier: any) => {
    setForm({
      name: tier.name,
      minPoints: tier.minPoints,
      maxPoints: tier.maxPoints,
      color: tier.color,
      icon: tier.icon,
      discount: tier.discount,
      pointsMultiplier: tier.pointsMultiplier,
      sortOrder: tier.sortOrder,
    });
    setEditingTier(tier);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTier) {
      updateMutation.mutate({ id: editingTier.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (tier: any) => {
    if (confirm(`Delete tier "${tier.name}"?`)) {
      deleteMutation.mutate(tier.id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🏆 Loyalty Tiers</h1>
        <button
          onClick={openCreate}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
        >
          + Create Tier
        </button>
      </div>

      {tiers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier: any) => (
            <div
              key={tier.id}
              className="bg-white rounded-xl shadow-sm border-2 hover:shadow-md transition"
              style={{ borderColor: tier.color }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{tier.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold">{tier.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="w-6 h-6 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: tier.color }}
                        />
                        <span className="text-xs text-gray-500">{tier.color}</span>
                      </div>
                    </div>
                  </div>
                  {!tier.isActive && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Points Range:</span>
                    <span className="font-semibold">
                      {tier.minPoints} - {tier.maxPoints || '∞'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-semibold text-green-600">{tier.discount}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Points Multiplier:</span>
                    <span className="font-semibold text-indigo-600">{tier.pointsMultiplier}×</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(tier)}
                    className="flex-1 py-2 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:text-indigo-600 font-semibold transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tier)}
                    className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-bold mb-2">No Tiers Found</h3>
          <p className="text-gray-600 mb-4">Initialize default tiers to get started</p>
          <button
            onClick={() => {

              loyaltyTiersAPI.initialize()
                .then((response) => {

                  queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] });
                  addToast('Default tiers initialized!');
                })
                .catch((error) => {
                  console.error('[DEBUG] LoyaltyTiers: Initialization failed:', error);
                  addToast('Failed to initialize tiers');
                });
            }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
          >
            Initialize Defaults
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b bg-indigo-600 text-white rounded-t-2xl">
              <h2 className="text-lg font-bold">
                {editingTier ? '✏️ Edit Tier' : '➕ Create New Tier'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block font-semibold mb-2">Tier Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., Gold"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block font-semibold mb-2">Icon</label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-4xl">{form.icon}</span>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="flex-1 border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`text-2xl p-2 rounded-lg border-2 hover:bg-gray-50 ${form.icon === icon ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block font-semibold mb-2">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-12 w-24 border rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1 border rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Points Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-2">Min Points</label>
                  <input
                    type="number"
                    value={form.minPoints}
                    onChange={(e) => setForm({ ...form, minPoints: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-2">Max Points (optional)</label>
                  <input
                    type="number"
                    value={form.maxPoints || ''}
                    onChange={(e) => setForm({ ...form, maxPoints: e.target.value ? parseInt(e.target.value) : null })}
                    min="0"
                    placeholder="Leave empty for unlimited"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Discount & Multiplier */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-2">Discount (%)</label>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-2">Points Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.pointsMultiplier}
                    onChange={(e) => setForm({ ...form, pointsMultiplier: parseFloat(e.target.value) || 1.0 })}
                    min="1"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block font-semibold mb-2">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingTier ? 'Update Tier' : 'Create Tier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
