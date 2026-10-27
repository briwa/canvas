# Scene

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## Scene

`new Scene(options)` → `Scene`

Keeps time, runs steps, and draws shapes.

| option | type | default | description |
| --- | --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | | Canvas to draw on. |
| `renderer` | `Renderer` | `new Renderer(canvas)` | Draws the shapes. |
| `layers` | `Layer \| Layer[]` | `[]` | Starting shapes and steps, drawn back to front. |
| `inputs` | `Input \| Input[]` | `[]` | Inputs to attach to the canvas. |
| `loop` | `boolean` | `false` | Start over once every layer that can end has ended. |

| property | type | description |
| --- | --- | --- |
| `elapsed` | `number` | Ms on the scene's clock. Stops while paused. |
| `dt` | `number` | Ms since the last frame. |
| `paused` | `boolean` | Whether the clock is stopped. |
| `loop` | `boolean` | Same as the option. Can be changed. |
| `size` | `number` | Number of shapes drawn. |
| `finished` | `boolean` | Whether every layer that can end has ended. |

| method | returns | description |
| --- | --- | --- |
| `add(shapes, step?)` | `this` | Draws `shapes`, and runs `step` on them. |
| `spawn(shapes, step, done?)` | `() => void` | Adds `shapes`, runs `step`, then removes them and calls `done`. Returns a stop function. |
| `remove(shapes)` | `this` | Stops drawing `shapes`, and stops steps with nothing left to move. |
| `run(shapes, step, done?)` | `() => void` | Runs `step` on `shapes`, then calls `done`. Returns a stop function. |
| `has(shape)` | `boolean` | Whether `shape` is drawn. |
| `after(ms, fn)` | `() => void` | Calls `fn` once after `ms`. Returns a stop function. |
| `every(ms, fn)` | `() => void` | Calls `fn` every `ms`. Returns a stop function. |
| `onUpdate(fn)` | `() => void` | Calls `fn(scene)` each frame after the steps. Returns an unsubscribe function. |
| `onFinish(fn)` | `() => void` | Calls `fn(scene)` each time the scene finishes. Returns an unsubscribe function. |
| `render(time)` | `this` | Moves to `time` (ms) and draws. |
| `pause()` / `play()` | `this` | Stops or resumes the clock. |
| `reset()` | `this` | Goes back to the first frame, removing anything added since. |
| `destroy()` | `this` | Detaches inputs and stops every step. |

`step` can also be a function that returns a step. Layers that run forever don't count towards finishing.

```js sandbox=root 640x300 code expand
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

Stars `spawn` on their own; click to throw sparks.

```js sandbox=canvas 640x300 code expand
const { Scene, MouseInput, rect, circle, path, move, moveTo, tween, wait, parallel, sequence, linear, easeInOutSine, mix, polar } = Canvas;

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

  scene.spawn(path({ x0: x, y0: y, x1: x + 16, y1: y + 10, alpha: 0, lineWidth: 2, color: STAR }), fall);
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

## layer

`layer(children, step?)` → `Layer`

Groups shapes, and runs a step on them.

| parameter | type | default | description |
| --- | --- | --- | --- |
| `children` | `Entity \| Layer \| Array` | required | Shapes or layers, drawn in order. |
| `step` | `Step` | | Runs on every shape inside, unless it names its own targets. |

| returns | |
| --- | --- |
| `Layer` | A step that ends when its step and child layers do. Without a step, it only draws. |
