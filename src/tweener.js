import { easeInOutSine, lerp } from './math';

function restyle(entry) {
  const color = entry.color;

  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);

  if (r !== entry.r || g !== entry.g || b !== entry.b) {
    entry.r = r;
    entry.g = g;
    entry.b = b;
    entry.target.style = `rgb(${r} ${g} ${b})`;
  }
}

class Tween {
  constructor(target, { startAt, duration, from, to, ease = easeInOutSine }) {
    this.startAt = startAt;
    this.endAt = duration > 0 ? startAt + duration : startAt;
    this.duration = duration;
    this.ease = ease;
    this.settled = false;
    this.props = [];
    this.colors = [];

    for (const key of Object.keys(to)) {
      const end = to[key];

      if (end !== null && typeof end === 'object') {
        const into = target[key];

        for (const leaf of Object.keys(end)) {
          this.props.push({
            into,
            key: leaf,
            from: from?.[key]?.[leaf] ?? into[leaf],
            to: end[leaf],
          });
        }

        if (key === 'color') this.colors.push({ target, color: into, r: NaN, g: NaN, b: NaN });

        continue;
      }

      this.props.push({ into: target, key, from: from?.[key] ?? target[key], to: end });
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

    for (const entry of this.colors) {
      restyle(entry);
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
