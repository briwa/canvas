import { DurationStep } from './duration';
import { Tweener } from '../tweener';

export class TweenerStep extends DurationStep {
  constructor({ duration, entities } = {}) {
    super({ duration, entities });

    this.tweener = new Tweener();
  }

  begin(time, entities) {
    this.tweener.clear();
    super.begin(time, entities);
  }

  tween(target, options) {
    this.tweener.add(target, options);
    return this;
  }

  update(time) {
    super.update(time);
    this.tweener.update(this.elapsed);
  }
}
