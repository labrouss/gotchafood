import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function MyAddressesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    number: '',
    city: '',
    postalCode: '',
    floor: '',
    notes: '',
    isDefault: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressAPI.getAll,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: addressAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      resetForm();
      alert('✅ Η διεύθυνση δημιουργήθηκε επιτυχώς!');
    },
    onError: (error: any) => {
      alert('❌ ' + (error.response?.data?.message || 'Σφάλμα κατά τη δημιουργία διεύθυνσης'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => addressAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      resetForm();
      alert('✅ Η διεύθυνση ενημερώθηκε επιτυχώς!');
    },
    onError: (error: any) => {
      alert('❌ ' + (error.response?.data?.message || 'Σφάλμα κατά την ενημέρωση διεύθυνσης'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: addressAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      alert('✅ Η διεύθυνση διαγράφηκε!');
    },
    onError: (error: any) => {
      alert('❌ ' + (error.response?.data?.message || 'Σφάλμα κατά τη διαγραφή'));
    },
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const addresses = data?.data?.addresses || [];

  const resetForm = () => {
    setFormData({
      label: '',
      street: '',
      number: '',
      city: '',
      postalCode: '',
      floor: '',
      notes: '',
      isDefault: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (address: any) => {
    setFormData({
      label: address.label || '',
      street: address.street,
      number: address.number,
      city: address.city,
      postalCode: address.postalCode,
      floor: address.floor || '',
      notes: address.notes || '',
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('❌ Το πρόγραμμα περιήγησής σας δεν υποστηρίζει γεωτοποθεσία');
      return;
    }

    // Check if permission was previously denied
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          alert('❌ Η πρόσβαση στην τοποθεσία έχει απορριφθεί. Παρακαλώ ενεργοποιήστε την από τις ρυθμίσεις του προγράμματος περιήγησης.');
          return;
        }
      });
    }

    setLoadingLocation(true);

    // Request geolocation with clear prompt
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get address from coordinates
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`
          );
          const data = await response.json();

          if (data && data.address) {
            setFormData({
              ...formData,
              street: data.address.road || data.address.pedestrian || '',
              number: data.address.house_number || '',
              city: data.address.city || data.address.town || data.address.village || '',
              postalCode: data.address.postcode || '',
            });
            setLoadingLocation(false);
            alert('✅ Η διεύθυνσή σας εντοπίστηκε! Παρακαλώ ελέγξτε τα στοιχεία.');
          } else {
            throw new Error('No address found');
          }
        } catch (error) {
          setLoadingLocation(false);
          alert('❌ Δεν ήταν δυνατός ο εντοπισμός της διεύθυνσης. Παρακαλώ εισάγετε χειροκίνητα.');
        }
      },
      (error) => {
        setLoadingLocation(false);
        let message = '';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Δεν επιτρέπεται η πρόσβαση στην τοποθεσία. Παρακαλώ επιτρέψτε την πρόσβαση και δοκιμάστε ξανά.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Η τοποθεσία δεν είναι διαθέσιμη αυτή τη στιγμή.';
            break;
          case error.TIMEOUT:
            message = 'Η αίτηση εντοπισμού έληξε. Δοκιμάστε ξανά.';
            break;
          default:
            message = 'Παρουσιάστηκε σφάλμα κατά τον εντοπισμό της τοποθεσίας.';
        }

        alert('❌ ' + message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Οι Διευθύνσεις μου</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-semibold"
          >
            + Νέα Διεύθυνση
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Επεξεργασία Διεύθυνσης' : 'Νέα Διεύθυνση'}
          </h2>

          <div className="mb-4">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={loadingLocation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {loadingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Εντοπισμός τοποθεσίας...
                </>
              ) : (
                <>📍 Χρήση Τρέχουσας Τοποθεσίας</>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Θα χρησιμοποιηθεί η τοποθεσία του προγράμματος περιήγησης για αυτόματη συμπλήρωση
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Ετικέτα (προαιρετικό)
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  placeholder="π.χ. Σπίτι, Δουλειά"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Πόλη *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  required
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Οδός *
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData({ ...formData, street: e.target.value })
                  }
                  required
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Αριθμός *
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: e.target.value })
                  }
                  required
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Ταχυδρομικός Κώδικας *
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  required
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Όροφος
                </label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Σημειώσεις
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="π.χ. Κουδούνι στο 2ο από δεξιά"
                className="w-full border rounded-lg px-4 py-2 h-20"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
              />
              <label htmlFor="isDefault" className="text-sm">
                Ορισμός ως προεπιλεγμένη διεύθυνση
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Αποθήκευση...'
                  : editingId
                    ? 'Ενημέρωση'
                    : 'Αποθήκευση'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border-2 border-gray-300 hover:border-gray-400 px-6 py-2 rounded-lg font-semibold"
              >
                Ακύρωση
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Δεν έχετε αποθηκευμένες διευθύνσεις</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((address: any) => (
            <div
              key={address.id}
              className="bg-white rounded-lg shadow-md p-6 relative"
            >
              {address.isDefault && (
                <span className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                  Προεπιλογή
                </span>
              )}
              <h3 className="font-bold text-lg mb-2">
                {address.label || 'Διεύθυνση'}
              </h3>
              <p className="text-gray-700 mb-1">
                {address.street} {address.number}
              </p>
              {address.floor && (
                <p className="text-gray-700 mb-1">Όροφος {address.floor}</p>
              )}
              <p className="text-gray-700 mb-1">
                {address.city} {address.postalCode}
              </p>
              {address.notes && (
                <p className="text-sm text-gray-500 italic mt-2">
                  {address.notes}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(address)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
                >
                  Επεξεργασία
                </button>
                <button
                  onClick={() => {
                    if (confirm('Σίγουρα θέλετε να διαγράψετε αυτή τη διεύθυνση;')) {
                      deleteMutation.mutate(address.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-opacity-90 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
                >
                  Διαγραφή
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
