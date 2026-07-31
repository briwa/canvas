import { Input } from './base';

export class MouseInput extends Input {
  constructor() {
    super();

    this.x = 0;
    this.y = 0;
    this.inside = false;
    this.down = false;
    this.pressed = false;
    this.released = false;
  }

  bindings() {
    return {
      pointerdown: this.onDown,
      pointermove: this.onMove,
      pointerup: this.onUp,
      pointerleave: this.onLeave,
    };
  }

  locate(event) {
    const target = this.target;
    const bounds = target.getBoundingClientRect?.();

    if (!bounds?.width || !bounds?.height) {
      return { x: event.offsetX ?? 0, y: event.offsetY ?? 0 };
    }

    return {
      x: ((event.clientX - bounds.left) * (target.width ?? bounds.width)) / bounds.width,
      y: ((event.clientY - bounds.top) * (target.height ?? bounds.height)) / bounds.height,
    };
  }

  track(event) {
    const { x, y } = this.locate(event);

    this.x = x;
    this.y = y;
    this.inside = true;
  }

  onMove(event) {
    this.track(event);
  }

  onDown(event) {
    this.track(event);

    this.down = true;
    this.pressed = true;
  }

  onUp(event) {
    this.track(event);

    this.down = false;
    this.released = true;
  }

  onLeave() {
    this.inside = false;
    this.down = false;
  }

  flush() {
    this.pressed = false;
    this.released = false;

    return this;
  }

  reset() {
    this.down = false;

    return this.flush();
  }
}
