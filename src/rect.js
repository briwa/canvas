import { Entity } from './entity';

export class Rect extends Entity {
  get width() {
    return this.x1 - this.x0;
  }

  get height() {
    return this.y1 - this.y0;
  }

  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.style;
    ctx.fillRect(this.x0, this.y0, this.width, this.height);
    ctx.restore();
  }
}
