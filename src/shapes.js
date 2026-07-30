export function drawRect(ctx, entity) {
  ctx.fillRect(entity.x0, entity.y0, entity.x1 - entity.x0, entity.y1 - entity.y0);
}

export function drawLine(ctx, entity) {
  ctx.lineWidth = entity.lineWidth;

  ctx.beginPath();
  ctx.moveTo(entity.x0, entity.y0);
  ctx.lineTo(entity.x1, entity.y1);
  ctx.stroke();
}
