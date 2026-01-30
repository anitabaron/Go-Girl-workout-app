"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

export default function LenisProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const isTouch =
      globalThis.window !== undefined &&
      ("ontouchstart" in globalThis.window || navigator.maxTouchPoints > 0);

    if (isTouch) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Lenis] Skipped on touch device");
      }
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1,
    });

    lenisRef.current = lenis;

    // Temporary debug: confirm Lenis scroll events run (throttled)
    let lastLog = 0;
    lenis.on("scroll", () => {
      if (process.env.NODE_ENV === "development") {
        const now = performance.now();
        if (now - lastLog > 500) {
          lastLog = now;
          console.log("[Lenis] scroll", { scroll: lenis.scroll });
        }
      }
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
