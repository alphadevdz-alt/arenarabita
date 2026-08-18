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

type Tab = 'dashboard' | 'institutions' | 'participants' | 'seasons' | 'competitions' | 'licenses' | 'audit' | 'reports' | 'approvals';

async function api(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    }
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
    const response = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      setError('بيانات الدخول غير صحيحة');
      return;
    }
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
  const association = roles.includes('ASSOCIATION_ADMINISTRATOR');
  const tabs = useMemo(() => {
    const items: { id: Tab; label: string }[] = [{ id: 'dashboard', label: 'الملخص' }];
    if (association) items.push({ id: 'approvals', label: 'طلبات الانخراط' });
    items.push({ id: 'institutions', label: 'المؤسسات' }, { id: 'participants', label: 'المشاركون' });
    if (national) items.push({ id: 'seasons', label: 'المواسم' }, { id: 'competitions', label: 'المنافسات' });
    items.push({ id: 'licenses', label: 'التراخيص' });
    if (national) items.push({ id: 'audit', label: 'التدقيق' }, { id: 'reports', label: 'التقارير' });
    return items;
  }, [national, association]);
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
      {tab === 'institutions' && <Collection token={token} path="/api/v1/admin/institutions" title="المؤسسات التعليمية" fields={['name', 'code', 'organization_name', 'status']} />}
      {tab === 'participants' && <Participants token={token} canCreate={national || association || roles.includes('MEMBER_INSTITUTION_USER')} />}
      {tab === 'seasons' && <Collection token={token} path="/api/v1/admin/seasons" title="المواسم" fields={['name', 'status', 'start_date', 'end_date']} create={national ? { name: '', startDate: '', endDate: '' } : undefined} />}
      {tab === 'competitions' && <Collection token={token} path="/api/v1/admin/competitions" title="المنافسات" fields={['name', 'season_name', 'status']} />}
      {tab === 'licenses' && <Licenses token={token} canIssue={national || association} />}
      {tab === 'audit' && <Collection token={token} path="/api/v1/admin/audit" title="سجل التدقيق" fields={['occurred_at', 'action', 'entity_type', 'result_status']} />}
      {tab === 'reports' && <Reports token={token} />}
    </div>
  );
}

function ScopedDashboard({ token, roles }: { token: string; roles: string[] }) {
  const [result, setResult] = useState<any>(null);
  useEffect(() => {
    api('/api/v1/dashboard/summary', token).then(setResult).catch(() => setResult({ error: 'تعذر تحميل الملخص' }));
  }, [token]);
  if (!result) return <div className="empty">جارٍ تحميل لوحة المستخدم…</div>;
  if (result.error) return <div className="alert error">{result.error}</div>;
  const scopeLabel = result.scope === 'national' ? 'النطاق الوطني الكامل' : result.scope === 'organization' ? 'بيانات الرابطة المرتبطة بالحساب' : result.scope === 'daira' ? 'نطاق الدائرة' : 'بيانات المؤسسة المنخرطة المرتبطة بالحساب';
  return (
    <>
      <div className="workspace-summary">
        {Object.entries(result.data ?? {}).map(([key, value]) => (
          <div className="summary-card" key={key}><small>{key}</small><b>{String(value)}</b></div>
        ))}
      </div>
      <div className="panel">
        <h3>نطاق الوصول</h3>
        <p>{scopeLabel}</p>
        <small>{roles.map((role) => labels[role] ?? role).join(' · ')}</small>
      </div>
    </>
  );
}

function Collection({ token, path, title, fields, create }: { token: string; path: string; title: string; fields: string[]; create?: Record<string, string> }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(create ?? {});
  const [message, setMessage] = useState('');
  function load() {
    api(path, token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
  }
  useEffect(load, [path, token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(path, token, { method: 'POST', body: JSON.stringify(form) });
      setMessage('تم الحفظ');
      load();
    } catch {
      setMessage('تعذر الحفظ');
    }
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

function Licenses({ token, canIssue }: { token: string; canIssue: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantId, setParticipantId] = useState('');
  const [issued, setIssued] = useState('');
  useEffect(() => {
    api('/api/v1/admin/licenses', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
    api('/api/v1/admin/participants', token).then((d) => setParticipants(d.data ?? [])).catch(() => setParticipants([]));
  }, [token]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = await api('/api/v1/admin/licenses', token, { method: 'POST', body: JSON.stringify({ participantId }) });
    setIssued(result.verificationReference ?? '');
    const d = await api('/api/v1/admin/licenses', token);
    setRows(d.data ?? []);
  }
  return (
    <div>
      <h3>التراخيص الرياضية</h3>
      {canIssue && (
        <form className="inline-form" onSubmit={submit}>
          <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} required>
            <option value="">المشارك</option>
            {participants.map((item) => <option key={item.id} value={item.id}>{item.given_name} {item.family_name}</option>)}
          </select>
          <button className="primary"><FileCheck2 size={16} /> إصدار ترخيص</button>
        </form>
      )}
      {issued && <div className="result-card"><div><strong>مرجع التحقق العام</strong><span>{issued}</span></div></div>}
      <div className="data-table">
        {rows.map((row) => (
          <div className="data-row" key={row.id}>
            <span>{row.status}</span>
            <small>{row.issued_at ? new Date(row.issued_at).toLocaleDateString('ar-DZ') : '—'}</small>
            <small>{row.expires_at ? new Date(row.expires_at).toLocaleDateString('ar-DZ') : 'بدون انتهاء'}</small>
          </div>
        ))}
        {!rows.length && <div className="empty">لا توجد تراخيص ضمن النطاق.</div>}
      </div>
    </div>
  );
}

function Approvals({ token }: { token: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  function load() {
    api('/api/v1/association/institution-registrations', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
  }
  useEffect(load, [token]);
  async function decide(id: string, action: 'approve' | 'reject') {
    try {
      await api(`/api/v1/association/institution-registrations/${id}/${action}`, token, { method: 'POST', body: JSON.stringify(action === 'reject' ? { reason: 'مراجعة الرابطة' } : {}) });
      setMessage(action === 'approve' ? 'تمت الموافقة' : 'تم الرفض');
      load();
    } catch {
      setMessage('تعذر تنفيذ القرار');
    }
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
