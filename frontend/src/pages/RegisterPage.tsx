import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    notificationPreference: 'email',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.register(formData);

      if (response.success) {
        setSuccess(true);
        // We don't log in automatically if verification is required
        // or we can log in but show a message. The backend sends a token.
        // For now, let's show the success message and NOT auto-login.
        // If the user wants auto-login, we could do it but still ask for verification.
      } else {
        setError(response.message || 'Σφάλμα εγγραφής');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Σφάλμα εγγραφής. Δοκίμασε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Εγγραφή
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
              <span className="text-4xl">📧</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Σχεδόν έτοιμοι!</h2>
            <p className="text-gray-600">
              Η εγγραφή σας έγινε επιτυχώς. Σας στείλαμε ένα email επαλήθευσης στο{' '}
              <span className="font-semibold text-gray-800">{formData.email}</span>.
            </p>
            <p className="text-sm text-gray-500">
              Παρακαλώ ελέγξτε τα εισερχόμενά σας (και τα ανεπιθύμητα) για να ενεργοποιήσετε τον λογαριασμό σας.
            </p>
            <Link
              to="/login"
              className="block w-full bg-primary text-white font-bold py-3 px-6 rounded-lg transition hover:bg-opacity-90 mt-6"
            >
              Μετάβαση στη Σύνδεση
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Όνομα
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Επώνυμο
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Τηλέφωνο (προαιρετικό)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="6912345678"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Κωδικός
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Τουλάχιστον 6 χαρακτήρες"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Προτίμηση Ενημερώσεων
              </label>
              <select
                name="notificationPreference"
                value={formData.notificationPreference}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="email">Email μόνο</option>
                <option value="sms">SMS μόνο</option>
                <option value="both">Και τα δύο</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Εγγραφή...' : 'Εγγραφή'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Έχεις ήδη λογαριασμό;{' '}
            <Link to="/login" className="text-primary hover:opacity-80 font-semibold">
              Σύνδεση
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
