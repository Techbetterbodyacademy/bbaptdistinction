"use client";

import { useEffect, useRef } from "react";

export function HeroGlow() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let rafId = 0;
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;

    const handleMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width) * 100;
      targetY = ((e.clientY - rect.top) / rect.height) * 100;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      el.style.background = `radial-gradient(circle at ${currentX.toFixed(1)}% ${currentY.toFixed(1)}%, rgba(0,174,239,0.22), transparent 55%), radial-gradient(circle at 80% 60%, rgba(0,174,239,0.08), transparent 50%)`;
      rafId = requestAnimationFrame(animate);
    };

    parent.addEventListener("pointermove", handleMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      parent.removeEventListener("pointermove", handleMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0 opacity-100 pointer-events-none transition-opacity"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(0,174,239,0.18), transparent 60%), radial-gradient(circle at 80% 60%, rgba(0,174,239,0.08), transparent 50%)"
      }}
    />
  );
}
