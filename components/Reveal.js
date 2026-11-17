'use client';
import { useEffect, useRef, useState } from 'react';
export default function Reveal({ children, delay = 0, as: T = 'div', className = '' }) {
  const r = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0, rootMargin: '0px 0px 12% 0px' });
    io.observe(r.current);
    return () => io.disconnect();
  }, []);
  return <T ref={r} className={`rv ${on ? 'in' : ''} ${className}`} style={{ '--d': delay + 'ms' }}>{children}</T>;
}
