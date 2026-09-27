import { easeInOutSine, lerp } from './math';

const OPTIONS = new Set(['duration', 'ease', 'stagger', 'from', 'startAt']);

function prop(into, key, from, to, name = key) {
  if (typeof from !== 'number' || typeof to !== 'number') {
    const hint = OPTIONS.has(name) ? ` "${name}" is an option; options go in the third argument.` : '';
    throw new TypeError(`Can't tween "${name}": it needs a number on both ends, got ${from} and ${to}.${hint}`);
  }

  return { into, key, from, to };
}

class Tween {
  constructor(target, { startAt, duration, from, to, ease = easeInOutSine }) {
    this.startAt = startAt;
    this.endAt = duration > 0 ? startAt + duration : startAt;
    this.duration = duration;
    this.ease = ease;
    this.settled = false;
    this.props = [];

    for (const key of Object.keys(to)) {
      const end = to[key];

      if (end !== null && typeof end === 'object') {
        const into = target[key];

        if (into === null || typeof into !== 'object') {
          throw new TypeError(`Can't tween "${key}": the target has no "${key}" to tween into.`);
        }

        for (const leaf of Object.keys(end)) {
          this.props.push(prop(into, leaf, from?.[key]?.[leaf] ?? into[leaf], end[leaf], `${key}.${leaf}`));
        }

        continue;
      }

      this.props.push(prop(target, key, from?.[key] ?? target[key], end));
    }
  }

  update(elapsed) {
    if (this.settled) {
      if (elapsed >= this.endAt) return;
      this.settled = false;
    }

    const progress = this.ease(
      this.duration > 0 ? Math.min((elapsed - this.startAt) / this.duration, 1) : 1,
    );

    for (const prop of this.props) {
      prop.into[prop.key] = lerp(prop.from, prop.to, progress);
    }

    this.settled = elapsed >= this.endAt;
  }
}

export class Tweener {
  constructor() {
    this.tweens = [];
  }

  add(target, options) {
    const tween = new Tween(target, options);

    let slot = this.tweens.length;
    while (slot > 0 && this.tweens[slot - 1].startAt > tween.startAt) {
      slot--;
    }

    this.tweens.splice(slot, 0, tween);

    return this;
  }

  clear() {
    this.tweens.length = 0;
    return this;
  }

  update(elapsed) {
    for (const tween of this.tweens) {
      if (tween.startAt > elapsed) break;
      tween.update(elapsed);
    }

    return this;
  }
}
