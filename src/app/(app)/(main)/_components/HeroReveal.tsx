"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "../_lib/gsap";

type HeroRevealProps = {
  children: React.ReactNode;
  /** Selectors for staggered animation (e.g. [".headline", ".desc", ".cta"]). If not provided, animates direct children. */
  stagger?: string[];
  /** Stagger delay in seconds */
  staggerDelay?: number;
  /** Animation duration */
  duration?: number;
};

/**
 * Hero section reveal – staggered fade/slide from bottom on mount.
 * Use with hero headline, description, CTA, and illustration.
 */
export function HeroReveal({
  children,
  stagger = ["> *"],
  staggerDelay = 0.12,
  duration = 0.6,
}: HeroRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(stagger, {
        y: 32,
        opacity: 0,
        duration,
        stagger: staggerDelay,
        ease: "power3.out",
      });
    },
    { scope: containerRef, dependencies: [] },
  );

  return <div ref={containerRef}>{children}</div>;
}
