import { NOTES, MAX } from '../data/notes.js';
import { TEAS } from '../data/teas.js';

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

function pearson(a, b) {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da < 1e-6 || db < 1e-6) return 0;
  return num / Math.sqrt(da * db);
}

/**
 * Совпадение 0..1: форма профиля (корреляция) важнее абсолютной силы,
 * но насыщенность тоже учитывается.
 */
export function similarity(user, tea) {
  const r = pearson(user, tea);
  let sq = 0;
  for (let i = 0; i < user.length; i++) sq += (user[i] - tea[i]) ** 2;
  const rmse = Math.sqrt(sq / user.length) / MAX; // 0..1
  const shape = (r + 1) / 2;
  return Math.max(0, Math.min(1, 0.72 * shape + 0.28 * (1 - rmse)));
}

export function rankTeas(values) {
  return TEAS.map((tea) => ({ tea, score: similarity(values, tea.profile) })).sort(
    (a, b) => b.score - a.score,
  );
}

/** Короткий детерминированный код созвездия. */
export function constellationCode(values) {
  let h = 2166136261;
  for (const v of values) {
    h ^= Math.round(v * 2);
    h = Math.imul(h, 16777619);
  }
  const s = (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
  return `ЧА-${s.slice(0, 3)}·${s.slice(3)}`;
}

export function describeConstellation(values) {
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v);
  const avg = mean(values);
  const bright = values.filter((v) => v >= 6).length;
  const spread = order[0].v - order[order.length - 1].v;

  let name;
  if (order[0].v < 1.5) name = 'Тихое небо';
  else if (spread < 1.2) name = 'Созвездие Ровного Света';
  else if (order[0].v - order[1].v > 3.5) name = `Звезда ${NOTES[order[0].i].star}`;
  else name = `Созвездие ${NOTES[order[0].i].star} и ${NOTES[order[1].i].star}`;

  let glow;
  if (avg < 2.5) glow = 'едва мерцающее';
  else if (avg < 4.5) glow = 'ясное';
  else if (avg < 6.5) glow = 'яркое';
  else glow = 'ослепительное';

  return {
    name,
    glow,
    bright,
    code: constellationCode(values),
    top: order.slice(0, 3).map((o) => NOTES[o.i]),
  };
}

/* ---------- Ссылка-«звёздная карта»: значения в адресной строке ---------- */
const ALPHABET = '0123456789abcdefghijk'; // 21 символ: шаг 0.5 от 0 до 10

export function encodeValues(values) {
  return values.map((v) => ALPHABET[Math.round(Math.max(0, Math.min(MAX, v)) * 2)]).join('');
}

export function decodeValues(str) {
  if (!str || str.length !== NOTES.length) return null;
  const out = [];
  for (const ch of str.toLowerCase()) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return null;
    out.push(idx / 2);
  }
  return out;
}

export function randomConstellation() {
  // Несколько ярких «центров» и мягкие соседи — чтобы получалось похоже на настоящий чай.
  const n = NOTES.length;
  const vals = new Array(n).fill(0).map(() => 0.5 + Math.random() * 2);
  const peaks = 2 + Math.floor(Math.random() * 2);
  for (let p = 0; p < peaks; p++) {
    const c = Math.floor(Math.random() * n);
    const h = 6 + Math.random() * 4;
    for (let d = -2; d <= 2; d++) {
      const i = (c + d + n) % n;
      vals[i] = Math.max(vals[i], h - Math.abs(d) * (1.6 + Math.random()));
    }
  }
  return vals.map((v) => Math.round(Math.min(MAX, v) * 2) / 2);
}
