export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire a 2d rendering context');

    this.ctx = ctx;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(entities) {
    const ctx = this.ctx;

    let alpha = -1;
    let style = null;

    ctx.save();

    for (const entity of entities) {
      if (entity.alpha !== alpha) {
        alpha = entity.alpha;
        ctx.globalAlpha = alpha;
      }

      const next = entity.style;

      if (next !== style) {
        style = next;
        ctx.fillStyle = style;
        ctx.strokeStyle = style;
      }

      entity.draw(ctx, entity);
    }

    ctx.restore();
  }
}
