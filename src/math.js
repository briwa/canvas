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

export function easeInSine(progress) {
  return 1 - Math.cos((Math.PI * progress) / 2);
}

export function easeOutSine(progress) {
  return Math.sin((Math.PI * progress) / 2);
}

export function easeOutLog(progress, strength = 9) {
  return strength ? Math.log1p(strength * progress) / Math.log1p(strength) : progress;
}

export function easeInExpo(progress) {
  return progress === 0 ? 0 : 2 ** (10 * progress - 10);
}

export function easeInOutCubic(progress) {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (2 - 2 * progress) ** 3 / 2;
}

export function easeOutBack(progress, overshoot = 1.70158) {
  return 1 + (overshoot + 1) * (progress - 1) ** 3 + overshoot * (progress - 1) ** 2;
}

export function spline(values, t) {
  const last = values.length - 1;

  if (last < 1) return values[0] ?? 0;

  const at = clamp(t, 0, 1) * last;
  const i = Math.min(Math.floor(at), last - 1);
  const u = at - i;

  const slope = (k) => {
    const a = Math.max(k - 1, 0);
    const b = Math.min(k + 1, last);

    return (values[b] - values[a]) / (b - a);
  };

  return (2 * u ** 3 - 3 * u ** 2 + 1) * values[i]
    + (u ** 3 - 2 * u ** 2 + u) * slope(i)
    + (3 * u ** 2 - 2 * u ** 3) * values[i + 1]
    + (u ** 3 - u ** 2) * slope(i + 1);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
