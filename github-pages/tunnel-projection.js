/* Circular surfaces share a fixed centre, including during a full revolution. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TunnelProjection = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function projectSector({ angle, radius, near, innerRatio, arcSpan, cx, cy, focal }) {
    if (![angle, radius, near, innerRatio, arcSpan, cx, cy, focal].every(Number.isFinite)
      || near < 280 || radius <= 0 || focal <= 0 || innerRatio <= 0 || innerRatio >= 1
      || arcSpan <= 0 || arcSpan >= Math.PI) return null;
    const outer = focal * radius / near;
    const inner = outer * innerRatio;
    return {
      angle, arcSpan, outer, inner, innerRatio,
      point(u, v) {
        const theta = angle + (u - .5) * arcSpan;
        const r = outer + (inner - outer) * v;
        return { x: cx + Math.cos(theta) * r, y: cy + Math.sin(theta) * r };
      },
    };
  }
  function createGrid(columns = 64, rows = 4) {
    const uv = [], indices = [];
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= columns; x++) uv.push(x / columns, y / rows);
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const a = y * (columns + 1) + x, b = a + 1, c = a + columns + 1, d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
    return { uv: new Float32Array(uv), indices: new Uint16Array(indices) };
  }
  function getPhases(progress, journeyEnd = .78) {
    const clamp = value => Math.min(1, Math.max(0, value));
    const smooth = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
    const p = clamp(progress), end = Math.min(.9, Math.max(.5, journeyEnd));
    const journey = clamp(p / end);
    const handoff = clamp((p - end) / (.97 - end));
    return {
      journey, portal: smooth(handoff / .65), reveal: smooth((handoff - .65) / .35),
      pinned: p >= end && p < 1,
      chrome: 1 - smooth((journey - .94) / .06),
    };
  }
  function coveringRadius(width, height) {
    return Math.ceil(Math.hypot(width, height) / 2) + 2;
  }
  function remapProgress(progress, oldEnd, newEnd) {
    if (progress < oldEnd) return progress / oldEnd * newEnd;
    if (progress < .97) return newEnd + (progress - oldEnd) / (.97 - oldEnd) * (.97 - newEnd);
    return progress;
  }
  return { projectSector, createGrid, getPhases, remapProgress, coveringRadius };
});
