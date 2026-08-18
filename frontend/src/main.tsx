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
    const token = reference.trim().toUpperCase();
    try {
      const enrollment = await fetch(`${API}/api/v1/public/enrollment/verify/${encodeURIComponent(token)}`);
      if (enrollment.ok) {
        setResult(await enrollment.json());
        return;
      }
      const license = await fetch(`${API}/api/v1/public/licenses/verify/${encodeURIComponent(token)}`);
      if (!license.ok) {
        throw new Error(license.status === 503 || enrollment.status === 503
          ? 'خدمة التحقق غير متاحة حالياً. تأكد أن قاعدة البيانات تعمل.'
          : 'لم يتم العثور على ترخيص أو رمز انخراط مطابق');
      }
      setResult(await license.json());
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
          <span className="brand-mark">★</span>
          <span>
            <b>NSSMS</b>
            <small>النظام الوطني لتسيير الرياضة المدرسية · الجزائر</small>
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
            <p>أدخل مرجع الإجازة أو رمز انخراط المدرب/التلميذ. النظام يعرض الحالة المعتمدة فقط دون المعرّفات الداخلية.</p>
            <p className="lede">تجربة محلية: <code>NSSMS-COACH-5D56C0935D8249B5</code> أو <code>NSSMS-STUD-AAD93430F8E1A1F1</code> أو <code>NSSMS-LIC-SETIF-FARHAT-ABBAS-2026</code></p>
            <form onSubmit={verify} className="verify-form">
              <input value={reference} onChange={(e) => setReference(e.target.value)} minLength={12} required placeholder="NSSMS-COACH-… أو NSSMS-STUD-… أو مرجع الترخيص" />
              <button className="primary"><Search size={18} /> تحقق الآن</button>
            </form>
            {error && <div className="alert error">{error}</div>}
            {result && (
              <article className="license-card">
                <header>
                  <CheckCircle2 size={28} />
                  <div>
                    <small>بطاقة تحقق معتمدة · NSSMS</small>
                    <strong>
                      {result.givenName || result.familyName
                        ? `${result.givenName ?? ''} ${result.familyName ?? ''}`.trim()
                        : result.role === 'COACH' ? 'انخراط مدرب' : result.role === 'STUDENT' ? 'انخراط تلميذ' : 'ترخيص رياضي معتمد'}
                    </strong>
                  </div>
                  <span className="badge">{result.status}</span>
                </header>
                <dl>
                  {result.givenName && <div><dt>الاسم</dt><dd>{result.givenName}</dd></div>}
                  {result.familyName && <div><dt>اللقب</dt><dd>{result.familyName}</dd></div>}
                  <div><dt>نوع الترخيص</dt><dd>{
                    ({ STUDENT: 'تلميذ / Student', COACH: 'مدرب / Coach', OFFICIAL: 'إطار رسمي', STUD: 'تلميذ' } as Record<string, string>)[result.licenseKind ?? result.role] ?? result.licenseKind ?? result.role ?? 'ترخيص رياضي'
                  }</dd></div>
                  <div><dt>الرياضة</dt><dd>{result.discipline ?? '—'}</dd></div>
                  <div><dt>الفئة العمرية</dt><dd>{result.ageCategory ?? '—'}</dd></div>
                  {result.sportKind && <div><dt>طبيعة النشاط</dt><dd>{result.sportKind === 'TEAM' ? 'جماعي' : result.sportKind === 'INDIVIDUAL' ? 'فردي' : result.sportKind}</dd></div>}
                  {result.genderCategory && <div><dt>الصنف</dt><dd>{result.genderCategory === 'MALE' ? 'ذكور' : result.genderCategory === 'FEMALE' ? 'إناث' : 'مختلط'}</dd></div>}
                  {result.institutionName && <div><dt>المؤسسة</dt><dd>{result.institutionName}</dd></div>}
                  {result.issuedAt && <div><dt>الإصدار</dt><dd>{new Date(result.issuedAt).toLocaleDateString('ar-DZ')}</dd></div>}
                  {result.expiresAt && <div><dt>الانتهاء</dt><dd>{new Date(result.expiresAt).toLocaleDateString('ar-DZ')}</dd></div>}
                </dl>
              </article>
            )}
          </section>
        )}
        {view === 'register' && <InstitutionRegister />}
      </main>
      <footer>
        <div className="site-foot">
          <div>
            <b>الجمهورية الجزائرية الديمقراطية الشعبية</b>
            <span className="motto">بالشعب وللشعب — ومن المدرسة إلى الملعب الوطني</span>
            <small>© {new Date().getFullYear()} NSSMS · National School Sports Management System</small>
          </div>
          <div>
            <b>مرجع</b>
            <small>حوكمة · أثر غير قابل للحذف · تحقق عمومي برمز</small>
          </div>
          <div>
            <b>Staff</b>
            <a href="/admin.html">فضاء العاملين / Administration</a>
          </div>
        </div>
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
        <div className="panel"><h3>التحقق العام · Public verify</h3><p>أدخل مرجع الإجازة أو رمز انخراط المدرب/التلميذ فقط. النظام لا يعرض المعرّفات الداخلية.</p></div>
        <div className="panel"><h3>انخراط المؤسسة · Enrolment</h3><p>الولاية ثم الدائرة ثم البلدية، واسم حر للمؤسسة. الطلب معلّق حتى تعتمد الرابطة الولائية.</p></div>
        <div className="panel"><h3>النطاق الإداري · Scope</h3><p>الوطني يرى الكل، الرابطة ولايتها، الدائرة دائرتها، والمؤسسة سجلها فقط — عدل جغرافي لا امتياز شخصي.</p></div>
        <div className="panel"><h3>حفظ التاريخ · Memory</h3><p>الأثر لا يُمحى. الإغلاق والأرشفة يحفظان السجل كذاكرة إدارية للموسم والوطن.</p></div>
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
