import { linear } from './math';
import { drawArc, drawCircle, drawLine, drawRect } from './shapes';

export function rgb(color) {
  return `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;
}

export class Entity {
  #r = NaN;
  #g = NaN;
  #b = NaN;
  #style = '';

  constructor({ draw, color, x0 = 0, x1 = 0, y0 = 0, y1 = 0, alpha = 1, lineWidth = 1, ...props } = {}) {
    Object.assign(this, { draw, x0, x1, y0, y1, alpha, lineWidth }, props);
    this.color = { r: 0, g: 0, b: 0, ...color };
  }

  get style() {
    const { r, g, b } = this.color;

    if (r !== this.#r || g !== this.#g || b !== this.#b) {
      this.#r = r;
      this.#g = g;
      this.#b = b;
      this.#style = rgb(this.color);
    }

    return this.#style;
  }

  snapshot() {
    return { ...this, color: { ...this.color } };
  }

  restore(state) {
    const color = this.color;

    Object.assign(this, state);
    this.color = Object.assign(color, state.color);
  }
}

export function rect(options) {
  return new Entity({ ...options, draw: drawRect });
}

export function line(options) {
  return new Entity({ ease: linear, t0: 0, t1: 1, segments: 32, ...options, draw: drawLine });
}

export function circle(options) {
  return new Entity({ ...options, draw: drawCircle });
}

export function arc(options) {
  return new Entity({ startAngle: 0, endAngle: Math.PI * 2, ...options, draw: drawArc });
}
