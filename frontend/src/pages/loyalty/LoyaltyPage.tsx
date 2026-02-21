import { useQuery } from '@tanstack/react-query';
import { loyaltyAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function LoyaltyPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: loyaltyAPI.getMyLoyalty,
    enabled: !!user,
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const loyalty = data?.data?.loyalty || { points: 0, tier: 'bronze', lifetimePoints: 0 };
  const transactions = data?.data?.transactions || [];

  const tierInfo = {
    bronze: {
      name: 'Χάλκινο',
      icon: '🥉',
      color: 'from-orange-600 to-orange-700',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
      next: 'Ασημένιο',
      nextPoints: 100,
      benefits: ['5% έκπτωση σε επιλεγμένα προϊόντα', 'Δωρεάν παράδοση άνω των €20'],
    },
    silver: {
      name: 'Ασημένιο',
      icon: '🥈',
      color: 'from-gray-400 to-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-100',
      next: 'Χρυσό',
      nextPoints: 200,
      benefits: ['10% έκπτωση σε όλα τα προϊόντα', 'Δωρεάν παράδοση πάντα', 'Προτεραιότητα στις παραγγελίες'],
    },
    gold: {
      name: 'Χρυσό',
      icon: '🥇',
      color: 'from-yellow-400 to-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      next: 'Πλατινένιο',
      nextPoints: 500,
      benefits: ['15% έκπτωση σε όλα', 'Δωρεάν παράδοση', 'VIP εξυπηρέτηση', 'Έκπληξη γενεθλίων'],
    },
    platinum: {
      name: 'Πλατινένιο',
      icon: '💎',
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-100',
      next: null,
      nextPoints: null,
      benefits: ['20% έκπτωση σε όλα', 'Όλα τα προηγούμενα', 'Αποκλειστικές προσφορές', 'Προσωπικός σύμβουλος'],
    },
  };

  const currentTier = tierInfo[loyalty.tier as keyof typeof tierInfo];
  const progress = currentTier.nextPoints
    ? Math.min((loyalty.lifetimePoints / currentTier.nextPoints) * 100, 100)
    : 100;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return '🛍️';
      case 'redeemed': return '🎁';
      case 'bonus': return '🎉';
      case 'milestone': return '🏆';
      default: return '💰';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎁 Loyalty Rewards</h1>
          <p className="text-gray-600">Το πρόγραμμα επιβράβευσης για τους πιστούς μας πελάτες</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Main Loyalty Card */}
            <div className={`bg-gradient-to-r ${currentTier.color} text-white rounded-3xl shadow-2xl p-8 mb-8 transform hover:scale-105 transition`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-5xl">{currentTier.icon}</span>
                    <div>
                      <div className="text-sm opacity-90">Επίπεδο</div>
                      <div className="text-3xl font-bold">{currentTier.name}</div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm opacity-90">Διαθέσιμοι Πόντοι</div>
                  <div className="text-5xl font-bold">{loyalty.points}</div>
                </div>
              </div>

              {/* Progress Bar */}
              {currentTier.next && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2 opacity-90">
                    <span>Πρόοδος προς {currentTier.next}</span>
                    <span>{loyalty.lifetimePoints} / {currentTier.nextPoints} πόντοι</span>
                  </div>
                  <div className="bg-white bg-opacity-30 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-white h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-sm mt-2 opacity-90">
                    Απομένουν {currentTier.nextPoints - loyalty.lifetimePoints} πόντοι
                  </div>
                </div>
              )}

              {currentTier.next === null && (
                <div className="bg-white bg-opacity-20 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <span className="font-semibold">
                      Συγχαρητήρια! Έχετε φτάσει το μέγιστο επίπεδο!
                    </span>
                  </div>
                </div>
              )}

              {/* Lifetime Points */}
              <div className="flex items-center justify-between pt-6 border-t border-white border-opacity-30">
                <div>
                  <div className="text-sm opacity-90">Συνολικοί Πόντοι (Lifetime)</div>
                  <div className="text-2xl font-bold">{loyalty.lifetimePoints} πόντοι</div>
                </div>
                <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-6 py-3 rounded-xl font-semibold transition">
                  Χρήση Πόντων
                </button>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Current Benefits */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>✨</span>
                  Τα Προνόμιά σας
                </h2>
                <div className="space-y-3">
                  {currentTier.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-green-600 text-xl mt-0.5">✓</span>
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Earn */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>💰</span>
                  Πως Κερδίζετε Πόντους
                </h2>
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🛍️</span>
                    <div>
                      <div className="font-semibold">Κάθε Παραγγελία</div>
                      <div className="text-sm">1 πόντος για κάθε €1 που ξοδεύετε</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">🏆</span>
                    <div>
                      <div className="font-semibold">Milestone Bonuses</div>
                      <div className="text-sm">
                        Ασημένιο: +10 | Χρυσό: +25 | Πλατινένιο: +50
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">⭐</span>
                    <div>
                      <div className="font-semibold">Αξιολογήσεις</div>
                      <div className="text-sm">Bonus πόντοι για κάθε αξιολόγηση</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">🎂</span>
                    <div>
                      <div className="font-semibold">Γενέθλια</div>
                      <div className="text-sm">Ειδικό δώρο γενεθλίων</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Progression */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-6">🎯 Όλα τα Επίπεδα</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(tierInfo).map(([key, tier]) => (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border-2 transition ${loyalty.tier === key
                        ? `border-${tier.textColor.replace('text-', '')} ${tier.bgColor}`
                        : 'border-gray-200'
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">{tier.icon}</div>
                      <div className="font-bold text-gray-800">{tier.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {key === 'bronze' ? '0-99' : key === 'silver' ? '100-199' : key === 'gold' ? '200-499' : '500+'} πόντοι
                      </div>
                      {loyalty.tier === key && (
                        <div className="mt-2">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Τρέχον
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">📊 Ιστορικό Πόντων</h2>

              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-5xl mb-4">📭</div>
                  <p>Δεν υπάρχουν συναλλαγές ακόμα</p>
                  <p className="text-sm mt-2">Ξεκινήστε να κερδίζετε πόντους κάνοντας παραγγελίες!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{getTransactionIcon(tx.type)}</div>
                        <div>
                          <div className="font-semibold text-gray-800">{tx.reason}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(tx.createdAt).toLocaleDateString('el-GR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className={`text-2xl font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </div>
                    </div>
                  ))}

                  {transactions.length > 10 && (
                    <div className="text-center pt-4">
                      <button className="text-primary hover:text-opacity-80 font-semibold">
                        Εμφάνιση Όλων ({transactions.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/')}
                className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center transition"
              >
                <div className="text-3xl mb-2">🛍️</div>
                <div className="font-semibold text-gray-800">Κάντε Παραγγελία</div>
                <div className="text-xs text-gray-600">Κερδίστε περισσότερους πόντους</div>
              </button>

              <button
                onClick={() => navigate('/review')}
                className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center transition"
              >
                <div className="text-3xl mb-2">⭐</div>
                <div className="font-semibold text-gray-800">Γράψτε Αξιολόγηση</div>
                <div className="text-xs text-gray-600">Κερδίστε bonus πόντους</div>
              </button>

              <button
                onClick={() => navigate('/my-orders')}
                className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center transition"
              >
                <div className="text-3xl mb-2">📦</div>
                <div className="font-semibold text-gray-800">Οι Παραγγελίες μου</div>
                <div className="text-xs text-gray-600">Δείτε το ιστορικό σας</div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
