import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import MyOrdersPage from './pages/MyOrdersPage';
import MyAddressesPage from './pages/MyAddressesPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCategories from './pages/admin/AdminCategories';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminReviews from './pages/admin/AdminReviews';
import StaffManagement from './pages/admin/StaffManagement';
import KitchenDisplayPage from './pages/admin/KitchenDisplayPage';
import EnhancedDashboard from './pages/admin/EnhancedDashboard';
import InsightsPage from './pages/admin/InsightsPage';
import CounterPOS from './pages/counter/CounterPOS';
import StaffHR from './pages/admin/StaffHR';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import CreateReview from './pages/reviews/CreateReview';
import MyReviews from './pages/reviews/MyReviews';
import LoyaltyPage from './pages/loyalty/LoyaltyPage';
import ToastContainer from './components/ToastContainer';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';

const queryClient = new QueryClient();

function App() {
  const { user, logout } = useAuthStore();
  const itemCount = useCartStore((state) => state.getItemCount());
  
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastContainer />
        <div className="min-h-screen bg-gray-50">
          {/* Navigation */}
          <nav className="bg-gradient-to-r from-red-700 to-red-900 text-white shadow-lg">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <Link to="/" className="text-2xl font-bold">
                  🍕 I Need Food!
                </Link>
                
                <div className="flex items-center space-x-6">
                  <Link to="/" className="hover:text-yellow-300 transition">
                    Αρχική
                  </Link>
                  <Link to="/menu" className="hover:text-yellow-300 transition">
                    Μενού
                  </Link>
                  
                  {user && (
                    <>
                      <Link to="/my-orders" className="hover:text-yellow-300 transition">
                        Παραγγελίες μου
                      </Link>
                      <Link to="/cart" className="hover:text-yellow-300 transition relative">
                        🛒 Καλάθι
                        {itemCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {itemCount}
                          </span>
                        )}
                      </Link>
                    </>
                  )}
                  
                  {isAdmin && (
                    <div className="relative group">
                      <button className="hover:text-yellow-300 transition">
                        ⚙️ Admin
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <Link to="/admin/insights" className="block px-4 py-2 hover:bg-gray-100 rounded-t-lg">
                          📈 Insights
                        </Link>
                        <Link to="/admin/kitchen" className="block px-4 py-2 hover:bg-gray-100">
                          🍳 Kitchen Display
                        </Link>
                        <Link to="/counter" className="block px-4 py-2 hover:bg-gray-100">
                          🛒 Counter POS
                        </Link>
                        <Link to="/delivery" className="block px-4 py-2 hover:bg-gray-100">
                          🚗 Delivery
                        </Link>
                        <Link to="/admin/reviews" className="block px-4 py-2 hover:bg-gray-100">
                          ⭐ Reviews
                        </Link>
                        <div className="border-t border-gray-200"></div>
                        <Link to="/admin/categories" className="block px-4 py-2 hover:bg-gray-100">
                          Κατηγορίες
                        </Link>
                        <Link to="/admin/products" className="block px-4 py-2 hover:bg-gray-100">
                          Προϊόντα
                        </Link>
                        <Link to="/admin/orders" className="block px-4 py-2 hover:bg-gray-100">
                          Παραγγελίες
                        </Link>
                        <Link to="/admin/customers" className="block px-4 py-2 hover:bg-gray-100">
                          Πελάτες
                        </Link>
                        <Link to="/admin/staff-hr" className="block px-4 py-2 hover:bg-gray-100">
                          👥 Staff HR
                        </Link>
                        <Link to="/admin/staff" className="block px-4 py-2 hover:bg-gray-100 rounded-b-lg">
                          👥 Staff
                        </Link>
                      </div>
                    </div>
                  )}
                  
                  {user ? (
                    <>
                      <div className="relative group">
                        <button className="text-sm hover:text-yellow-300 transition">
                          Γεια σου, {user.firstName}! ▼
                        </button>
                        <div className="absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <Link to="/profile" className="block px-4 py-3 hover:bg-gray-100 rounded-t-lg">
                            👤 Το Προφίλ μου
                          </Link>
                          <Link to="/my-orders" className="block px-4 py-3 hover:bg-gray-100">
                            📦 Οι Παραγγελίες μου
                          </Link>
                          <Link to="/my-addresses" className="block px-4 py-3 hover:bg-gray-100">
                            📍 Οι Διευθύνσεις μου
                          </Link>
                          <div className="border-t border-gray-200"></div>
                          <Link to="/loyalty" className="block px-4 py-3 hover:bg-gray-100">
                            🎁 Loyalty Rewards
                          </Link>
                          <Link to="/my-reviews" className="block px-4 py-3 hover:bg-gray-100">
                            ⭐ Οι Αξιολογήσεις μου
                          </Link>
                          <Link to="/review" className="block px-4 py-3 hover:bg-gray-100 rounded-b-lg">
                            ✍️ Γράψτε Αξιολόγηση
                          </Link>
                        </div>
                      </div>
                      <button
                        onClick={logout}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition"
                      >
                        Αποσύνδεση
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="hover:text-yellow-300 transition"
                      >
                        Σύνδεση
                      </Link>
                      <Link
                        to="/register"
                        className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded font-semibold transition"
                      >
                        Εγγραφή
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/my-orders" element={<MyOrdersPage />} />
            <Route path="/my-addresses" element={<MyAddressesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<Navigate to="/admin/insights" replace />} />
            <Route path="/admin/analytics" element={<EnhancedDashboard />} />
            <Route path="/admin/insights"  element={<InsightsPage />} />
            <Route path="/admin/staff-hr"   element={<StaffHR />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/staff" element={<StaffManagement />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/kitchen" element={<KitchenDisplayPage />} />
            
            {/* Delivery Route */}
            <Route path="/delivery" element={<DeliveryDashboard />} />
            <Route path="/counter" element={<CounterPOS />} />
            
            {/* Review Routes */}
            <Route path="/review" element={<CreateReview />} />
            <Route path="/my-reviews" element={<MyReviews />} />
            
            {/* Loyalty Route */}
            <Route path="/loyalty" element={<LoyaltyPage />} />
          </Routes>

          {/* Footer */}
          <footer className="bg-gray-800 text-white mt-12">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center">
                <p className="text-sm">
                  © 2025 I Need Food - Παραγγελία Online
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Φτιαγμένο με ❤️ και Node.js
                </p>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
