import { useState } from 'react';
import { useMutation } from '@tantml:react-query';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Το Προφίλ μου</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Προσωπικά Στοιχεία</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Όνομα *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Επώνυμο *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Τηλέφωνο *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold"
                onClick={(e) => {
                  e.preventDefault();
                  alert('⚠️ Feature coming soon! Profile update will be implemented shortly.');
                }}
              >
                Ενημέρωση Προφίλ
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Αλλαγή Κωδικού</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Τρέχων Κωδικός *
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Νέος Κωδικός *
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Επιβεβαίωση Νέου Κωδικού *
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                onClick={(e) => {
                  e.preventDefault();
                  alert('⚠️ Feature coming soon! Password change will be implemented shortly.');
                }}
              >
                Αλλαγή Κωδικού
              </button>
            </form>
          </div>
        </div>

        {/* Account Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Πληροφορίες Λογαριασμού</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Ρόλος</p>
                <p className="font-semibold">
                  {user.role === 'ADMIN' ? '👑 Διαχειριστής' : 
                   user.role === 'STAFF' ? '⚙️ Προσωπικό' : 
                   '👤 Πελάτης'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Κατάσταση</p>
                <p className="font-semibold">
                  {user.isActive ? (
                    <span className="text-green-600">✅ Ενεργός</span>
                  ) : (
                    <span className="text-red-600">❌ Ανενεργός</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Μέλος από</p>
                <p className="font-semibold">
                  {new Date(user.createdAt).toLocaleDateString('el-GR')}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Γρήγορες Συνδέσμοι</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/my-orders')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded transition"
              >
                📦 Οι Παραγγελίες μου
              </button>
              <button
                onClick={() => navigate('/my-addresses')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded transition"
              >
                📍 Οι Διευθύνσεις μου
              </button>
              <button
                onClick={() => navigate('/menu')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded transition"
              >
                🍽️ Μενού
              </button>
              {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded transition"
                >
                  ⚙️ Admin Panel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
