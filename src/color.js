import { clamp, lerp } from './math';

const HEX = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseColor(hex) {
  if (!HEX.test(hex)) throw new Error(`Invalid hex color: ${hex}`);

  let h = hex.startsWith('#') ? hex.slice(1) : hex;
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);

  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex(rgb) {
  const channels = rgb.map((v) =>
    clamp(Math.round(v), 0, 255)
      .toString(16)
      .padStart(2, '0'),
  );

  return `#${channels.join('')}`;
}

export function lerpRgb(from, to, t) {
  return toHex([lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)]);
}

export function lerpColor(from, to, t) {
  return lerpRgb(parseColor(from), parseColor(to), t);
}
