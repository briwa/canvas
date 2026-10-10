import { linear } from './math';

export function drawRect(ctx, entity) {
  ctx.fillRect(entity.x0, entity.y0, entity.x1 - entity.x0, entity.y1 - entity.y0);
}

function trace(ctx, entity, startAngle, endAngle) {
  ctx.beginPath();
  ctx.ellipse(
    (entity.x0 + entity.x1) / 2,
    (entity.y0 + entity.y1) / 2,
    Math.abs(entity.x1 - entity.x0) / 2,
    Math.abs(entity.y1 - entity.y0) / 2,
    0,
    startAngle,
    endAngle,
  );
}

export function drawCircle(ctx, entity) {
  trace(ctx, entity, 0, Math.PI * 2);
  ctx.fill();
}

export function drawArc(ctx, entity) {
  ctx.lineWidth = entity.lineWidth;

  trace(ctx, entity, entity.startAngle, entity.endAngle);
  ctx.stroke();
}

export function straight() {
  return 0;
}

function bend(entity) {
  const { x0, y0, ease, offset } = entity;
  const dx = entity.x1 - x0;
  const dy = entity.y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  return (t, push = offset(t, entity)) => {
    const [along, across] = Array.isArray(push) ? push : [0, push];

    return [x0 + dx * t + ux * along + uy * across, y0 + dy * ease(t) + uy * along - ux * across];
  };
}

function walk(ctx, entity) {
  const { t0, t1, ease, offset, segments } = entity;
  const at = bend(entity);

  ctx.beginPath();
  ctx.moveTo(...at(t0));

  const count = ease === linear && offset === straight ? 1 : segments;

  for (let i = 1; i <= count; i++) {
    ctx.lineTo(...at(t0 + ((t1 - t0) * i) / count));
  }

  return at;
}

export function drawPath(ctx, entity) {
  ctx.lineWidth = entity.lineWidth;

  walk(ctx, entity);
  ctx.stroke();
}

export function drawArea(ctx, entity) {
  const at = walk(ctx, entity);

  ctx.lineTo(...at(entity.t1, entity.base));
  ctx.lineTo(...at(entity.t0, entity.base));
  ctx.fill();
}
