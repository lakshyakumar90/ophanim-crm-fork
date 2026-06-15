"use client";

import { useEffect, useRef } from "react";

export function ScrollAnchor({ onIntersect, disabled }: { onIntersect: () => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || disabled) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onIntersect();
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onIntersect, disabled]);
  return <div ref={ref} className="h-4 w-full opacity-0 pointer-events-none" aria-hidden="true" />;
}
