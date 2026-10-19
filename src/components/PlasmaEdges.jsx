import { useEffect, useRef } from 'react';

const WAVELENGTH = 48; // длина волны в единицах viewBox
const STEP = 4; // шаг дискретизации линии

/**
 * Грани созвездия как плазменный луч: две синусоиды бегут навстречу друг другу вдоль контура,
 * переплетаются и сходятся в нуль в каждой вершине-звезде.
 * Кадры рисуются напрямую в атрибут d, без перерисовки React.
 */
export default function PlasmaEdges({ points, colorA, colorB, colorCore }) {
  const pts = useRef(points);
  pts.current = points;
  const refs = {
    aGlow: useRef(null),
    bGlow: useRef(null),
    a: useRef(null),
    b: useRef(null),
  };
  const root = useRef(null);
  const redraw = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let visible = true;
    const t0 = performance.now();

    const build = (t, sign, phase0, ampMul) => {
      const p = pts.current;
      const n = p.length;
      const amp = (5.6 + 1.8 * Math.sin(t * 0.9 + phase0)) * ampMul;
      const omega = sign * (sign > 0 ? 3.1 : 2.4);
      let s = 0; // длина пути от первой вершины — волна непрерывно течёт по всему контуру
      let d = '';
      for (let i = 0; i < n; i++) {
        const [x1, y1] = p[i];
        const [x2, y2] = p[(i + 1) % n];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (i === 0) d += `M${x1.toFixed(1)} ${y1.toFixed(1)}`;
        if (len < 2) {
          d += `L${x2.toFixed(1)} ${y2.toFixed(1)}`;
          s += len;
          continue;
        }
        const nx = -dy / len;
        const ny = dx / len;
        const steps = Math.max(4, Math.ceil(len / STEP));
        // амплитуда на коротких гранях меньше — чтобы волна не «рвала» острые углы
        const edgeAmp = amp * Math.min(1, len / 70);
        for (let k = 1; k <= steps; k++) {
          const u = k / steps;
          const env = Math.sin(Math.PI * u); // в вершинах волна сходится к звезде
          const w = Math.sin(((s + u * len) / WAVELENGTH) * 2 * Math.PI - omega * t + phase0);
          const off = w * edgeAmp * env;
          d += `L${(x1 + dx * u + nx * off).toFixed(1)} ${(y1 + dy * u + ny * off).toFixed(1)}`;
        }
        s += len;
      }
      return d + 'Z';
    };

    const frame = (now) => {
      const t = reduce ? 0.6 : (now - t0) / 1000;
      const da = build(t, 1, 0, 1);
      const db = build(t, -1, Math.PI, 0.9);
      refs.a.current?.setAttribute('d', da);
      refs.aGlow.current?.setAttribute('d', da);
      refs.b.current?.setAttribute('d', db);
      refs.bGlow.current?.setAttribute('d', db);
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    };

    // Когда паутинка вне экрана — не тратим кадры
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && !reduce) raf = requestAnimationFrame(frame);
    });
    if (root.current) io.observe(root.current.ownerSVGElement || root.current);

    redraw.current = reduce ? () => frame(performance.now()) : null;
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Без анимации (reduced motion) форма всё равно следует за звёздами
  useEffect(() => {
    redraw.current?.();
  }, [points]);

  return (
    <g ref={root} className="plasma" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path ref={refs.aGlow} stroke={colorA} strokeWidth="7" strokeOpacity="0.16" />
      <path ref={refs.bGlow} stroke={colorB} strokeWidth="6" strokeOpacity="0.14" />
      <polygon
        points={points.map((p) => p.join(',')).join(' ')}
        stroke={colorCore}
        strokeWidth="0.9"
        strokeOpacity="0.55"
      />
      <path ref={refs.a} stroke={colorA} strokeWidth="1.7" />
      <path ref={refs.b} stroke={colorB} strokeWidth="1.3" strokeOpacity="0.9" />
    </g>
  );
}
