import { useRef, useEffect, useState, useCallback } from 'react';

export function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollRoot = el.closest('[data-scroll-container]') as HTMLElement | null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px', root: scrollRoot }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

export function useParallax(speed = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const parent = el.closest('[data-scroll-container]') || el.parentElement;
    if (!parent) return;

    let rafId: number;
    const handleScroll = () => {
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const windowH = window.innerHeight;
        const center = rect.top + rect.height / 2;
        const delta = (center - windowH / 2) / windowH;
        setOffset(delta * speed * 100);
      });
    };

    parent.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      parent.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [speed]);

  return { ref, offset };
}

export function useStaggerChildren() {
  const getDelay = useCallback((index: number, baseDelay = 0.04) => {
    return index * baseDelay;
  }, []);

  return { getDelay };
}
