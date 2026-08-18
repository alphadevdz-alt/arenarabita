import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BarChart3, CheckCircle2, FileCheck2, Landmark, LayoutDashboard, QrCode, Search, ShieldCheck, Trophy, Users } from 'lucide-react';
import { RoleAdmin } from './RoleAdmin';
import { HonorsBoard, PlayerCard, Scoreboard, TeamsBoard } from './PublicShowcase';
import './styles.css';

const API = import.meta.env.VITE_API_URL ?? '';
type View = 'home' | 'seasons' | 'competitions' | 'results' | 'teams' | 'honors' | 'player' | 'announcements' | 'help' | 'verify' | 'register' | 'admin';

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
        <button className="admin-link" onClick={() => setView('admin')}><LayoutDashboard size={16} /> البوابة الإدارية</button>
      </header>
      <main>
        {view === 'home' && <Home onVerify={() => setView('verify')} onAdmin={() => setView('admin')} onMore={() => setView('announcements')} />}
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
              <input value={reference} onChange={(e) => setReference(e.target.value)} minLength={20} required placeholder="مرجع التحقق" />
              <button className="primary"><Search size={18} /> تحقق الآن</button>
            </form>
            {error && <div className="alert error">{error}</div>}
            {result && (
              <div className="result-card">
                <CheckCircle2 size={30} />
                <div>
                  <strong>تم التحقق من الترخيص</strong>
                  <span>الحالة: {result.status}</span>
                  {result.issuedAt && <small>تاريخ الإصدار: {new Date(result.issuedAt).toLocaleDateString('ar-DZ')}</small>}
                  {result.expiresAt && <small>تاريخ الانتهاء: {new Date(result.expiresAt).toLocaleDateString('ar-DZ')}</small>}
                </div>
              </div>
            )}
          </section>
        )}
        {view === 'register' && <InstitutionRegister />}
        {view === 'admin' && <RoleAdmin onBack={() => setView('home')} />}
      </main>
      <footer>
        <span>© {new Date().getFullYear()} NSSMS — منصة وطنية لتسيير الرياضة المدرسية</span>
        <span>التحقق العام · التدقيق · عدم الحذف النهائي</span>
      </footer>
    </div>
  );
}

function Home({ onVerify, onAdmin, onMore }: { onVerify: () => void; onAdmin: () => void; onMore: () => void }) {
  const [stats, setStats] = useState({ seasons: '—', competitions: '—', announcements: '—' });
  const [news, setNews] = useState<any[]>([]);
  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/v1/public/seasons`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${API}/api/v1/public/competitions`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${API}/api/v1/public/announcements`).then((r) => r.json()).catch(() => ({ data: [] }))
    ]).then(([seasons, competitions, announcements]) => {
      setStats({
        seasons: String((seasons.data ?? []).length),
        competitions: String((competitions.data ?? []).length),
        announcements: String((announcements.data ?? []).length)
      });
      setNews((announcements.data ?? []).slice(0, 3));
    });
  }, []);

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow"><ShieldCheck size={18} /> منصة حكومية رقمية</div>
          <h1>تسيير الرياضة المدرسية<br /><em>بثقة وشفافية</em></h1>
          <p className="lede">منصة موحّدة للمواسم والمنافسات والإجازات الرقمية، مع سجل تدقيق محفوظ وتحقق عام لا يكشف البيانات الداخلية.</p>
          <div className="hero-actions">
            <button className="primary" onClick={onVerify}><QrCode size={18} /> تحقق من ترخيص</button>
            <button className="secondary" onClick={onAdmin}>دخول الإدارة</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="seal">ن<br /><small>NSSMS</small></div>
        </div>
      </section>
      <section className="stats">
        <Stat icon={<Trophy />} number={stats.seasons} label="مواسم منشورة" />
        <Stat icon={<Users />} number={stats.competitions} label="منافسات معتمدة" />
        <Stat icon={<FileCheck2 />} number={stats.announcements} label="إعلانات رسمية" />
      </section>
      <section className="pillars">
        <article className="pillar"><Landmark size={20} color="#0f6b4a" /><h3>حوكمة رسمية</h3><p>صلاحيات حسب النطاق الوطني والولائي والدائرة والمؤسسة، دون حذف نهائي للسجلات.</p></article>
        <article className="pillar"><QrCode size={20} color="#0f6b4a" /><h3>إجازة رقمية</h3><p>مرجع تحقق عام يحمي المعرّفات الداخلية ويعرض الحالة المعتمدة فقط.</p></article>
        <article className="pillar"><ShieldCheck size={20} color="#0f6b4a" /><h3>أثر قابل للمراجعة</h3><p>كل قرار إداري يُسجَّل في تدقيق محمي لا يُعدَّل ولا يُحذف.</p></article>
      </section>
      <section className="preview">
        <div className="eyebrow">آخر الإعلانات</div>
        <div className="cards">
          {news.length === 0 && <div className="empty-state">لا توجد إعلانات منشورة حالياً.</div>}
          {news.map((row) => (
            <article className="item-card" key={row.id}>
              {row.image_url ? <img className="thumb" src={row.image_url} alt="" /> : <div className="icon-box"><FileCheck2 /></div>}
              <div>
                <h3>{row.title}</h3>
                <p>{row.body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="hero-actions"><button className="secondary" onClick={onMore}>عرض كل الإعلانات</button></div>
      </section>
    </>
  );
}

function Stat({ icon, number, label }: { icon: React.ReactNode; number: string; label: string }) {
  return <div className="stat"><span>{icon}</span><div><b>{number}</b><small>{label}</small></div></div>;
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
                <p>{row.summary}</p>
              </div>
              <span className="badge">{labels[row.sport_kind] ?? ''} · {labels[row.status] ?? row.status}</span>
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
  const [form, setForm] = useState({ username: '', password: '', displayName: '', institutionName: '', institutionCode: '', wilayaId: '', dairaId: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${API}/api/v1/public/geography/wilayas`).then((r) => r.json()).then((d) => setWilayas(d.data ?? [])).catch(() => setWilayas([]));
  }, []);
  useEffect(() => {
    if (!form.wilayaId) { setDairas([]); return; }
    fetch(`${API}/api/v1/public/geography/wilayas/${form.wilayaId}/dairas`).then((r) => r.json()).then((d) => setDairas(d.data ?? [])).catch(() => setDairas([]));
  }, [form.wilayaId]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const r = await fetch(`${API}/api/v1/auth/institution-register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, wilayaId: Number(form.wilayaId), dairaId: Number(form.dairaId) })
    });
    if (!r.ok) { setError('تعذر تسجيل المؤسسة. تحقق من البيانات وتكوين الرابطة الولائية.'); return; }
    setMessage('تم إرسال الطلب. بانتظار موافقة الرابطة الولائية.');
  }
  return (
    <section className="login-page">
      <div className="login-card">
        <div className="eyebrow"><Users size={18} /> انخراط مؤسسة تعليمية</div>
        <h1>طلب الانخراط</h1>
        <p>يُراجع الطلب من الرابطة الولائية قبل تفعيل الحساب.</p>
        <form onSubmit={submit}>
          <label>اسم المستخدم<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required minLength={3} /></label>
          <label>كلمة المرور<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={12} /></label>
          <label>الاسم المعروض<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required /></label>
          <label>اسم المؤسسة<input value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} required /></label>
          <label>رمز المؤسسة<input value={form.institutionCode} onChange={(e) => setForm({ ...form, institutionCode: e.target.value })} required /></label>
          <label>الولاية
            <select value={form.wilayaId} onChange={(e) => setForm({ ...form, wilayaId: e.target.value, dairaId: '' })} required>
              <option value="">اختر الولاية</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{w.ar_name || w.name}</option>)}
            </select>
          </label>
          <label>الدائرة
            <select value={form.dairaId} onChange={(e) => setForm({ ...form, dairaId: e.target.value })} required>
              <option value="">اختر الدائرة</option>
              {dairas.map((d) => <option key={d.id} value={d.id}>{d.ar_name || d.name}</option>)}
            </select>
          </label>
          {error && <div className="alert error">{error}</div>}
          {message && <div className="result-card"><div><strong>{message}</strong></div></div>}
          <button className="primary">إرسال طلب الانخراط</button>
        </form>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
