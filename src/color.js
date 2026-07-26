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

export function lerpColor(from, to, t) {
  const a = parseColor(from);
  const b = parseColor(to);

  return toHex([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
}
