# Getting started

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## Install

```sh
npm i @briwa.dev/canvas
```

```js
import { Scene, layer, circle, tween } from '@briwa.dev/canvas';
```

Or load the script above, which puts everything on a global `Canvas`.

## Usage

A scene draws layers. A layer holds shapes and a step that changes them. Call `scene.render(time)` every frame.

```js
const scene = new Scene({ canvas, layers: [layer([ball], tween({ x0: 300 }, { duration: 1000 }))] });

requestAnimationFrame(function frame(time) {
  scene.render(time);
  requestAnimationFrame(frame);
});
```

In the sandboxes on these pages, `canvas`, `width` and `height` are given, and `loop(fn)` calls `fn` with the time every frame.

```js sandbox=canvas 640x200 control=default code expand
const { Scene, layer, circle, tween, sequence, easeInOutSine } = Canvas;

const ball = circle({ x0: 40, y0: 80, x1: 80, y1: 120, color: { r: 224, g: 122, b: 95 } });

const scene = new Scene({
  canvas,
  layers: [
    layer(
      [ball],
      sequence(
        tween({ x0: width - 80, x1: width - 40 }, { duration: 1200, ease: easeInOutSine }),
        tween({ x0: 40, x1: 80 }, { duration: 1200, ease: easeInOutSine }),
      ),
    ),
  ],
});

scene.onFinish(() => reset());

loop((t) => scene.render(t));
```

## Interface

| export | kind | page |
| --- | --- | --- |
| `Scene`, `layer`, `Layer` | class, function | [scene](#scene) |
| `Entity`, `rect`, `circle`, `arc`, `path`, `area`, `rgb` | class, function | [shapes](#shapes) |
| `tween`, `move`, `moveTo`, `sequence`, `parallel`, `repeat`, `wait`, `until`, `forever`, `step`, `Step`, `Tweener` | function, class | [steps](#steps) |
| `machine`, `Machine` | function, class | [machine](#machine) |
| `MouseInput`, `KeyboardInput`, `Input` | class | [inputs](#inputs) |
| `Renderer`, `drawRect`, `drawCircle`, `drawArc`, `drawPath`, `drawArea`, `straight` | class, function | [rendering](#rendering) |
| `linear`, `easeIn*`, `easeOut*`, `easeInOut*`, `lerp`, `mix`, `polar`, `clamp`, `spline` | function | [math](#math) |
