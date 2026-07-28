import { easeInOutSine, lerp } from './math';

export class Tweener {
  constructor() {
    this.tweens = [];
  }

  add(target, { startAt, duration, from, to, ease = easeInOutSine }) {
    const props = [];

    for (const key of Object.keys(to)) {
      const end = to[key];

      if (end !== null && typeof end === 'object') {
        const into = target[key];

        for (const leaf of Object.keys(end)) {
          props.push({ into, key: leaf, from: from?.[key]?.[leaf] ?? into[leaf], to: end[leaf] });
        }

        continue;
      }

      props.push({ into: target, key, from: from?.[key] ?? target[key], to: end });
    }

    let slot = this.tweens.length;
    while (slot > 0 && this.tweens[slot - 1].startAt > startAt) {
      slot--;
    }

    this.tweens.splice(slot, 0, {
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
        if (elapsed >= tween.endAt) continue;
        tween.settled = false;
      }

      const progress = tween.ease(
        tween.duration > 0 ? Math.min((elapsed - tween.startAt) / tween.duration, 1) : 1,
      );

      for (const prop of tween.props) {
        prop.into[prop.key] = lerp(prop.from, prop.to, progress);
      }

      tween.settled = elapsed >= tween.endAt;
    }

    return this;
  }
}
