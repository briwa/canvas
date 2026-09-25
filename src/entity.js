import { linear } from './math';

export function rgb(color) {
  return `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;
}

export class Entity {
  constructor({
    shape,
    x0 = 0,
    x1 = 0,
    y0 = 0,
    y1 = 0,
    color,
    alpha = 1,
    lineWidth = 1,
    startAngle = 0,
    endAngle = Math.PI * 2,
    ease = linear,
    steps = 32,
    t0 = 0,
    t1 = 1,
  } = {}) {
    this.shape = shape;
    this.x0 = x0;
    this.x1 = x1;
    this.y0 = y0;
    this.y1 = y1;
    this.color = { r: 0, g: 0, b: 0, ...color };
    this.style = rgb(this.color);
    this.alpha = alpha;
    this.lineWidth = lineWidth;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.ease = ease;
    this.steps = steps;
    this.t0 = t0;
    this.t1 = t1;
  }

  recolor({ r, g, b }) {
    const color = this.color;

    if (r !== undefined) color.r = r;
    if (g !== undefined) color.g = g;
    if (b !== undefined) color.b = b;

    this.style = rgb(color);

    return this;
  }

  snapshot() {
    return {
      x0: this.x0,
      x1: this.x1,
      y0: this.y0,
      y1: this.y1,
      alpha: this.alpha,
      lineWidth: this.lineWidth,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
      ease: this.ease,
      steps: this.steps,
      t0: this.t0,
      t1: this.t1,
      r: this.color.r,
      g: this.color.g,
      b: this.color.b,
    };
  }

  restore(state) {
    this.x0 = state.x0;
    this.x1 = state.x1;
    this.y0 = state.y0;
    this.y1 = state.y1;
    this.alpha = state.alpha;
    this.lineWidth = state.lineWidth;
    this.startAngle = state.startAngle;
    this.endAngle = state.endAngle;
    this.ease = state.ease;
    this.steps = state.steps;
    this.t0 = state.t0;
    this.t1 = state.t1;

    const color = this.color;
    color.r = state.r;
    color.g = state.g;
    color.b = state.b;

    this.style = rgb(color);
  }
}

export function rect(options) {
  return new Entity({ ...options, shape: 'rect' });
}

export function line(options) {
  return new Entity({ ...options, shape: 'line' });
}

export function circle(options) {
  return new Entity({ ...options, shape: 'circle' });
}

export function arc(options) {
  return new Entity({ ...options, shape: 'arc' });
}

export function curve(options) {
  return new Entity({ ...options, shape: 'curve' });
}
