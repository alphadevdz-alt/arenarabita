import React, { useEffect, useState } from 'react';
import { Medal, Sparkles, Trophy, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

export function TeamsBoard({ onPlayer }: { onPlayer: (id: string) => void }) {
  const [teams, setTeams] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/api/v1/public/teams`).then((r) => r.json()).then((d) => setTeams(d.data ?? [])).catch(() => setTeams([]));
  }, []);
  async function openTeam(id: string) {
    const d = await fetch(`${API}/api/v1/public/teams/${id}`).then((r) => r.json());
    setOpen(d.data);
  }
  return (
    <section className="listing arena">
      <div className="eyebrow"><Users /> دفتر الفرق · Club book</div>
      <h1>أندية مدرسية بأسماء مستعارة</h1>
      <p className="lede">بطاقات نادي محترفة دون كشف هوية التلاميذ. الاسم المستعار حماية، والانتماء للولاية فخر.</p>
      {!teams && <div className="empty">جارٍ التحميل…</div>}
      <div className="team-grid">
        {teams?.map((team) => (
          <button className="team-card" key={team.id} style={{ borderColor: team.crest_color }} onClick={() => openTeam(team.id)}>
            <img src={team.image_url} alt="" />
            <div>
              <b>{team.name}</b>
              <small>{team.alias} · {team.roster} لاعبين</small>
              <p>{team.motto}</p>
            </div>
          </button>
        ))}
      </div>
      {open && (
        <div className="roster">
          <h2>تشكيلة {open.name}</h2>
          <p>{open.motto}</p>
          <div className="player-grid">
            {open.members?.map((player: any) => (
              <button className="player-card" key={player.id} onClick={() => onPlayer(player.id)}>
                <img src={player.portrait_url} alt={player.public_alias} />
                <span className="num">{player.jersey_number}</span>
                <strong>{player.public_alias}</strong>
                <small>{player.position_label}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function PlayerCard({ id, onBack }: { id: string; onBack: () => void }) {
  const [player, setPlayer] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/api/v1/public/players/${id}`).then((r) => r.json()).then((d) => setPlayer(d.data)).catch(() => setPlayer(null));
  }, [id]);
  if (!player) return <div className="empty">جارٍ فتح البطاقة…</div>;
  return (
    <section className="listing arena">
      <button className="back" onClick={onBack}>← عودة للفرق</button>
      <article className="hero-card">
        <img src={player.portrait_url} alt="" />
        <div>
          <div className="eyebrow"><Sparkles size={16} /> بطاقة منافس</div>
          <h1>{player.public_alias}</h1>
          <p>الرقم {player.jersey_number} · {player.position_label} · {player.team_name ?? 'فردي'}</p>
          <div className="medal-row">
            {player.honors?.map((honor: any, i: number) => (
              <span className={`medal ${honor.honor_type?.toLowerCase()}`} key={i}>{honor.title}</span>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}

export function HonorsBoard() {
  const [honors, setHonors] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/api/v1/public/honors`).then((r) => r.json()).then((d) => setHonors(d.data ?? [])).catch(() => setHonors([]));
    fetch(`${API}/api/v1/public/records`).then((r) => r.json()).then((d) => setRecords(d.data ?? [])).catch(() => setRecords([]));
  }, []);
  return (
    <section className="listing arena">
      <div className="eyebrow"><Medal /> منصة التتويج · Honours</div>
      <h1>ذهب الولاية… ومجد المدرسة</h1>
      <div className="split">
        <div>
          <h3>تكريمات الموسم</h3>
          <div className="honor-list">
            {honors.map((row) => (
              <article key={row.id} className="honor-item">
                {row.portrait_url && <img src={row.portrait_url} alt="" />}
                <div>
                  <b>{row.public_alias}</b>
                  <p>{row.title}</p>
                  <small>{row.detail}</small>
                </div>
                <span className={`medal ${row.honor_type?.toLowerCase()}`}>{row.honor_type}</span>
              </article>
            ))}
          </div>
        </div>
        <div>
          <h3>الأرقام القياسية</h3>
          <div className="record-list">
            {records.map((row) => (
              <article key={row.id} className="record-item">
                <Trophy size={18} />
                <div>
                  <b>{row.record_value}</b>
                  <p>{row.record_label} · {row.discipline}</p>
                  <small>{row.holder_alias}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Scoreboard() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/api/v1/public/scoreboard`).then((r) => r.json()).then((d) => setRows(d.data ?? [])).catch(() => setRows([]));
  }, []);
  return (
    <section className="listing arena">
      <div className="eyebrow"><Trophy /> لوحة النتائج · Scoreboard</div>
      <h1>ما اعتُمد يُنشر — لا شيء قبل التدقيق</h1>
      <div className="score-grid">
        {rows.map((row) => (
          <article className="score-card" key={row.id}>
            {row.image_url && <img src={row.image_url} alt="" />}
            <div className="score-body">
              {row.portrait_url && <img className="mini" src={row.portrait_url} alt="" />}
              <div>
                <b>{row.competition_name}</b>
                <p>{row.public_alias ?? 'نتيجة معتمدة'}</p>
                <strong>{row.result_data?.score ?? row.result_data?.note ?? 'نُشرت'}</strong>
              </div>
              {row.result_data?.medal && <span className="medal gold">{row.result_data.medal}</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
