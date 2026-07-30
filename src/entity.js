export class Entity {
  constructor({ shape, x0 = 0, x1 = 0, y0 = 0, y1 = 0, color, alpha = 1, lineWidth = 1 } = {}) {
    this.shape = shape;
    this.x0 = x0;
    this.x1 = x1;
    this.y0 = y0;
    this.y1 = y1;
    this.color = { r: 0, g: 0, b: 0, ...color };
    this.alpha = alpha;
    this.lineWidth = lineWidth;

    this.cachedR = NaN;
    this.cachedG = NaN;
    this.cachedB = NaN;
    this.cachedStyle = '';
  }

  get style() {
    const r = Math.round(this.color.r);
    const g = Math.round(this.color.g);
    const b = Math.round(this.color.b);

    if (r !== this.cachedR || g !== this.cachedG || b !== this.cachedB) {
      this.cachedR = r;
      this.cachedG = g;
      this.cachedB = b;
      this.cachedStyle = `rgb(${r} ${g} ${b})`;
    }

    return this.cachedStyle;
  }

  snapshot() {
    return {
      x0: this.x0,
      x1: this.x1,
      y0: this.y0,
      y1: this.y1,
      alpha: this.alpha,
      lineWidth: this.lineWidth,
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
    this.color.r = state.r;
    this.color.g = state.g;
    this.color.b = state.b;
  }
}

export function rect(options) {
  return new Entity({ ...options, shape: 'rect' });
}

export function line(options) {
  return new Entity({ ...options, shape: 'line' });
}
