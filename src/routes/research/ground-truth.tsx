import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/research/ground-truth')({
  component: GroundTruthPage,
});

const PROVINCES = ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต'] as const;
const PROFILES = [
  { type: ['วัฒนธรรม','เมือง','คาเฟ่'], activities: ['ถ่ายรูป','อาหาร','ช้อปปิ้ง'], atmosphere: 'คึกคัก', companion: 'เพื่อน', budget: 'ประหยัด' },
  { type: ['ภูเขา','ธรรมชาติ'], activities: ['เดินป่า','พักผ่อน'], atmosphere: 'เงียบสงบ', companion: 'คนเดียว', budget: 'ประหยัด' },
  { type: ['ทะเล'], activities: ['ช้อปปิ้ง','พักผ่อน','ถ่ายรูป'], atmosphere: 'เงียบสงบ', companion: 'ครอบครัว', budget: 'หรูหรา' },
  { type: ['วัฒนธรรม'], activities: ['ถ่ายรูป','อาหาร','ช้อปปิ้ง'], atmosphere: 'เงียบสงบ', companion: 'คนเดียว', budget: 'ปานกลาง' },
  { type: ['ภูเขา','ธรรมชาติ'], activities: ['พักผ่อน'], atmosphere: 'เงียบสงบ', companion: 'เพื่อน', budget: 'หรูหรา' },
  { type: ['ทะเล'], activities: ['ถ่ายรูป','อาหาร','ช้อปปิ้ง'], atmosphere: 'คึกคัก', companion: 'คนเดียว', budget: 'ปานกลาง' },
  { type: ['ธรรมชาติ','เมือง'], activities: ['ถ่ายรูป','อาหาร','พักผ่อน'], atmosphere: 'เงียบสงบ', companion: 'คู่รัก', budget: 'ปานกลาง' },
] as const;

type Place = {
  att_id: string;
  name_th: string | null;
  province: string | null;
  category: string[] | string | null;
  travel_type: string[] | null;
  activities: string[] | null;
  atmosphere: string[] | null;
  budget: string[] | null;
  travel_companion: string[] | null;
  detail_th: string | null;
};
type Annotation = { att_id: string; relevant: boolean; reason: string | null; updated_at: string };
type Label = { relevant: boolean; reason: string };

function csvValue(value: unknown): string {
  const str = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return '"' + str.replace(/"/g, '""') + '"';
}

function GroundTruthPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [caseId, setCaseId] = useState(1);
  const [province, setProvince] = useState<string>(PROVINCES[0]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [labels, setLabels] = useState<Record<string, Label>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) {
        const { data, error: membershipError } = await supabase
          .from('ground_truth_reviewers').select('user_id').eq('user_id', user.id).maybeSingle();
        if (active) {
          setAuthorized(!!data && !membershipError);
          if (membershipError) setError('กรุณาสร้างตาราง SQL และกำหนดสิทธิ์ผู้ประเมินก่อน');
        }
      }
      if (active) setChecking(false);
    };
    void check();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authorized || !userId) return;
    let active = true;
    setLoading(true);
    setError('');
    setStatus('');
    setPlaces([]);
    setLabels({});
    const load = async () => {
      try {
        const all: Place[] = [];
        for (let start = 0; ; start += 1000) {
          const { data, error: placesError } = await supabase
            .from('attraction')
            .select('att_id,name_th,province,category,travel_type,activities,atmosphere,budget,travel_companion,detail_th')
            .eq('province', province)
            .order('att_id', { ascending: true })
            .range(start, start + 999);
          if (placesError) throw placesError;
          all.push(...((data ?? []) as Place[]));
          if ((data ?? []).length < 1000) break;
        }
        const saved: Annotation[] = [];
        for (let start = 0; ; start += 1000) {
          const { data, error: annotationsError } = await supabase
            .from('ground_truth_annotations')
            .select('att_id,relevant,reason,updated_at')
            .eq('case_id', caseId).eq('province', province).eq('reviewer_id', userId)
            .order('att_id', { ascending: true })
            .range(start, start + 999);
          if (annotationsError) throw annotationsError;
          saved.push(...((data ?? []) as Annotation[]));
          if ((data ?? []).length < 1000) break;
        }
        if (!active) return;
        setPlaces(all);
        setLabels(Object.fromEntries(saved.map(x => [x.att_id, { relevant: x.relevant, reason: x.reason ?? '' }])));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [caseId, province, authorized, userId]);

  const visible = useMemo(() => places.filter(p => {
    const matching = (p.name_th ?? '').toLowerCase().includes(query.trim().toLowerCase()) || p.att_id.includes(query.trim());
    return matching && (filter === 'all' || (filter === 'done' ? labels[p.att_id] !== undefined : labels[p.att_id] === undefined));
  }), [places, labels, query, filter]);

  const save = async (attId: string, relevant: boolean | null) => {
    if (!userId || busyId) return;
    setBusyId(attId);
    setError('');
    try {
      if (relevant === null) {
        const { error: deletionError } = await supabase.from('ground_truth_annotations')
          .delete().eq('reviewer_id', userId).eq('case_id', caseId).eq('province', province).eq('att_id', attId);
        if (deletionError) throw deletionError;
        setLabels(old => { const next = { ...old }; delete next[attId]; return next; });
      } else {
        const reason = labels[attId]?.reason ?? '';
        const { error: writeError } = await supabase.from('ground_truth_annotations')
          .upsert({ reviewer_id: userId, case_id: caseId, province, att_id: attId, relevant,
            reason, updated_at: new Date().toISOString() }, { onConflict: 'reviewer_id,case_id,province,att_id' });
        if (writeError) throw writeError;
        setLabels(old => ({ ...old, [attId]: { relevant, reason } }));
      }
      setStatus('บันทึกแล้ว');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusyId(null); }
  };

  const exportCsv = () => {
    const cols = ['case_id','province','att_id','name_th','travel_type','activities','atmosphere','budget','travel_companion','relevant_0_or_1','reason','reviewer_id'];
    const rows = places.map(p => [caseId,province,p.att_id,p.name_th,p.travel_type,p.activities,p.atmosphere,p.budget,p.travel_companion,
      labels[p.att_id] === undefined ? '' : labels[p.att_id].relevant ? 1 : 0,labels[p.att_id]?.reason ?? '',userId]);
    const data = '\uFEFF' + [cols, ...rows].map(row => row.map(csvValue).join(',')).join('\r\n');
    const href = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = href; anchor.download = `travelwish_groundtruth_case${caseId}_${PROVINCES.indexOf(province as typeof PROVINCES[number])+1}.csv`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  if (checking) return <main className="p-8">กำลังตรวจสอบสิทธิ์...</main>;
  if (!userId) return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-bold">Ground Truth Annotation</h1><p className="mt-4">กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้</p><Link to="/login" className="underline">เข้าสู่ระบบ</Link></main>;
  if (!authorized) return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-bold">สงวนสิทธิ์เฉพาะผู้ประเมิน</h1><p className="mt-4">บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งาน Ground Truth Annotation ติดต่อผู้ดูแลระบบเพื่อเพิ่มสิทธิ์ใน Supabase</p>{error && <p className="mt-2 text-red-600">{error}</p>}</main>;

  const profile = PROFILES[caseId - 1];
  const done = Object.keys(labels).length;
  const button = (active: boolean, text: string) => active ? 'border-violet-400 bg-violet-100 text-violet-950' : 'border-gray-200 bg-white text-gray-700 hover:bg-violet-50';

  return <main className="min-h-screen bg-[#faf8fc] p-4 text-[#33283b] md:p-8">
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-violet-600">TravelWish Research</p><h1 className="text-2xl font-bold md:text-3xl">Ground Truth Annotation</h1><p className="text-sm text-gray-500">ผู้ประเมินให้คะแนนด้วยตนเอง โดยไม่แสดง TDMC ranking</p></div>
        <button type="button" onClick={exportCsv} disabled={loading || places.length === 0} className="rounded-xl bg-[#5B3A61] px-5 py-3 text-white disabled:opacity-50">ดาวน์โหลด CSV</button>
      </header>
      <section className="mb-5 grid gap-4 rounded-2xl border border-violet-100 bg-white p-5 md:grid-cols-2">
        <label className="text-sm font-semibold">Case
          <select className="mt-2 block w-full rounded-lg border p-3" value={caseId} onChange={e => setCaseId(Number(e.target.value))}>
            {PROFILES.map((_, i) => <option key={i} value={i+1}>Case {i+1}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">จังหวัด
          <select className="mt-2 block w-full rounded-lg border p-3" value={province} onChange={e => setProvince(e.target.value)}>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <div className="md:col-span-2 text-sm leading-7">
          <strong>ความสนใจ:</strong> {profile.type.join(', ')} · <strong>กิจกรรม:</strong> {profile.activities.join(', ')} · <strong>บรรยากาศ:</strong> {profile.atmosphere}<br/>
          <strong>ผู้ร่วมเดินทาง:</strong> {profile.companion} · <strong>งบ:</strong> {profile.budget}
        </div>
        <div className="md:col-span-2">
          <div className="mb-2 flex justify-between text-sm"><span>ความคืบหน้า</span><strong>{done} / {places.length}</strong></div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-violet-500" style={{width: `${places.length ? 100*done/places.length : 0}%`}} /></div>
        </div>
      </section>
      <div className="mb-4 flex flex-wrap gap-3">
        <input aria-label="ค้นหาสถานที่" placeholder="ค้นหาชื่อหรือรหัสสถานที่..." value={query} onChange={e=>setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border bg-white p-3" />
        <select aria-label="สถานะการประเมิน" className="rounded-xl border bg-white p-3" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}>
          <option value="pending">ยังไม่ประเมิน</option><option value="done">ประเมินแล้ว</option><option value="all">ทั้งหมด</option>
        </select>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {status && <p role="status" className="mb-4 text-sm text-green-700">{status}</p>}
      {loading && <p>กำลังโหลดข้อมูล...</p>}
      <p className="mb-3 text-sm text-gray-500">แสดง {visible.length} สถานที่ · ข้อมูลถูกบันทึกลง Supabase ทันทีเมื่อเลือก</p>
      <div className="space-y-3">
        {visible.map(p => <article key={p.att_id} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="font-semibold">{p.name_th || 'ไม่มีชื่อสถานที่'}</h2><p className="text-xs text-gray-400">{p.att_id}</p></div>
            {labels[p.att_id] !== undefined && <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">ประเมินแล้ว</span>}
          </div>
          <p className="mt-2 text-sm text-gray-600">ประเภท: {[...(p.travel_type ?? [])].join(', ') || 'ไม่มีข้อมูล'} · กิจกรรม: {[...(p.activities ?? [])].join(', ') || 'ไม่มีข้อมูล'}</p>
          <p className="mt-1 text-sm text-gray-600">บรรยากาศ: {(p.atmosphere ?? []).join(', ') || 'ไม่มีข้อมูล'} · งบ: {(p.budget ?? []).join(', ') || 'ไม่มีข้อมูล'}</p>
          {p.detail_th && <details className="mt-2 text-sm text-gray-600"><summary className="cursor-pointer">รายละเอียดเพิ่มเติม</summary><p className="mt-1 whitespace-pre-wrap">{p.detail_th}</p></details>}
          <div className="mt-4 flex flex-wrap gap-2">
            {([{value: true, label: 'เหมาะสม (1)'},{value:false,label:'ไม่เหมาะสม (0)'},{value:null,label:'ยังไม่ประเมิน'}] as const).map(option =>
              <button key={String(option.value)} type="button" disabled={busyId!==null}
                aria-pressed={option.value===null ? labels[p.att_id]===undefined : labels[p.att_id]?.relevant===option.value}
                className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${button(option.value===null ? labels[p.att_id]===undefined : labels[p.att_id]?.relevant===option.value, option.label)}`}
                onClick={()=>void save(p.att_id, option.value)}>{busyId===p.att_id ? 'กำลังบันทึก...' : option.label}</button>
            )}
          </div>
        </article>)}
      </div>
    </div>
  </main>;
}
