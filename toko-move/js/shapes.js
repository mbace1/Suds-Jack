// The alphabet. A passenger is a shape that wants to reach a stop of the same
// shape, and that is the entire fiction — no names, no destinations, no story.
// It works because a shape can be read at eight pixels across, which is how big
// a waiting passenger actually is once thirty of them are on the board.

export const COMMON = ['circle', 'triangle', 'square'];
export const SPECIAL = ['cross', 'diamond', 'star', 'pentagon', 'gem'];
export const SHAPES = [...COMMON, ...SPECIAL];

export const isSpecial = k => SPECIAL.includes(k);

// Each shape traces into whatever path the caller opened, so one function
// serves the big station outline, the little waiting passenger and the tiny
// dot riding inside a train.
export function tracePath(ctx, kind, x, y, r) {
  switch (kind) {
    case 'circle':
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 'square':
      poly(ctx, [[-1, -1], [1, -1], [1, 1], [-1, 1]], x, y, r * 0.88);
      break;
    case 'triangle':
      // sat on its base rather than centred on the centroid, or it reads as
      // sliding downhill next to a square
      poly(ctx, [[0, -1.08], [1, 0.72], [-1, 0.72]], x, y, r);
      break;
    case 'diamond':
      poly(ctx, [[0, -1.18], [1.05, 0], [0, 1.18], [-1.05, 0]], x, y, r);
      break;
    case 'cross': {
      const t = 0.38;
      poly(ctx, [
        [-t, -1], [t, -1], [t, -t], [1, -t], [1, t], [t, t],
        [t, 1], [-t, 1], [-t, t], [-1, t], [-1, -t], [-t, -t],
      ], x, y, r);
      break;
    }
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const k = i % 2 ? 0.47 : 1.15;
        pts.push([Math.cos(a) * k, Math.sin(a) * k]);
      }
      poly(ctx, pts, x, y, r);
      break;
    }
    case 'pentagon': {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        pts.push([Math.cos(a) * 1.1, Math.sin(a) * 1.1]);
      }
      poly(ctx, pts, x, y, r);
      break;
    }
    case 'gem':
      poly(ctx, [[-0.55, -1], [0.55, -1], [1.1, -0.1], [0, 1.15], [-1.1, -0.1]], x, y, r);
      break;
    default:
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

function poly(ctx, pts, x, y, r) {
  ctx.moveTo(x + pts[0][0] * r, y + pts[0][1] * r);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(x + pts[i][0] * r, y + pts[i][1] * r);
  ctx.closePath();
}

// A filled shape with its own outline — the house look for a station: paper
// centre, hard dark edge, no shading anywhere.
export function drawShape(ctx, kind, x, y, r, fill, stroke, width) {
  ctx.beginPath();
  tracePath(ctx, kind, x, y, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke(); }
}
