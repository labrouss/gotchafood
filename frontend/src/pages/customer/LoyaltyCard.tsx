import { useQuery } from '@tanstack/react-query';
import { loyaltyAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useState, useEffect } from 'react';

export default function LoyaltyCard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const { data: rewardData } = useQuery({
    queryKey: ['loyalty'],
    queryFn: loyaltyAPI.getMyReward,
    enabled: !!user && user.role === 'CUSTOMER',
  });

  useEffect(() => {
    if (user?.phone) {
      // Generate QR code with just the phone number
      QRCode.toDataURL(user.phone, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [user?.phone]);

  if (!user || user.role !== 'CUSTOMER') {
    navigate('/');
    return null;
  }

  const reward = rewardData?.data?.reward;
  const transactions = rewardData?.data?.transactions || [];

  // Determine tier info
  const getTierInfo = (tier: string) => {
    const tiers: any = {
      bronze: { name: 'Bronze', color: '#cd7f32', icon: '🥉', min: 0, max: 499 },
      silver: { name: 'Silver', color: '#c0c0c0', icon: '🥈', min: 500, max: 1499 },
      gold: { name: 'Gold', color: '#ffd700', icon: '🥇', min: 1500, max: 2999 },
      platinum: { name: 'Platinum', color: '#e5e4e2', icon: '💎', min: 3000, max: null },
    };
    return tiers[tier.toLowerCase()] || tiers.bronze;
  };

  const tierInfo = getTierInfo(reward?.tier || 'bronze');
  const points = reward?.points || 0;
  const lifetimePoints = reward?.lifetimePoints || 0;

  // Calculate progress to next tier
  const getNextTier = () => {
    if (points < 500) return { name: 'Silver', needed: 500 - points, total: 500 };
    if (points < 1500) return { name: 'Gold', needed: 1500 - points, total: 1500 };
    if (points < 3000) return { name: 'Platinum', needed: 3000 - points, total: 3000 };
    return null;
  };

  const nextTier = getNextTier();
  const progress = nextTier ? ((points / nextTier.total) * 100) : 100;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">💳 My Loyalty Card</h1>

      {/* Loyalty Card */}
      <div className="max-w-md mx-auto mb-8">
        <div 
          className="rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${tierInfo.color} 0%, ${tierInfo.color}dd 100%)` }}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-sm opacity-80">Loyalty Member</div>
                <div className="text-2xl font-bold">{user.firstName} {user.lastName}</div>
              </div>
              <div className="text-5xl">{tierInfo.icon}</div>
            </div>

            {/* Tier Badge */}
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <span className="font-bold text-lg">{tierInfo.name} Tier</span>
            </div>

            {/* Points */}
            <div className="mb-6">
              <div className="text-sm opacity-80">Available Points</div>
              <div className="text-5xl font-bold mb-1">{points}</div>
              <div className="text-xs opacity-60">Lifetime: {lifetimePoints} points</div>
            </div>

            {/* Progress to Next Tier */}
            {nextTier && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{nextTier.needed} points to {nextTier.name}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code for Scanning */}
      <div className="max-w-md mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-2">📷 Scan to Earn Points</h2>
          <p className="text-gray-600 text-sm mb-4">Show this QR code at the counter</p>
          
          {qrDataUrl ? (
            <div className="inline-block p-4 bg-white border-4 border-gray-200 rounded-xl">
              <img src={qrDataUrl} alt="Loyalty QR Code" className="w-64 h-64" />
            </div>
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
              <div className="text-gray-400">Loading QR...</div>
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Your Phone Number</div>
            <div className="font-mono text-lg font-bold">{user.phone}</div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">📜 Recent Activity</h2>
        
        {transactions.length > 0 ? (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {transactions.slice(0, 10).map((tx: any) => (
              <div key={tx.id} className="border-b last:border-b-0 p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold">
                      {tx.type === 'EARN' ? '✅' : '❌'} {tx.reason}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(tx.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${tx.type === 'EARN' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'EARN' ? '+' : '-'}{Math.abs(tx.points)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold mb-2">Start Earning Points!</h3>
            <p className="text-gray-600">Make your first order to start collecting loyalty points</p>
          </div>
        )}
      </div>
    </div>
  );
}
