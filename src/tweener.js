import { lerpRgb, parseColor } from './color';
import { easeInOutSine, lerp } from './math';

const NUMBER = { interpolate: lerp };
const COLOR = { interpolate: lerpRgb, prepare: parseColor };

const INTERPOLATORS = {
  x0: NUMBER,
  x1: NUMBER,
  y0: NUMBER,
  y1: NUMBER,
  color: COLOR,
  alpha: NUMBER,
};

export class Tweener {
  constructor() {
    this.tweens = [];
  }

  add(target, { startAt, duration, from, to, ease = easeInOutSine }) {
    const props = [];

    for (const key of Object.keys(to)) {
      const interpolator = INTERPOLATORS[key];
      if (!interpolator) throw new Error(`Cannot tween property: ${key}`);

      const start = from[key] ?? target[key];
      const end = to[key];
      if (start === undefined || end === undefined) continue;

      const { interpolate, prepare } = interpolator;
      props.push({
        key,
        interpolate,
        from: prepare ? prepare(start) : start,
        to: prepare ? prepare(end) : end,
      });
    }

    let slot = this.tweens.length;
    while (slot > 0 && this.tweens[slot - 1].startAt > startAt) {
      slot--;
    }

    this.tweens.splice(slot, 0, {
      target,
      startAt,
      endAt: duration > 0 ? startAt + duration : startAt,
      duration,
      ease,
      props,
      settled: false,
    });

    return this;
  }

  clear() {
    this.tweens.length = 0;
    return this;
  }

  update(elapsed) {
    for (const tween of this.tweens) {
      if (tween.startAt > elapsed) break;

      if (tween.settled) {
        // Already holding its final values, and elapsed hasn't rewound past the end.
        if (elapsed >= tween.endAt) continue;
        tween.settled = false;
      }

      const progress = tween.ease(
        tween.duration > 0 ? Math.min((elapsed - tween.startAt) / tween.duration, 1) : 1,
      );

      for (const prop of tween.props) {
        tween.target[prop.key] = prop.interpolate(prop.from, prop.to, progress);
      }

      tween.settled = elapsed >= tween.endAt;
    }

    return this;
  }
}
