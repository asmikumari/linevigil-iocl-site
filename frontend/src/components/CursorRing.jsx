import React, { useEffect, useRef } from 'react';

// A ring that trails the pointer and grows over links and buttons. Mouse and pen only.
const CursorRing = () => {
  const ringRef = useRef(null);

  useEffect(() => {
    const ring = ringRef.current;
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!ring || !fine || reduce) return undefined;

    const pos = { x: -100, y: -100 };
    const goal = { x: -100, y: -100 };
    let frame = 0;

    const loop = () => {
      pos.x += (goal.x - pos.x) * 0.22;
      pos.y += (goal.y - pos.y) * 0.22;
      ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      frame = Math.abs(goal.x - pos.x) + Math.abs(goal.y - pos.y) > 0.2 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e) => {
      goal.x = e.clientX;
      goal.y = e.clientY;
      ring.dataset.visible = 'true';
      const hit = e.target.closest?.('a, button, [role="button"], input, label');
      ring.dataset.hover = hit ? 'true' : 'false';
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onDown = () => { ring.dataset.down = 'true'; };
    const onUp = () => { ring.dataset.down = 'false'; };
    const onLeave = () => { ring.dataset.visible = 'false'; };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={ringRef} className="lv-cursor" aria-hidden="true" data-visible="false">
      <span />
    </div>
  );
};

export default CursorRing;
