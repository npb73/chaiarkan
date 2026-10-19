import { NOTES, MAX } from '../data/notes.js';

const N = NOTES.length;
const R = 86;
const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
const pts = (vals, r = R) =>
  vals.map((v, i) => `${(Math.cos(ang(i)) * r * v) / MAX},${(Math.sin(ang(i)) * r * v) / MAX}`).join(' ');

/** Компактная паутинка для карточек: несколько профилей поверх друг друга. */
export default function MiniRadar({ layers, labels = false, className = '' }) {
  const half = labels ? 122 : 100;
  return (
    <svg className={`mini-radar ${className}`} viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`} aria-hidden="true">
      {[5, 10].map((lv) => (
        <polygon
          key={lv}
          points={pts(new Array(N).fill(lv))}
          fill="none"
          stroke="rgba(225,238,230,.14)"
          strokeWidth="1"
        />
      ))}
      {NOTES.map((n, i) => (
        <line
          key={n.id}
          x1="0"
          y1="0"
          x2={Math.cos(ang(i)) * R}
          y2={Math.sin(ang(i)) * R}
          stroke="rgba(225,238,230,.08)"
        />
      ))}
      {layers.map((l, k) => (
        <polygon
          key={k}
          points={pts(l.values)}
          fill={l.fill || 'none'}
          fillOpacity={l.fillOpacity ?? 0.3}
          stroke={l.color}
          strokeWidth={l.width ?? 1.5}
          strokeDasharray={l.dashed ? '4 4' : undefined}
          strokeLinejoin="round"
        />
      ))}
      {layers[0] &&
        layers[0].values.map((v, i) =>
          v >= 6 ? (
            <circle
              key={i}
              cx={(Math.cos(ang(i)) * R * v) / MAX}
              cy={(Math.sin(ang(i)) * R * v) / MAX}
              r="2.6"
              fill={NOTES[i].color}
            />
          ) : null,
        )}
      {labels &&
        NOTES.map((n, i) => (
          <text
            key={n.id}
            x={Math.cos(ang(i)) * (R + 20)}
            y={Math.sin(ang(i)) * (R + 20) + 5}
            textAnchor="middle"
            className="mini-glyph"
            fill={n.color}
          >
            {n.glyph}
          </text>
        ))}
    </svg>
  );
}
