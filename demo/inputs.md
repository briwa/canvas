# Inputs

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

Pass inputs to `new Scene({ inputs })`. They listen on the scene's canvas, and `pressed` / `released` last one frame.

## MouseInput

`new MouseInput()` → `MouseInput`

| property | type | description |
| --- | --- | --- |
| `x`, `y` | `number` | Pointer position, in canvas pixels. |
| `inside` | `boolean` | Whether the pointer is over the canvas. |
| `down` | `boolean` | Whether a button is held. |
| `pressed` | `boolean` | Went down this frame. |
| `released` | `boolean` | Went up this frame. |

```js sandbox=canvas 640x200 code expand
const { Scene, MouseInput, circle } = Canvas;

const mouse = new MouseInput();
const scene = new Scene({ canvas, inputs: [mouse] });

const dot = circle({ color: { r: 224, g: 122, b: 95 } });

mouse.x = width / 2;
mouse.y = height / 2;

scene.add(dot);

scene.onUpdate(() => {
  const r = mouse.down ? 24 : 12;

  Object.assign(dot, {
    x0: mouse.x - r,
    y0: mouse.y - r,
    x1: mouse.x + r,
    y1: mouse.y + r,
    alpha: mouse.inside ? 1 : 0.4,
  });
});

loop((t) => scene.render(t));
onCleanup(() => scene.destroy());
```

## KeyboardInput

`new KeyboardInput(options?)` → `KeyboardInput`

Keys are `event.key` in lower case, with `' '` as `'space'` and `'esc'` as `'escape'`. The canvas needs a `tabIndex` to get focus.

| option | type | default | description |
| --- | --- | --- | --- |
| `prevent` | `string[]` | `[]` | Keys whose default action is blocked, like scrolling. |

| method | returns | description |
| --- | --- | --- |
| `held(...keys)` | `boolean` | Whether any of `keys` is down. |
| `pressed(...keys)` | `boolean` | Whether any went down this frame. |
| `released(...keys)` | `boolean` | Whether any went up this frame. |
| `axis(negative, positive)` | `-1 \| 0 \| 1` | Direction from two lists of keys. |

Click it, then use the arrow keys and space.

```js sandbox=canvas 640x200 code expand
const { Scene, KeyboardInput, rect, clamp } = Canvas;

const ARROWS = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'];

canvas.tabIndex = 0;

const keyboard = new KeyboardInput({ prevent: [...ARROWS, 'space'] });
const scene = new Scene({ canvas, inputs: [keyboard] });

const box = rect({ x0: 300, y0: 80, x1: 340, y1: 120, color: { r: 118, g: 176, b: 222 } });

scene.add(box);

scene.onUpdate((s) => {
  const x = clamp(
    box.x0 + keyboard.axis(['arrowleft'], ['arrowright']) * 0.3 * s.dt,
    0,
    width - 40,
  );
  const y = clamp(box.y0 + keyboard.axis(['arrowup'], ['arrowdown']) * 0.3 * s.dt, 0, height - 40);

  Object.assign(box, { x0: x, y0: y, x1: x + 40, y1: y + 40 });

  if (keyboard.pressed('space')) box.alpha = box.alpha === 1 ? 0.4 : 1;
});

loop((t) => scene.render(t));
onCleanup(() => scene.destroy());
```

## Input

`class extends Input` → `Input`

Base class for your own inputs.

| method | returns | description |
| --- | --- | --- |
| `bindings()` | `{ [event]: handler }` | Override. Events to listen to; handlers get `this`. |
| `flush()` | `this` | Override. Called after each frame. |
| `reset()` | `this` | Override. Called on `scene.reset()`. |
| `attach(target)` / `detach()` | `this` | Starts or stops listening. The scene calls these. |
