import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, menuAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';

const stations = [
  { value: '', label: '-- Select Station --', icon: '' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'barista', label: 'Barista', icon: '☕' },
  { value: 'cold-prep', label: 'Cold Prep', icon: '🥗' },
  { value: 'hot-prep', label: 'Hot Prep', icon: '🔥' },
];

export default function AdminProducts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStation, setFilterStation] = useState('all');
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
    prepTime: 10,
    calories: 0,
    station: '',
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
      addToast('Product created successfully!');
    },
    onError: () => {
      addToast('Failed to create product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminAPI.updateMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      resetForm();
      addToast('Product updated successfully!');
    },
    onError: () => {
      addToast('Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminAPI.deleteMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      addToast('Product deleted successfully!');
    },
    onError: () => {
      addToast('Failed to delete product');
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const categories = categoriesData?.data?.categories || [];
  const products = productsData?.data?.menuItems || [];
  
  // Filter products by station
  const filteredProducts = filterStation === 'all' 
    ? products 
    : products.filter((p: any) => p.station === filterStation);

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
      prepTime: 10,
      calories: 0,
      station: '',
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
      prepTime: product.prepTime || 10,
      calories: product.calories || 0,
      station: product.station || '',
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

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">🍽️ Product Management</h1>
          <p className="text-gray-600 mt-1">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            {filterStation !== 'all' && ` in ${stations.find(s => s.value === filterStation)?.label}`}
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          {!showForm && (
            <>
              {/* Station Filter */}
              <select
                value={filterStation}
                onChange={(e) => setFilterStation(e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
              >
                <option value="all">All Stations</option>
                {stations.filter(s => s.value).map((station) => (
                  <option key={station.value} value={station.value}>
                    {station.icon} {station.label}
                  </option>
                ))}
              </select>
              
              {/* New Product Button */}
              <button
                onClick={() => setShowForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold whitespace-nowrap"
              >
                + New Product
              </button>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {editingId ? 'Edit Product' : 'New Product'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-600 hover:text-gray-800 font-semibold"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Price (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Name (Greek) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Name (English)
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Kitchen & Preparation */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                Kitchen & Preparation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Station *
                  </label>
                  <select
                    value={formData.station}
                    onChange={(e) =>
                      setFormData({ ...formData, station: e.target.value })
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  >
                    {stations.map((station) => (
                      <option key={station.value} value={station.value}>
                        {station.icon} {station.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Which station prepares this item
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Prep Time (minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.prepTime}
                    onChange={(e) =>
                      setFormData({ ...formData, prepTime: parseInt(e.target.value) || 10 })
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Average preparation time
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    value={formData.calories}
                    onChange={(e) =>
                      setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional nutritional info
                  </p>
                </div>
              </div>
            </div>

            {/* Description & Image */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                Description & Media
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) =>
                        setFormData({ ...formData, isAvailable: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-semibold">Available</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) =>
                        setFormData({ ...formData, isPopular: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-semibold">Popular Item</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingId
                  ? 'Update Product'
                  : 'Create Product'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {products.length === 0 ? 'No products yet' : 'No products in this station'}
          </h3>
          <p className="text-gray-600">
            {products.length === 0 
              ? 'Create your first product to get started'
              : 'Try selecting a different station or create a product for this station'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product: any) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">
                      {product.name}
                    </h3>
                    {product.nameEn && (
                      <p className="text-sm text-gray-600">{product.nameEn}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-600">
                      €{parseFloat(product.price).toFixed(2)}
                    </div>
                  </div>
                </div>

                {product.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Product Details */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  {product.station && (
                    <div className="bg-gray-100 rounded px-2 py-1">
                      <span className="font-semibold">Station:</span>{' '}
                      {stations.find((s) => s.value === product.station)?.icon}{' '}
                      {product.station}
                    </div>
                  )}
                  {product.prepTime && (
                    <div className="bg-gray-100 rounded px-2 py-1">
                      <span className="font-semibold">Prep:</span> {product.prepTime} min
                    </div>
                  )}
                  {product.calories > 0 && (
                    <div className="bg-gray-100 rounded px-2 py-1">
                      <span className="font-semibold">Calories:</span> {product.calories} kcal
                    </div>
                  )}
                  <div className="bg-gray-100 rounded px-2 py-1">
                    <span className="font-semibold">Category:</span>{' '}
                    {product.category?.name || 'N/A'}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {product.isPopular && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                      ⭐ Popular
                    </span>
                  )}
                  {product.isAvailable ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                      ✓ Available
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                      ✕ Unavailable
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
