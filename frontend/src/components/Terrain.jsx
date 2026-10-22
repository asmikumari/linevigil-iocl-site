import React, { useEffect, useRef } from 'react';

/*
 * Full-bleed contour terrain for the landing hero.
 * - Contours come from a noise height field, traced with marching squares.
 * - The pointer raises the terrain: contours bend around it and pick up the accent colour.
 * - The pipeline crosses the terrain; a measuring line runs from the pointer to its nearest point,
 *   and onMeasure reports the distance so the page can show a readout.
 */

const ACCENT = [243, 112, 33]; // IOCL orange
const CELL = 13; // grid cell in CSS px
const LEVEL_STEP = 0.07;
const METRES_PER_PX = 6; // so the 500 m band is about 83 px either side of the line

// Pipeline path in hero-relative coordinates (0..1).
const PIPE = [[0.33, 1.05], [0.45, 0.86], [0.55, 0.74], [0.66, 0.66], [0.76, 0.55], [0.84, 0.38], [0.93, 0.22], [1.04, 0.1]];

// Small gradient-noise implementation (Perlin style), seeded so the terrain is the same every visit.
const makeNoise = (seed = 7) => {
  const p = new Uint8Array(512);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  return (x, y) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return x1 + v * (x2 - x1);
  };
};

const nearestOnPolyline = (pts, x, y) => {
  let best = { d: Infinity, x: 0, y: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { d, x: px, y: py };
  }
  return best;
};

// `pipeline` draws the route and measuring line (landing hero); `ignore` is a selector where the pointer
// should not raise the terrain (for example over maps on the dashboards).
const Terrain = ({ onMeasure, interactive = true, pipeline = true, ignore = null, className = '' }) => {
  const canvasRef = useRef(null);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const noise = makeNoise(11);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, cols = 0, rows = 0, base = null, pipe = [];
    const target = { x: -9999, y: -9999, a: 0 };
    const bump = { x: -9999, y: -9999, a: 0 };
    let frame = 0;
    let reveal = reduce ? 1 : 0; // contours fade in on load
    const startedAt = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL) + 1;
      rows = Math.ceil(h / CELL) + 1;
      base = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * CELL / 420;
          const y = j * CELL / 420;
          base[j * cols + i] = noise(x, y) * 0.9 + noise(x * 2.3 + 5, y * 2.3 + 9) * 0.32 + noise(x * 5 + 2, y * 5 + 4) * 0.06;
        }
      }
      pipe = PIPE.map(([px, py]) => [px * w, py * h]);
      draw();
    };

    const heightAt = (i, j) => {
      let v = base[j * cols + i];
      if (bump.a > 0.001) {
        const dx = i * CELL - bump.x;
        const dy = j * CELL - bump.y;
        v += bump.a * 0.55 * Math.exp(-(dx * dx + dy * dy) / (2 * 130 * 130));
      }
      return v;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (!base) return;

      // Heights for this frame.
      const H = new Float32Array(cols * rows);
      let min = Infinity, max = -Infinity;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const v = heightAt(i, j);
          H[j * cols + i] = v;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }

      // Contour paths, split by style so each is stroked once.
      const faint = new Path2D();
      const index = new Path2D();
      const hot = new Path2D();
      const warm = new Path2D();
      const R1 = 120, R2 = 230;
      const first = Math.ceil(min / LEVEL_STEP);
      const last = Math.floor(max / LEVEL_STEP);

      for (let k = first; k <= last; k++) {
        const L = k * LEVEL_STEP;
        const isIndex = k % 5 === 0;
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const a = H[j * cols + i], b = H[j * cols + i + 1];
            const c = H[(j + 1) * cols + i + 1], d = H[(j + 1) * cols + i];
            const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x0 = i * CELL, y0 = j * CELL;
            const top = [x0 + CELL * ((L - a) / (b - a)), y0];
            const right = [x0 + CELL, y0 + CELL * ((L - b) / (c - b))];
            const bottom = [x0 + CELL * ((L - d) / (c - d)), y0 + CELL];
            const left = [x0, y0 + CELL * ((L - a) / (d - a))];
            let segs;
            switch (idx) {
              case 1: case 14: segs = [[left, bottom]]; break;
              case 2: case 13: segs = [[bottom, right]]; break;
              case 3: case 12: segs = [[left, right]]; break;
              case 4: case 11: segs = [[top, right]]; break;
              case 5: segs = [[left, top], [bottom, right]]; break;
              case 6: case 9: segs = [[top, bottom]]; break;
              case 7: case 8: segs = [[left, top]]; break;
              case 10: segs = [[left, bottom], [top, right]]; break;
              default: segs = [];
            }
            for (const [s, e] of segs) {
              const mx = (s[0] + e[0]) / 2 - bump.x;
              const my = (s[1] + e[1]) / 2 - bump.y;
              const dist = Math.sqrt(mx * mx + my * my);
              const path = bump.a > 0.05 && dist < R1 ? hot : bump.a > 0.05 && dist < R2 ? warm : isIndex ? index : faint;
              path.moveTo(s[0], s[1]);
              path.lineTo(e[0], e[1]);
            }
          }
        }
      }

      ctx.globalAlpha = reveal;
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(232, 234, 237, 0.16)';
      ctx.stroke(faint);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(232, 234, 237, 0.42)';
      ctx.stroke(index);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(${ACCENT.join(',')}, ${0.45 * bump.a})`;
      ctx.stroke(warm);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = `rgba(${ACCENT.join(',')}, ${0.95 * bump.a})`;
      ctx.stroke(hot);

      // Soft glow where the terrain is raised.
      if (bump.a > 0.02) {
        const g = ctx.createRadialGradient(bump.x, bump.y, 0, bump.x, bump.y, 260);
        g.addColorStop(0, `rgba(${ACCENT.join(',')}, ${0.09 * bump.a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(bump.x - 260, bump.y - 260, 520, 520);
      }

      if (!pipeline) { ctx.globalAlpha = 1; return; }

      // Pipeline with its 1 km and 500 m bands.
      const line = new Path2D();
      pipe.forEach(([x, y], n) => (n ? line.lineTo(x, y) : line.moveTo(x, y)));
      ctx.lineJoin = 'round';
      ctx.lineWidth = (1000 / METRES_PER_PX) * 2;
      ctx.strokeStyle = 'rgba(243, 112, 33, 0.028)';
      ctx.stroke(line);
      ctx.lineWidth = (500 / METRES_PER_PX) * 2;
      ctx.strokeStyle = 'rgba(243, 112, 33, 0.04)';
      ctx.stroke(line);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${ACCENT.join(',')}, 0.95)`;
      ctx.stroke(line);

      // Measuring line from the pointer to the nearest point on the pipeline.
      if (bump.a > 0.05 && target.a > 0) {
        const n = nearestOnPolyline(pipe, bump.x, bump.y);
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(237, 237, 237, ${0.7 * bump.a})`;
        ctx.beginPath();
        ctx.moveTo(bump.x, bump.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(237, 237, 237, ${bump.a})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      frame = 0;
      const k = 0.16;
      bump.x += (target.x - bump.x) * k;
      bump.y += (target.y - bump.y) * k;
      bump.a += (target.a - bump.a) * 0.08;
      if (!reduce && reveal < 1) reveal = Math.min(1, (performance.now() - startedAt) / 1400);
      draw();
      const moving = Math.abs(target.x - bump.x) > 0.3 || Math.abs(target.y - bump.y) > 0.3 || Math.abs(target.a - bump.a) > 0.005 || reveal < 1;
      if (moving) frame = requestAnimationFrame(tick);
    };
    const kick = () => { if (!frame) frame = requestAnimationFrame(tick); };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const outside = x < 0 || y < 0 || x > rect.width || y > rect.height;
      if (outside || (ignore && e.target.closest?.(ignore))) { target.a = 0; onMeasureRef.current?.(null); kick(); return; }
      if (bump.a < 0.02) { bump.x = x; bump.y = y; }
      target.x = x;
      target.y = y;
      target.a = 1;
      const n = nearestOnPolyline(pipe, x, y);
      const overUi = !!e.target.closest?.('a, button, input, label, form');
      onMeasureRef.current?.(overUi ? null : { x, y, metres: Math.round((n.d * METRES_PER_PX) / 10) * 10 });
      kick();
    };
    // Touch pointers "leave" as soon as the finger lifts; keep the last tap measured instead.
    const onLeave = (e) => {
      if (e.pointerType === 'touch') return;
      target.a = 0;
      onMeasureRef.current?.(null);
      kick();
    };

    resize();
    kick();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (interactive && !reduce) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [interactive, pipeline, ignore]);

  return <canvas ref={canvasRef} className={`lv-terrain ${className}`} aria-hidden="true" />;
};

export default Terrain;
