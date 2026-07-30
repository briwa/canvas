export function rgb(color) {
  return `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;
}

export class Entity {
  constructor({ shape, x0 = 0, x1 = 0, y0 = 0, y1 = 0, color, alpha = 1, lineWidth = 1 } = {}) {
    this.shape = shape;
    this.x0 = x0;
    this.x1 = x1;
    this.y0 = y0;
    this.y1 = y1;
    this.color = { r: 0, g: 0, b: 0, ...color };
    this.style = rgb(this.color);
    this.alpha = alpha;
    this.lineWidth = lineWidth;
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
