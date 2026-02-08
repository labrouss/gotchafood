import { useQuery } from '@tanstack/react-query';
import { reviewAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function MyReviews() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: reviewAPI.getMyReviews,
    enabled: !!user,
  });

  if (!user) {
    navigate('/login');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">⏳ Σε αναμονή</span>;
      case 'reviewed':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">👀 Αναθεωρήθηκε</span>;
      case 'implemented':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">✅ Υλοποιήθηκε</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">📝 Οι Αξιολογήσεις μου</h1>
            <p className="text-gray-600 mt-2">Δείτε όλες τις αξιολογήσεις που έχετε υποβάλει</p>
          </div>
          <button
            onClick={() => navigate('/review')}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition transform hover:scale-105"
          >
            ➕ Νέα Αξιολόγηση
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="text-gray-600 mt-4">Φόρτωση αξιολογήσεων...</p>
          </div>
        ) : reviews.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📝</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Δεν έχετε υποβάλει ακόμα καμία αξιολόγηση
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Μοιραστείτε την εμπειρία σας μαζί μας και βοηθήστε μας να βελτιωθούμε!
            </p>
            <button
              onClick={() => navigate('/review')}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-105"
            >
              ⭐ Γράψτε την πρώτη σας αξιολόγηση
            </button>
          </div>
        ) : (
          /* Reviews List */
          <div className="space-y-6">
            {reviews.map((review: any) => (
              <div
                key={review.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-2xl">
                            {star <= review.rating ? '⭐' : '☆'}
                          </span>
                        ))}
                      </div>
                      <span className="text-lg font-bold text-gray-800">
                        {review.rating}/5
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>{getTypeLabel(review.type)}</span>
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
                          <span className="font-mono text-xs">
                            #{review.order.orderNumber}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    {getStatusBadge(review.status)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-gray-800 leading-relaxed">{review.comment}</p>
                </div>

                {review.adminResponse && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">💬</div>
                      <div className="flex-1">
                        <div className="font-bold text-blue-900 mb-2">
                          Απάντηση από την ομάδα μας:
                        </div>
                        <p className="text-blue-800 text-sm leading-relaxed">
                          {review.adminResponse}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {review.status === 'implemented' && (
                  <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <span className="text-xl">🎉</span>
                      <span className="font-semibold text-sm">
                        Η πρότασή σας υλοποιήθηκε! Ευχαριστούμε για τη συνεισφορά σας!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats Card */}
        {reviews.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-lg mb-4">📊 Τα Στατιστικά σας</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {reviews.length}
                </div>
                <div className="text-sm text-gray-600">Συνολικές Αξιολογήσεις</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {(reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Μέση Βαθμολογία</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {reviews.filter((r: any) => r.status === 'reviewed').length}
                </div>
                <div className="text-sm text-gray-600">Αναθεωρημένες</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {reviews.filter((r: any) => r.status === 'implemented').length}
                </div>
                <div className="text-sm text-gray-600">Υλοποιημένες</div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-red-600 hover:text-red-700 font-semibold"
          >
            ← Επιστροφή στην Αρχική
          </button>
        </div>
      </div>
    </div>
  );
}
