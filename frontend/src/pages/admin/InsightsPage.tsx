import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const PERIOD_OPTIONS = [
  { label: 'Today',    value: 1  },
  { label: '7 days',  value: 7  },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

// ── small helpers ──────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = 'blue' }: any) => {
  const colors: any = {
    blue:   'border-blue-500   bg-blue-50   text-blue-700',
    green:  'border-green-500  bg-green-50  text-green-700',
    orange: 'border-orange-500 bg-orange-50 text-orange-700',
    red:    'border-red-500    bg-red-50    text-red-700',
    purple: 'border-purple-500 bg-purple-50 text-purple-700',
    gray:   'border-gray-400   bg-gray-50   text-gray-700',
  };
  return (
    <div className={`rounded-xl border-l-4 p-5 shadow-sm ${colors[color]}`}>
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-3xl font-extrabold">{value ?? '—'}</div>
      <div className="text-sm font-semibold mt-1">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
};

const BarRow = ({ label, value, max, color, suffix = '' }: any) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 truncate max-w-xs">{label}</span>
        <span className="font-bold ml-2">{value}{suffix}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div className={`h-3 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const Badge = ({ text, color }: { text: string; color: string }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{text}</span>
);

const speedBadge = (val: number | null, good: number, bad: number) => {
  if (val === null) return <Badge text="No data" color="bg-gray-200 text-gray-600" />;
  if (val <= good)  return <Badge text={`${val} min ✓`} color="bg-green-100 text-green-800" />;
  if (val <= bad)   return <Badge text={`${val} min ⚠`} color="bg-yellow-100 text-yellow-800" />;
  return              <Badge text={`${val} min ✗`}  color="bg-red-100 text-red-800" />;
};

// ── mini bar chart using divs ───────────────────────────────────────────────
const MiniBarChart = ({ data, valueKey, labelKey, color, maxLabel = '' }: any) => {
  const max = Math.max(...data.map((d: any) => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d: any, i: number) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className={`w-full rounded-t transition-all ${color}`}
            style={{ height: `${Math.max((d[valueKey] / max) * 80, d[valueKey] > 0 ? 4 : 0)}px` }}
          />
          {/* tooltip */}
          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
            {d[labelKey]}: {d[valueKey]}{maxLabel}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── main page ─────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const [days, setDays] = useState(7);
  const [staffTab, setStaffTab] = useState<'overview' | 'confirm' | 'prep' | 'delivery'>('overview');

  const isAuthorized = !!user && (user.role === 'ADMIN' || user.role === 'STAFF');

  const { data, isLoading, error } = useQuery({
    queryKey: ['insights', days],
    queryFn: () => adminAPI.getInsights(days),
    enabled: isAuthorized,
    staleTime: 60_000,
  });

  if (!isAuthorized) { navigate('/'); return null; }

  const d = data?.data;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">

      {/* ── header ── */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white px-6 py-8">
        <h1 className="text-3xl font-extrabold mb-1">📈 Data Insights</h1>
        <p className="opacity-80 text-sm">Timing patterns · Staff performance · Bottlenecks</p>

        {/* period selector */}
        <div className="flex gap-2 mt-4">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-4 py-1.5 rounded-lg font-semibold text-sm transition ${
                days === p.value ? 'bg-white text-indigo-700' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600" />
        </div>
      )}

      {error && (
        <div className="max-w-2xl mx-auto mt-8 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">
          Failed to load insights. Make sure the backend is running and Prisma client is regenerated.
        </div>
      )}

      {d && (
        <div className="max-w-7xl mx-auto px-4 mt-6 space-y-8">

          {/* ══ SUMMARY ROW ══════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard icon="📦" label="Total Orders"     value={d.summary.totalOrders}    color="blue"   />
            <StatCard icon="✅" label="Delivered"         value={d.summary.deliveredCount}  color="green"  sub={`of ${d.summary.totalOrders}`} />
            <StatCard icon="❌" label="Cancelled"         value={d.summary.cancelledCount}  color="red"    />
            <StatCard icon="💰" label="Revenue"           value={`€${d.summary.totalRevenue}`} color="purple" />
            <StatCard icon="⏱️" label="Avg Total Time"    value={d.timing.avgTotalMin != null ? `${d.timing.avgTotalMin} min` : null} color="orange" />
          </div>

          {/* ══ TIMING PATTERNS ═════════════════════════════════════════ */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-5">⏱️ Timing Patterns</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Confirmation */}
              <div className="rounded-xl bg-blue-50 p-5">
                <div className="text-lg font-bold text-blue-800 mb-3">✅ Confirmation</div>
                <div className="text-4xl font-extrabold text-blue-700 mb-1">
                  {d.timing.avgConfirmMin ?? '—'}<span className="text-lg font-normal"> min</span>
                </div>
                <div className="text-xs text-blue-600 mb-3">avg time to confirm order</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-semibold text-green-700">&lt; 3 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {speedBadge(d.timing.avgConfirmMin, 3, 5)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Samples:</span>
                    <span>{d.timing.confirmSamples}</span>
                  </div>
                </div>
              </div>

              {/* Preparation */}
              <div className="rounded-xl bg-purple-50 p-5">
                <div className="text-lg font-bold text-purple-800 mb-3">🍳 Preparation</div>
                <div className="text-4xl font-extrabold text-purple-700 mb-1">
                  {d.timing.avgPrepMin ?? '—'}<span className="text-lg font-normal"> min</span>
                </div>
                <div className="text-xs text-purple-600 mb-3">avg time from confirm → ready</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-semibold text-green-700">&lt; 15 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {speedBadge(d.timing.avgPrepMin, 15, 25)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Samples:</span>
                    <span>{d.timing.prepSamples}</span>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="rounded-xl bg-green-50 p-5">
                <div className="text-lg font-bold text-green-800 mb-3">🚗 Delivery</div>
                <div className="text-4xl font-extrabold text-green-700 mb-1">
                  {d.timing.avgDeliveryMin ?? '—'}<span className="text-lg font-normal"> min</span>
                </div>
                <div className="text-xs text-green-600 mb-3">avg time from ready → delivered</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-semibold text-green-700">&lt; 15 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {speedBadge(d.timing.avgDeliveryMin, 15, 20)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Samples:</span>
                    <span>{d.timing.deliverySamples}</span>
                  </div>
                </div>
              </div>
            </div>

	    {/* Waiter */}
	    <div className="bg-purple-50 rounded-lg shadow p-4">
              <div className="text-purple-600 text-sm">Waiter Orders Revenue</div>
              <div className="text-2xl font-bold text-purple-700">
                €{data?.data?.waiterRevenue?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {data?.data?.waiterOrderCount || 0} orders
              </div>
            </div>

            {/* On-time rates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">On-time rate <span className="text-xs">(≤ 40 min)</span></div>
                <div className="text-3xl font-bold text-gray-800">
                  {d.timing.onTimeRate != null ? `${d.timing.onTimeRate}%` : '—'}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${(d.timing.onTimeRate ?? 0) >= 80 ? 'bg-green-500' : (d.timing.onTimeRate ?? 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${d.timing.onTimeRate ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Fast orders <span className="text-xs">(≤ 25 min)</span></div>
                <div className="text-3xl font-bold text-gray-800">
                  {d.timing.fastOrderRate != null ? `${d.timing.fastOrderRate}%` : '—'}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${d.timing.fastOrderRate ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ══ BOTTLENECKS ═════════════════════════════════════════════ */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl font-bold text-gray-800">🚧 Bottleneck Detection</h2>
              {d.bottlenecks.worstStage && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                  Worst: {d.bottlenecks.worstStage}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Slow Confirmations', rate: d.bottlenecks.slowConfirmRate, count: d.bottlenecks.slowConfirmCount, desc: '> 5 min to confirm', icon: '✅' },
                { label: 'Slow Preparations',  rate: d.bottlenecks.slowPrepRate,     count: d.bottlenecks.slowPrepCount,    desc: '> 25 min to prepare', icon: '🍳' },
                { label: 'Slow Deliveries',    rate: d.bottlenecks.slowDeliveryRate, count: d.bottlenecks.slowDeliveryCount, desc: '> 20 min to deliver', icon: '🚗' },
              ].map(b => (
                <div key={b.label} className={`rounded-xl p-4 border-2 ${b.rate > 30 ? 'border-red-300 bg-red-50' : b.rate > 15 ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800">{b.icon} {b.label}</span>
                    <span className={`text-2xl font-extrabold ${b.rate > 30 ? 'text-red-600' : b.rate > 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {b.rate}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{b.desc}</div>
                  <div className="text-sm text-gray-700">{b.count} orders affected</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${b.rate > 30 ? 'bg-red-500' : b.rate > 15 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(b.rate, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Actionable advice */}
            {d.bottlenecks.worstStage && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg text-sm">
                <div className="font-bold text-amber-900 mb-1">💡 Recommendation</div>
                {d.bottlenecks.worstStage === 'preparation' && (
                  <p className="text-amber-800">Preparation is your main bottleneck. Consider adding more kitchen staff during peak hours, reviewing prep times on slow items, or pre-preparing common ingredients.</p>
                )}
                {d.bottlenecks.worstStage === 'delivery' && (
                  <p className="text-amber-800">Delivery is your main bottleneck. Consider adding a delivery driver during peak hours or reviewing delivery routes and zones.</p>
                )}
                {d.bottlenecks.worstStage === 'confirmation' && (
                  <p className="text-amber-800">Orders are waiting too long for confirmation. Ensure counter staff are monitoring incoming orders and enable sound alerts on the kitchen display.</p>
                )}
              </div>
            )}
          </section>

          {/* ══ STAFF PERFORMANCE ═══════════════════════════════════════ */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">👥 Staff Performance</h2>

            {/* tabs */}
            <div className="flex gap-2 mb-6 border-b">
              {(['overview','confirm','prep','delivery'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStaffTab(tab)}
                  className={`px-4 py-2 font-semibold text-sm border-b-2 transition -mb-px ${
                    staffTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {{ overview:'Overview', confirm:'Fastest Confirmer', prep:'Best Preparer', delivery:'Quickest Deliverer' }[tab]}
                </button>
              ))}
            </div>

            {d.staff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👤</div>
                No staff activity recorded in this period
              </div>
            ) : (
              <>
                {/* OVERVIEW */}
                {staffTab === 'overview' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b-2 text-gray-600">
                          <th className="pb-2 pr-4">Name</th>
                          <th className="pb-2 pr-4 text-center">Confirmations</th>
                          <th className="pb-2 pr-4 text-center">Items Prepared</th>
                          <th className="pb-2 pr-4 text-center">Deliveries</th>
                          <th className="pb-2 pr-4 text-center">Avg Confirm</th>
                          <th className="pb-2 pr-4 text-center">Avg Prep</th>
                          <th className="pb-2 text-center">Avg Delivery</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.staff.map((s: any, i: number) => (
                          <tr key={s.id} className={`border-b ${i === 0 ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-3 pr-4 font-semibold">
                              {i === 0 && <span className="text-yellow-500 mr-1">🏆</span>}
                              {s.name}
                            </td>
                            <td className="py-3 pr-4 text-center">{s.confirmCount || '—'}</td>
                            <td className="py-3 pr-4 text-center">{s.itemCount || '—'}</td>
                            <td className="py-3 pr-4 text-center">{s.deliveryCount || '—'}</td>
                            <td className="py-3 pr-4 text-center">{speedBadge(s.avgConfirmTime, 3, 5)}</td>
                            <td className="py-3 pr-4 text-center">{speedBadge(s.avgItemPrepTime, 10, 20)}</td>
                            <td className="py-3 text-center">{speedBadge(s.avgDeliveryTime, 15, 20)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* FASTEST CONFIRMER */}
                {staffTab === 'confirm' && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500 mb-4">Lower is better — target &lt; 3 min</div>
                    {d.staff
                      .filter((s: any) => s.confirmCount > 0)
                      .sort((a: any, b: any) => (a.avgConfirmTime ?? 999) - (b.avgConfirmTime ?? 999))
                      .map((s: any, i: number) => (
                        <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                          <div className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
                          <div className="flex-1">
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.confirmCount} confirmations</div>
                          </div>
                          {speedBadge(s.avgConfirmTime, 3, 5)}
                        </div>
                      ))}
                  </div>
                )}

                {/* BEST PREPARER */}
                {staffTab === 'prep' && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500 mb-4">Lower avg prep time · More items = better</div>
                    {d.staff
                      .filter((s: any) => s.itemCount > 0)
                      .sort((a: any, b: any) => (a.avgItemPrepTime ?? 999) - (b.avgItemPrepTime ?? 999))
                      .map((s: any, i: number) => (
                        <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                          <div className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
                          <div className="flex-1">
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.itemCount} items prepared</div>
                          </div>
                          {speedBadge(s.avgItemPrepTime, 10, 20)}
                        </div>
                      ))}
                  </div>
                )}

                {/* QUICKEST DELIVERER */}
                {staffTab === 'delivery' && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500 mb-4">Lower is better — target &lt; 15 min</div>
                    {d.staff
                      .filter((s: any) => s.deliveryCount > 0)
                      .sort((a: any, b: any) => (a.avgDeliveryTime ?? 999) - (b.avgDeliveryTime ?? 999))
                      .map((s: any, i: number) => (
                        <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                          <div className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
                          <div className="flex-1">
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.deliveryCount} deliveries · €{
                              (() => {
                                // not available at this level, just show count
                                return s.deliveryCount * 0;
                              })()
                            }</div>
                          </div>
                          {speedBadge(s.avgDeliveryTime, 15, 20)}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* ══ DAILY TREND ═════════════════════════════════════════════ */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📅 Daily Trend</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Orders per day</div>
                <MiniBarChart data={d.daily} valueKey="orders" labelKey="date" color="bg-indigo-500" maxLabel=" orders" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{d.daily[0]?.date?.slice(5)}</span>
                  <span>{d.daily[d.daily.length - 1]?.date?.slice(5)}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Revenue per day (€)</div>
                <MiniBarChart data={d.daily} valueKey="revenue" labelKey="date" color="bg-green-500" maxLabel="€" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{d.daily[0]?.date?.slice(5)}</span>
                  <span>{d.daily[d.daily.length - 1]?.date?.slice(5)}</span>
                </div>
              </div>
            </div>

            {/* daily table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-600">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4 text-right">Orders</th>
                    <th className="pb-2 pr-4 text-right">Delivered</th>
                    <th className="pb-2 pr-4 text-right">Revenue</th>
                    <th className="pb-2 text-right">Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...d.daily].reverse().map((day: any) => (
                    <tr key={day.date} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium">{day.date}</td>
                      <td className="py-2 pr-4 text-right">{day.orders}</td>
                      <td className="py-2 pr-4 text-right">{day.delivered}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-green-700">€{day.revenue.toFixed(2)}</td>
                      <td className="py-2 text-right">{day.avgMin != null ? `${day.avgMin} min` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ══ HOURLY HEATMAP ══════════════════════════════════════════ */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🕐 Peak Hours</h2>
            <div className="text-sm text-gray-500 mb-4">Orders by hour of day — spot your busiest periods</div>
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {d.hourly.map((h: any) => {
                  const maxOrders = Math.max(...d.hourly.map((x: any) => x.orders), 1);
                  const intensity = h.orders / maxOrders;
                  const bg = intensity === 0 ? 'bg-gray-100'
                    : intensity < 0.25 ? 'bg-orange-100'
                    : intensity < 0.5  ? 'bg-orange-300'
                    : intensity < 0.75 ? 'bg-orange-500'
                    : 'bg-red-600';
                  const text = intensity >= 0.5 ? 'text-white' : 'text-gray-700';
                  return (
                    <div key={h.hour} className="flex flex-col items-center gap-1">
                      <div className={`w-12 rounded-lg flex flex-col items-center justify-center py-3 ${bg} ${text}`}
                           style={{ minHeight: '64px' }}>
                        <div className="text-lg font-bold">{h.orders}</div>
                        {h.avgMin && <div className="text-xs opacity-80">{h.avgMin}m</div>}
                      </div>
                      <div className="text-xs text-gray-500">{h.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Quiet</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" /> Moderate</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block" /> Peak</span>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
