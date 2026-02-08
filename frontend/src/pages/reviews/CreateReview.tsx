import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';
import { useAuthStore } from '../../store/authStore';

export default function CreateReview() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [type, setType] = useState('service');
  const [hoveredRating, setHoveredRating] = useState(0);

  const createMutation = useMutation({
    mutationFn: reviewAPI.create,
    onSuccess: () => {
      addToast('Ευχαριστούμε για την αξιολόγησή σας!');
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      navigate('/my-reviews');
    },
    onError: () => {
      addToast('Σφάλμα κατά την υποβολή της αξιολόγησης');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      addToast('Παρακαλώ προσθέστε ένα σχόλιο');
      return;
    }

    createMutation.mutate({ 
      rating, 
      comment: comment.trim(), 
      type 
    });
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const ratingLabels = ['Πολύ Κακό', 'Κακό', 'Μέτριο', 'Καλό', 'Εξαιρετικό'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/my-reviews')}
            className="text-red-600 hover:text-red-700 font-semibold mb-4 flex items-center gap-2"
          >
            ← Πίσω στις αξιολογήσεις μου
          </button>
          <h1 className="text-4xl font-bold text-gray-800">⭐ Αξιολογήστε μας</h1>
          <p className="text-gray-600 mt-2">Η γνώμη σας μας βοηθά να γίνουμε καλύτεροι!</p>
        </div>

        {/* Review Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit}>
              {/* Rating Selection */}
              <div className="mb-8">
                <label className="block text-lg font-bold text-gray-800 mb-4">
                  Πόσο ικανοποιημένοι είστε;
                </label>
                
                <div className="flex justify-center gap-3 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="text-6xl transition-transform hover:scale-110 focus:outline-none"
                    >
                      {star <= (hoveredRating || rating) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                
                <div className="text-center">
                  <span className="text-xl font-semibold text-red-600">
                    {ratingLabels[rating - 1]}
                  </span>
                </div>
              </div>

              {/* Type Selection */}
              <div className="mb-8">
                <label className="block text-lg font-bold text-gray-800 mb-3">
                  Τι θέλετε να αξιολογήσετε;
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('service')}
                    className={`p-4 rounded-xl border-2 transition ${
                      type === 'service'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">🙋</div>
                    <div className="font-semibold">Εξυπηρέτηση</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setType('product')}
                    className={`p-4 rounded-xl border-2 transition ${
                      type === 'product'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">🍽️</div>
                    <div className="font-semibold">Προϊόντα</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setType('suggestion')}
                    className={`p-4 rounded-xl border-2 transition ${
                      type === 'suggestion'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">💡</div>
                    <div className="font-semibold">Πρόταση</div>
                  </button>
                </div>
              </div>

              {/* Comment */}
              <div className="mb-8">
                <label className="block text-lg font-bold text-gray-800 mb-3">
                  Πείτε μας περισσότερα
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    type === 'service' 
                      ? 'Πώς ήταν η εξυπηρέτηση; Τι θα θέλατε να βελτιώσουμε;'
                      : type === 'product'
                      ? 'Πώς σας φάνηκαν τα προϊόντα μας; Τι σας άρεσε περισσότερο;'
                      : 'Ποιες είναι οι προτάσεις σας για να γίνουμε καλύτεροι;'
                  }
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 h-40 focus:border-red-500 focus:outline-none resize-none"
                  required
                />
                <div className="text-sm text-gray-500 mt-2">
                  {comment.length} / 500 χαρακτήρες
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💬</div>
                  <div className="text-sm text-blue-800">
                    <strong>Συμβουλή:</strong> Όσο πιο λεπτομερής είναι η αξιολόγησή σας, 
                    τόσο περισσότερο μας βοηθάτε να βελτιωθούμε!
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={createMutation.isPending || !comment.trim()}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105"
              >
                {createMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Υποβολή...
                  </span>
                ) : (
                  '✅ Υποβολή Αξιολόγησης'
                )}
              </button>
            </form>
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold text-lg mb-3">🎁 Γιατί να αξιολογήσετε;</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Βοηθάτε άλλους πελάτες να κάνουν καλύτερες επιλογές
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Μας βοηθάτε να βελτιώσουμε τις υπηρεσίες μας
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Οι προτάσεις σας λαμβάνονται σοβαρά υπόψη
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Κερδίζετε επιπλέον πόντους στο πρόγραμμα επιβράβευσης
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
