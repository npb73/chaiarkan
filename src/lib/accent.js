// Цвет созвездия из соотношения акцентных нот.
// Оттенки нот усредняются по кругу (а не по RGB): так смесь розового и зелёного не превращается в серое,
// а вес каждой ноты растёт быстрее её силы — тон задают самые яркие ноты.
import { NOTES } from '../data/notes.js';

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

const NOTE_HSL = NOTES.map((n) => hexToHsl(n.color));

export const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;

/**
 * Смешанный цвет нот.
 * power — насколько сильнее доминируют яркие ноты (1 — пропорционально, 3 — почти только лидеры).
 * Возвращает { h, s, l, coherence }: coherence 0..1 — насколько ноты согласны по оттенку.
 */
export function blendNotes(values, power = 2.5) {
  let x = 0;
  let y = 0;
  let wl = 0;
  let wsum = 0;
  values.forEach((v, i) => {
    const w = Math.max(0, v) ** power;
    const [h, s, l] = NOTE_HSL[i];
    const a = (h * Math.PI) / 180;
    x += Math.cos(a) * w * s;
    y += Math.sin(a) * w * s;
    wl += l * w;
    wsum += w;
  });
  if (wsum < 1e-6) return { h: 42, s: 0.9, l: 0.78, coherence: 0 };
  const h = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const coherence = Math.min(1, Math.hypot(x, y) / wsum / 0.8);
  return { h, s: 0.5 + 0.45 * coherence, l: Math.min(0.8, Math.max(0.62, wl / wsum)), coherence };
}

/** Два цвета плазмы: основной (по лидирующим нотам) и второй (по более широкому кругу нот). */
export function plasmaColors(values) {
  const a = blendNotes(values, 3);
  const b = blendNotes(values, 1.3);
  let hb = b.h;
  // если обе волны получились почти одного тона — разводим их, чтобы луч переливался
  const diff = Math.abs(((a.h - hb + 540) % 360) - 180);
  if (diff < 22) hb = a.h + 30;
  // фиолетовый диапазон палитре чужд — уводим вторую волну в другую сторону
  hb = ((hb % 360) + 360) % 360;
  if (hb > 245 && hb < 300) hb = a.h - 30;
  // при несогласных нотах тон уходит к светлому золоту — чтобы не было грязи
  const pale = (c) => 1 - c * 0.85;
  return {
    a: hsl(a.h, a.s, Math.min(0.82, a.l + 0.06 * pale(a.coherence))),
    b: hsl(hb, Math.max(0.55, b.s), Math.min(0.86, b.l + 0.08)),
    core: hsl(a.h, 0.6, 0.9),
  };
}
