import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { menuAPI, categoryAPI } from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../components/ToastContainer';

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const cart = useCartStore();
  const addToast = useToastStore((state) => state.addToast);
  
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryAPI.getAll,
  });

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: menuAPI.getAll,
  });

  const filteredItems = selectedCategory
    ? menuItems?.data?.menuItems?.filter(
        (item: any) => item.category.slug === selectedCategory
      )
    : menuItems?.data?.menuItems;

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">
        Το Μενού μας
      </h1>

      {/* Categories */}
      <div className="mb-8 flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-6 py-2 rounded-full font-semibold transition ${
            selectedCategory === null
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Όλα
        </button>
        {categories?.data?.categories?.map((category: any) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.slug)}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              selectedCategory === category.slug
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems?.map((item: any) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1"
            >
              <div className="h-40 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center relative">
                <span className="text-5xl">🍽️</span>
                {item.isPopular && (
                  <span className="absolute top-2 right-2 bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded">
                    ⭐ Popular
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs text-gray-500 mb-1">
                  {item.category.name}
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-800">
                  {item.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">
                  {item.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-red-600">
                    €{parseFloat(item.price).toFixed(2)}
                  </span>
                  {item.isAvailable ? (
                    <button 
                      onClick={() => handleAddToCart(item)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
                    >
                      Προσθήκη
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">
                      Μη διαθέσιμο
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredItems?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Δεν βρέθηκαν προϊόντα σε αυτήν την κατηγορία.
        </div>
      )}
    </div>
  );
}
