import React, { useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-_';

// Link or button whose label scrambles and resolves left to right on hover or keyboard focus.
// The real label stays underneath (invisible) so the width never jumps.
const Scramble = ({ text, as: Tag = 'span', className = '', children, ...rest }) => {
  const [shown, setShown] = useState(text);
  const frameRef = useRef(0);

  const run = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(frameRef.current);
    const start = performance.now();
    const duration = 420;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * text.length);
      setShown(
        text
          .split('')
          .map((ch, i) => (ch === ' ' || i < settled ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join('')
      );
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  };

  return (
    <Tag className={className} onMouseEnter={run} onFocus={run} {...rest}>
      <span className="lv-scramble" aria-hidden="true">
        <span className="lv-scramble-ghost">{text}</span>
        <span className="lv-scramble-live">{shown}</span>
      </span>
      <span className="lv-sr">{text}</span>
      {children}
    </Tag>
  );
};

export default Scramble;
