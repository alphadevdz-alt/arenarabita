import React, { useEffect, useMemo, useState } from 'react';
import { Building2, FileCheck2, Landmark, LayoutDashboard, School, Shield, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

export const ROLE_META: Record<string, { title: string; rank: string; color: string; mission: string }> = {
  SYSTEM_ADMINISTRATOR: { title: 'المشرف العام', rank: 'المستوى 1 — السيادة التقنية', color: '#c4a35a', mission: 'حسابات، أدوار، أمن النظام، وسجل التدقيق الكامل.' },
  NATIONAL_ADMINISTRATOR: { title: 'الممثل الجهوي / الوطني', rank: 'المستوى 2 — الرزنامة الوطنية', color: '#8fd0b0', mission: 'المواسم، المنافسات، الإعلانات، والتقارير المعتمدة.' },
  ASSOCIATION_ADMINISTRATOR: { title: 'مدير الرابطة الولائية', rank: 'المستوى 3 — الولاية', color: '#6bb3ff', mission: 'موافقة المؤسسات، تراخيص الولاية، ومتابعة المنخرطين.' },
  ASSOCIATION_REPRESENTATIVE: { title: 'ممثل الرابطة', rank: 'المستوى 3ب — تمثيل ميداني', color: '#7ec8e3', mission: 'متابعة المشاركين والتسجيلات دون صلاحيات الاعتماد.' },
  DAIRA_OFFICER: { title: 'ممثل الدائرة', rank: 'المستوى 4 — الدائرة', color: '#e0b36a', mission: 'مؤسسات الدائرة ومشاركوها ضمن النطاق فقط.' },
  MEMBER_INSTITUTION_USER: { title: 'حساب المؤسسة المنخرطة', rank: 'المستوى 5 — المؤسسة', color: '#d08bb0', mission: 'تلاميذ المؤسسة، طلب الترخيص، والتسجيل في المنافسات المفتوحة.' }
};

export function primaryRole(roles: string[]): string {
  const order = ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR', 'ASSOCIATION_REPRESENTATIVE', 'DAIRA_OFFICER', 'MEMBER_INSTITUTION_USER'];
  return order.find((role) => roles.includes(role)) ?? roles[0] ?? 'MEMBER_INSTITUTION_USER';
}

export async function api(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) }
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? 'request_failed');
  return response.json();
}

export function menusFor(role: string): { id: string; label: string }[] {
  const account = { id: 'account', label: 'الحساب' };
  if (role === 'SYSTEM_ADMINISTRATOR') return [{ id: 'home', label: 'لوحة المشرف' }, { id: 'users', label: 'المستخدمون' }, { id: 'organizations', label: 'الرابطات' }, { id: 'audit', label: 'التدقيق' }, { id: 'reports', label: 'التقارير' }, account];
  if (role === 'NATIONAL_ADMINISTRATOR') return [{ id: 'home', label: 'لوحة وطنية' }, { id: 'seasons', label: 'المواسم' }, { id: 'competitions', label: 'المنافسات' }, { id: 'announcements', label: 'الإعلانات' }, { id: 'results', label: 'النتائج' }, { id: 'reports', label: 'التقارير' }, account];
  if (role === 'ASSOCIATION_ADMINISTRATOR') return [{ id: 'home', label: 'لوحة الرابطة' }, { id: 'approvals', label: 'طلبات الانخراط' }, { id: 'institutions', label: 'المؤسسات' }, { id: 'participants', label: 'المشاركون' }, { id: 'licenses', label: 'التراخيص' }, { id: 'entries', label: 'التسجيلات' }, account];
  if (role === 'ASSOCIATION_REPRESENTATIVE') return [{ id: 'home', label: 'لوحة التمثيل' }, { id: 'participants', label: 'المشاركون' }, { id: 'competitions', label: 'المنافسات' }, { id: 'entries', label: 'التسجيلات' }, account];
  if (role === 'DAIRA_OFFICER') return [{ id: 'home', label: 'لوحة الدائرة' }, { id: 'institutions', label: 'مؤسسات الدائرة' }, { id: 'participants', label: 'المشاركون' }, account];
  return [{ id: 'home', label: 'لوحة المؤسسة' }, { id: 'participants', label: 'تلاميذ المؤسسة' }, { id: 'licenses', label: 'طلب ترخيص' }, { id: 'entries', label: 'التسجيل في منافسة' }, account];
}

export function RoleHome({ token, role, user }: { token: string; role: string; user: any }) {
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => { api('/api/v1/dashboard/summary', token).then(setSummary).catch(() => setSummary({ error: 'تعذر التحميل' })); }, [token]);
  const meta = ROLE_META[role];
  const metricLabels: Record<string, string> = { organizations: 'الرابطات', institutions: 'المؤسسات', participants: 'المشاركون', licenses: 'التراخيص' };
  return (
    <div className="cockpit-home">
      <article className="rank-banner" style={{ borderColor: meta.color }}>
        <span className="rank-dot" style={{ background: meta.color }} />
        <div>
          <small>{meta.rank}</small>
          <h2>{meta.title}</h2>
          <p>{meta.mission}</p>
          <small>النطاق: ولاية {user.wilayaId ?? '—'} · دائرة {user.dairaId ?? '—'} · مؤسسة {user.institutionId ? 'مرتبطة' : '—'}</small>
        </div>
      </article>
      <div className="workspace-summary">
        {Object.entries(summary?.data ?? {}).map(([key, value]) => (
          <div className="summary-card" key={key}><small>{metricLabels[key] ?? key}</small><b>{String(value)}</b></div>
        ))}
      </div>
      <div className="hierarchy">
        <span className={role === 'SYSTEM_ADMINISTRATOR' ? 'on' : ''}><Shield size={14} /> مشرف عام</span>
        <span className={role === 'NATIONAL_ADMINISTRATOR' ? 'on' : ''}><Landmark size={14} /> ممثل وطني</span>
        <span className={role === 'ASSOCIATION_ADMINISTRATOR' ? 'on' : ''}><Building2 size={14} /> رابطة</span>
        <span className={role === 'ASSOCIATION_REPRESENTATIVE' ? 'on' : ''}><Users size={14} /> ممثل رابطة</span>
        <span className={role === 'DAIRA_OFFICER' ? 'on' : ''}><LayoutDashboard size={14} /> دائرة</span>
        <span className={role === 'MEMBER_INSTITUTION_USER' ? 'on' : ''}><School size={14} /> مؤسسة</span>
      </div>
    </div>
  );
}
