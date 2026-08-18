import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, QrCode, Trophy, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

const slides = [
  { image: '/media/season-open.jpg', title: 'افتتاح الموسم المدرسي', text: 'رزنامة وطنية معتمدة للحوكمة والشفافية.' },
  { image: '/media/football.jpg', title: 'كرة القدم المدرسية', text: 'تجمعات ولائية تُتوَّج بفرق متأهلة للنهائي.' },
  { image: '/media/athletics.jpg', title: 'ألعاب القوى', text: 'أرقام قياسية مدرسية تُعرض للجمهور فور اعتمادها.' },
  { image: '/media/basketball.jpg', title: 'كرة السلة', text: 'نهائيات الإناث والذكور في هرم منافسات واضح.' },
  { image: '/media/swimming.jpg', title: 'السباحة والجودو', text: 'رياضات فردية وجماعية في منصة واحدة.' }
];

export function HomeArena({ onVerify, onMore, onResults, onCompetitions }: { onVerify: () => void; onMore: () => void; onResults: () => void; onCompetitions: () => void }) {
  const [slide, setSlide] = useState(0);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [honors, setHonors] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((i) => (i + 1) % slides.length), 5200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/v1/public/competitions`).then((r) => r.json()).then((d) => setUpcoming((d.data ?? []).filter((c: any) => ['REGISTRATION', 'ACTIVE'].includes(c.status)).slice(0, 6))).catch(() => setUpcoming([]));
    fetch(`${API}/api/v1/public/scoreboard`).then((r) => r.json()).then((d) => setScores((d.data ?? []).slice(0, 6))).catch(() => setScores([]));
    fetch(`${API}/api/v1/public/honors`).then((r) => r.json()).then((d) => setHonors((d.data ?? []).filter((h: any) => h.honor_type === 'GOLD').slice(0, 4))).catch(() => setHonors([]));
    fetch(`${API}/api/v1/public/teams`).then((r) => r.json()).then((d) => setTeams((d.data ?? []).slice(0, 6))).catch(() => setTeams([]));
  }, []);

  const current = slides[slide];

  return (
    <div className="arena-home">
      <section className="cinema">
        {slides.map((item, i) => (
          <div key={item.title} className={`cinema-slide ${i === slide ? 'show' : ''}`} style={{ backgroundImage: `url(${item.image})` }} />
        ))}
        <div className="cinema-shade" />
        <div className="cinema-copy">
          <div className="eyebrow">مؤشر الرياضة المدرسية</div>
          <h1>{current.title}</h1>
          <p>{current.text}</p>
          <div className="hero-actions">
            <button className="primary" onClick={onCompetitions}><Trophy size={16} /> الرزنامة</button>
            <button className="secondary" onClick={onVerify}><QrCode size={16} /> تحقق من ترخيص</button>
          </div>
        </div>
        <div className="cinema-nav">
          <button onClick={() => setSlide((slide + slides.length - 1) % slides.length)}><ChevronRight /></button>
          <button onClick={() => setSlide((slide + 1) % slides.length)}><ChevronLeft /></button>
        </div>
        <div className="cinema-dots">
          {slides.map((item, i) => <button key={item.title} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} />)}
        </div>
      </section>

      <section className="ticker">
        <b>نتائج مباشرة</b>
        <div className="ticker-track">
          {(scores.length ? scores : [{ competition_name: 'بانتظار النتائج المعتمدة', result_data: {} }]).concat(scores).map((row, i) => (
            <span key={`${row.id ?? 'x'}-${i}`}>{row.competition_name} — {row.public_alias ?? 'فريق متأهل'} {row.result_data?.score ?? ''}</span>
          ))}
        </div>
      </section>

      <section className="home-grid">
        <div>
          <div className="section-head">
            <h2>نتائج الفرق المتأهلة</h2>
            <button className="text-link" onClick={onResults}>كل النتائج</button>
          </div>
          <div className="qualify">
            {scores.slice(0, 4).map((row) => (
              <article key={row.id} className="qualify-card">
                {row.portrait_url && <img src={row.portrait_url} alt="" />}
                <div>
                  <small>{row.competition_name}</small>
                  <b>{row.public_alias ?? 'متأهل'}</b>
                  <strong>{row.result_data?.score ?? row.result_data?.medal ?? 'تأهل'}</strong>
                </div>
              </article>
            ))}
            {!scores.length && <div className="empty-state">لا توجد نتائج متأهلين بعد.</div>}
          </div>
        </div>
        <div>
          <div className="section-head"><h2>هرم المنافسات</h2></div>
          <div className="pyramid">
            <div className="pyr national">النهائي الوطني</div>
            <div className="pyr-row">
              <span>نصف نهائي شرق</span>
              <span>نصف نهائي غرب</span>
            </div>
            <div className="pyr-row small">
              <span>تجمع ولائي</span>
              <span>تجمع ولائي</span>
              <span>تجمع ولائي</span>
              <span>تجمع ولائي</span>
            </div>
            <small>دائرة → ولاية → جهة → وطني</small>
          </div>
          {honors[0] && <div className="champion-chip"><Trophy size={16} /> بطل معتمد: {honors[0].public_alias}</div>}
        </div>
      </section>

      <section className="preview">
        <div className="section-head">
          <h2><CalendarDays size={18} /> منافسات قادمة</h2>
          <button className="text-link" onClick={onCompetitions}>الرزنامة كاملة</button>
        </div>
        <div className="upcoming">
          {upcoming.map((row) => (
            <article key={row.id} className="up-card">
              {row.image_url && <img src={row.image_url} alt="" />}
              <div>
                <span className="badge">{row.status === 'REGISTRATION' ? 'تسجيل مفتوح' : 'جارية'}</span>
                <h3>{row.name}</h3>
                <p>{row.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="preview">
        <div className="section-head"><h2><Users size={18} /> فرق في دائرة الضوء</h2></div>
        <div className="spotlight">
          {teams.map((team) => (
            <article key={team.id} className="spot-card">
              <img src={team.image_url} alt="" />
              <b>{team.name}</b>
              <small>{team.alias}</small>
            </article>
          ))}
        </div>
        <div className="hero-actions"><button className="secondary" onClick={onMore}>الإعلانات الرسمية</button></div>
      </section>
    </div>
  );
}
