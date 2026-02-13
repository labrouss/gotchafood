import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../components/ToastContainer';

export default function AdminReviews() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();
  
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', filterStatus, filterType],
    queryFn: () => reviewAPI.getAll(filterStatus, filterType),
    enabled: user?.role === 'ADMIN' || user?.role === 'STAFF',
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, response }: any) =>
      reviewAPI.updateStatus(id, status, response),
    onSuccess: () => {
      addToast('Η αξιολόγηση ενημερώθηκε επιτυχώς');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setSelectedReview(null);
      setAdminResponse('');
    },
  });

  if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') {
    navigate('/');
    return null;
  }

  const reviews = data?.data?.reviews || [];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'service': return '🙋 Εξυπηρέτηση';
      case 'product': return '🍽️ Προϊόντα';
      case 'suggestion': return '💡 Πρόταση';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'implemented': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateStatus = (review: any, newStatus: string) => {
    updateMutation.mutate({
      id: review.id,
      status: newStatus,
      response: adminResponse || undefined,
    });
  };

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r: any) => r.status === 'pending').length,
    reviewed: reviews.filter((r: any) => r.status === 'reviewed').length,
    implemented: reviews.filter((r: any) => r.status === 'implemented').length,
    avgRating: reviews.length > 0
      ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0',
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">⭐ Διαχείριση Αξιολογήσεων</h1>
            <p className="text-gray-600 mt-2">Διαχειριστείτε τα σχόλια και τις προτάσεις των πελατών</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            ← Πίσω στο Dashboard
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-600">Συνολικές</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Σε Αναμονή</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.reviewed}</div>
            <div className="text-sm text-gray-600">Αναθεωρημένες</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.implemented}</div>
            <div className="text-sm text-gray-600">Υλοποιημένες</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.avgRating}</div>
            <div className="text-sm text-gray-600">Μέσος Όρος</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Κατάσταση</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Όλες</option>
                <option value="pending">Σε Αναμονή</option>
                <option value="reviewed">Αναθεωρημένες</option>
                <option value="implemented">Υλοποιημένες</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Τύπος</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Όλες</option>
                <option value="service">Εξυπηρέτηση</option>
                <option value="product">Προϊόντα</option>
                <option value="suggestion">Πρόταση</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800">Δεν βρέθηκαν αξιολογήσεις</h2>
            <p className="text-gray-600">Δοκιμάστε να αλλάξετε τα φίλτρα</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-xl">
                            {star <= review.rating ? '⭐' : '☆'}
                          </span>
                        ))}
                      </div>
                      <span className="font-bold text-lg">{review.rating}/5</span>
                      <span className="text-sm">{getTypeLabel(review.type)}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                      <span className="font-semibold">
                        {review.user.firstName} {review.user.lastName}
                      </span>
                      <span>•</span>
                      <span>{review.user.email}</span>
                      <span>•</span>
                      <span>
                        {new Date(review.createdAt).toLocaleDateString('el-GR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      {review.order && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-xs">#{review.order.orderNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(review.status)}`}>
                    {review.status.toUpperCase()}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-800">{review.comment}</p>
                </div>

                {review.adminResponse ? (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
                    <div className="font-semibold text-blue-900 mb-2">Η Απάντησή σας:</div>
                    <p className="text-blue-800 text-sm">{review.adminResponse}</p>
                  </div>
                ) : selectedReview?.id === review.id ? (
                  <div className="border-2 border-blue-500 rounded-lg p-4 mb-4">
                    <label className="block font-semibold mb-2">Γράψτε Απάντηση:</label>
                    <textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Η απάντησή σας στον πελάτη..."
                      className="w-full border rounded px-3 py-2 h-24"
                    />
                  </div>
                ) : null}

                <div className="flex gap-2">
                  {review.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                      >
                        ✍️ Απάντηση
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(review, 'reviewed')}
                        disabled={updateMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                      >
                        ✓ Αναθεώρηση
                      </button>
                    </>
                  )}
                  
                  {review.status === 'reviewed' && review.type === 'suggestion' && (
                    <button
                      onClick={() => handleUpdateStatus(review, 'implemented')}
                      disabled={updateMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                    >
                      🎉 Υλοποιήθηκε
                    </button>
                  )}
                  
                  {selectedReview?.id === review.id && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(review, 'reviewed')}
                        disabled={updateMutation.isPending || !adminResponse}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                      >
                        💾 Αποθήκευση Απάντησης
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReview(null);
                          setAdminResponse('');
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                      >
                        Ακύρωση
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
