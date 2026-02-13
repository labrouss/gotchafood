import { useQuery } from '@tanstack/react-query';
import { menuAPI } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../components/ToastContainer';
import { resolveImageUrl, getImagePlaceholder } from '../utils/imageUtils';

export default function HomePage() {
  const navigate = useNavigate();
  const cart = useCartStore();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const { data: popularItems, isLoading } = useQuery({
    queryKey: ['popularItems'],
    queryFn: menuAPI.getPopular,
  });

  const handleAddToCart = (item: any) => {
    cart.addItem({
      id: item.id,
      menuItemId: item.id,
      name: item.name,
      price: parseFloat(item.price),
      imageUrl: item.imageUrl,
    }, 1);
    addToast(`Το προϊόν "${item.name}" προστέθηκε στο καλάθι σας`);
  };

  const handleQuickOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
    } else {
      navigate('/menu');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-12 text-white mb-12 shadow-xl">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold mb-4">
            Γεια σου! Πεινάς;
          </h1>
          <p className="text-xl mb-8 text-red-50">
            Παράγγειλε τα αγαπημένα σου φαγητά online και απόλαυσέ τα στο σπίτι σου!
          </p>
          <Link
            to="/menu"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-8 rounded-lg text-lg transition transform hover:scale-105"
          >
            Δες το Μενού 🍔
          </Link>
        </div>
      </div>

      {/* Order Form */}
      <div className="bg-white rounded-xl shadow-md p-8 mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Παραγγείλε Online Τώρα!
        </h2>
        <form onSubmit={handleQuickOrder} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Όνομα"
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Επώνυμο"
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <input
            type="tel"
            placeholder="Τηλέφωνο"
            required
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Διεύθυνση"
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent md:col-span-2"
          />
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {user ? 'Δες το Μενού 🚀' : 'Σύνδεση & Παραγγελία 🚀'}
          </button>
        </form>
      </div>

      {/* Popular Items */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">
          Top 5 Δημοφιλείς Παραγγελίες
        </h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularItems?.data?.menuItems?.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1"
              >
                {item.imageUrl ? (
                  <div className="h-48 relative overflow-hidden bg-gray-100">
                    <img
                      src={resolveImageUrl(item.imageUrl) || getImagePlaceholder('product')}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getImagePlaceholder('product');
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-2 text-gray-800">
                    {item.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-red-600">
                      €{parseFloat(item.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      Προσθήκη
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="text-center p-6 bg-white rounded-xl shadow-md">
          <div className="text-5xl mb-4">⚡</div>
          <h3 className="font-bold text-xl mb-2">Γρήγορη Παράδοση</h3>
          <p className="text-gray-600">Παράδοση σε 30-45 λεπτά</p>
        </div>
        <div className="text-center p-6 bg-white rounded-xl shadow-md">
          <div className="text-5xl mb-4">🍕</div>
          <h3 className="font-bold text-xl mb-2">Φρέσκα Υλικά</h3>
          <p className="text-gray-600">100% ποιοτικά προϊόντα</p>
        </div>
        <div className="text-center p-6 bg-white rounded-xl shadow-md">
          <div className="text-5xl mb-4">💳</div>
          <h3 className="font-bold text-xl mb-2">Εύκολη Πληρωμή</h3>
          <p className="text-gray-600">Μετρητά ή κάρτα</p>
        </div>
      </div>
    </div>
  );
}
