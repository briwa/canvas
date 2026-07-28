export class Entity {
  constructor({ x0 = 0, x1 = 0, y0 = 0, y1 = 0, color, alpha = 1, lineWidth = 1 } = {}) {
    this.x0 = x0;
    this.x1 = x1;
    this.y0 = y0;
    this.y1 = y1;
    this.color = { r: 0, g: 0, b: 0, ...color };
    this.alpha = alpha;
    this.lineWidth = lineWidth;
  }

  get style() {
    const { r, g, b } = this.color;

    return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
  }

  render(_ctx) {}
}
