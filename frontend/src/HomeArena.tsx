import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Landmark, QrCode, Sparkles, Trophy, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

const slides = [
  { image: '/media/heritage-november.jpg', kicker: 'من نوفمبر إلى الملعب', title: 'الأرض التي أنجبت الشهداء تُنجب الأبطال', text: 'الرياضة المدرسية امتداد لكرامة نوفمبر: انضباط، تضحية، وانتماء للوطن قبل النتيجة.' },
  { image: '/media/heritage-school-sport.jpg', kicker: 'المدرسة الجزائرية', title: 'من ساحة المؤسسة إلى راية الولاية', text: 'كل دائرة وكل بلدية جزء من هرم وطني واحد: تسجيل نزيه، ترخيص موثّق، وتتويج معتمد.' },
  { image: '/media/football.jpg', kicker: 'كرة القدم المدرسية', title: 'تجمّعات ولائية تُتوَّج بالنهائي', text: 'مسار واضح من المؤسسة إلى الجهة ثم الوطن، بلا غموض في الأهلية أو النتائج.' },
  { image: '/media/athletics.jpg', kicker: 'ألعاب القوى', title: 'رقم قياسي لا يُعتمد إلا بعد التدقيق', text: 'السجل العام يعرض ما صادقت عليه الإدارة فقط — الشفافية حماية للموهبة.' },
  { image: '/media/heritage-stadium-dawn.jpg', kicker: 'المستقبل الرياضي', title: 'جيل يرى الأفق أبعد من الخط النهائي', text: 'حوكمة اليوم تصنع منتخبات الغد: فتيات وفتيان، فردي وجماعي، في منصة وطنية واحدة.' }
];

const values = [
  { ar: 'نوفمبر مرجع', en: 'November as compass', body: 'روح أول نوفمبر: تضحية جماعية، صدق في العمل، وعلو راية الوطن على أي حساب ضيق.' },
  { ar: 'المدرسة حاضنة', en: 'The school as cradle', body: 'المؤسسة التربوية هي الخلية الأولى: مدرب واحد، تلميذ مرخّص، واسم معتمد في الولاية.' },
  { ar: 'أفق رياضي', en: 'A sporting horizon', body: 'من الدائرة إلى النهائي الوطني، المسار نفسه لكل الولايات — شرقًا وغربًا، جنوبًا وشمالًا.' }
];

export function HomeArena({ onMore, onResults, onCompetitions }: { onMore: () => void; onResults: () => void; onCompetitions: () => void }) {
  const [slide, setSlide] = useState(0);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [honors, setHonors] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((i) => (i + 1) % slides.length), 5600);
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
          <div className="eyebrow">{current.kicker}</div>
          <h1>{current.title}</h1>
          <p>{current.text}</p>
          <p className="hero-en">A national school-sports ledger — transparent, scoped, and worthy of the Republic.</p>
          <div className="hero-actions">
            <button className="primary" onClick={onCompetitions}><Trophy size={16} /> الرزنامة / Calendar</button>
            <a className="secondary" href="/admin.html"><QrCode size={16} /> تحقق للعاملين</a>
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
        <b>نتائج مباشرة · Live</b>
        <div className="ticker-track">
          {(scores.length ? scores : [{ competition_name: 'بانتظار النتائج المعتمدة', result_data: {} }]).concat(scores).map((row, i) => (
            <span key={`${row.id ?? 'x'}-${i}`}>{row.competition_name} — {row.public_alias ?? 'فريق متأهل'} {row.result_data?.score ?? ''}</span>
          ))}
        </div>
      </section>

      <section className="values-strip">
        {values.map((v) => (
          <article key={v.ar} className="value-card">
            <span className="crescent" aria-hidden>✦</span>
            <h3>{v.ar}</h3>
            <small>{v.en}</small>
            <p>{v.body}</p>
          </article>
        ))}
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
          <div className="section-head"><h2>هرم المنافسات · The pyramid</h2></div>
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

      <section className="heritage-banner">
        <Landmark size={22} />
        <div>
          <b>الشعب والجيش… ثم الملعب المدرسي</b>
          <p>المنصة لا تستبدل المؤسسات الرسمية؛ تخدمها: أثر غير قابل للحذف، نطاق إداري واضح، وتحقق عمومي برمز لا يكشف السجلات الداخلية.</p>
        </div>
        <button className="secondary" onClick={onMore}>الإعلانات الرسمية</button>
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
        <div className="section-head"><h2><Users size={18} /> فرق في دائرة الضوء · Spotlight</h2></div>
        <div className="spotlight">
          {teams.map((team) => (
            <article key={team.id} className="spot-card">
              <img src={team.image_url} alt="" />
              <b>{team.name}</b>
              <small>{team.alias}</small>
            </article>
          ))}
        </div>
        <div className="hero-actions">
          <button className="ghost" onClick={onCompetitions}><Sparkles size={16} /> أفق الموسم</button>
        </div>
      </section>
    </div>
  );
}
