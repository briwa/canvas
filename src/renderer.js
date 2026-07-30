import { drawLine, drawRect } from './shapes';

const SHAPES = { line: drawLine, rect: drawRect };

export class Renderer {
  constructor(canvas, { shapes } = {}) {
    this.canvas = canvas;
    this.shapes = shapes ? { ...SHAPES, ...shapes } : SHAPES;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire a 2d rendering context');

    this.ctx = ctx;
  }

  resolve(entity) {
    const draw = this.shapes[entity.shape];
    if (!draw) throw new Error(`Nothing knows how to draw a "${entity.shape}"`);

    return draw;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(entities, draws) {
    const ctx = this.ctx;

    let alpha = -1;
    let style = null;

    ctx.save();

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

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

      draws[i](ctx, entity);
    }

    ctx.restore();
  }
}
