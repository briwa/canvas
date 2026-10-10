# Scene

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

| option | what it is |
| --- | --- |
| `canvas` | the `<canvas>` to draw on |
| `layers` | the shapes and steps it starts with, drawn back to front, all running at once |
| `inputs` | a `MouseInput` or `KeyboardInput` to listen with, like in [spawn](#scene) and [machine](#machine) |
| `loop` | start over once every layer that can end has ended |

| method | what it does |
| --- | --- |
| `add(shapes, step?)` | draw `shapes` from now on, and run `step` on them if given |
| `spawn(shapes, step, done?)` | add `shapes` and run `step` on them, then remove them once it ends and call `done` (see [spawn](#spawn)) |
| `remove(shapes)` | stop drawing `shapes`, and stop the steps that have nothing left to move |
| `run(shapes, step, done?)` | run `step` on `shapes`, then call `done`; returns a function that stops it |
| `after(ms, fn)` / `every(ms, fn)` | call `fn` once later, or over and over; each returns a function that stops it |
| `onUpdate(fn)` | call `fn(scene)` each frame after the steps; returns a function that stops listening |
| `render(time)` | move to `time` (in ms) and draw |
| `pause()` / `play()` | stop and resume the clock; `scene.paused` says which |
| `reset()` | go back to how the scene was on its first frame: those shapes as they were, their steps from the start, and anything added since gone |
| `onFinish(fn)` | call `fn` each time the scene finishes; returns a function that stops listening |
| `destroy()` | stop listening to inputs, and stop every step |

`scene.dt` is the time since the last frame, and `scene.elapsed` is the time on the scene's clock, which stops while it's paused. Shapes are drawn in the order they were added, unless they have a `z`: lower goes behind. Anywhere a step goes, a function that makes one works too.

`layer(children, step?)` draws its children in order, which can be shapes or other layers. Its step works on every shape inside it, unless a step names its own targets. A layer without a step just draws.

## Finishing and looping

Layers that run forever, or have no step, don't count towards finishing, and neither do steps added later. With `loop: true`, the scene starts over once the rest is done.

```js sandbox=canvas 960x480 code
const { Scene, layer, circle, rect, step, tween, move, wait, sequence, repeat, easeInOutSine, linear, mix } = Canvas;

const HORIZON = 330;
const BANDS = 6;
const SUN = 34;

const DUSK = { top: { r: 38, g: 32, b: 62 }, low: { r: 216, g: 118, b: 82 } };
const DAWN = { top: { r: 46, g: 56, b: 96 }, low: { r: 196, g: 122, b: 132 } };
const DAY = { top: { r: 78, g: 140, b: 206 }, low: { r: 190, g: 218, b: 238 } };

function walk({ duration, dx, strides, lift = 7 }) {
  const beats = strides * 2;
  const span = duration / beats;

  return step({
    duration,
    start(s) {
      for (const part of s.targets) {
        s.tween(part, { startAt: 0, duration, ease: linear, to: { x0: part.x0 + dx, x1: part.x1 + dx } });

        const { y0, y1 } = part;

        for (let i = 0; i < beats; i++) {
          const up = i % 2 === 0;

          s.tween(part, {
            startAt: i * span,
            duration: span,
            ease: easeInOutSine,
            from: { y0: up ? y0 : y0 - lift, y1: up ? y1 : y1 - lift },
            to: { y0: up ? y0 - lift : y0, y1: up ? y1 - lift : y1 },
          });
        }
      }
    },
  });
}

function tree(x, scale) {
  const trunk = rect({
    x0: x - (13 * scale) / 2,
    x1: x + (13 * scale) / 2,
    y0: HORIZON - 74 * scale,
    y1: HORIZON,
    color: { r: 54, g: 40, b: 34 },
  });

  const canopy = circle({
    x0: x - (66 * scale) / 2,
    x1: x + (66 * scale) / 2,
    y0: HORIZON - 74 * scale - 60 * scale + 14 * scale,
    y1: HORIZON - 74 * scale + 14 * scale,
    color: { r: 46, g: 98, b: 64 },
  });

  return { trunk, canopy };
}

const bands = Array.from({ length: BANDS }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: (i * HORIZON) / BANDS,
    y1: ((i + 1) * HORIZON) / BANDS + 1,
    color: mix(DUSK.top, DUSK.low, i / (BANDS - 1)),
  }),
);

const sun = circle({ x0: 664, x1: 664 + SUN, y0: HORIZON + 26, y1: HORIZON + 26 + SUN, color: { r: 250, g: 226, b: 168 } });
const ground = rect({ x0: 0, x1: width, y0: HORIZON, y1: height, color: { r: 34, g: 50, b: 42 } });

const trees = [tree(120, 1), tree(310, 0.8), tree(620, 1.1), tree(848, 0.9)];
const trunks = trees.map((t) => t.trunk);
const canopies = trees.map((t) => t.canopy);

const body = rect({ x0: 60, x1: 86, y0: HORIZON - 46, y1: HORIZON, alpha: 0, color: { r: 232, g: 98, b: 76 } });
const head = circle({ x0: 64, x1: 82, y0: HORIZON - 66, y1: HORIZON - 46, alpha: 0, color: { r: 246, g: 208, b: 178 } });
const hero = [body, head];

const skyTo = ({ top, low }, duration) =>
  tween((_, i) => ({ color: mix(top, low, i / (BANDS - 1)) }), { duration, ease: linear });

const sunTo = (y0, duration, ease) => tween({ y0, y1: y0 + SUN }, { duration, ease });

const sway = (x) => move({ x }, { duration: 1300, ease: easeInOutSine });

const hop = (y) => move({ y }, { duration: 260, ease: easeInOutSine });

const scene = new Scene({
  canvas,
  loop: true,
  layers: [
    layer(bands, repeat(sequence(skyTo(DAWN, 2200), skyTo(DAY, 2800), skyTo(DUSK, 2800)))),
    layer(
      [sun],
      repeat(
        sequence(
          sunTo(HORIZON - 4, 2200, linear),
          sunTo(68, 2800, easeInOutSine),
          sunTo(HORIZON + 26, 2800, easeInOutSine),
        ),
      ),
    ),
    layer([ground, trunks]),
    layer(canopies, repeat(sequence(sway(7), sway(-7)))),
    layer(
      hero,
      sequence(
        tween({ alpha: 1 }, { duration: 700 }),
        walk({ duration: 2500, dx: 330, strides: 7 }),
        hop(-42),
        hop(42),
        walk({ duration: 2500, dx: 330, strides: 7 }),
        wait(2400),
        tween({ alpha: 0 }, { duration: 700 }),
      ),
    ),
  ],
});

loop((t) => scene.render(t));
```

## Your own controls

`onFinish` fires each time the scene gets to the end, whether or not it loops.

```js sandbox=root 640x300 control=none code
const { Scene, layer, circle, tween, sequence, easeInOutSine } = Canvas;

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height - 48;

const bar = document.createElement('div');
bar.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;height:48px;font:13px system-ui';
root.append(canvas, bar);

function button(label, onClick) {
  const el = document.createElement('button');
  el.textContent = label;
  el.onclick = onClick;
  bar.append(el);
  return el;
}

const ball = circle({ x0: 20, y0: 106, x1: 60, y1: 146, color: { r: 224, g: 122, b: 95 } });

const scene = new Scene({
  canvas,
  loop: true,
  layers: [
    layer(
      [ball],
      sequence(
        tween({ x0: width - 60, x1: width - 20 }, { duration: 1500, ease: easeInOutSine }),
        tween({ alpha: 0 }, { duration: 400 }),
      ),
    ),
  ],
});

const pause = button('pause', () => {
  if (scene.paused) scene.play();
  else scene.pause();
  pause.textContent = scene.paused ? 'play' : 'pause';
});

button('reset', () => scene.reset());

const looping = button('loop: on', () => {
  scene.loop = !scene.loop;
  looping.textContent = scene.loop ? 'loop: on' : 'loop: off';
});

const finished = document.createElement('span');
finished.textContent = 'finished: 0';
bar.append(finished);

let count = 0;
scene.onFinish(() => {
  count++;
  finished.textContent = `finished: ${count}`;
});

loop((t) => scene.render(t));
```

## spawn

A spawned shape lives for as long as its step does. `remove` it to cut that short; its `done` isn't called then.

Stars spawn on their own, and click to throw sparks. The bar at the bottom counts the stars and sparks in the scene. Change how often stars fall and how many sparks a click throws from the figure's settings.

```js sandbox=canvas 640x300 control=none code
const { Scene, MouseInput, rect, circle, line, move, moveTo, tween, wait, parallel, sequence, linear, easeInOutSine, mix, polar } = Canvas;

const HORIZON = 230;
const STAR = { r: 255, g: 236, b: 196 };
const SPARK = { r: 255, g: 190, b: 112 };

const rate = knob(220, { min: 40, max: 800, step: 10 });
const burst = knob(10, { min: 3, max: 30, step: 1 });

const mouse = new MouseInput();
const scene = new Scene({ canvas, inputs: [mouse] });

const sky = Array.from({ length: 5 }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: (i * HORIZON) / 5,
    y1: ((i + 1) * HORIZON) / 5 + 1,
    color: mix({ r: 14, g: 16, b: 36 }, { r: 62, g: 46, b: 90 }, i / 4),
  }),
);

const ground = rect({ x0: 0, x1: width, y0: HORIZON, y1: height, z: 1, color: { r: 22, g: 27, b: 42 } });

const hills = [
  circle({ x0: -140, x1: 360, y0: HORIZON - 64, y1: HORIZON + 300, z: 1, color: { r: 26, g: 32, b: 50 } }),
  circle({ x0: 300, x1: 820, y0: HORIZON - 36, y1: HORIZON + 300, z: 1, color: { r: 22, g: 27, b: 42 } }),
];

const meter = rect({ x0: 16, x1: 16, y0: height - 14, y1: height - 10, z: 2, color: SPARK });

scene.add(sky).add(ground).add(hills).add(meter);

const scenery = scene.size;

const fall = () =>
  parallel(
    move({ x: 240, y: 150 }, { duration: 1500, ease: linear }),
    sequence(tween({ alpha: 1 }, { duration: 300 }), wait(500), tween({ alpha: 0 }, { duration: 700 })),
  );

scene.every(rate, () => {
  const x = Math.random() * width - 120;
  const y = Math.random() * 90;

  scene.spawn(line({ x0: x, y0: y, x1: x + 16, y1: y + 10, alpha: 0, lineWidth: 2, color: STAR }), fall);
});

scene.onUpdate(() => {
  meter.x1 = 16 + (scene.size - scenery) * 6;

  if (!mouse.pressed) return;

  for (let i = 0; i < burst; i++) {
    const to = polar(mouse, (i * 360) / burst + Math.random() * 20, 40 + Math.random() * 30);

    scene.spawn(
      circle({ x0: mouse.x - 3, x1: mouse.x + 3, y0: mouse.y - 3, y1: mouse.y + 3, z: 2, color: SPARK }),
      parallel(moveTo({ x: to.x - 3, y: to.y - 3 }, { duration: 600, ease: easeInOutSine }), tween({ alpha: 0 }, { duration: 600 })),
    );
  }
});

loop((t) => scene.render(t));
onCleanup(() => scene.destroy());
```

## Without a scene

A scene only keeps time and calls a `Renderer`. You can use the `Renderer` yourself: change the shapes however you like, then `clear()` and `render(shapes)` each frame. The draw functions like `drawRect` also work on their own, with any context and any object that has the fields they read.

```js sandbox=canvas 640x240 control=default code
const { Renderer, circle, line, drawRect, polar, mix, easeInOutSine } = Canvas;

const CORAL = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const center = { x: width / 2, y: 110 };

const renderer = new Renderer(canvas);

const dots = Array.from({ length: 6 }, () => circle({ color: { ...CORAL } }));
const arm = line({ x0: center.x, y0: center.y, lineWidth: 2, color: BLUE });

loop((t) => {
  const turn = (t / 4000) * 360;
  const head = polar(center, turn, 70);

  arm.x1 = head.x;
  arm.y1 = head.y;

  dots.forEach((dot, i) => {
    const p = polar(center, turn + i * 60, 70);
    const r = 6 + 6 * easeInOutSine((Math.sin(t / 400 + i) + 1) / 2);

    Object.assign(dot, { x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });
    Object.assign(dot.color, mix(CORAL, BLUE, i / 5));
  });

  renderer.clear();
  renderer.render([arm, ...dots]);

  renderer.ctx.fillStyle = 'rgb(118 176 222)';
  drawRect(renderer.ctx, { x0: 40, y0: 210, x1: 40 + ((t / 4000) % 1) * (width - 80), y1: 216 });
});
```
