import { lerpColor } from './color';
import { easeInOutSine, lerp } from './math';

const INTERPOLATORS = {
  x0: lerp,
  x1: lerp,
  y0: lerp,
  y1: lerp,
  color: lerpColor,
  alpha: lerp,
};

export class Tweener {
  constructor() {
    this.tweens = [];
  }

  add(target, { startAt, duration, from, to, ease = easeInOutSine }) {
    const start = {};
    for (const key of Object.keys(to)) {
      start[key] = from[key] ?? target[key];
    }

    let slot = this.tweens.length;
    while (slot > 0 && this.tweens[slot - 1].startAt > startAt) slot--;
    this.tweens.splice(slot, 0, { target, startAt, duration, from: start, to, ease });

    return this;
  }

  clear() {
    this.tweens.length = 0;
    return this;
  }

  update(elapsed) {
    for (const tween of this.tweens) {
      if (tween.startAt > elapsed) break;

      const progress = tween.ease(
        tween.duration > 0 ? Math.min((elapsed - tween.startAt) / tween.duration, 1) : 1,
      );

      for (const key of Object.keys(tween.to)) {
        const from = tween.from[key];
        const to = tween.to[key];
        if (from === undefined || to === undefined) continue;

        tween.target[key] = INTERPOLATORS[key](from, to, progress);
      }
    }

    return this;
  }
}
