import { useQuery } from '@tanstack/react-query';
import { loyaltyAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext'; // Import ThemeContext

export default function LoyaltyCard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { storeName } = useTheme(); // Get storeName
  const [qrDataUrl, setQrDataUrl] = useState('');

  const { data: rewardData, isLoading: loyaltyLoading } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: loyaltyAPI.getMyLoyalty,
    enabled: !!user && user.role === 'CUSTOMER',
  });

  const { data: tokenData, isLoading: tokenLoading } = useQuery({
    queryKey: ['loyalty-token'],
    queryFn: loyaltyAPI.getLoyaltyToken,
    // Refresh token every 4 minutes (it expires in 5)
    refetchInterval: 4 * 60 * 1000,
    enabled: !!user && user.role === 'CUSTOMER',
  });

  const loyalty = rewardData?.data?.loyalty;
  const qrData = tokenData?.data?.token || user?.phone || '';
  const isLoading = loyaltyLoading || tokenLoading;

  useEffect(() => {
    if (!user || user.role !== 'CUSTOMER') {
      navigate('/');
    }
  }, [user, navigate]);

  // Generate QR from the encrypted loyalty token (refreshed every 4 min).
  // Falls back to phone number if token hasn't loaded yet.
  // The waiter app calls POST /user/identify-loyalty to decrypt the token,
  // or falls back to GET /loyalty/lookup/:phone if the QR contains a phone.
  useEffect(() => {
    const qrContent = tokenData?.data?.token || user?.phone;
    if (!qrContent) return;

    QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [tokenData?.data?.token, user?.phone]);

  const reward = rewardData?.data?.loyalty;
  const transactions = rewardData?.data?.transactions || [];

  // Determine tier info
  const getTierInfo = (tier: string) => {
    const tiers: any = {
      bronze: { name: 'Bronze', color: '#cd7f32', icon: '🥉' },
      silver: { name: 'Silver', color: '#c0c0c0', icon: '🥈' },
      gold: { name: 'Gold', color: '#ffd700', icon: '🥇' },
      platinum: { name: 'Platinum', color: '#e5e4e2', icon: '💎' },
    };
    return tiers[tier.toLowerCase()] || tiers.bronze;
  };

  const tierInfo = getTierInfo(reward?.tier || 'bronze');
  const points = reward?.points || 0;
  const lifetimePoints = reward?.lifetimePoints || 0;

  // Calculate progress to next tier based on lifetime points
  // Thresholds must match LoyaltyPage.tsx:
  // Bronze: 0-99 (Next: 100)
  // Silver: 100-199 (Next: 200)
  // Gold: 200-499 (Next: 500)
  // Platinum: 500+
  const getNextTier = () => {
    if (lifetimePoints < 100) return { name: 'Silver', needed: 100 - lifetimePoints, total: 100 };
    if (lifetimePoints < 200) return { name: 'Gold', needed: 200 - lifetimePoints, total: 200 };
    if (lifetimePoints < 500) return { name: 'Platinum', needed: 500 - lifetimePoints, total: 500 };
    return null;
  };

  const nextTier = getNextTier();
  // Progress is percentage of the way to the next tier total
  const progress = nextTier ? Math.min((lifetimePoints / nextTier.total) * 100, 100) : 100;

  const handleDownloadCard = () => {
    if (!qrDataUrl || !user) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Card dimensions
    const width = 600;
    const height = 900;
    canvas.width = width;
    canvas.height = height;

    // Background gradient based on tier
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (tierInfo.name === 'Bronze') {
      gradient.addColorStop(0, '#cd7f32');
      gradient.addColorStop(1, '#a05a2c');
    } else if (tierInfo.name === 'Silver') {
      gradient.addColorStop(0, '#c0c0c0');
      gradient.addColorStop(1, '#808080');
    } else if (tierInfo.name === 'Gold') {
      gradient.addColorStop(0, '#ffd700');
      gradient.addColorStop(1, '#b8860b');
    } else {
      gradient.addColorStop(0, '#e5e4e2');
      gradient.addColorStop(1, '#a9a9a9');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Header (Store Name)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(storeName || 'Loyalty Card', width / 2, 80);

    // Tier Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 100, 110, 200, 50, 25);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${tierInfo.name} Member`, width / 2, 143);

    // QR Code Background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 160, 200, 320, 320, 20);
    ctx.fill();

    // Draw QR Code
    const qrImage = new Image();
    qrImage.onload = () => {
      ctx.drawImage(qrImage, width / 2 - 140, 220, 280, 280);

      // User Info
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`${user.firstName} ${user.lastName}`, width / 2, 600);

      ctx.font = '24px monospace';
      ctx.fillText(user.phone || '', width / 2, 640);

      // Points
      ctx.font = 'bold 80px sans-serif';
      ctx.fillText(`${points}`, width / 2, 750);
      ctx.font = '24px sans-serif';
      ctx.fillText('Available Points', width / 2, 790);

      // Footer
      ctx.font = 'italic 20px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(`Scanned at ${storeName}`, width / 2, 860);

      // Trigger Download
      const link = document.createElement('a');
      link.download = `${storeName.replace(/\s+/g, '_')}_LoyaltyCard.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    qrImage.src = qrDataUrl;
  };

  if (!user || user.role !== 'CUSTOMER') return null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{storeName}</h2>
            <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold mt-1">Member Card</div>
          </div>

          <h2 className="text-xl font-bold mb-2 sr-only">Scan to Earn</h2>

          {qrDataUrl ? (
            <div className="inline-block p-4 bg-white border-4 border-gray-200 rounded-xl mb-4">
              <img src={qrDataUrl} alt="Loyalty QR Code" className="w-64 h-64" />
            </div>
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <div className="text-gray-400">Loading QR...</div>
            </div>
          )}

          <div className="mt-2 p-3 bg-gray-50 rounded-lg mb-4">
            <div className="text-xs text-gray-500 mb-1">Your Phone Number</div>
            <div className="font-mono text-lg font-bold">{user.phone}</div>
          </div>

          <button
            onClick={handleDownloadCard}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-800 transition font-semibold"
          >
            <span>📥</span>
            Save to Phone / Gallery
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Save this image to use as your digital wallet card
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">📜 Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {transactions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx: any) => {
                const isPositive = ['earned', 'milestone', 'bonus', 'redeemed_reversal'].includes(tx.type?.toLowerCase());
                // redeemed is negative
                const isNegative = ['redeemed'].includes(tx.type?.toLowerCase());

                // If it's not explicitly negative, treat as positive for display if points > 0
                // or trust the type list. Best to match LoyaltyPage logic.
                // LoyaltyPage logic: points > 0 ? green : red
                const isGain = tx.points > 0;

                return (
                  <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label={tx.type}>
                        {tx.type === 'earned' ? '🛍️' :
                          tx.type === 'milestone' ? '🏆' :
                            tx.type === 'redeemed' ? '🎁' : '💰'}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-800">{tx.reason}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString()}
                          {', '}
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold ${isGain ? 'text-green-600' : 'text-red-600'}`}>
                      {isGain ? '+' : ''}{tx.points}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No recent transactions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
