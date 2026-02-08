/**
 * GSAP setup for M3.
 * ScrollTrigger uses native scroll.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { default as gsap } from "gsap";
export { ScrollTrigger } from "gsap/ScrollTrigger";
export { useGSAP } from "@gsap/react";
