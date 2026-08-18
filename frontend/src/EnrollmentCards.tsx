import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Printer } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

async function api(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) }
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? 'request_failed');
  return response.json();
}

const kindLabel: Record<string, string> = {
  STUDENT: 'تلميذ منخرط',
  COACH: 'مدرب المؤسسة',
  INSTITUTION_REPRESENTATIVE: 'ممثل المؤسسة'
};

function Seal({ seed }: { seed: string }) {
  const bits = useMemo(() => {
    const cells: boolean[] = [];
    for (let i = 0; i < 49; i++) cells.push(((seed.charCodeAt(i % seed.length) + i * 17) % 3) !== 0);
    return cells;
  }, [seed]);
  return (
    <div className="card-seal" aria-hidden>
      {bits.map((on, i) => <span key={i} className={on ? 'on' : ''} />)}
    </div>
  );
}

export function EnrollmentDesk({ token, canIssue }: { token: string; canIssue: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [fresh, setFresh] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<{ institutionId: string; competitionId: string } | null>(null);
  const [names, setNames] = useState({ coachName: 'مدرب المؤسسة', representativeName: 'ممثل المؤسسة' });

  function load() {
    api('/api/v1/admin/participations', token).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
    api('/api/v1/admin/entries', token).then((d) => setEntries(d.data ?? [])).catch(() => setEntries([]));
    api('/api/v1/admin/cards', token).then((d) => setCards(d.data ?? [])).catch(() => setCards([]));
  }
  useEffect(load, [token]);

  const selectedEntries = entries.filter((e) => selected && e.competition_id === selected.competitionId && e.institution_id === selected.institutionId);
  const selectedCards = cards.filter((c) => selected && c.competition_id === selected.competitionId && c.institution_id === selected.institutionId);
  const printable = (fresh.length ? fresh.map((item) => ({
    ...item,
    holder_kind: item.holderKind,
    given_name: item.givenName,
    family_name: item.familyName,
    card_number: item.cardNumber,
    reference: item.reference,
    portrait_url: item.portraitUrl ?? item.portrait_url,
    competition_name: rows.find((r) => r.competition_id === selected?.competitionId)?.competition_name,
    institution_name: rows.find((r) => r.institution_id === selected?.institutionId)?.institution_name,
    season_name: rows.find((r) => r.competition_id === selected?.competitionId)?.season_name,
    age_category: rows.find((r) => r.competition_id === selected?.competitionId)?.age_category,
    discipline: rows.find((r) => r.competition_id === selected?.competitionId)?.discipline,
    wilaya_name: rows.find((r) => r.institution_id === selected?.institutionId)?.wilaya_name
  })) : (selected ? selectedCards : cards));

  async function accept() {
    if (!selected) return;
    try {
      await api('/api/v1/admin/participations/accept', token, { method: 'POST', body: JSON.stringify({ ...selected, ...names }) });
      setMessage('قُبلت المؤسسة في المنافسة.');
      load();
    } catch { setMessage('تعذر قبول المؤسسة. تأكد من صلاحية الرابطة.'); }
  }

  async function confirm(id: string, decision: 'CONFIRMED' | 'REJECTED') {
    try {
      await api(`/api/v1/admin/entries/${id}/confirm`, token, { method: 'POST', body: JSON.stringify({ decision }) });
      load();
    } catch { setMessage('تعذر تأكيد الملف.'); }
  }

  async function issue() {
    if (!selected) return;
    try {
      const result = await api('/api/v1/admin/cards/issue', token, { method: 'POST', body: JSON.stringify(selected) });
      setFresh(result.data ?? []);
      setMessage(`صدرت ${result.data?.length ?? 0} بطاقة بنفس التصميم. اطبعها الآن (CR80).`);
      load();
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'institution_not_accepted'
        ? 'اقبل المؤسسة أولاً ثم أكّد ملفات التلاميذ.'
        : error instanceof Error && error.message === 'no_confirmed_students'
          ? 'لا يوجد تلاميذ مؤكَّدون لهذه المؤسسة.'
          : 'تعذر إصدار البطاقات.');
    }
  }

  async function issueAll() {
    try {
      const result = await api('/api/v1/admin/cards/issue-all', token, { method: 'POST', body: '{}' });
      setSelected(null);
      setFresh([]);
      setMessage(`صدرت ${result.created ?? 0} بطاقة لكل المنخرطين المؤكَّدين — نفس القالب، تختلف الصورة والبيانات فقط.`);
      load();
    } catch { setMessage('تعذر الإصدار الجماعي.'); }
  }

  return (
    <div className="card-desk">
      <div className="section-head">
        <h3><CreditCard size={18} /> بطاقات الانخراط للطباعة</h3>
        <small>ISO-ID-1 / CR80 — 85.6 × 54 مم · ثماني بطاقات على A4</small>
      </div>
      <p className="lede">القالب واحد لكل المنخرطين (CR80). تختلف فقط الاسم والصورة والولاية والمنافسة والرقم. بعد قبول الرابطة وتأكيد الملفات تُولَّد بطاقة لكل تلميذ ومدرب وممثل مؤسسة.</p>
      {canIssue && <div className="print-toolbar"><button type="button" className="primary" onClick={() => void issueAll()}>توليد بطاقات كل المنخرطين المؤكَّدين</button></div>}
      {message && <div className="empty">{message}</div>}
      <div className="data-table">
        {rows.map((row) => (
          <button
            key={`${row.institution_id}-${row.competition_id}`}
            className={`data-row ${selected?.institutionId === row.institution_id && selected?.competitionId === row.competition_id ? 'on-row' : ''}`}
            onClick={() => {
              setSelected({ institutionId: row.institution_id, competitionId: row.competition_id });
              setNames({ coachName: row.coach_name || 'مدرب المؤسسة', representativeName: row.representative_name || 'ممثل المؤسسة' });
              setFresh([]);
            }}
          >
            <span>{row.institution_name}</span>
            <span>{row.competition_name}</span>
            <small>{row.participation_status === 'ACCEPTED' ? 'مقبولة' : 'بانتظار القبول'} · {row.confirmed_entries}/{row.entries} ملف مؤكد</small>
          </button>
        ))}
        {!rows.length && <div className="empty">لا توجد مؤسسات مسجّلة في منافسة بعد.</div>}
      </div>

      {selected && (
        <>
          {canIssue && (
            <form className="inline-form" onSubmit={(e) => { e.preventDefault(); void accept(); }}>
              <input value={names.coachName} onChange={(e) => setNames({ ...names, coachName: e.target.value })} placeholder="اسم ولقب المدرب" required />
              <input value={names.representativeName} onChange={(e) => setNames({ ...names, representativeName: e.target.value })} placeholder="اسم ولقب ممثل المؤسسة" required />
              <button className="secondary">قبول المؤسسة في المنافسة</button>
              <button type="button" className="primary" onClick={() => void issue()}>توليد البطاقات</button>
            </form>
          )}
          <div className="data-table">
            {selectedEntries.map((row) => (
              <div className="data-row" key={row.id}>
                <span>{row.given_name} {row.family_name}</span>
                <small>{row.confirmation_status === 'CONFIRMED' ? 'ملف مؤكد' : row.confirmation_status === 'REJECTED' ? 'مرفوض' : 'بانتظار التأكيد'}</small>
                {canIssue && row.confirmation_status !== 'CONFIRMED' && <button className="primary" onClick={() => confirm(row.id, 'CONFIRMED')}>تأكيد الملف</button>}
                {canIssue && row.confirmation_status === 'PENDING' && <button className="secondary" onClick={() => confirm(row.id, 'REJECTED')}>رفض</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {printable.length > 0 && (
        <div className="print-toolbar">
          <button className="primary" onClick={() => window.print()}><Printer size={16} /> طباعة الورقة الرسمية</button>
          <small>قصّ على علامات الزوايا. الوجه الأمامي فقط — لا تطبع خلفيات المتصفح.</small>
        </div>
      )}

      <section className="print-sheet">
        {printable.map((card) => (
          <article className="id-card" key={card.id ?? card.card_number}>
            <div className="official-bar" />
            <div className="id-card-body">
              <header>
                <span className="brand-mark">★</span>
                <div>
                  <b>NSSMS</b>
                  <small>بطاقة انخراط مدرسي</small>
                </div>
                <em>{kindLabel[card.holder_kind] ?? card.holder_kind}</em>
              </header>
              <div className="id-main">
                <div className="id-photo">
                  {card.portrait_url
                    ? <img src={card.portrait_url} alt="" />
                    : <span>{(card.given_name ?? 'ت')[0]}{(card.family_name ?? 'م')[0]}</span>}
                </div>
                <div>
                  <strong>{card.given_name} {card.family_name}</strong>
                  <p>{card.institution_name}</p>
                  <p>{card.competition_name}</p>
                </div>
                <Seal seed={card.card_number ?? card.reference ?? 'NSSMS'} />
              </div>
              <dl>
                <div><dt>الولاية</dt><dd>{card.wilaya_name ?? '—'}</dd></div>
                <div><dt>الموسم</dt><dd>{card.season_name ?? '—'}</dd></div>
                <div><dt>الرياضة</dt><dd>{card.discipline ?? '—'}</dd></div>
                <div><dt>الفئة</dt><dd>{card.age_category ?? '—'}</dd></div>
              </dl>
              <footer>
                <span>{card.card_number}</span>
                {card.reference && <small>{card.reference}</small>}
              </footer>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
