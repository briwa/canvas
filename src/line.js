import { Entity } from './entity';

export class Line extends Entity {
  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.style;

    ctx.beginPath();
    ctx.moveTo(this.x0, this.y0);
    ctx.lineTo(this.x1, this.y1);
    ctx.stroke();
    ctx.restore();
  }
}
