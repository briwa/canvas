export class Renderer {
  constructor(canvas, entities) {
    this.canvas = canvas;
    this.entities = entities;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire a 2d rendering context');

    this.ctx = ctx;
  }

  update() {
    this.clear();

    for (const entity of this.entities) {
      entity.render(this.ctx);
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
