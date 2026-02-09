import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const statusColors: any = {
  PENDING: 'bg-yellow-400 text-gray-900',
  CONFIRMED: 'bg-blue-500 text-white',
  PREPARING: 'bg-purple-500 text-white',
  OUT_FOR_DELIVERY: 'bg-indigo-600 text-white',
};

const stations = [
  { id: 'all', name: 'Όλα', icon: '🏠', color: 'bg-gray-600' },
  { id: 'kitchen', name: 'Κουζίνα', icon: '🍳', color: 'bg-red-600' },
  { id: 'barista', name: 'Barista', icon: '☕', color: 'bg-amber-700' },
  { id: 'cold-prep', name: 'Κρύα', icon: '🥗', color: 'bg-green-600' },
  { id: 'hot-prep', name: 'Ζεστά', icon: '🔥', color: 'bg-orange-600' },
];

export default function KitchenDisplayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  
  // Auto-select station based on user's routing role, default to 'all' for admins
  const initialStation = user?.role === 'STAFF' && user?.routingRole ? user.routingRole : 'all';
  const [selectedStation, setSelectedStation] = useState(initialStation);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds default
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCompletedToday, setShowCompletedToday] = useState(false);
  
  const previousOrderCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lock staff to their assigned station
  const isStaffLocked = user?.role === 'STAFF' && user?.routingRole;

  // Initialize audio
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playNotification = () => {
      if (!soundEnabled) return;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(soundVolume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };
    
    audioRef.current = { play: playNotification } as any;
  }, [soundEnabled, soundVolume]);

  // Fetch active orders
  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => adminAPI.getOrders(),
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'STAFF'),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, additionalTime }: { id: string; status: string; additionalTime?: number }) =>
      adminAPI.updateOrderStatus(id, status, additionalTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
  });

  // Sound alert for new orders
  useEffect(() => {
    const orders = data?.data?.orders || [];
    const activeOrders = orders.filter((o: any) => 
      ['PENDING', 'CONFIRMED', 'PREPARING'].includes(o.status)
    );
    const currentCount = activeOrders.length;
    
    if (currentCount > previousOrderCountRef.current && previousOrderCountRef.current > 0) {
      // New order detected
      if (audioRef.current) {
        audioRef.current.play();
      }
    }
    
    previousOrderCountRef.current = currentCount;
  }, [data]);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    navigate('/');
    return null;
  }

  const allOrders = data?.data?.orders || [];
  
  // Filter active orders
  const activeOrders = allOrders.filter((order: any) => 
    !['DELIVERED', 'CANCELLED'].includes(order.status)
  );

  // Filter by station
  const filteredOrders = selectedStation === 'all' 
    ? activeOrders 
    : activeOrders.filter((order: any) => {
        // Check if any item in the order belongs to the selected station
        return order.items?.some((item: any) => item.station === selectedStation);
      });

  // Group orders by status
  const groupedOrders = {
    PENDING: filteredOrders.filter((o: any) => o.status === 'PENDING'),
    CONFIRMED: filteredOrders.filter((o: any) => o.status === 'CONFIRMED'),
    PREPARING: filteredOrders.filter((o: any) => o.status === 'PREPARING'),
    OUT_FOR_DELIVERY: filteredOrders.filter((o: any) => o.status === 'OUT_FOR_DELIVERY'),
  };

  // Calculate time since order
  const getTimeSinceOrder = (placedAt: string) => {
    const now = new Date();
    const placed = new Date(placedAt);
    const diff = Math.floor((now.getTime() - placed.getTime()) / 60000); // minutes
    return diff;
  };

  const getTimeColor = (minutes: number, estimatedTime: number, additionalTime: number) => {
    const totalTime = estimatedTime + additionalTime;
    if (minutes > totalTime + 15) return 'text-red-600 font-bold animate-pulse';
    if (minutes > totalTime) return 'text-orange-600 font-semibold';
    return 'text-green-600';
  };

  const OrderCard = ({ order }: { order: any }) => {
    const timeSinceOrder = getTimeSinceOrder(order.placedAt);
    const estimatedTime = order.estimatedTime || 15;
    const additionalTime = order.additionalTime || 0;
    const remainingTime = (estimatedTime + additionalTime) - timeSinceOrder;
    
    // Filter items by station if a station is selected
    const displayItems = selectedStation === 'all' 
      ? order.items 
      : order.items.filter((item: any) => item.station === selectedStation);

    if (displayItems.length === 0) return null;

    return (
      <div className={`bg-white rounded-lg shadow-lg p-4 border-l-4 ${
        timeSinceOrder > estimatedTime + additionalTime + 15 
          ? 'border-red-600 ring-4 ring-red-200' 
          : timeSinceOrder > estimatedTime + additionalTime
          ? 'border-orange-500'
          : 'border-green-500'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              #{order.orderNumber.split('-')[1]}
            </h3>
            <p className="text-sm text-gray-600">
              {order.user.firstName} {order.user.lastName}
            </p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColors[order.status]}`}>
              {order.status}
            </span>
            <div className={`text-2xl font-bold mt-1 ${getTimeColor(timeSinceOrder, estimatedTime, additionalTime)}`}>
              {timeSinceOrder} min
            </div>
            {remainingTime > 0 ? (
              <div className="text-xs text-gray-600">
                {remainingTime} min left
              </div>
            ) : (
              <div className="text-xs text-red-600 font-semibold">
                {Math.abs(remainingTime)} min over
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {displayItems.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center bg-gray-50 rounded p-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-600">{item.quantity}x</span>
                <div>
                  <div className="font-semibold">{item.menuItem.name}</div>
                  {item.notes && (
                    <div className="text-xs text-orange-600 font-semibold">
                      ⚠️ {item.notes}
                    </div>
                  )}
                </div>
              </div>
              {item.station && (
                <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                  {stations.find(s => s.id === item.station)?.icon} {item.station}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Order Notes */}
        {order.notes && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-4">
            <div className="font-bold text-yellow-900 text-sm">📝 Special Instructions:</div>
            <div className="text-yellow-800 text-sm">{order.notes}</div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          {order.status === 'PENDING' && (
            <button
              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'CONFIRMED' })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm"
            >
              ✅ Confirm
            </button>
          )}
          
          {order.status === 'CONFIRMED' && (
            <button
              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'PREPARING' })}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold text-sm"
            >
              🍳 Start Prep
            </button>
          )}
          
          {order.status === 'PREPARING' && (
            <button
              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'OUT_FOR_DELIVERY' })}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm"
            >
              📦 Ready
            </button>
          )}

          {/* Add Time Buttons */}
          <button
            onClick={() => updateStatusMutation.mutate({ 
              id: order.id, 
              status: order.status,
              additionalTime: additionalTime + 5 
            })}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold text-sm"
          >
            +5 min
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 sticky top-0 z-30 shadow-lg">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold">🍳 Kitchen Display</h1>
              <p className="text-sm opacity-90">
                Active Orders: {activeOrders.length} | Filtered: {filteredOrders.length}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => navigate('/admin')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded font-semibold"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Station Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {isStaffLocked && (
              <div className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                🔒 Assigned to: {stations.find(s => s.id === user?.routingRole)?.name}
              </div>
            )}
            {stations
              .filter(station => !isStaffLocked || station.id === selectedStation)
              .map((station) => (
              <button
                key={station.id}
                onClick={() => !isStaffLocked && setSelectedStation(station.id)}
                disabled={isStaffLocked && station.id !== selectedStation}
                className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition flex items-center gap-2 ${
                  selectedStation === station.id
                    ? `${station.color} text-white`
                    : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                } ${isStaffLocked && station.id !== selectedStation ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-xl">{station.icon}</span>
                <span>{station.name}</span>
                {station.id !== 'all' && (
                  <span className="bg-white bg-opacity-30 px-2 py-0.5 rounded text-sm">
                    {activeOrders.filter((o: any) => 
                      o.items?.some((i: any) => i.station === station.id)
                    ).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="bg-white border-b p-4 sticky top-24 z-20 shadow">
        <div className="container mx-auto flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            {/* Auto Refresh */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold">Auto-Refresh</span>
            </label>

            {/* Refresh Interval */}
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
            )}

            {/* Sound Toggle */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold">🔔 Sound</span>
            </label>

            {/* Volume */}
            {soundEnabled && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={soundVolume}
                onChange={(e) => setSoundVolume(Number(e.target.value))}
                className="w-20"
              />
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="text-gray-600 mt-4">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">All Clear!</h2>
            <p className="text-gray-600">
              {selectedStation === 'all' 
                ? 'No active orders in the kitchen' 
                : `No orders for ${stations.find(s => s.id === selectedStation)?.name}`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Orders */}
            {groupedOrders.PENDING.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded">
                    PENDING ({groupedOrders.PENDING.length})
                  </span>
                </h2>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {groupedOrders.PENDING.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed Orders */}
            {groupedOrders.CONFIRMED.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded">
                    CONFIRMED ({groupedOrders.CONFIRMED.length})
                  </span>
                </h2>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {groupedOrders.CONFIRMED.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Preparing Orders */}
            {groupedOrders.PREPARING.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="bg-purple-500 text-white px-3 py-1 rounded">
                    PREPARING ({groupedOrders.PREPARING.length})
                  </span>
                </h2>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {groupedOrders.PREPARING.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Out for Delivery */}
            {groupedOrders.OUT_FOR_DELIVERY.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded">
                    OUT FOR DELIVERY ({groupedOrders.OUT_FOR_DELIVERY.length})
                  </span>
                </h2>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {groupedOrders.OUT_FOR_DELIVERY.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
