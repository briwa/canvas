import { beforeEach, describe, expect, it } from 'vitest';

import { Rect } from '../src/rect';
import { linear } from '../src/math';
import { Step } from '../src/step';
import { Timeline } from '../src/timeline';

class Fade extends Step {
  enter() {
    this.tween(this.entities[0], {
      startAt: 0,
      duration: this.duration,
      from: { alpha: 0 },
      to: { alpha: 1 },
      ease: linear,
    });
  }
}

describe('Timeline', () => {
  let target;
  let first;
  let second;
  let timeline;

  beforeEach(() => {
    target = new Rect({ alpha: 0 });
    first = new Fade({ duration: 100 });
    second = new Fade({ duration: 100 });
    timeline = new Timeline([target], [first, second]);
  });

  it('starts idle', () => {
    expect(timeline.index).toBe(-1);
    expect(timeline.step).toBeNull();
    expect(timeline.done).toBe(false);
  });

  it('begins the first step and returns it', () => {
    expect(timeline.update(1000)).toBe(first);
    expect(timeline.index).toBe(0);
    expect(first.startTime).toBe(1000);
    expect(first.elapsed).toBe(0);
  });

  it('drives tweens on the active step', () => {
    timeline.update(1000);
    timeline.update(1050);

    expect(first.progress).toBe(0.5);
    expect(first.finished).toBe(false);
    expect(target.alpha).toBe(0.5);
  });

  it('releases a step once it finishes', () => {
    timeline.update(1000);
    timeline.update(1100);

    expect(first.finished).toBe(true);
    expect(target.alpha).toBe(1);
    expect(timeline.step).toBeNull();
  });

  it('advances to the next step', () => {
    timeline.update(1000);
    timeline.update(1100);

    expect(timeline.update(1100)).toBe(second);
    expect(timeline.index).toBe(1);
    expect(second.startTime).toBe(1100);
  });

  it('completes once every step has run', () => {
    timeline.update(1000);
    timeline.update(1100);
    timeline.update(1100);
    timeline.update(1200);

    expect(timeline.update(1300)).toBeNull();
    expect(timeline.done).toBe(true);
    expect(timeline.update(1400)).toBeNull();
  });

  it('reset returns it to the initial state', () => {
    timeline.update(1000);
    timeline.update(1100);
    timeline.reset();

    expect(timeline.index).toBe(-1);
    expect(timeline.step).toBeNull();
    expect(timeline.done).toBe(false);
  });

  it('completes immediately with no steps', () => {
    const empty = new Timeline([target], []);

    expect(empty.update(0)).toBeNull();
    expect(empty.done).toBe(true);
  });
});
