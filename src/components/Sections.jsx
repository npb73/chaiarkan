import { useState } from 'react';
import { NOTES } from '../data/notes.js';
import { TEAS, TEA_TYPES } from '../data/teas.js';
import MiniRadar from './MiniRadar.jsx';

/* ------------------------------ Шапка ------------------------------ */
export function Header() {
  return (
    <header className="header">
      <a href="#top" className="brand" aria-label="ЧайАркан — на главную">
        <span className="brand-mark" aria-hidden="true">
          ✦
        </span>
        <span className="brand-word">
          Чай<span>Аркан</span>
        </span>
      </a>
      <nav className="nav" aria-label="Разделы">
        <a href="#tea">Ваш сорт</a>
        <a href="#notes">Атлас нот</a>
        <a href="#catalog">Звёздный каталог</a>
        <a href="#ritual">Ритуал</a>
      </nav>
    </header>
  );
}

/* ------------------------- Свиток найденного сорта ------------------------- */
export function TeaScroll({ chosen, onOrder }) {
  if (!chosen) {
    return (
      <section id="tea" className="section">
        <div className="section-head">
          <div className="kicker">Свиток сорта · 卷轴</div>
          <h2 className="h2">Свиток ещё не развёрнут</h2>
          <p className="lead">
            Он откроется после предсказания: здесь появятся описание вытянутого сорта, его главные ноты и подсказки по
            завариванию.
          </p>
        </div>
        <a href="#top" className="btn btn-gold">
          ✦ К звёздной карте
        </a>
      </section>
    );
  }
  const { tea, values } = chosen;
  const type = TEA_TYPES[tea.type];
  const shared = NOTES.map((n, i) => ({ n, v: Math.min(values[i], tea.profile[i]) }))
    .filter((x) => x.v >= 3)
    .sort((a, b) => b.v - a.v)
    .slice(0, 4);
  const teaTop = NOTES.map((n, i) => ({ n, v: tea.profile[i] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 4);

  return (
    <section id="tea" className="section">
      <div className="section-head">
        <div className="kicker">Свиток сорта · 卷轴</div>
        <h2 className="h2">
          {tea.name} <span className="h2-hanzi">{tea.hanzi}</span>
        </h2>
        <p className="lead">
          {tea.alt} · {type.name} чай · {tea.region}
        </p>
      </div>

      <div className="scroll card">
        <div className="scroll-radar">
          <MiniRadar
            labels
            layers={[
              { values, color: '#ffe9b0', fill: '#e9b964', fillOpacity: 0.22 },
              { values: tea.profile, color: type.color, dashed: true, width: 1.8 },
            ]}
          />
          <div className="legend">
            <span>
              <i className="sw sw-user" /> ваше созвездие
            </span>
            <span>
              <i className="sw sw-tea" style={{ borderColor: type.color }} /> профиль чая
            </span>
          </div>
        </div>

        <div className="scroll-body">
          <div className="oracle-label">Карта, вытянутая оракулом</div>
          <p className="scroll-desc">{tea.desc}</p>

          <div className="chips-row">
            <div className="oracle-label">Главные ноты сорта</div>
            <div className="chips">
              {teaTop.map(({ n }) => (
                <span key={n.id} className="chip" style={{ '--c': n.color }}>
                  <b>{n.glyph}</b> {n.name}
                </span>
              ))}
            </div>
          </div>

          {shared.length > 0 && (
            <div className="chips-row">
              <div className="oracle-label">Что вас связывает</div>
              <div className="chips">
                {shared.map(({ n }) => (
                  <span key={n.id} className="chip chip-soft" style={{ '--c': n.color }}>
                    ✦ {n.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <dl className="brew">
            <div>
              <dt>Вода</dt>
              <dd>{tea.brew.temp}</dd>
            </div>
            <div>
              <dt>Лист</dt>
              <dd>{tea.brew.dose}</dd>
            </div>
            <div>
              <dt>Время</dt>
              <dd>{tea.brew.time}</dd>
            </div>
            <div>
              <dt>Посуда</dt>
              <dd>{tea.brew.ware}</dd>
            </div>
          </dl>
          <div className="scroll-actions">
            <button className="btn btn-gold btn-big" onClick={() => onOrder(tea)}>
              Заказать {tea.name}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Атлас нот ------------------------------ */
export function NotesAtlas({ values, onIgnite }) {
  return (
    <section id="notes" className="section">
      <div className="section-head">
        <div className="kicker">Атлас нот · 十二味</div>
        <h2 className="h2">Двенадцать звёзд чайного неба</h2>
        <p className="lead">
          Каждый луч паутинки — одна из основных нот, которыми китайские мастера описывают вкус и аромат чая.
          Зажгите звезду — и она вспыхнет на вашей карте.
        </p>
      </div>
      <div className="atlas">
        {NOTES.map((n, i) => {
          const teas = TEAS.filter((t) => t.profile[i] >= 7).slice(0, 3);
          return (
            <article key={n.id} className="note card" style={{ '--c': n.color }}>
              <div className="note-top">
                <span className="note-glyph">{n.glyph}</span>
                <span className="note-pinyin">{n.pinyin}</span>
              </div>
              <h3 className="note-name">{n.name}</h3>
              <div className="note-star">звезда {n.star}</div>
              <p className="note-desc">{n.desc}</p>
              {teas.length > 0 && (
                <div className="note-teas">
                  {teas.map((t) => (
                    <span key={t.id}>{t.name}</span>
                  ))}
                </div>
              )}
              <div className="note-foot">
                <div className="meter" aria-label={`Сейчас: ${values[i].toFixed(1)} из 10`}>
                  <span style={{ width: `${values[i] * 10}%` }} />
                </div>
                <button className="note-btn" onClick={() => onIgnite(i)}>
                  Зажечь
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------- Звёздный каталог --------------------------- */
export function Catalog({ onTry }) {
  const [filter, setFilter] = useState('all');
  const list = TEAS.filter((t) => filter === 'all' || t.type === filter);
  const usedTypes = Object.keys(TEA_TYPES).filter((k) => TEAS.some((t) => t.type === k));

  return (
    <section id="catalog" className="section">
      <div className="section-head">
        <div className="kicker">Звёздный каталог · 星图</div>
        <h2 className="h2">{TEAS.length} сортов — {TEAS.length} созвездий</h2>
        <p className="lead">
          У каждого чая своя форма звёздного неба. Нажмите «Примерить», чтобы перенести его созвездие на свою карту
          и доработать под себя.
        </p>
      </div>

      <div className="filters" role="tablist" aria-label="Тип чая">
        <button className={`filter ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          Все
        </button>
        {usedTypes.map((k) => (
          <button
            key={k}
            className={`filter ${filter === k ? 'on' : ''}`}
            style={{ '--c': TEA_TYPES[k].color }}
            onClick={() => setFilter(k)}
          >
            {TEA_TYPES[k].name}
          </button>
        ))}
      </div>

      <div className="catalog">
        {list.map((t) => {
          const type = TEA_TYPES[t.type];
          return (
            <article key={t.id} className="tea card" style={{ '--c': type.color }}>
              <MiniRadar layers={[{ values: t.profile, color: type.color, fill: type.color, fillOpacity: 0.18 }]} />
              <div className="tea-info">
                <div className="tea-hanzi">{t.hanzi}</div>
                <h3 className="tea-name">{t.name}</h3>
                <div className="tea-sub">
                  {type.name} · {t.region.split(',')[0]}
                </div>
                <div className="tea-foot">
                  <span className="tea-score" aria-hidden="true">
                    ✦
                  </span>
                  <button className="note-btn" onClick={() => onTry(t)}>
                    Примерить
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ Ритуал ------------------------------ */
const STEPS = [
  {
    glyph: '醒',
    title: 'Пробуждение',
    text: 'Прогрейте посуду кипятком и всыпьте лист. Вдохните аромат сухого чая в тёплой гайвани — это первая звезда.',
  },
  {
    glyph: '洗',
    title: 'Омовение',
    text: 'Для улунов и пуэров залейте лист на несколько секунд и слейте. Так лист раскрывается и смывает дорожную пыль.',
  },
  {
    glyph: '泡',
    title: 'Проливы',
    text: 'Заваривайте короткими проливами, каждый чуть дольше прежнего. В каждом новом настое загораются другие ноты.',
  },
  {
    glyph: '韵',
    title: 'Послевкусие',
    text: 'Задержите глоток и прислушайтесь: сладость, прохлада, тепло в груди. Китайцы называют это «юнь» — отзвук чая.',
  },
];

export function Ritual() {
  return (
    <section id="ritual" className="section">
      <div className="section-head">
        <div className="kicker">Ритуал · 功夫茶</div>
        <h2 className="h2">Как зажечь созвездие в чашке</h2>
        <p className="lead">Четыре шага гунфу-ча — неторопливого заваривания, которое раскрывает чай целиком.</p>
      </div>
      <ol className="ritual">
        {STEPS.map((s, i) => (
          <li key={s.title} className="step card">
            <div className="step-n">0{i + 1}</div>
            <div className="step-glyph">{s.glyph}</div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------ Подвал ------------------------------ */
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <span className="brand-mark">✦</span> ЧайАркан
      </div>
      <p className="muted">Карта вкуса китайского чая. Двенадцать нот, бесконечное число созвездий.</p>
      <p className="muted small">© {new Date().getFullYear()} chaiarkan.ru</p>
    </footer>
  );
}
