export function lerp(from, to, t) {
  return from + (to - from) * t;
}

export function mix(from, to, t) {
  return { r: lerp(from.r, to.r, t), g: lerp(from.g, to.g, t), b: lerp(from.b, to.b, t) };
}

export function polar(origin, angle, length) {
  const rad = (angle / 180) * Math.PI;

  return {
    x: origin.x - Math.sin(rad) * length,
    y: origin.y - Math.cos(rad) * length,
  };
}

export function linear(progress) {
  return progress;
}

export function easeInOutSine(progress) {
  return (1 - Math.cos(Math.PI * progress)) / 2;
}

export function easeInOutSineInverse(progress) {
  return Math.acos(1 - (2 * progress)) / Math.PI;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
