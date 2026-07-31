import { Input } from './base';

const ALIASES = { ' ': 'space', spacebar: 'space', esc: 'escape' };

function normalize(key) {
  const name = String(key).toLowerCase();

  return ALIASES[name] ?? name;
}

export class KeyboardInput extends Input {
  constructor({ prevent = [] } = {}) {
    super();

    this.prevent = new Set(prevent.map(normalize));
    this.keys = new Set();
    this.presses = new Set();
    this.releases = new Set();
  }

  bindings() {
    return {
      keydown: this.onDown,
      keyup: this.onUp,
      blur: this.onBlur,
    };
  }

  held(...keys) {
    return keys.some((key) => this.keys.has(normalize(key)));
  }

  pressed(...keys) {
    return keys.some((key) => this.presses.has(normalize(key)));
  }

  released(...keys) {
    return keys.some((key) => this.releases.has(normalize(key)));
  }

  axis(negative, positive) {
    return (this.held(...positive) ? 1 : 0) - (this.held(...negative) ? 1 : 0);
  }

  onDown(event) {
    const key = normalize(event.key);

    if (this.prevent.has(key)) event.preventDefault?.();
    if (!this.keys.has(key)) this.presses.add(key);

    this.keys.add(key);
  }

  onUp(event) {
    const key = normalize(event.key);

    if (this.prevent.has(key)) event.preventDefault?.();

    this.keys.delete(key);
    this.releases.add(key);
  }

  onBlur() {
    for (const key of this.keys) {
      this.releases.add(key);
    }

    this.keys.clear();
  }

  flush() {
    this.presses.clear();
    this.releases.clear();

    return this;
  }

  reset() {
    this.keys.clear();

    return this.flush();
  }
}
