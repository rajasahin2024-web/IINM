"use client";
import React, { useEffect, useRef, useState } from "react";

interface LazySectionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  fallbackHeight?: string | number;
  rootMargin?: string;
  threshold?: number;
}

export default function LazySection({
  children,
  className,
  style,
  fallbackHeight = 400,
  rootMargin = "200px",
  threshold = 0,
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  if (!isVisible) {
    return (
      <div
        ref={ref}
        className={className}
        style={{
          minHeight: fallbackHeight,
          ...style,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
