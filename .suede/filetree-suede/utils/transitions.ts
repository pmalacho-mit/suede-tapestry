import { cubicOut } from "svelte/easing";
import { easeInOut } from ".";

let show = true;

export function customScale(node: HTMLElement, options?: { duration: number }) {
  return {
    duration: options?.duration ?? 200,
    easing: cubicOut,
    css: (t: number) => `transform:scaleY(${t}); transform-origin: top left;`,
  };
}

export const fadeAndScaleY = (
  node: HTMLElement,
  { delay = 0, duration = 300 }: { delay?: number; duration?: number } = {}
) => {
  return {
    delay,
    duration,
    css: (t: number) => {
      const eased = cubicOut(t);
      return `opacity: ${eased}; transform: scaleY(${eased});`;
    },
  };
};

export const animatedHeightEstimator = (transitionTimeMs: number) => {
  let lastAnimationTrigger = 0;

  return (target: HTMLElement, open: boolean) => {
    const { height } = target.getBoundingClientRect();
    const now = performance.now();

    const delta = now - lastAnimationTrigger;
    const elapsedRatio = Math.min(delta / transitionTimeMs, 1);
    const t = easeInOut.t(elapsedRatio);

    lastAnimationTrigger = now;
    return open ? height * (1 - t) : height * t;
  };
};

export const duration = (_: HTMLElement, duration: number) => ({ duration });

export const trySetFirstChildOpacity = (
  { children: [child] }: HTMLElement,
  state: boolean
) => {
  if (child) (child as HTMLElement).style.opacity = state ? "1" : "0";
};
