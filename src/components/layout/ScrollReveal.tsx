"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/app/(app)/_lib/gsap";

type ScrollRevealProps = {
  children: React.ReactNode;
  /** Y offset before trigger (0–1 = viewport height) */
  start?: string;
  /** Animation duration */
  duration?: number;
  /** Y distance for slide (px) */
  y?: number;
};

/**
 * Scroll-triggered reveal – fade/slide from bottom when element enters viewport.
 */
export function ScrollReveal({
  children,
  start = "top 85%",
  duration = 0.6,
  y = 40,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.from(containerRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start,
          toggleActions: "play none none none",
        },
        y,
        opacity: 0,
        duration,
        ease: "power3.out",
      });
    },
    { scope: containerRef, dependencies: [] },
  );

  return (
    <div ref={containerRef} className="w-full min-w-0">
      {children}
    </div>
  );
}
