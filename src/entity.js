export class Entity {
  constructor({
    x0 = 0,
    x1 = 0,
    y0 = 0,
    y1 = 0,
    color = '#000000',
    alpha = 1,
    lineWidth = 1,
  } = {}) {
    this.x0 = x0;
    this.x1 = x1;
    this.y0 = y0;
    this.y1 = y1;
    this.color = color;
    this.alpha = alpha;
    this.lineWidth = lineWidth;
  }

  render(_ctx) {}
}
