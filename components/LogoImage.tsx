'use client';
import { useEffect, useState } from 'react';

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export default function LogoImage({ className, style }: Props) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return (
    <img
      src={isDark ? '/TraderLog.svg' : '/TraderLog-1.svg'}
      alt="TraderLog"
      className={className}
      style={style}
    />
  );
}
