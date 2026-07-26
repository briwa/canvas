export function lerp(from, to, t) {
  return from + (to - from) * t;
}

export function linear(progress) {
  return progress;
}

export function easeInOutSine(progress) {
  return (1 - Math.cos(Math.PI * progress)) / 2;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
