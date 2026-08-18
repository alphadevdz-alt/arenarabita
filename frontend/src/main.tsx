import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, CheckCircle2, FileCheck2, Landmark, QrCode, Search, ShieldCheck, Trophy, Users } from 'lucide-react';
import { HonorsBoard, PlayerCard, Scoreboard, TeamsBoard } from './PublicShowcase';
import { HomeArena } from './HomeArena';
import './styles.css';

const API = import.meta.env.VITE_API_URL ?? '';
type View = 'home' | 'seasons' | 'competitions' | 'results' | 'teams' | 'honors' | 'player' | 'announcements' | 'help' | 'verify' | 'register';

function App() {
  const [view, setView] = useState<View>('home');
  const [playerId, setPlayerId] = useState('');
  const [reference, setReference] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const r = await fetch(`${API}/api/v1/public/licenses/verify/${encodeURIComponent(reference)}`);
      if (!r.ok) throw new Error('لم يتم العثور على ترخيص مطابق');
      setResult(await r.json());
    } catch (x) {
      setError(x instanceof Error ? x.message : 'تعذر الاتصال بالخادم');
    }
  }

  const nav = [
    ['home', 'الرئيسية'],
    ['seasons', 'المواسم'],
    ['competitions', 'المنافسات'],
    ['teams', 'الفرق'],
    ['results', 'النتائج'],
    ['honors', 'التتويج'],
    ['announcements', 'الإعلانات'],
    ['verify', 'التحقق'],
    ['register', 'انخراط مؤسسة'],
    ['help', 'مساعدة']
  ] as const;

  return (
    <div dir="rtl" className="app">
      <div className="official-bar" />
      <header className="topbar">
        <div className="brand" onClick={() => setView('home')}>
          <span className="brand-mark">ن</span>
          <span>
            <b>NSSMS</b>
            <small>النظام الوطني لتسيير الرياضة المدرسية</small>
          </span>
        </div>
        <nav>
          {nav.map(([key, label]) => (
            <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>
          ))}
        </nav>
      </header>
      <main>
        {view === 'home' && <HomeArena onVerify={() => setView('verify')} onMore={() => setView('announcements')} onResults={() => setView('results')} onCompetitions={() => setView('competitions')} />}
        {view === 'seasons' && <Listing title="المواسم الرياضية" endpoint="seasons" icon={<Activity />} />}
        {view === 'competitions' && <CompetitionsListing />}
        {view === 'teams' && <TeamsBoard onPlayer={(id) => { setPlayerId(id); setView('player'); }} />}
        {view === 'player' && playerId && <PlayerCard id={playerId} onBack={() => setView('teams')} />}
        {view === 'results' && <Scoreboard />}
        {view === 'honors' && <HonorsBoard />}
        {view === 'announcements' && <Listing title="الإعلانات الرسمية" endpoint="announcements" icon={<FileCheck2 />} />}
        {view === 'help' && <Help />}
        {view === 'verify' && (
          <section className="verify-page">
            <div className="eyebrow"><QrCode size={18} /> خدمة عمومية آمنة</div>
            <h1>تحقق من الترخيص الرياضي</h1>
            <p>أدخل مرجع التحقق العام لعرض الحالة المعتمدة فقط، دون كشف المعرّفات الداخلية.</p>
            <form onSubmit={verify} className="verify-form">
              <input value={reference} onChange={(e) => setReference(e.target.value)} minLength={12} required placeholder="رمز الترخيص أو رمز انخراط مدرب/تلميذ" />
              <button className="primary"><Search size={18} /> تحقق الآن</button>
            </form>
            {error && <div className="alert error">{error}</div>}
            {result && (
              <div className="result-card">
                <CheckCircle2 size={30} />
                <div>
                  <strong>{result.role ? `تم التحقق من انخراط ${result.role === 'COACH' ? 'مدرب' : result.role === 'STUDENT' ? 'تلميذ' : result.role}` : 'تم التحقق من الترخيص'}</strong>
                  <span>الحالة: {result.status}</span>
                  {result.institutionName && <small>المؤسسة: {result.institutionName}</small>}
                  {result.issuedAt && <small>تاريخ الإصدار: {new Date(result.issuedAt).toLocaleDateString('ar-DZ')}</small>}
                  {result.expiresAt && <small>تاريخ الانتهاء: {new Date(result.expiresAt).toLocaleDateString('ar-DZ')}</small>}
                </div>
              </div>
            )}
          </section>
        )}
        {view === 'register' && <InstitutionRegister />}
      </main>
      <footer>
        <span>© {new Date().getFullYear()} NSSMS — منصة وطنية لتسيير الرياضة المدرسية</span>
        <a href="/admin.html">فضاء العاملين</a>
      </footer>
    </div>
  );
}

function CompetitionsListing() {
  const [kind, setKind] = useState<'all' | 'INDIVIDUAL' | 'TEAM'>('all');
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    const query = kind === 'all' ? '' : `?sportKind=${kind}`;
    fetch(`${API}/api/v1/public/competitions${query}`).then((r) => (r.ok ? r.json() : { data: [] })).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
  }, [kind]);
  const labels: Record<string, string> = { INDIVIDUAL: 'فردية', TEAM: 'جماعية', REGISTRATION: 'تسجيل', ACTIVE: 'جارية', RESULTS: 'نتائج', CLOSED: 'مغلقة' };
  return (
    <section className="listing">
      <div className="eyebrow"><Trophy /> الرزنامة المعتمدة</div>
      <h1>المنافسات الفردية والجماعية</h1>
      <p className="lede">جميع المنافسات أدناه معتمدة ومنشورة للموسم الجاري، بأكثر من سبع بطولات فردية وجماعية.</p>
      <div className="tabs">
        <button className={kind === 'all' ? 'selected' : ''} onClick={() => setKind('all')}>الكل</button>
        <button className={kind === 'INDIVIDUAL' ? 'selected' : ''} onClick={() => setKind('INDIVIDUAL')}>فردية</button>
        <button className={kind === 'TEAM' ? 'selected' : ''} onClick={() => setKind('TEAM')}>جماعية</button>
      </div>
      {!rows && <div className="empty">جارٍ التحميل…</div>}
      {rows && (
        <div className="cards">
          {rows.map((row) => (
            <article className="item-card" key={row.id}>
              {row.image_url ? <img className="thumb" src={row.image_url} alt="" /> : <div className="icon-box"><Trophy /></div>}
              <div>
                <h3>{row.name}</h3>
                <p>{row.summary}{row.rules_text ? ` — ${row.rules_text}` : ''}</p>
              </div>
              <span className="badge">{labels[row.sport_kind] ?? ''} · {row.age_category ?? ''} · {row.gender_category === 'MALE' ? 'ذكور' : row.gender_category === 'FEMALE' ? 'إناث' : row.gender_category === 'MIXED' ? 'مختلط' : ''} · {labels[row.status] ?? row.status}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Listing({ title, endpoint, icon }: { title: string; endpoint: string; icon: React.ReactNode }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    setRows(null);
    fetch(`${API}/api/v1/public/${endpoint}`).then((r) => (r.ok ? r.json() : { data: [] })).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
  }, [endpoint]);
  return (
    <section className="listing">
      <div className="eyebrow">{icon} السجل العام المعتمد</div>
      <h1>{title}</h1>
      <p className="lede">تُعرض هنا المعلومات المنشورة بعد استيفاء دورة الاعتماد الإدارية.</p>
      {!rows && <div className="empty">جارٍ التحميل…</div>}
      {rows && rows.length === 0 && <div className="empty-state">لا توجد بيانات منشورة في هذا السجل حالياً.</div>}
      {rows && rows.length > 0 && (
        <div className="cards">
          {rows.map((row, i) => (
            <article className="item-card" key={row.id ?? i}>
              {row.image_url ? <img className="thumb" src={row.image_url} alt="" /> : <div className="icon-box">{icon}</div>}
              <div>
                <h3>{row.title ?? row.name ?? row.competition_name ?? 'نتيجة منشورة'}</h3>
                <p>{row.body ?? row.summary ?? row.season_name ?? 'معلومات معتمدة من الإدارة المختصة'}</p>
              </div>
              <span className="badge">{row.status ?? 'منشور'}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Help() {
  return (
    <section className="listing">
      <div className="eyebrow">الدعم</div>
      <h1>دليل الاستخدام</h1>
      <div className="help-grid">
        <div className="panel"><h3>التحقق العام</h3><p>أدخل مرجع الإجازة فقط. النظام لا يعرض أرقام التراخيص الداخلية.</p></div>
        <div className="panel"><h3>انخراط المؤسسة</h3><p>يُرسل الطلب بحالة معلّقة حتى توافق الرابطة الولائية.</p></div>
        <div className="panel"><h3>النطاق الإداري</h3><p>الوطني يرى الكل، الرابطة ولايتها، الدائرة دائرتها، والمؤسسة سجلها فقط.</p></div>
        <div className="panel"><h3>حفظ التاريخ</h3><p>الإغلاق والأرشفة يحفظان السجل. لا يوجد حذف نهائي للبيانات المحكومة.</p></div>
      </div>
    </section>
  );
}

function InstitutionRegister() {
  const [wilayas, setWilayas] = useState<any[]>([]);
  const [dairas, setDairas] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [form, setForm] = useState({ username: '', password: '', displayName: '', institutionName: '', wilayaId: '', dairaId: '', communeId: '' });
  const [message, setMessage] = useState('');
  const [codes, setCodes] = useState<{ coach?: string; student?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/v1/public/geography/wilayas`).then((r) => r.json()).then((d) => setWilayas(d.data ?? [])).catch(() => setWilayas([]));
  }, []);
  useEffect(() => {
    if (!form.wilayaId) { setDairas([]); setCommunes([]); return; }
    fetch(`${API}/api/v1/public/geography/wilayas/${form.wilayaId}/dairas`).then((r) => r.json()).then((d) => setDairas(d.data ?? [])).catch(() => setDairas([]));
  }, [form.wilayaId]);
  useEffect(() => {
    if (!form.dairaId) { setCommunes([]); return; }
    fetch(`${API}/api/v1/public/geography/dairas/${form.dairaId}/communes`).then((r) => r.json()).then((d) => setCommunes(d.data ?? [])).catch(() => setCommunes([]));
  }, [form.dairaId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setCodes(null);
    const r = await fetch(`${API}/api/v1/auth/institution-register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: form.username,
        password: form.password,
        displayName: form.displayName,
        institutionName: form.institutionName,
        institutionCode: `W${form.wilayaId}-C${form.communeId}-${Date.now().toString().slice(-6)}`,
        wilayaId: Number(form.wilayaId),
        dairaId: Number(form.dairaId)
      })
    });
    if (!r.ok) { setError('تعذر تسجيل المؤسسة. تحقق من الولاية والدائرة والبلدية والرابطة الولائية.'); return; }
    const data = await r.json();
    setMessage('تم إرسال الطلب. احتفظ برمزي التحقق أدناه حتى تعتمد الرابطة الاسم ضمن قائمة المؤسسات.');
    setCodes(data.enrollmentCodes ?? null);
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="eyebrow"><Users size={18} /> دليل الولايات والدوائر والبلديات</div>
        <h1>انخراط مؤسسة</h1>
        <p>اختر الولاية ثم الدائرة ثم البلدية، ثم سمِّ مؤسستك كما تريد. الاسم يُعتمد لاحقاً ضمن اختيارات المؤسسات.</p>
        <form onSubmit={submit}>
          <label>الولاية
            <select value={form.wilayaId} onChange={(e) => setForm({ ...form, wilayaId: e.target.value, dairaId: '', communeId: '' })} required>
              <option value="">اختر الولاية</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{w.ar_name || w.name}</option>)}
            </select>
          </label>
          <label>الدائرة
            <select value={form.dairaId} onChange={(e) => setForm({ ...form, dairaId: e.target.value, communeId: '' })} required disabled={!form.wilayaId}>
              <option value="">{form.wilayaId ? 'اختر الدائرة' : 'اختر الولاية أولاً'}</option>
              {dairas.map((d) => <option key={d.id} value={d.id}>{d.ar_name || d.name}</option>)}
            </select>
          </label>
          <label>البلدية
            <select value={form.communeId} onChange={(e) => setForm({ ...form, communeId: e.target.value })} required disabled={!form.dairaId}>
              <option value="">{form.dairaId ? 'اختر البلدية' : 'اختر الدائرة أولاً'}</option>
              {communes.map((c) => <option key={c.id} value={c.id}>{c.ar_name || c.name}</option>)}
            </select>
          </label>
          <label>اسم المؤسسة كما تريد اعتماده<input value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} required placeholder="تسمية حرة للمؤسسة المنخرطة" /></label>
          <label>اسم المستخدم<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required minLength={3} /></label>
          <label>كلمة المرور<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={12} /></label>
          <label>الاسم المعروض للمسؤول<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required /></label>
          {error && <div className="alert error">{error}</div>}
          {message && <div className="result-card"><div><strong>{message}</strong></div></div>}
          {codes && (
            <div className="result-card">
              <div>
                <strong>رمز تحقق المدرب</strong><span>{codes.coach}</span>
                <strong>رمز تحقق التلميذ</strong><span>{codes.student}</span>
              </div>
            </div>
          )}
          <button className="primary">إرسال طلب الانخراط</button>
        </form>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
