import { useEffect, useRef } from 'react';

/** Живое звёздное небо на canvas: мерцание, лёгкий параллакс, падающие звёзды. */
export default function Starfield() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars = [];
    let meteors = [];
    let raf = 0;
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let nextMeteor = performance.now() + 2500;

    const tints = ['255,255,255', '255,240,210', '210,220,255', '255,224,178', '200,255,245'];

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 2600);
      stars = Array.from({ length: count }, () => {
        const layer = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: layer > 0.97 ? 1.6 + Math.random() * 0.9 : 0.3 + Math.random() * 1.0,
          depth: 0.2 + layer * 0.8,
          tw: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 1.6,
          a: 0.35 + Math.random() * 0.65,
          c: tints[Math.floor(Math.random() * tints.length)],
        };
      });
    };

    const onMove = (e) => {
      tx = (e.clientX / w - 0.5) * 2;
      ty = (e.clientY / h - 0.5) * 2;
    };

    const frame = (t) => {
      ctx.clearRect(0, 0, w, h);
      mx += (tx - mx) * 0.03;
      my += (ty - my) * 0.03;
      const scrollShift = window.scrollY * 0.05;
      for (const s of stars) {
        const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(s.tw + (t / 1000) * s.sp);
        let x = s.x - mx * 14 * s.depth;
        let y = s.y - my * 10 * s.depth - scrollShift * s.depth;
        y = ((y % h) + h) % h;
        x = ((x % w) + w) % w;
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = `rgb(${s.c})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.5) {
          ctx.globalAlpha = s.a * tw * 0.35;
          ctx.fillRect(x - s.r * 4, y - 0.4, s.r * 8, 0.8);
          ctx.fillRect(x - 0.4, y - s.r * 4, 0.8, s.r * 8);
        }
      }
      if (!reduce && t > nextMeteor) {
        nextMeteor = t + 3500 + Math.random() * 6000;
        const ang = Math.PI * (0.15 + Math.random() * 0.15);
        meteors.push({ x: Math.random() * w * 0.8 + w * 0.1, y: Math.random() * h * 0.4, vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9, life: 1 });
      }
      meteors = meteors.filter((m) => m.life > 0);
      for (const m of meteors) {
        m.x += m.vx;
        m.y += m.vy;
        m.life -= 0.018;
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 12, m.y - m.vy * 12);
        g.addColorStop(0, `rgba(255,244,214,${m.life})`);
        g.addColorStop(1, 'rgba(255,244,214,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 12, m.y - m.vy * 12);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    build();
    raf = requestAnimationFrame(frame);
    const onResize = () => {
      // на телефонах адресная строка меняет высоту при скролле — не пересоздаём небо из-за этого
      if (Math.abs(window.innerWidth - w) > 2 || Math.abs(window.innerHeight - h) > 160) build();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div className="sky" aria-hidden="true">
      <div className="nebula n1" />
      <div className="nebula n2" />
      <div className="nebula n3" />
      <canvas ref={ref} className="sky-canvas" />
    </div>
  );
}
