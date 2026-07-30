import { beforeEach, describe, expect, it } from 'vitest';

import {
  BaseStep,
  DurationStep,
  ParallelStep,
  RepeatStep,
  SequenceStep,
  TweenerStep,
} from '../src/steps';
import { rect } from '../src/entity';
import { Scene } from '../src/scene';
import { Timeline } from '../src/timeline';
import { linear } from '../src/math';

class Fade extends TweenerStep {
  enter() {
    for (const entity of this.entities) {
      this.tween(entity, {
        startAt: 0,
        duration: this.duration,
        from: { alpha: 0 },
        to: { alpha: 1 },
        ease: linear,
      });
    }
  }
}

class Drift extends TweenerStep {
  constructor({ duration, entities, dx } = {}) {
    super({ duration, entities });
    this.dx = dx;
  }

  enter() {
    for (const entity of this.entities) {
      this.tween(entity, {
        startAt: 0,
        duration: this.duration,
        ease: linear,
        to: { x0: entity.x0 + this.dx, x1: entity.x1 + this.dx },
      });
    }
  }
}

describe('Scene', () => {
  const CANOPIES = [0, 60];

  function build({ loop = false } = {}) {
    const bands = [rect({ alpha: 0 }), rect({ alpha: 0 })];
    const canopies = CANOPIES.map((x) => rect({ x0: x, x1: x + 40 }));
    const hero = rect({ x0: 10, x1: 36, alpha: 0 });

    const sky = new Timeline({
      entities: [bands],
      repeat: true,
      steps: [new Fade({ duration: 600 }), new Fade({ duration: 600 })],
    });

    const trees = new Timeline({
      entities: [canopies],
      repeat: true,
      steps: [new Drift({ duration: 300, dx: 8 }), new Drift({ duration: 300, dx: -8 })],
    });

    const actor = new Timeline({
      entities: [hero],
      steps: [new Fade({ duration: 200 }), new Drift({ duration: 600, dx: 100 })],
    });

    const scene = new Scene({ timelines: [sky, trees, actor], loop });

    return { scene, sky, trees, actor, bands, canopies, hero };
  }

  it('draws its layers in order', () => {
    const { scene, bands, canopies, hero } = build();

    expect(scene.entities).toEqual([...bands, ...canopies, hero]);
  });

  it('spans the longest layer that ends', () => {
    const { scene } = build();

    expect(scene.span).toBe(800);
  });

  it('runs indefinitely when no layer ends', () => {
    const { sky, trees } = build();
    const scene = new Scene({ timelines: [sky, trees] });

    scene.advance(0);
    scene.advance(10_000);

    expect(scene.span).toBe(null);
    expect(scene.finished).toBe(false);
  });

  it('runs its layers off one clock', () => {
    const { scene, sky, trees, canopies } = build();

    scene.advance(1000);
    scene.advance(1300);

    expect(scene.elapsed).toBe(300);
    expect(sky.root.step.index).toBe(0);
    expect(trees.root.step.index).toBe(1);
    expect(canopies[0].x0).toBeCloseTo(8);

    scene.advance(1600);

    expect(trees.root.count).toBe(1);
    expect(canopies[0].x0).toBeCloseTo(CANOPIES[0]);
  });

  it('finishes with the layers that end, cutting the endless ones short', () => {
    const { scene, sky, trees, actor, hero } = build();

    for (let time = 0; time <= 700; time += 100) scene.advance(time);

    expect(scene.finished).toBe(false);

    scene.advance(800);

    expect(scene.finished).toBe(true);
    expect(actor.finished).toBe(true);
    expect(hero.alpha).toBe(1);
    expect(hero.x0).toBeCloseTo(110);

    expect(sky.finished).toBe(false);
    expect(sky.root.step.index).toBe(1);
    expect(trees.finished).toBe(false);
    expect(trees.root.count).toBe(1);
  });

  it('waits for every layer that ends', () => {
    const short = new Timeline({ entities: [rect()], steps: [new Fade({ duration: 100 })] });
    const long = new Timeline({ entities: [rect()], steps: [new Fade({ duration: 400 })] });
    const scene = new Scene({ timelines: [short, long] });

    scene.advance(0);
    scene.advance(100);

    expect(short.finished).toBe(true);
    expect(scene.finished).toBe(false);

    scene.advance(400);

    expect(scene.finished).toBe(true);
  });

  it('rewinds every layer when it replays', () => {
    const { scene, sky, trees, actor } = build();

    for (let time = 0; time <= 800; time += 100) scene.advance(time);

    expect(scene.finished).toBe(true);

    scene.reset();

    expect(scene.finished).toBe(false);
    expect(scene.elapsed).toBe(0);

    scene.advance(5000);

    expect(scene.elapsed).toBe(0);
    expect(actor.root.index).toBe(0);
    expect(sky.root.count).toBe(0);
    expect(sky.root.step.index).toBe(0);
    expect(trees.root.step.index).toBe(0);
  });

  it('loops itself once it finishes', () => {
    const { scene, actor, hero } = build({ loop: true });

    for (let time = 0; time <= 800; time += 100) scene.render(time);

    expect(scene.finished).toBe(false);
    expect(hero.x0).toBe(10);

    scene.render(900);

    expect(scene.elapsed).toBe(0);
    expect(actor.root.index).toBe(0);
  });
});
