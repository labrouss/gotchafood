import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffhrAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';

const DAYS     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const STATIONS = ['kitchen','barista','cold-prep','hot-prep','delivery','counter'];
const STATION_ICONS: any = { kitchen:'🍳', barista:'☕', 'cold-prep':'🥗', 'hot-prep':'🔥', delivery:'🚗', counter:'🧑‍💼' };
const CONTRACT_TYPES = ['full-time','part-time','hourly'];

// ── tiny helpers ─────────────────────────────────────────────────────────
const Badge = ({ label, color }: { label: string; color: string }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{label}</span>
);

const statusBadge = (staff: any) => {
  if (staff.staffProfile?.firedAt) return <Badge label="Terminated" color="bg-red-100 text-red-700" />;
  if (!staff.isActive)              return <Badge label="Login Disabled" color="bg-orange-100 text-orange-700" />;
  return                                   <Badge label="Active" color="bg-green-100 text-green-700" />;
};

const roleBadge = (role: string) =>
  role === 'ADMIN'
    ? <Badge label="Admin"  color="bg-red-500 text-white"  />
    : <Badge label="Staff"  color="bg-blue-500 text-white" />;

const contractBadge = (type: string) => {
  const c: any = { 'full-time':'bg-indigo-100 text-indigo-700', 'part-time':'bg-purple-100 text-purple-700', 'hourly':'bg-gray-100 text-gray-700' };
  return <Badge label={type} color={c[type] ?? 'bg-gray-100 text-gray-600'} />;
};

// ── blank form states ────────────────────────────────────────────────────
const blankHire = { firstName:'', lastName:'', email:'', phone:'', password:'', role:'STAFF', routingRole:'', contractType:'full-time', hourlyRate:'', emergencyName:'', emergencyPhone:'', notes:'' };

const blankSchedule = DAYS.map((_,i) => ({ dayOfWeek:i, enabled:false, startTime:'09:00', endTime:'17:00', station:'' }));

// ════════════════════════════════════════════════════════════════════════
export default function StaffHR() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const user         = useAuthStore(s => s.user);
  const addToast     = useToastStore(s => s.addToast);

  // tabs: list | schedule | hire
  const [tab,        setTab]        = useState<'list'|'schedule'|'hire'>('list');
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<'all'|'active'|'disabled'|'terminated'>('all');
  const [expandedId, setExpandedId] = useState<string|null>(null);

  // modal state
  const [hireForm,        setHireForm]        = useState({ ...blankHire });
  const [editTarget,      setEditTarget]      = useState<any>(null);
  const [fireTarget,      setFireTarget]      = useState<any>(null);
  const [fireReason,      setFireReason]      = useState('');
  const [resetTarget,     setResetTarget]     = useState<any>(null);
  const [newPassword,     setNewPassword]     = useState('');
  const [scheduleTarget,  setScheduleTarget]  = useState<any>(null);
  const [scheduleDays,    setScheduleDays]    = useState(blankSchedule.map(d => ({...d})));
  const [showHireModal,   setShowHireModal]   = useState(false);

  const isAdmin = !!user && user.role === 'ADMIN';

  // ── queries ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['staffhr'],
    queryFn: staffhrAPI.getAll,
    enabled: isAdmin,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ['weekly-schedule'],
    queryFn: staffhrAPI.getWeeklySchedule,
    enabled: isAdmin && tab === 'schedule',
  });

  // ── mutations ─────────────────────────────────────────────────────────
  const mut = (fn: () => Promise<any>, msg: string, invalidate = 'staffhr') => useMutation({
    mutationFn: fn,
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: [invalidate] }); addToast(r.message ?? msg); },
    onError:   (e: any) => addToast(e.response?.data?.message ?? 'Error', 'error'),
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const hireMut = useMutation({
    mutationFn: () => {
      const payload: any = { ...hireForm };
      // coerce numeric fields — backend Zod still expects number or undefined
      if (payload.hourlyRate === '' || payload.hourlyRate === undefined) {
        delete payload.hourlyRate;
      } else {
        payload.hourlyRate = parseFloat(payload.hourlyRate);
      }
      // strip empty optional strings so Zod doesn't choke on them
      if (!payload.phone)          delete payload.phone;
      if (!payload.routingRole)    delete payload.routingRole;
      if (!payload.emergencyName)  delete payload.emergencyName;
      if (!payload.emergencyPhone) delete payload.emergencyPhone;
      if (!payload.notes)          delete payload.notes;
      return staffhrAPI.hire(payload);
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['staffhr'] });
      addToast(r.message);
      setShowHireModal(false);
      setHireForm({ ...blankHire });
    },
    onError: (e: any) => addToast(e.response?.data?.message ?? 'Error'),
  });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const updateMut = useMutation({
    mutationFn: (d: any) => {
      const payload = { ...d };
      if (payload.hourlyRate === '' || payload.hourlyRate === undefined) {
        payload.hourlyRate = null;
      } else {
        payload.hourlyRate = parseFloat(payload.hourlyRate);
      }
      if (!payload.routingRole) payload.routingRole = null;
      return staffhrAPI.update(payload.id, payload);
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['staffhr'] });
      addToast(r.message);
      setEditTarget(null);
    },
    onError: (e: any) => addToast(e.response?.data?.message ?? 'Error'),
  });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const toggleMut   = useMutation({ mutationFn: (id:string)=>staffhrAPI.toggleLogin(id),onSuccess: (r) => { queryClient.invalidateQueries({queryKey:['staffhr']}); addToast(r.message); },                                                        onError:(e:any)=>addToast(e.response?.data?.message??'Error') });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const fireMut     = useMutation({ mutationFn: ()=>staffhrAPI.fire(fireTarget?.id,fireReason), onSuccess:(r)=>{ queryClient.invalidateQueries({queryKey:['staffhr']}); addToast(r.message); setFireTarget(null); setFireReason(''); },             onError:(e:any)=>addToast(e.response?.data?.message??'Error') });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rehireMut   = useMutation({ mutationFn: (id:string)=>staffhrAPI.rehire(id,'STAFF'),     onSuccess:(r)=>{ queryClient.invalidateQueries({queryKey:['staffhr']}); addToast(r.message); },                                                   onError:(e:any)=>addToast(e.response?.data?.message??'Error') });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const resetMut    = useMutation({ mutationFn: ()=>staffhrAPI.resetPassword(resetTarget?.id,newPassword), onSuccess:(r)=>{ addToast(r.message); setResetTarget(null); setNewPassword(''); },                                                     onError:(e:any)=>addToast(e.response?.data?.message??'Error') });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const scheduleMut = useMutation({ mutationFn: ()=>staffhrAPI.saveSchedule(scheduleTarget?.id, scheduleDays.filter(d=>d.enabled).map(d=>({dayOfWeek:d.dayOfWeek,startTime:d.startTime,endTime:d.endTime,station:d.station}))), onSuccess:(r)=>{ queryClient.invalidateQueries({queryKey:['staffhr','weekly-schedule']}); addToast(r.message); setScheduleTarget(null); }, onError:(e:any)=>addToast(e.response?.data?.message??'Error') });

  if (!isAdmin) { navigate('/'); return null; }

  // ── derived data ─────────────────────────────────────────────────────
  const allStaff: any[] = data?.data?.staff ?? [];

  const filtered = allStaff.filter(s => {
    const matchSearch = !search || `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    const isFired    = !!s.staffProfile?.firedAt;
    const matchFilter =
      filter === 'all'        ? true :
      filter === 'active'     ? s.isActive && !isFired :
      filter === 'disabled'   ? !s.isActive && !isFired :
      filter === 'terminated' ? isFired : true;
    return matchSearch && matchFilter;
  });

  // ── open schedule modal ───────────────────────────────────────────────
  const openSchedule = (staff: any) => {
    setScheduleTarget(staff);
    const existing = staff.staffProfile?.shifts ?? [];
    setScheduleDays(blankSchedule.map(d => {
      const s = existing.find((e: any) => e.dayOfWeek === d.dayOfWeek);
      return s ? { ...d, enabled:true, startTime:s.startTime, endTime:s.endTime, station:s.station??'' } : { ...d };
    }));
  };

  // ── open edit modal ───────────────────────────────────────────────────
  const openEdit = (staff: any) => {
    setEditTarget({
      id: staff.id,
      firstName: staff.firstName, lastName: staff.lastName, phone: staff.phone ?? '',
      role: staff.role, routingRole: staff.routingRole ?? '',
      contractType: staff.staffProfile?.contractType ?? 'full-time',
      hourlyRate: staff.staffProfile?.hourlyRate ?? '',
      emergencyName: staff.staffProfile?.emergencyName ?? '',
      emergencyPhone: staff.staffProfile?.emergencyPhone ?? '',
      notes: staff.staffProfile?.notes ?? '',
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-12">

      {/* ── header ── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold mb-1">👥 Staff HR Management</h1>
            <p className="opacity-70 text-sm">Hiring · Scheduling · Performance · Access Control</p>
          </div>
          <button
            onClick={() => setShowHireModal(true)}
            className="bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2"
          >
            ➕ Hire New Staff
          </button>
        </div>

        {/* summary chips */}
        <div className="max-w-7xl mx-auto mt-5 flex gap-3 flex-wrap">
          {[
            { label:'Total Staff',  value: allStaff.length,                                                  color:'bg-white/20' },
            { label:'Active',       value: allStaff.filter(s=>s.isActive&&!s.staffProfile?.firedAt).length,  color:'bg-green-500/40' },
            { label:'Login Disabled',value:allStaff.filter(s=>!s.isActive&&!s.staffProfile?.firedAt).length, color:'bg-orange-500/40' },
            { label:'Terminated',   value: allStaff.filter(s=>!!s.staffProfile?.firedAt).length,             color:'bg-red-500/40' },
          ].map(c => (
            <div key={c.label} className={`${c.color} rounded-lg px-4 py-2`}>
              <span className="text-2xl font-bold mr-2">{c.value}</span>
              <span className="text-sm opacity-80">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── tabs ── */}
      <div className="border-b bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {(['list','schedule','hire'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)}
              className={`px-5 py-3 font-semibold text-sm border-b-2 transition -mb-px capitalize ${tab===t?'border-slate-700 text-slate-800':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {{ list:'👤 Staff List', schedule:'📅 Weekly Schedule', hire:'📋 Hire History' }[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">

        {/* ══════════════════ STAFF LIST TAB ══════════════════ */}
        {tab === 'list' && (
          <>
            {/* search + filter */}
            <div className="flex flex-wrap gap-3 mb-5">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…"
                className="border rounded-lg px-4 py-2 w-72 text-sm" />
              <div className="flex gap-1">
                {(['all','active','disabled','terminated'] as const).map(f => (
                  <button key={f} onClick={()=>setFilter(f)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold capitalize ${filter===f?'bg-slate-700 text-white':'bg-white border hover:bg-gray-50'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-slate-600"/></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><div className="text-5xl mb-3">👤</div>No staff found</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((staff: any) => {
                  const isFired    = !!staff.staffProfile?.firedAt;
                  const isExpanded = expandedId === staff.id;
                  const profile    = staff.staffProfile;

                  return (
                    <div key={staff.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden ${isFired?'border-red-400 opacity-75':!staff.isActive?'border-orange-400':'border-green-400'}`}>
                      {/* ── card header ── */}
                      <div className="p-5 flex flex-wrap items-center gap-4">
                        {/* avatar + name */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-400 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                          {staff.firstName[0]}{staff.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-lg font-bold text-gray-800">{staff.firstName} {staff.lastName}</span>
                            {roleBadge(staff.role)}
                            {statusBadge(staff)}
                            {profile && contractBadge(profile.contractType)}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5 flex gap-3 flex-wrap">
                            <span>{staff.email}</span>
                            {staff.phone && <span>{staff.phone}</span>}
                            {profile?.employeeId && <span className="font-mono font-semibold">{profile.employeeId}</span>}
                            {staff.routingRole && <span>{STATION_ICONS[staff.routingRole] ?? '📍'} {staff.routingRole}</span>}
                          </div>
                        </div>

                        {/* quick stats */}
                        <div className="hidden md:flex gap-4 text-center text-sm">
                          <div><div className="font-bold text-lg text-indigo-600">{staff.performance?.todayItems ?? 0}</div><div className="text-gray-500 text-xs">Items today</div></div>
                          <div><div className="font-bold text-lg text-green-600">{staff.performance?.monthItems ?? 0}</div><div className="text-gray-500 text-xs">Items/month</div></div>
                          <div><div className="font-bold text-lg text-blue-600">{staff.performance?.monthDeliveries ?? 0}</div><div className="text-gray-500 text-xs">Deliveries/mo</div></div>
                        </div>

                        {/* last login */}
                        <div className="text-xs text-gray-400 hidden lg:block">
                          {staff.lastLoginAt ? `Last login: ${new Date(staff.lastLoginAt).toLocaleDateString()}` : 'Never logged in'}
                        </div>

                        {/* expand button */}
                        <button onClick={()=>setExpandedId(isExpanded?null:staff.id)}
                          className="ml-auto px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold">
                          {isExpanded ? '▲ Less' : '▼ More'}
                        </button>
                      </div>

                      {/* ── expanded panel ── */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                            {/* contract info */}
                            <div className="bg-white rounded-lg p-4 border">
                              <div className="font-bold text-gray-700 mb-2">📄 Contract</div>
                              <dl className="text-sm space-y-1">
                                <div className="flex justify-between"><dt className="text-gray-500">Employee ID:</dt><dd className="font-mono font-semibold">{profile?.employeeId ?? '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Contract:</dt><dd>{profile?.contractType ?? '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Hourly rate:</dt><dd>{profile?.hourlyRate ? `€${profile.hourlyRate}/h` : '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Hired:</dt><dd>{profile?.hiredAt ? new Date(profile.hiredAt).toLocaleDateString() : '—'}</dd></div>
                                {isFired && <div className="flex justify-between"><dt className="text-red-500">Terminated:</dt><dd className="text-red-600 text-xs">{new Date(profile.firedAt).toLocaleDateString()}</dd></div>}
                                {isFired && <div className="text-xs text-red-500 mt-1">Reason: {profile?.firedReason}</div>}
                              </dl>
                            </div>

                            {/* emergency contact */}
                            <div className="bg-white rounded-lg p-4 border">
                              <div className="font-bold text-gray-700 mb-2">🚨 Emergency Contact</div>
                              <dl className="text-sm space-y-1">
                                <div className="flex justify-between"><dt className="text-gray-500">Name:</dt><dd>{profile?.emergencyName ?? '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Phone:</dt><dd>{profile?.emergencyPhone ?? '—'}</dd></div>
                              </dl>
                              {profile?.notes && <p className="text-xs text-gray-500 mt-2 italic">{profile.notes}</p>}
                            </div>

                            {/* weekly shifts */}
                            <div className="bg-white rounded-lg p-4 border">
                              <div className="font-bold text-gray-700 mb-2">📅 Schedule</div>
                              {profile?.shifts?.length ? (
                                <div className="space-y-1 text-xs">
                                  {profile.shifts.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-2">
                                      <span className="w-8 font-semibold text-gray-600">{DAYS[s.dayOfWeek]}</span>
                                      <span className="text-gray-800">{s.startTime}–{s.endTime}</span>
                                      {s.station && <span className="bg-gray-100 px-1.5 rounded">{STATION_ICONS[s.station]} {s.station}</span>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No schedule set</p>
                              )}
                            </div>
                          </div>

                          {/* action buttons */}
                          <div className="flex flex-wrap gap-2">
                            {!isFired && (
                              <>
                                <button onClick={()=>openEdit(staff)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">✏️ Edit Profile</button>
                                <button onClick={()=>openSchedule(staff)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">📅 Edit Schedule</button>
                                <button onClick={()=>toggleMut.mutate(staff.id)} disabled={toggleMut.isPending} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${staff.isActive?'bg-orange-500 hover:bg-orange-600':'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}>
                                  {staff.isActive ? '🔒 Disable Login' : '🔓 Enable Login'}
                                </button>
                                <button onClick={()=>setResetTarget(staff)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold">🔑 Reset Password</button>
                                <button onClick={()=>{setFireTarget(staff);setFireReason('');}} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">🔥 Terminate</button>
                              </>
                            )}
                            {isFired && (
                              <button onClick={()=>rehireMut.mutate(staff.id)} disabled={rehireMut.isPending} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                                ♻️ Re-hire
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════ WEEKLY SCHEDULE TAB ══════════════════ */}
        {tab === 'schedule' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">📅 This Week's Schedule</h2>
            {!scheduleData ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-slate-600"/></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max bg-white rounded-xl shadow-sm text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="px-4 py-3 text-left rounded-tl-xl w-40">Staff Member</th>
                      {DAYS.map(d => <th key={d} className="px-3 py-3 text-center w-36">{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(scheduleData.data?.profiles ?? []).map((p: any, i: number) => (
                      <tr key={p.user.id} className={i%2===0?'bg-gray-50':'bg-white'}>
                        <td className="px-4 py-3 font-semibold text-gray-800 border-r">
                          <div>{p.user.firstName} {p.user.lastName}</div>
                          {p.user.routingRole && <div className="text-xs text-gray-400">{STATION_ICONS[p.user.routingRole]} {p.user.routingRole}</div>}
                        </td>
                        {DAYS.map((_,day) => {
                          const shift = p.shifts.find((s: any) => s.dayOfWeek === day);
                          return (
                            <td key={day} className="px-2 py-3 text-center border-r">
                              {shift ? (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-1.5">
                                  <div className="font-semibold text-indigo-700 text-xs">{shift.startTime}–{shift.endTime}</div>
                                  {shift.station && <div className="text-xs text-gray-500 mt-0.5">{STATION_ICONS[shift.station]} {shift.station}</div>}
                                </div>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(scheduleData.data?.profiles ?? []).length === 0 && (
                  <div className="text-center py-12 text-gray-400">No schedules set yet. Go to Staff List and click "Edit Schedule" for each member.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ HIRE HISTORY TAB ══════════════════ */}
        {tab === 'hire' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Employment History</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-sm text-sm">
                <thead className="bg-slate-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left rounded-tl-xl">Employee</th>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Contract</th>
                    <th className="px-4 py-3 text-left">Hired</th>
                    <th className="px-4 py-3 text-left">Terminated</th>
                    <th className="px-4 py-3 text-left rounded-tr-xl">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allStaff.filter(s => s.staffProfile).map((s: any, i: number) => (
                    <tr key={s.id} className={i%2===0?'bg-gray-50':'bg-white'}>
                      <td className="px-4 py-3 font-semibold">{s.firstName} {s.lastName}<div className="text-xs text-gray-400">{s.email}</div></td>
                      <td className="px-4 py-3 font-mono">{s.staffProfile.employeeId}</td>
                      <td className="px-4 py-3">{contractBadge(s.staffProfile.contractType)}</td>
                      <td className="px-4 py-3">{new Date(s.staffProfile.hiredAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{s.staffProfile.firedAt ? <span className="text-red-600 text-xs">{new Date(s.staffProfile.firedAt).toLocaleDateString()}<br/><span className="text-gray-400">{s.staffProfile.firedReason?.slice(0,40)}</span></span> : '—'}</td>
                      <td className="px-4 py-3">{statusBadge(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════ HIRE MODAL ══════════════════ */}
      {showHireModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xl font-bold">➕ Hire New Staff Member</h2>
              <button onClick={()=>setShowHireModal(false)} className="text-2xl hover:opacity-70">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[['firstName','First Name'],['lastName','Last Name']].map(([k,l]) => (
                  <div key={k}><label className="block text-sm font-semibold text-gray-700 mb-1">{l} *</label>
                  <input value={(hireForm as any)[k]} onChange={e=>setHireForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                  <input type="email" value={hireForm.email} onChange={e=>setHireForm(f=>({...f,email:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                  <input value={hireForm.phone} onChange={e=>setHireForm(f=>({...f,phone:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Initial Password *</label>
                  <input type="password" value={hireForm.password} onChange={e=>setHireForm(f=>({...f,password:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">System Role</label>
                  <select value={hireForm.role} onChange={e=>setHireForm(f=>({...f,role:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="STAFF">Staff</option><option value="ADMIN">Admin</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Station</label>
                  <select value={hireForm.routingRole} onChange={e=>setHireForm(f=>({...f,routingRole:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">None</option>
                    {STATIONS.map(s => <option key={s} value={s}>{STATION_ICONS[s]} {s}</option>)}
                  </select></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Contract Type</label>
                  <select value={hireForm.contractType} onChange={e=>setHireForm(f=>({...f,contractType:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Hourly Rate (€)</label>
                <input type="number" value={hireForm.hourlyRate} onChange={e=>setHireForm(f=>({...f,hourlyRate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 8.50"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Emergency Contact Name</label>
                  <input value={hireForm.emergencyName} onChange={e=>setHireForm(f=>({...f,emergencyName:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Emergency Contact Phone</label>
                  <input value={hireForm.emergencyPhone} onChange={e=>setHireForm(f=>({...f,emergencyPhone:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              </div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={hireForm.notes} onChange={e=>setHireForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>hireMut.mutate()} disabled={hireMut.isPending || !hireForm.firstName || !hireForm.email || !hireForm.password}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold disabled:opacity-50">
                  {hireMut.isPending ? 'Hiring…' : '✅ Confirm Hire'}
                </button>
                <button onClick={()=>setShowHireModal(false)} className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ EDIT MODAL ══════════════════ */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xl font-bold">✏️ Edit Staff Profile</h2>
              <button onClick={()=>setEditTarget(null)} className="text-2xl hover:opacity-70">×</button>
            </div>
            <div className="p-6 space-y-3">
              {[['firstName','First Name'],['lastName','Last Name'],['phone','Phone']].map(([k,l]) => (
                <div key={k}><label className="block text-sm font-semibold text-gray-700 mb-1">{l}</label>
                  <input value={editTarget[k]} onChange={e=>setEditTarget((t:any)=>({...t,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                  <select value={editTarget.role} onChange={e=>setEditTarget((t:any)=>({...t,role:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="STAFF">Staff</option><option value="ADMIN">Admin</option>
                  </select></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Station</label>
                  <select value={editTarget.routingRole} onChange={e=>setEditTarget((t:any)=>({...t,routingRole:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">None</option>
                    {STATIONS.map(s => <option key={s} value={s}>{STATION_ICONS[s]} {s}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Contract</label>
                  <select value={editTarget.contractType} onChange={e=>setEditTarget((t:any)=>({...t,contractType:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Hourly Rate (€)</label>
                  <input type="number" value={editTarget.hourlyRate} onChange={e=>setEditTarget((t:any)=>({...t,hourlyRate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Emergency Name</label>
                  <input value={editTarget.emergencyName} onChange={e=>setEditTarget((t:any)=>({...t,emergencyName:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Emergency Phone</label>
                  <input value={editTarget.emergencyPhone} onChange={e=>setEditTarget((t:any)=>({...t,emergencyPhone:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              </div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={editTarget.notes} onChange={e=>setEditTarget((t:any)=>({...t,notes:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>updateMut.mutate(editTarget)} disabled={updateMut.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold disabled:opacity-50">
                  {updateMut.isPending ? 'Saving…' : '💾 Save Changes'}
                </button>
                <button onClick={()=>setEditTarget(null)} className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ SCHEDULE MODAL ══════════════════ */}
      {scheduleTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xl font-bold">📅 Schedule — {scheduleTarget.firstName} {scheduleTarget.lastName}</h2>
              <button onClick={()=>setScheduleTarget(null)} className="text-2xl hover:opacity-70">×</button>
            </div>
            <div className="p-6 space-y-3">
              {scheduleDays.map((day, i) => (
                <div key={day.dayOfWeek} className={`rounded-xl border p-4 transition ${day.enabled?'bg-indigo-50 border-indigo-300':'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <input type="checkbox" checked={day.enabled} onChange={e=>{ const n=[...scheduleDays]; n[i]={...n[i],enabled:e.target.checked}; setScheduleDays(n); }} className="w-5 h-5 cursor-pointer"/>
                    <span className="font-bold text-gray-800 w-12">{DAYS[day.dayOfWeek]}</span>
                    {!day.enabled && <span className="text-xs text-gray-400 italic">Day off</span>}
                  </div>
                  {day.enabled && (
                    <div className="grid grid-cols-3 gap-3 pl-8">
                      <div><label className="block text-xs font-semibold text-gray-600 mb-1">Start</label>
                        <input type="time" value={day.startTime} onChange={e=>{const n=[...scheduleDays];n[i]={...n[i],startTime:e.target.value};setScheduleDays(n);}} className="w-full border rounded-lg px-2 py-1.5 text-sm"/></div>
                      <div><label className="block text-xs font-semibold text-gray-600 mb-1">End</label>
                        <input type="time" value={day.endTime} onChange={e=>{const n=[...scheduleDays];n[i]={...n[i],endTime:e.target.value};setScheduleDays(n);}} className="w-full border rounded-lg px-2 py-1.5 text-sm"/></div>
                      <div><label className="block text-xs font-semibold text-gray-600 mb-1">Station</label>
                        <select value={day.station} onChange={e=>{const n=[...scheduleDays];n[i]={...n[i],station:e.target.value};setScheduleDays(n);}} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                          <option value="">Any</option>
                          {STATIONS.map(s => <option key={s} value={s}>{STATION_ICONS[s]} {s}</option>)}
                        </select></div>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={()=>scheduleMut.mutate()} disabled={scheduleMut.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold disabled:opacity-50">
                  {scheduleMut.isPending ? 'Saving…' : '💾 Save Schedule'}
                </button>
                <button onClick={()=>setScheduleTarget(null)} className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ FIRE MODAL ══════════════════ */}
      {fireTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold">🔥 Terminate {fireTarget.firstName} {fireTarget.lastName}</h2>
              <p className="text-sm opacity-80 mt-1">This will disable their login and record termination.</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for termination *</label>
              <textarea value={fireReason} onChange={e=>setFireReason(e.target.value)} rows={3} placeholder="e.g. End of contract, redundancy, misconduct…" className="w-full border rounded-lg px-3 py-2 text-sm mb-4"/>
              <div className="flex gap-3">
                <button onClick={()=>fireMut.mutate()} disabled={fireMut.isPending||fireReason.length<3} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold disabled:opacity-50">
                  {fireMut.isPending ? 'Processing…' : '✅ Confirm Termination'}
                </button>
                <button onClick={()=>setFireTarget(null)} className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ RESET PASSWORD MODAL ══════════════════ */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="bg-gray-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-lg font-bold">🔑 Reset Password</h2>
              <button onClick={()=>setResetTarget(null)} className="text-2xl hover:opacity-70">×</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Set a new password for <strong>{resetTarget.firstName} {resetTarget.lastName}</strong>. They should change it on first login.</p>
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="w-full border rounded-lg px-3 py-2 text-sm mb-4"/>
              <div className="flex gap-3">
                <button onClick={()=>resetMut.mutate()} disabled={resetMut.isPending||newPassword.length<6} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-2.5 rounded-xl font-bold disabled:opacity-50">
                  {resetMut.isPending ? 'Resetting…' : '🔑 Reset'}
                </button>
                <button onClick={()=>setResetTarget(null)} className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
