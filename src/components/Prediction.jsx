import { useEffect, useRef, useState } from 'react';
import { TEA_TYPES } from '../data/teas.js';
import MiniRadar from './MiniRadar.jsx';

export const HOLO_THRESHOLD = 0.9;
const ROMAN = ['I', 'II', 'III'];

/** Сколько карт вытянуть: лучшая всегда, ещё до двух — если они почти так же близки. */
export function drawCards(ranking, max) {
  const [best, ...rest] = ranking;
  const picked = [best];
  for (const r of rest) {
    if (picked.length >= max) break;
    if (r.score >= best.score - 0.06 && r.score >= 0.7) picked.push(r);
  }
  return picked;
}

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Оверлей предсказания: колода появляется, тасуется, раздаёт карты рубашкой вверх,
 * затем карты переворачиваются.
 */
export default function Prediction({ cards, values, constellationName, onClose, onOpenScroll, onOrder }) {
  const reduce = prefersReduced();
  const [phase, setPhase] = useState(reduce ? 'reveal' : 'deck'); // deck → shuffle → deal → reveal
  const closeRef = useRef(null);

  useEffect(() => {
    if (reduce) return undefined;
    const t = [
      setTimeout(() => setPhase('shuffle'), 350),
      setTimeout(() => setPhase('deal'), 1650),
      setTimeout(() => setPhase('reveal'), 2450),
    ];
    return () => t.forEach(clearTimeout);
  }, [reduce]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.order-modal')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Лучшая карта всегда в центральной колонке; вторая — слева, третья — справа
  const COLS = cards.length > 1 ? 3 : 1;
  const center = COLS === 3 ? 1 : 0;
  const colOf = (rank) => (COLS === 1 ? 0 : [1, 0, 2][rank]);

  return (
    <div className={`prophecy phase-${phase}`} role="dialog" aria-modal="true" aria-label={`Предсказание оракула: ${constellationName}`}>
      <div className="prophecy-backdrop" onClick={phase === 'reveal' ? onClose : undefined} />
      <div className="prophecy-body">
        <div className={`prophecy-table cols-${COLS}`} style={{ '--cols': COLS }}>
          <div className="deck" aria-hidden="true">
            {Array.from({ length: 7 }, (_, k) => (
              <div key={k} className="deck-card" style={{ '--k': k }}>
                <CardBack />
              </div>
            ))}
          </div>

          <div className="spread">
            {cards.map(({ tea, score }, rank) => {
              const col = colOf(rank);
              return (
                <TeaCard
                  key={tea.id}
                  tea={tea}
                  rank={rank}
                  values={values}
                  holo={score >= HOLO_THRESHOLD}
                  col={col}
                  offset={center - col}
                  delay={rank}
                  revealed={phase === 'reveal'}
                  dealt={phase === 'deal' || phase === 'reveal'}
                  onOpen={() => onOpenScroll(tea)}
                  onOrder={() => onOrder(tea)}
                />
              );
            })}
          </div>
        </div>

        <div className="prophecy-foot">
          <button ref={closeRef} className="btn btn-ghost" onClick={onClose}>
            ← Вернуться к звёздной карте
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Карта сорта ------------------------------ */
function TeaCard({ tea, rank, values, holo, col, offset, delay, revealed, dealt, onOpen, onOrder }) {
  const tiltRef = useRef(null);
  const type = TEA_TYPES[tea.type];
  // После переворота убираем 3D-переворот из раскладки: так клики и наклон работают предсказуемо
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!revealed) return undefined;
    const t = setTimeout(() => setSettled(true), prefersReduced() ? 0 : 950 + delay * 280);
    return () => clearTimeout(t);
  }, [revealed, delay]);

  const onMove = (e) => {
    const el = tiltRef.current;
    if (!el || !settled) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty('--rx', `${(0.5 - py) * 16}deg`);
    el.style.setProperty('--ry', `${(px - 0.5) * 20}deg`);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    el.style.setProperty('--pos', `${px * 100}% ${py * 100}%`);
    el.classList.add('is-active');
  };
  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.classList.remove('is-active');
    ['--rx', '--ry', '--mx', '--my', '--pos'].forEach((p) => el.style.removeProperty(p));
  };

  return (
    <div
      className={`tcard ${holo ? 'is-holo' : ''} ${dealt ? 'is-dealt' : ''} ${revealed ? 'is-revealed' : ''} ${
        settled ? 'is-settled' : ''
      } ${rank === 0 ? 'is-first' : ''}`}
      style={{ '--offset': offset, '--d': delay, '--c': type.color, gridColumn: col + 1, gridRow: 1 }}
    >
      <div
        ref={tiltRef}
        className="tcard-tilt"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerCancel={onLeave}
        onPointerUp={(e) => e.pointerType !== 'mouse' && onLeave()}
      >
        <div className="tcard-flip">
          <article className="tcard-face tcard-front" aria-hidden={!revealed}>
            <div className="tcard-frame">
              <div className="tcard-top">
                <span className="tcard-rank">{ROMAN[rank]}</span>
                <span className="tcard-kicker">{holo ? '✦ Ваша звезда ✦' : 'Созвездие'}</span>
                <span className="tcard-rank">{ROMAN[rank]}</span>
              </div>

              <div className="tcard-sky">
                <MiniRadar
                  labels
                  layers={[
                    { values: tea.profile, color: type.color, fill: type.color, fillOpacity: 0.22, width: 1.6 },
                    { values, color: '#ffe6ad', dashed: true, width: 1.3 },
                  ]}
                />
              </div>
              <div className="tcard-legend">
                <span>
                  <i className="lg lg-tea" /> сорт
                </span>
                <span>
                  <i className="lg lg-you" /> ваше небо
                </span>
              </div>

              <div className="tcard-hanzi">{tea.hanzi}</div>
              <h3 className="tcard-name">{tea.name}</h3>
              <div className="tcard-alt">{tea.alt}</div>
              <div className="tcard-meta">
                <span className="pill" style={{ '--c': type.color }}>
                  {type.name}
                </span>
                <span>{tea.region.split(',')[0]}</span>
              </div>
              <p className="tcard-desc">{tea.desc}</p>
              <div className="tcard-brew">
                {tea.brew.temp} · {tea.brew.dose}
              </div>
              <div className="tcard-actions">
                <button className="tcard-btn tcard-btn-gold" onClick={onOrder} tabIndex={revealed ? 0 : -1}>
                  Заказать
                </button>
                <button className="tcard-btn" onClick={onOpen} tabIndex={revealed ? 0 : -1}>
                  Свиток сорта
                </button>
              </div>
            </div>
            {holo && <div className="tcard-holo" aria-hidden="true" />}
            <div className="tcard-glare" aria-hidden="true" />
          </article>
          <div className="tcard-face tcard-back" aria-hidden="true">
            <CardBack />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Рубашка ------------------------------ */
function CardBack() {
  return (
    <div className="cback">
      <svg viewBox="-100 -100 200 200" className="cback-art" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (-90 + i * 30) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1={Math.cos(a) * 34}
              y1={Math.sin(a) * 34}
              x2={Math.cos(a) * 82}
              y2={Math.sin(a) * 82}
              stroke="currentColor"
              strokeOpacity=".35"
            />
          );
        })}
        <circle r="82" fill="none" stroke="currentColor" strokeOpacity=".4" strokeDasharray="2 5" />
        <circle r="92" fill="none" stroke="currentColor" strokeOpacity=".18" />
        <circle r="32" fill="none" stroke="currentColor" strokeOpacity=".7" />
        <text y="12" textAnchor="middle" className="cback-glyph">
          茶
        </text>
      </svg>
      {['a', 'b'].map((k) => (
        <svg key={k} viewBox="0 0 60 50" className={`cback-stars ${k}`} aria-hidden="true">
          <path d="M6 8 L30 22 L20 44 M30 22 L54 16" fill="none" stroke="currentColor" strokeOpacity=".45" />
          <circle cx="6" cy="8" r="2.4" fill="currentColor" />
          <circle cx="30" cy="22" r="1.6" fill="currentColor" />
          <circle cx="20" cy="44" r="1.6" fill="currentColor" />
          <circle cx="54" cy="16" r="2" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
