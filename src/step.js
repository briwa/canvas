import { Tweener } from './tweener';

export class Step {
  constructor({ duration } = {}) {
    this.duration = duration;
    this.entities = [];
    this.startTime = 0;
    this.time = 0;
    this.tweener = new Tweener();
  }

  begin(time, entities) {
    this.tweener.clear();

    this.startTime = time;
    this.time = time;
    this.entities = entities;
    this.enter();
  }

  enter() {}

  tween(target, options) {
    this.tweener.add(target, options);
    return this;
  }

  get elapsed() {
    return this.time - this.startTime;
  }

  get progress() {
    if (!this.duration) throw new Error('A duration is required');

    return Math.min(this.elapsed / this.duration, 1);
  }

  get finished() {
    return this.progress >= 1;
  }

  update(time) {
    this.time = time;
    this.tweener.update(this.elapsed);
  }

  destroy() {}
}
