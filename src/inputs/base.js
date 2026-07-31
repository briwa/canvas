export class Input {
  constructor() {
    this.target = null;
    this.listeners = [];
  }

  get attached() {
    return this.listeners.length > 0;
  }

  bindings() {
    return {};
  }

  attach(target) {
    if (this.attached) return this;

    this.target = target ?? null;

    if (!this.target?.addEventListener) return this;

    for (const [type, handler] of Object.entries(this.bindings())) {
      const listener = (event) => handler.call(this, event);

      this.target.addEventListener(type, listener);
      this.listeners.push([type, listener]);
    }

    return this;
  }

  detach() {
    for (const [type, listener] of this.listeners) {
      this.target.removeEventListener(type, listener);
    }

    this.listeners = [];

    return this;
  }

  flush() {
    return this;
  }

  reset() {
    return this;
  }
}
