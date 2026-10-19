import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NOTES, MAX } from '../data/notes.js';
import stoneAvif from '../assets/stone.avif';
import stoneWebp from '../assets/stone.webp';

// Геометрия в координатах viewBox: центр (0,0)
const HALF = 340; // половина ширины viewBox
const HALF_H = 305; // половина высоты: сверху и снизу места под подписи нужно меньше
const N = NOTES.length;
// На узких экранах паутинка чуть меньше, а подписи крупнее — чтобы читались с телефона
const GEOMETRY = { wide: { R: 200, LABEL_R: 262 }, compact: { R: 176, LABEL_R: 250 } };
let R = GEOMETRY.wide.R;
let LABEL_R = GEOMETRY.wide.LABEL_R;
// Пока палец/курсор ближе к центру, чем LOCK_PX экранных пикселей, ось выбирается
// по направлению движения: там вершины соседних лучей почти слипаются.
const LOCK_PX = 22;
const STONE_PAD = 40; // радиус камня = R + STONE_PAD
// url() в CSS-переменной браузер разрешает относительно файла стилей, поэтому даём абсолютный адрес
const absUrl = (u) => new URL(u, document.baseURI).href;

const angleOf = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
const AXES = NOTES.map((_, i) => ({ c: Math.cos(angleOf(i)), s: Math.sin(angleOf(i)) }));
const pt = (i, v, r = R) => [AXES[i].c * (r * v) / MAX, AXES[i].s * (r * v) / MAX];
const polyPoints = (vals, r = R) => vals.map((v, i) => pt(i, v, r).join(',')).join(' ');
const ringPoints = (level) => polyPoints(new Array(N).fill(level));
const clamp = (v) => Math.max(0, Math.min(MAX, v));

function nearestAxis(x, y) {
  let a = Math.atan2(y, x) + Math.PI / 2;
  if (a < 0) a += 2 * Math.PI;
  return Math.round(a / ((2 * Math.PI) / N)) % N;
}

function arcPath(i, r1, r2, gapDeg = 3) {
  const step = (2 * Math.PI) / N;
  const gap = (gapDeg * Math.PI) / 180;
  const a1 = angleOf(i) - step / 2 + gap;
  const a2 = angleOf(i) + step / 2 - gap;
  const p = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(r2, a1)} A ${r2} ${r2} 0 0 1 ${p(r2, a2)} L ${p(r1, a2)} A ${r1} ${r1} 0 0 0 ${p(r1, a1)} Z`;
}

// 4-лучевая «искра» для вершин
const SPARK = 'M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z';

// Немного «пыли» внутри паутины — детерминированно
const DUST = Array.from({ length: 36 }, (_, k) => {
  const a = (k * 137.508 * Math.PI) / 180;
  const r = Math.sqrt((k + 0.5) / 36) * 0.96;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 0.6 + ((k * 7) % 5) * 0.22, d: (k % 7) * 0.6 };
});

function useCompact() {
  const q = '(max-width: 600px)';
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setCompact(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return compact;
}

export default function FlavorWeb({ values, onChange, ghost, ghostColor = '#f3d48a', touched, onFirstTouch }) {
  const svgRef = useRef(null);
  const drag = useRef(null); // { idx, pointerId, locked }
  const tap = useRef(null);
  const [active, setActive] = useState(null); // ось под мышью / в фокусе / в перетаскивании
  const [dragging, setDragging] = useState(null);
  const compact = useCompact();
  const geo = compact ? GEOMETRY.compact : GEOMETRY.wide;
  R = geo.R;
  LABEL_R = geo.LABEL_R;

  const toSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const p = svg.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const q = p.matrixTransform(m.inverse());
    return [q.x, q.y];
  }, []);

  const lockRadius = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect && rect.width ? (LOCK_PX * HALF * 2) / rect.width : 30;
  };

  // Без шагов и округлений: звезда линейно и непрерывно следует за указателем
  const valueAt = (idx, x, y) => clamp(((x * AXES[idx].c + y * AXES[idx].s) / R) * MAX);

  const applyPointer = (clientX, clientY) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toSvg(clientX, clientY);
    if (!d.locked) {
      if (Math.hypot(x, y) > lockRadius()) d.locked = true;
      const idx = nearestAxis(x, y);
      if (idx !== d.idx) {
        d.idx = idx;
        setDragging(idx);
        setActive(idx);
      }
    }
    onChange(d.idx, valueAt(d.idx, x, y));
  };

  const startDrag = (e, el) => {
    e.preventDefault();
    const [x, y] = toSvg(e.clientX, e.clientY);
    const nearCenter = Math.hypot(x, y) <= lockRadius();
    // Ось определяется по углу точки касания, а не по тому, какая кнопка «поймала» палец:
    // зоны касания соседних вершин могут перекрываться.
    const i = nearestAxis(x, y);
    drag.current = { idx: i, pointerId: e.pointerId, locked: !nearCenter, el };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    setDragging(i);
    setActive(i);
    if (!touched) onFirstTouch?.();
    if (!nearCenter) applyPointer(e.clientX, e.clientY);
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (d && d.pointerId === e.pointerId) {
      try {
        d.el.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      drag.current = null;
      setDragging(null);
    }
  };

  /* ---- Вершины (HTML-кнопки поверх SVG: надёжный touch-action) ---- */
  const onHandleDown = (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    startDrag(e, e.currentTarget);
  };
  const onHandleMove = (e) => {
    if (drag.current && drag.current.pointerId === e.pointerId) applyPointer(e.clientX, e.clientY);
  };

  /* ---- Поле: мышью можно тянуть откуда угодно, пальцем — тапнуть ---- */
  const onFieldDown = (e) => {
    const [x, y] = toSvg(e.clientX, e.clientY);
    if (Math.hypot(x, y) > R + 24) return;
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      if (e.button !== 0) return;
      startDrag(e, e.currentTarget);
    } else {
      tap.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    }
  };
  const onFieldMove = (e) => {
    if (drag.current && drag.current.pointerId === e.pointerId) {
      applyPointer(e.clientX, e.clientY);
      return;
    }
    if (e.pointerType === 'mouse') {
      const [x, y] = toSvg(e.clientX, e.clientY);
      const r = Math.hypot(x, y);
      setActive(r <= LABEL_R + 30 && r > 6 ? nearestAxis(x, y) : null);
    }
  };
  const onFieldUp = (e) => {
    endDrag(e);
    const t = tap.current;
    tap.current = null;
    if (t && t.id === e.pointerId && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 10) {
      const [x, y] = toSvg(e.clientX, e.clientY);
      const idx = nearestAxis(x, y);
      setActive(idx);
      if (!touched) onFirstTouch?.();
      onChange(idx, valueAt(idx, x, y));
    }
  };

  const onKey = (idx) => (e) => {
    const v = values[idx];
    let nv = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') nv = v + 0.5;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') nv = v - 0.5;
    else if (e.key === 'PageUp') nv = v + 2;
    else if (e.key === 'PageDown') nv = v - 2;
    else if (e.key === 'Home') nv = 0;
    else if (e.key === 'End') nv = MAX;
    if (nv !== null) {
      e.preventDefault();
      if (!touched) onFirstTouch?.();
      onChange(idx, clamp(nv));
    }
  };

  const userPoly = useMemo(() => polyPoints(values), [values, compact]);
  const ghostPoly = useMemo(() => (ghost ? polyPoints(ghost) : null), [ghost, compact]);
  const shown = dragging ?? active;
  const activeNote = shown !== null ? NOTES[shown] : null;

  return (
    <div className={`web ${dragging !== null ? 'is-dragging' : ''} ${compact ? 'is-compact' : ''}`}>
      <div className="web-stage" style={{ aspectRatio: `${HALF} / ${HALF_H}` }}>
        {/* каменная подложка: диск чуть шире цветного кольца нот */}
        <div className="web-stone" style={{
            width: `${((STONE_PAD + R) / HALF) * 100}%`,
            '--stone-avif': `url("${absUrl(stoneAvif)}")`,
            '--stone-webp': `url("${absUrl(stoneWebp)}")`,
          }}
          aria-hidden="true"
        />
        <svg
          ref={svgRef}
          className="web-svg"
          viewBox={`${-HALF} ${-HALF_H} ${HALF * 2} ${HALF_H * 2}`}
          onPointerDown={onFieldDown}
          onPointerMove={onFieldMove}
          onPointerUp={onFieldUp}
          onPointerCancel={(e) => {
            tap.current = null;
            endDrag(e);
          }}
          onPointerLeave={(e) => e.pointerType === 'mouse' && !drag.current && setActive(null)}
          role="img"
          aria-label="Двенадцатилучевая карта вкуса чая"
        >
          <defs>
            <radialGradient id="webFill" cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff3cf" stopOpacity="0.5" />
              <stop offset="0.4" stopColor="#e9b964" stopOpacity="0.3" />
              <stop offset="1" stopColor="#3fd8c0" stopOpacity="0.24" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="bigGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* вращающееся внешнее кольцо */}
          <g className="web-orbit">
            <circle r={R + 46} fill="none" stroke="rgba(243,212,138,.22)" strokeWidth="1" strokeDasharray="2 9" />
            <circle r={R + 52} fill="none" stroke="rgba(169,139,255,.14)" strokeWidth="0.8" strokeDasharray="30 14 4 14" />
          </g>

          {/* «зодиакальное» кольцо из цветов нот */}
          {NOTES.map((n, i) => (
            <path
              key={`arc-${n.id}`}
              d={arcPath(i, R + 14, R + 21)}
              fill={n.color}
              opacity={shown === i ? 0.95 : 0.16 + (values[i] / MAX) * 0.55}
              className="web-arc"
            />
          ))}

          {/* звёздная пыль */}
          <g className="web-dust">
            {DUST.map((d, k) => (
              <circle key={k} cx={d.x * R} cy={d.y * R} r={d.s} style={{ animationDelay: `${d.d}s` }} />
            ))}
          </g>

          {/* внешний контур паутины — без промежуточных ступеней шкалы */}
          <polygon points={ringPoints(MAX)} fill="none" stroke="rgba(232,240,232,.22)" strokeWidth="1.1" />

          {/* оси */}
          {NOTES.map((n, i) => {
            const [x, y] = pt(i, MAX);
            return (
              <line
                key={`ax-${n.id}`}
                x1="0"
                y1="0"
                x2={x}
                y2={y}
                stroke={shown === i ? n.color : 'rgba(232,240,232,.14)'}
                strokeWidth={shown === i ? 1.6 : 1}
              />
            );
          })}

          {/* контур найденного чая */}
          {ghostPoly && (
            <polygon
              className="web-ghost"
              points={ghostPoly}
              fill="none"
              stroke={ghostColor}
              strokeOpacity="0.55"
              strokeWidth="1.4"
              strokeDasharray="5 6"
            />
          )}

          {/* созвездие пользователя */}
          <polygon points={userPoly} fill="url(#webFill)" stroke="none" className="web-fill" />
          <polygon
            points={userPoly}
            fill="none"
            stroke="#ffe9b0"
            strokeWidth="1.6"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="web-edge"
          />

          {/* звёзды-вершины */}
          {values.map((v, i) => {
            const [x, y] = pt(i, v);
            const n = NOTES[i];
            const k = v / MAX;
            const isOn = shown === i;
            const size = 7 + k * 9 + (isOn ? 4 : 0);
            return (
              <g key={`st-${n.id}`} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} className="web-star">
                <circle r={size * 1.25} fill={n.color} opacity={0.18 + k * 0.32} filter="url(#bigGlow)" />
                <path
                  d={SPARK}
                  transform={`scale(${size}) rotate(${isOn ? 45 : 0})`}
                  fill={n.color}
                  className="web-spark"
                />
                <circle r={2.4 + k * 1.6} fill="#fff" />
              </g>
            );
          })}

          {/* подписи */}
          {NOTES.map((n, i) => {
            const [x, y] = pt(i, MAX, LABEL_R);
            const isOn = shown === i;
            return (
              <g
                key={`lb-${n.id}`}
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
                className={`web-label ${isOn ? 'on' : ''}`}
              >
                <text className="web-glyph" y="-4" textAnchor="middle" fill={n.color}>
                  {n.glyph}
                </text>
                <text className="web-name" y="17" textAnchor="middle">
                  {n.name}
                </text>
              </g>
            );
          })}

          <circle r="3" fill="#fff" filter="url(#glow)" />
        </svg>

        {/* невидимые «рукоятки» — большие зоны для пальца + доступность с клавиатуры */}
        {values.map((v, i) => {
          const [x, y] = pt(i, Math.max(v, 0.6));
          const n = NOTES[i];
          return (
            <button
              key={`h-${n.id}`}
              type="button"
              className={`web-handle ${!touched && i === 0 ? 'hint' : ''}`}
              style={{ left: `${((x + HALF) / (HALF * 2)) * 100}%`, top: `${((y + HALF_H) / (HALF_H * 2)) * 100}%`, '--c': n.color }}
              role="slider"
              aria-label={`${n.name} нота`}
              aria-valuemin={0}
              aria-valuemax={MAX}
              aria-valuenow={Math.round(v * 10) / 10}
              aria-valuetext={`${n.name}: ${Math.round(v)} из 10`}
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((a) => (a === i ? null : a))}
              onMouseEnter={() => !drag.current && setActive(i)}
              onKeyDown={onKey(i)}
            />
          );
        })}
      </div>

      <div className="web-caption" aria-live="polite">
        {activeNote ? (
          <>
            <span className="web-caption-glyph" style={{ color: activeNote.color }}>
              {activeNote.glyph}
            </span>
            <span>
              <b>{activeNote.name}</b>
              <span className="muted"> — {activeNote.desc}</span>
            </span>
          </>
        ) : (
          <span className="muted">
            {touched
              ? 'Наведите на луч, чтобы прочитать ноту. Когда небо сложится — спросите оракула.'
              : 'Тяните звёзды от центра к краю: чем дальше звезда, тем ярче нота во вкусе.'}
          </span>
        )}
      </div>
    </div>
  );
}
