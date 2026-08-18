import React, { useEffect, useMemo, useState } from 'react';
import { FileCheck2, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const labels: Record<string, string> = {
  SYSTEM_ADMINISTRATOR: 'إداري عام',
  NATIONAL_ADMINISTRATOR: 'إداري وطني',
  ASSOCIATION_ADMINISTRATOR: 'مدير رابطة ولائية',
  ASSOCIATION_REPRESENTATIVE: 'ممثل الرابطة',
  DAIRA_OFFICER: 'موظف دائرة',
  MEMBER_INSTITUTION_USER: 'مسؤول مؤسسة منخرطة'
};

const seasonNext: Record<string, string> = { DRAFT: 'UNDER_REVIEW', UNDER_REVIEW: 'APPROVED', APPROVED: 'ACTIVE', ACTIVE: 'CLOSED', CLOSED: 'ARCHIVED' };
const competitionNext: Record<string, string> = { DRAFT: 'REVIEW', REVIEW: 'APPROVED', APPROVED: 'REGISTRATION', REGISTRATION: 'ACTIVE', ACTIVE: 'RESULTS', RESULTS: 'CLOSED', CLOSED: 'ARCHIVED' };
const licenseNext: Record<string, string> = { APPLICATION: 'VALIDATION', VALIDATION: 'APPROVAL', APPROVAL: 'ISSUED', ISSUED: 'ACTIVE', ACTIVE: 'EXPIRED' };

type Tab = 'dashboard' | 'institutions' | 'organizations' | 'participants' | 'seasons' | 'competitions' | 'entries' | 'licenses' | 'results' | 'announcements' | 'users' | 'audit' | 'reports' | 'approvals' | 'account';

async function api(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) }
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? 'request_failed');
  return response.json();
}

export function RoleAdmin({ onBack }: { onBack: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('demo.admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('nssms_token');
    if (!token) return;
    fetch(`${API}/api/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('nssms_token'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch(`${API}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!response.ok) { setError('بيانات الدخول غير صحيحة'); return; }
    const data = await response.json();
    localStorage.setItem('nssms_token', data.token);
    setUser(data.user);
    setError('');
  }

  async function logout() {
    const token = localStorage.getItem('nssms_token');
    if (token) await fetch(`${API}/api/v1/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } }).catch(() => undefined);
    localStorage.removeItem('nssms_token');
    setUser(null);
  }

  if (!user) {
    return (
      <section className="login-page">
        <button className="back" onClick={onBack}>← العودة للبوابة العامة</button>
        <div className="login-card">
          <div className="brand-mark">ن</div>
          <div className="eyebrow"><ShieldCheck size={18} /> وصول حسب الصلاحية</div>
          <h1>تسجيل الدخول</h1>
          <form onSubmit={submit}>
            <label>اسم المستخدم<input value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
            <label>كلمة المرور<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} required /></label>
            {error && <div className="alert error">{error}</div>}
            <button className="primary">دخول إلى لوحة التحكم</button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="admin">
      <button className="back" onClick={onBack}>← العودة</button>
      <div className="admin-head">
        <div>
          <div className="eyebrow"><LayoutDashboard size={18} /> لوحة المستخدم</div>
          <h1>مرحبًا، {user.username}</h1>
          <p>{user.roles?.map((role: string) => labels[role] ?? role).join(' · ')}</p>
        </div>
        <button className="secondary" onClick={logout}><LogOut size={16} /> خروج</button>
      </div>
      <AdminWorkspace token={localStorage.getItem('nssms_token') ?? ''} roles={user.roles ?? []} />
    </section>
  );
}

function AdminWorkspace({ token, roles }: { token: string; roles: string[] }) {
  const national = roles.some((r) => ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR'].includes(r));
  const system = roles.includes('SYSTEM_ADMINISTRATOR');
  const association = roles.includes('ASSOCIATION_ADMINISTRATOR');
  const canWritePeople = national || association || roles.includes('MEMBER_INSTITUTION_USER');
  const tabs = useMemo(() => {
    const items: { id: Tab; label: string }[] = [{ id: 'dashboard', label: 'الملخص' }];
    if (association) items.push({ id: 'approvals', label: 'طلبات الانخراط' });
    if (national) items.push({ id: 'organizations', label: 'الرابطات' });
    items.push({ id: 'institutions', label: 'المؤسسات' }, { id: 'participants', label: 'المشاركون' });
    items.push({ id: 'seasons', label: 'المواسم' }, { id: 'competitions', label: 'المنافسات' }, { id: 'entries', label: 'التسجيلات' });
    items.push({ id: 'licenses', label: 'التراخيص' });
    if (national) items.push({ id: 'results', label: 'النتائج' }, { id: 'announcements', label: 'الإعلانات' });
    if (system) items.push({ id: 'users', label: 'المستخدمون' });
    if (national) items.push({ id: 'audit', label: 'التدقيق' }, { id: 'reports', label: 'التقارير' });
    items.push({ id: 'account', label: 'الحساب' });
    return items;
  }, [national, association, system]);
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="workspace">
      <div className="tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'selected' : ''} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </div>
      {tab === 'dashboard' && <ScopedDashboard token={token} roles={roles} />}
      {tab === 'approvals' && <Approvals token={token} />}
      {tab === 'organizations' && <Organizations token={token} />}
      {tab === 'institutions' && <Collection token={token} path="/api/v1/admin/institutions" title="المؤسسات التعليمية" fields={['name', 'code', 'organization_name', 'status']} />}
      {tab === 'participants' && <Participants token={token} canCreate={canWritePeople} />}
      {tab === 'seasons' && <LifecycleList token={token} path="/api/v1/admin/seasons" title="المواسم" fields={['name', 'status', 'start_date', 'end_date']} next={seasonNext} create={national ? { name: '', startDate: '', endDate: '' } : undefined} canTransition={national} />}
      {tab === 'competitions' && <Competitions token={token} national={national} />}
      {tab === 'entries' && <Entries token={token} canCreate={canWritePeople} />}
      {tab === 'licenses' && <Licenses token={token} canIssue={national || association} canApply={canWritePeople} />}
      {tab === 'results' && <Results token={token} />}
      {tab === 'announcements' && <Announcements token={token} />}
      {tab === 'users' && <Users token={token} />}
      {tab === 'audit' && <Collection token={token} path="/api/v1/admin/audit" title="سجل التدقيق" fields={['occurred_at', 'action', 'entity_type', 'result_status']} />}
      {tab === 'reports' && <Reports token={token} />}
      {tab === 'account' && <Account token={token} />}
    </div>
  );
}

function ScopedDashboard({ token, roles }: { token: string; roles: string[] }) {
  const [result, setResult] = useState<any>(null);
  useEffect(() => { api('/api/v1/dashboard/summary', token).then(setResult).catch(() => setResult({ error: 'تعذر تحميل الملخص' })); }, [token]);
  if (!result) return <div className="empty">جارٍ تحميل لوحة المستخدم…</div>;
  if (result.error) return <div className="alert error">{result.error}</div>;
  const scopeLabel = result.scope === 'national' ? 'النطاق الوطني الكامل' : result.scope === 'organization' ? 'بيانات الرابطة المرتبطة بالحساب' : result.scope === 'daira' ? 'نطاق الدائرة' : 'بيانات المؤسسة المنخرطة المرتبطة بالحساب';
  const metricLabels: Record<string, string> = { organizations: 'الرابطات', institutions: 'المؤسسات', participants: 'المشاركون', licenses: 'التراخيص' };
  return (
    <>
      <div className="workspace-summary">
        {Object.entries(result.data ?? {}).map(([key, value]) => (
          <div className="summary-card" key={key}><small>{metricLabels[key] ?? key}</small><b>{String(value)}</b></div>
        ))}
      </div>
      <div className="panel"><h3>نطاق الوصول</h3><p>{scopeLabel}</p><small>{roles.map((role) => labels[role] ?? role).join(' · ')}</small></div>
    </>
  );
}

function Collection({ token, path, title, fields, create }: { token: string; path: string; title: string; fields: string[]; create?: Record<string, string> }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(create ?? {});
  const [message, setMessage] = useState('');
  function load() { api(path, token).then((d) => setRows(d.data ?? [])).catch(() => setRows([])); }
  useEffect(load, [path, token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api(path, token, { method: 'POST', body: JSON.stringify(form) }); setMessage('تم الحفظ'); load(); }
    catch { setMessage('تعذر الحفظ'); }
  }
  return (
    <div>
      <h3>{title}</h3>
      {create && (
        <form className="inline-form" onSubmit={submit}>
          {Object.keys(create).map((key) => (
            <input key={key} placeholder={key} value={(form as any)[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
          ))}
          <button className="primary">إضافة</button>
        </form>
      )}
      {message && <div className="empty">{message}</div>}
      <div className="data-table">
        {rows.length === 0 && <div className="empty">لا توجد سجلات ضمن نطاقك.</div>}
        {rows.map((row) => (
          <div className="data-row" key={row.id ?? JSON.stringify(row)}>
            {fields.map((field) => <span key={field}>{String(row[field] ?? '—')}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function LifecycleList({ token, path, title, fields, next, create, canTransition }: { token: string; path: string; title: string; fields: string[]; next: Record<string, string>; create?: Record<string, string>; canTransition: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(create ?? {});
  const [message, setMessage] = useState('');
  function load() { api(path, token).then((d) => setRows(d.data ?? [])).catch(() => setRows([])); }
  useEffect(load, [path, token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api(path, token, { method: 'POST', body: JSON.stringify(form) }); setMessage('تم الحفظ'); load(); } catch { setMessage('تعذر الحفظ'); }
  }
  async function transition(id: string, to: string) {
    try { await api(`${path}/${id}/transition`, token, { method: 'POST', body: JSON.stringify({ to }) }); load(); } catch { setMessage('انتقال غير مسموح'); }
  }
  return (
    <div>
      <h3>{title}</h3>
      {create && (
        <form className="inline-form" onSubmit={submit}>
          {Object.keys(create).map((key) => (
            <input key={key} placeholder={key} value={(form as any)[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
          ))}
          <button className="primary">إضافة</button>
        </form>
      )}
      {message && <div className="empty">{message}</div>}
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            {fields.map((field) => <span key={field}>{String(row[field] ?? '—')}</span>)}
            {canTransition && next[row.status] && <button className="secondary" onClick={() => transition(row.id, next[row.status])}>{next[row.status]}</button>}
          </div>
        ))}
        {!rows.length && <div className="empty">لا توجد سجلات.</div>}
      </div>
    </div>
  );
}

function Organizations({ token }: { token: string }) {
  return <Collection token={token} path="/api/v1/admin/organizations" title="الرابطات والمنظمات" fields={['name', 'code', 'status']} create={{ name: '', code: '' }} />;
}

function Competitions({ token, national }: { token: string; national: boolean }) {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ seasonId: '', name: '' });
  const [message, setMessage] = useState('');
  function load() {
    api('/api/v1/admin/competitions', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
    api('/api/v1/admin/seasons', token).then((d) => setSeasons(d.data ?? [])).catch(() => setSeasons([]));
  }
  useEffect(load, [token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api('/api/v1/admin/competitions', token, { method: 'POST', body: JSON.stringify(form) }); load(); } catch { setMessage('تعذر الإنشاء'); }
  }
  async function transition(id: string, status: string) {
    const to = competitionNext[status];
    if (!to) return;
    try { await api(`/api/v1/admin/competitions/${id}/transition`, token, { method: 'POST', body: JSON.stringify({ to }) }); load(); } catch { setMessage('انتقال غير مسموح'); }
  }
  return (
    <div>
      <h3>المنافسات</h3>
      {national && (
        <form className="inline-form" onSubmit={submit}>
          <select value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })} required>
            <option value="">الموسم</option>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="اسم المنافسة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <button className="primary">إنشاء</button>
        </form>
      )}
      {message && <div className="empty">{message}</div>}
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.name}</span>
            <span>{row.season_name}</span>
            <small>{row.status}</small>
            {national && competitionNext[row.status] && <button className="secondary" onClick={() => transition(row.id, row.status)}>{competitionNext[row.status]}</button>}
          </div>
        ))}
        {!rows.length && <div className="empty">لا توجد منافسات.</div>}
      </div>
    </div>
  );
}

function Entries({ token, canCreate }: { token: string; canCreate: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [form, setForm] = useState({ competitionId: '', participantId: '' });
  function load() {
    api('/api/v1/admin/entries', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
    api('/api/v1/admin/participants', token).then((d) => setParticipants(d.data ?? [])).catch(() => setParticipants([]));
    api('/api/v1/admin/competitions', token).then((d) => setCompetitions((d.data ?? []).filter((c: any) => ['REGISTRATION', 'ACTIVE'].includes(c.status)))).catch(() => setCompetitions([]));
  }
  useEffect(load, [token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api('/api/v1/admin/entries', token, { method: 'POST', body: JSON.stringify(form) });
    load();
  }
  return (
    <div>
      <h3>تسجيل المشاركين في المنافسات</h3>
      {canCreate && (
        <form className="inline-form" onSubmit={submit}>
          <select value={form.competitionId} onChange={(e) => setForm({ ...form, competitionId: e.target.value })} required>
            <option value="">المنافسة</option>
            {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.participantId} onChange={(e) => setForm({ ...form, participantId: e.target.value })} required>
            <option value="">المشارك</option>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.given_name} {p.family_name}</option>)}
          </select>
          <button className="primary">تسجيل</button>
        </form>
      )}
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.given_name} {row.family_name}</span>
            <span>{row.competition_name}</span>
            <small>{row.status}</small>
          </div>
        ))}
        {!rows.length && <div className="empty">لا توجد تسجيلات.</div>}
      </div>
    </div>
  );
}

function Participants({ token, canCreate }: { token: string; canCreate: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [form, setForm] = useState({ institutionId: '', givenName: '', familyName: '' });
  useEffect(() => {
    api('/api/v1/admin/participants', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
    api('/api/v1/admin/institutions', token).then((d) => setInstitutions(d.data ?? [])).catch(() => setInstitutions([]));
  }, [token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api('/api/v1/admin/participants', token, { method: 'POST', body: JSON.stringify(form) });
    const d = await api('/api/v1/admin/participants', token);
    setRows(d.data ?? []);
  }
  return (
    <div>
      <h3>المشاركون</h3>
      {canCreate && (
        <form className="inline-form" onSubmit={submit}>
          <select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} required>
            <option value="">المؤسسة</option>
            {institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input placeholder="الاسم" value={form.givenName} onChange={(e) => setForm({ ...form, givenName: e.target.value })} required />
          <input placeholder="اللقب" value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} required />
          <button className="primary">تسجيل مشارك</button>
        </form>
      )}
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.given_name} {row.family_name}</span>
            <span>{row.institution_name}</span>
            <small>{row.status}</small>
          </div>
        ))}
        {!rows.length && <div className="empty">لا يوجد مشاركون في النطاق الحالي.</div>}
      </div>
    </div>
  );
}

function Licenses({ token, canIssue, canApply }: { token: string; canIssue: boolean; canApply: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantId, setParticipantId] = useState('');
  const [issued, setIssued] = useState('');
  function load() {
    api('/api/v1/admin/licenses', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
    api('/api/v1/admin/participants', token).then((d) => setParticipants(d.data ?? [])).catch(() => setParticipants([]));
  }
  useEffect(load, [token]);
  async function apply(e: React.FormEvent) {
    e.preventDefault();
    await api('/api/v1/admin/licenses/applications', token, { method: 'POST', body: JSON.stringify({ participantId }) });
    load();
  }
  async function issue(e: React.FormEvent) {
    e.preventDefault();
    const result = await api('/api/v1/admin/licenses', token, { method: 'POST', body: JSON.stringify({ participantId }) });
    setIssued(result.verificationReference ?? '');
    load();
  }
  async function advance(row: any) {
    const to = licenseNext[row.status];
    if (!to) return;
    await api(`/api/v1/admin/licenses/${row.id}/transition`, token, { method: 'POST', body: JSON.stringify({ to }) });
    if (to === 'ISSUED') {
      const issuedRef = await api(`/api/v1/admin/licenses/${row.id}/issue-reference`, token, { method: 'POST', body: '{}' }).catch(() => null);
      if (issuedRef?.verificationReference) setIssued(issuedRef.verificationReference);
    }
    load();
  }
  return (
    <div>
      <h3>التراخيص الرياضية</h3>
      {(canApply || canIssue) && (
        <form className="inline-form" onSubmit={canIssue ? issue : apply}>
          <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} required>
            <option value="">المشارك</option>
            {participants.map((item) => <option key={item.id} value={item.id}>{item.given_name} {item.family_name}</option>)}
          </select>
          {canApply && <button type="button" className="secondary" onClick={(e) => { e.preventDefault(); void apply(e as any); }}>طلب ترخيص</button>}
          {canIssue && <button className="primary"><FileCheck2 size={16} /> إصدار مباشر</button>}
        </form>
      )}
      {issued && <div className="result-card"><div><strong>مرجع التحقق العام</strong><span>{issued}</span></div></div>}
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.status}</span>
            <small>{row.issued_at ? new Date(row.issued_at).toLocaleDateString('ar-DZ') : '—'}</small>
            {canIssue && licenseNext[row.status] && <button className="secondary" onClick={() => advance(row)}>{licenseNext[row.status]}</button>}
          </div>
        ))}
        {!rows.length && <div className="empty">لا توجد تراخيص ضمن النطاق.</div>}
      </div>
    </div>
  );
}

function Results({ token }: { token: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [form, setForm] = useState({ competitionId: '', participantId: '', note: '' });
  function load() {
    api('/api/v1/admin/results', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
    api('/api/v1/admin/competitions', token).then((d) => setCompetitions(d.data ?? [])).catch(() => setCompetitions([]));
    api('/api/v1/admin/participants', token).then((d) => setParticipants(d.data ?? [])).catch(() => setParticipants([]));
  }
  useEffect(load, [token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api(`/api/v1/admin/competitions/${form.competitionId}/results`, token, { method: 'POST', body: JSON.stringify({ participantId: form.participantId || undefined, resultData: { note: form.note } }) });
    load();
  }
  return (
    <div>
      <h3>نتائج المنافسات</h3>
      <form className="inline-form" onSubmit={submit}>
        <select value={form.competitionId} onChange={(e) => setForm({ ...form, competitionId: e.target.value })} required>
          <option value="">المنافسة</option>
          {competitions.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
        </select>
        <select value={form.participantId} onChange={(e) => setForm({ ...form, participantId: e.target.value })}>
          <option value="">بدون مشارك</option>
          {participants.map((p) => <option key={p.id} value={p.id}>{p.given_name} {p.family_name}</option>)}
        </select>
        <input placeholder="ملاحظة النتيجة" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} required />
        <button className="primary">تسجيل نتيجة</button>
      </form>
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.competition_name}</span>
            <small>{JSON.stringify(row.result_data)}</small>
            <small>{row.status}</small>
          </div>
        ))}
        {!rows.length && <div className="empty">لا توجد نتائج.</div>}
      </div>
    </div>
  );
}

function Announcements({ token }: { token: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', body: '' });
  function load() { api('/api/v1/admin/announcements', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([])); }
  useEffect(load, [token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api('/api/v1/admin/announcements', token, { method: 'POST', body: JSON.stringify(form) });
    setForm({ title: '', body: '' });
    load();
  }
  return (
    <div>
      <h3>الإعلانات العامة</h3>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input placeholder="النص" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
        <button className="primary">نشر</button>
      </form>
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.title}</span>
            <small>{row.status}</small>
            <button className="secondary" onClick={() => api(`/api/v1/admin/announcements/${row.id}/archive`, token, { method: 'POST', body: '{}' }).then(load)}>أرشفة</button>
          </div>
        ))}
        {!rows.length && <div className="empty">لا توجد إعلانات.</div>}
      </div>
    </div>
  );
}

function Users({ token }: { token: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api('/api/v1/admin/users', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([])); }, [token]);
  return (
    <div>
      <h3>المستخدمون</h3>
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.username}</span>
            <span>{row.display_name}</span>
            <small>{row.status} · {(row.roles ?? []).join(', ')}</small>
          </div>
        ))}
        {!rows.length && <div className="empty">لا يوجد مستخدمون أو لا تملك صلاحية العرض.</div>}
      </div>
    </div>
  );
}

function Account({ token }: { token: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/v1/auth/change-password', token, { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
      setMessage('تم تغيير كلمة المرور');
    } catch {
      setMessage('تعذر تغيير كلمة المرور');
    }
  }
  return (
    <div className="login-card">
      <h3>تغيير كلمة المرور</h3>
      <form onSubmit={submit}>
        <label>كلمة المرور الحالية<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} minLength={12} required /></label>
        <label>كلمة المرور الجديدة<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={12} required /></label>
        <button className="primary">حفظ</button>
      </form>
      {message && <div className="empty">{message}</div>}
    </div>
  );
}

function Approvals({ token }: { token: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  function load() { api('/api/v1/association/institution-registrations', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([])); }
  useEffect(load, [token]);
  async function decide(id: string, action: 'approve' | 'reject') {
    try {
      await api(`/api/v1/association/institution-registrations/${id}/${action}`, token, { method: 'POST', body: JSON.stringify(action === 'reject' ? { reason: 'مراجعة الرابطة' } : {}) });
      setMessage(action === 'approve' ? 'تمت الموافقة' : 'تم الرفض');
      load();
    } catch { setMessage('تعذر تنفيذ القرار'); }
  }
  return (
    <div>
      <h3>طلبات انخراط المؤسسات</h3>
      {message && <div className="empty">{message}</div>}
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.institution_name} · {row.username}</span>
            <small>{row.daira_name}</small>
            <span>
              <button className="primary" onClick={() => decide(row.id, 'approve')}>موافقة</button>
              <button className="secondary" onClick={() => decide(row.id, 'reject')}>رفض</button>
            </span>
          </div>
        ))}
        {!rows.length && <div className="empty">لا توجد طلبات معلّقة.</div>}
      </div>
    </div>
  );
}

function Reports({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    Promise.all([api('/api/v1/admin/reports/summary', token), api('/api/v1/admin/reports/status-breakdown', token)])
      .then(([summary, breakdown]) => setData({ summary: summary.data, breakdown: breakdown.data }))
      .catch(() => setData({ error: 'تعذر تحميل التقارير' }));
  }, [token]);
  if (!data) return <div className="empty">جارٍ تحميل التقارير…</div>;
  if (data.error) return <div className="alert error">{data.error}</div>;
  return (
    <div className="admin-grid">
      <div className="panel">
        <h3>ملخص وطني</h3>
        {Object.entries(data.summary ?? {}).map(([key, value]) => (
          <div className="overview-stat" key={key}><b>{key}</b><small>{String(value)}</small></div>
        ))}
      </div>
      <div className="panel">
        <h3>توزيع الحالات</h3>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12 }}>{JSON.stringify(data.breakdown, null, 2)}</pre>
      </div>
    </div>
  );
}
