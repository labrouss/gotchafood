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
import StoreSettings from './pages/admin/StoreSettings';
import LoyaltyTiers from './pages/admin/LoyaltyTiers';
import LoyaltyCard from './pages/customer/LoyaltyCard';
import StaffHR from './pages/admin/StaffHR';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import CreateReview from './pages/reviews/CreateReview';
import MyReviews from './pages/reviews/MyReviews';
import LoyaltyPage from './pages/loyalty/LoyaltyPage';
import ToastContainer from './components/ToastContainer';


// Pack 6 - Admin Pages
import TablesManagement from './pages/admin/TablesManagement';
import ReservationsCalendar from './pages/admin/ReservationsCalendar';

// Pack 6 - Waiter Pages
import WaiterDashboard from './pages/waiter/WaiterDashboard';
import WaiterOrderDetail from './pages/waiter/WaiterOrderDetail';
import TakeOrder from './pages/waiter/TakeOrder';

// Pack 6 - Customer Pages
import ReservationForm from './pages/customer/ReservationForm';
import MyReservations from './pages/customer/MyReservations';

import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';

import { ThemeProvider, useTheme } from './context/ThemeContext';

const queryClient = new QueryClient();

function AppContent() {
  const { user, logout } = useAuthStore();
  const itemCount = useCartStore((state) => state.getItemCount());
  const { storeName, logoUrl, primaryColor } = useTheme();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav
          className="text-white shadow-lg transition-colors duration-300"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="text-2xl font-bold flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={storeName} className="h-10 w-10 object-contain bg-white rounded-full p-1" />
                ) : (
                  <span>🍕</span>
                )}
                {storeName}
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
		    <Link to="/my-reservations" className="hover:text-yellow-300 transition">
                    📅 Κρατήσεις μου
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
		 
               {user && user.role === 'STAFF' && (
                 <Link to="/waiter" className="hover:text-yellow-300 transition font-semibold">
                   👔 Τα Τραπέζια μου
                 </Link>
               )}


                {isAdmin && (
                  <div className="relative group">
                    <button className="hover:text-yellow-300 transition">
                      ⚙️ Admin
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
		       <Link to="/admin/tables" className="block px-4 py-2 hover:bg-gray-100 rounded-t-lg">
                         🍽️ Τραπέζια
                       </Link>
                       <Link to="/admin/reservations" className="block px-4 py-2 hover:bg-gray-100">
                         📅 Κρατήσεις
                       </Link>
                       <div className="border-t border-gray-200"></div>

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
                      <Link to="/admin/staff" className="block px-4 py-2 hover:bg-gray-100">
                        👥 Staff
                      </Link>
                      <div className="border-t border-gray-200"></div>
                      <Link to="/admin/settings" className="block px-4 py-2 hover:bg-gray-100">
                        ⚙️ Store Settings
                      </Link>
                      <Link to="/admin/loyalty-tiers" className="block px-4 py-2 hover:bg-gray-100 rounded-b-lg">
                        🏆 Loyalty Tiers
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
                        <Link to="/my-reservations" className="block px-4 py-3 hover:bg-gray-100">
                          📅 Οι Κρατήσεις μου
                        </Link>
                        <Link to="/my-addresses" className="block px-4 py-3 hover:bg-gray-100">
                          📍 Οι Διευθύνσεις μου
                        </Link>
                        <div className="border-t border-gray-200"></div>
                        <Link to="/loyalty-card" className="block px-4 py-3 hover:bg-gray-100">
                          💳 Loyalty Card
                        </Link>
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
		    <Link to="/reserve" className="hover:text-yellow-300 transition">
                      📅 Κράτηση
                    </Link>
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
          <Route path="/loyalty-card" element={<LoyaltyCard />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/insights" replace />} />
          <Route path="/admin/analytics" element={<EnhancedDashboard />} />
          <Route path="/admin/insights" element={<InsightsPage />} />
          <Route path="/admin/staff-hr" element={<StaffHR />} />
          <Route path="/admin/settings" element={<StoreSettings />} />
          <Route path="/admin/loyalty-tiers" element={<LoyaltyTiers />} />
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
	  {/* Waiter and Tables Route */}
	  <Route path="/admin/tables" element={<TablesManagement />} />
          <Route path="/admin/reservations" element={<ReservationsCalendar />} />
          <Route path="/waiter" element={<WaiterDashboard />} />
          <Route path="/waiter/take-order/:sessionId" element={<TakeOrder />} />
	  <Route path="/waiter/order/:orderId" element={<WaiterOrderDetail />} /> 
          <Route path="/reserve" element={<ReservationForm />} />
          <Route path="/my-reservations" element={<MyReservations />} /> 

        </Routes>

        {/* Footer */}
        <footer className="bg-gray-800 text-white mt-12">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-sm">
                © {new Date().getFullYear()} {storeName} - Παραγγελία Online
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Φτιαγμένο με ❤️ και Node.js
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
