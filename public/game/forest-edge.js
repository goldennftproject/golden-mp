/* Decoración del suelo en el borde del bosque. Usa el plano visual de la granja. */
(function (root) {
  'use strict';

  const sides = {
    north: { col: 0, row: -1 },
    south: { col: 0, row: 1 },
    east: { col: 1, row: 0 },
    west: { col: -1, row: 0 },
  };
  const shade = [0x273f1e, 0x345220, 0x3d5f25];
  const grass = [0x375623, 0x4a6a27, 0x587b2f, 0x729044, 0x859a48];
  const roots = [0x3e3d22, 0x5f5030, 0x78643a];

  function sampler(col, row, side) {
    let state = (Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263) ^
      Math.imul(side.charCodeAt(0), 1274126177)) >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function intersects(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function pointAt(col, row, side, along, inward, tile) {
    switch (side) {
      case 'north': return { x: col * tile + along, y: row * tile + inward };
      case 'south': return { x: col * tile + along, y: (row + 1) * tile - inward };
      case 'west': return { x: col * tile + inward, y: row * tile + along };
      case 'east': return { x: (col + 1) * tile - inward, y: row * tile + along };
    }
  }

  function pathExclusions(pathPlan, tile) {
    const boxes = [];
    for (const route of [...(pathPlan.paths || []), ...(pathPlan.pads || [])]) {
      const margin = Math.max(9, tile * .29);
      for (let i = 1; i < route.length; i++) {
        const first = route[i - 1], last = route[i];
        boxes.push({
          left: Math.min(first.x, last.x) - margin,
          top: Math.min(first.y, last.y) - margin,
          right: Math.max(first.x, last.x) + margin,
          bottom: Math.max(first.y, last.y) + margin,
        });
      }
    }
    return boxes;
  }

  function plan(pathPlan, options = {}) {
    const { T: tile, owned, blocked, fence } = pathPlan;
    if (!(tile > 0) || !owned?.size) return [];
    const edges = options.edges ?? ['north'];
    const inset = Math.max(tile + 2, options.inset ?? tile + 4);
    const exclusions = [...(pathPlan.protectedRects || []), ...pathExclusions(pathPlan, tile)];
    for (const mark of options.trailMarks || []) {
      exclusions.push({ left: mark.left, top: mark.top,
        right: mark.left + mark.width, bottom: mark.top + mark.height });
    }
    const boxesByCell = new Map();
    for (const box of exclusions) {
      for (let row = Math.floor(box.top / tile); row * tile < box.bottom; row++) {
        for (let col = Math.floor(box.left / tile); col * tile < box.right; col++) {
          const cell = col + ',' + row;
          if (!boxesByCell.has(cell)) boxesByCell.set(cell, []);
          boxesByCell.get(cell).push(box);
        }
      }
    }
    const marks = [];
    const available = (x, y, width, height) => {
      const right = x + width, bottom = y + height;
      const bounds = { left: x, right, top: y, bottom };
      for (let row = Math.floor(y / tile); row * tile < bottom; row++) {
        for (let col = Math.floor(x / tile); col * tile < right; col++) {
          const cell = col + ',' + row;
          if (!owned.has(cell) || fence?.has(cell) || blocked?.has(cell)) return false;
          if (boxesByCell.get(cell)?.some(box => intersects(bounds, box))) return false;
        }
      }
      return true;
    };
    const add = (x, y, width, height, color, alpha) => {
      x = Math.round(x);
      y = Math.round(y);
      if (available(x, y, width, height)) marks.push({ x, y, width, height, color, alpha });
    };

    for (const side of edges) {
      const normal = Object.hasOwn(sides, side) ? sides[side] : null;
      if (!normal) continue;
      for (const cell of owned) {
        const [col, row] = cell.split(',').map(Number);
        if (owned.has((col + normal.col) + ',' + (row + normal.row))) continue;

        const random = sampler(col, row, side);
        const point = (along, inward) => pointAt(col, row, side, along, inset + inward, tile);
        const alongCell = normal.row ? col : row;
        const pocket = .5 + .5 * Math.sin(alongCell * 1.21 + row * .12 + col * .17);
        const spread = 7 + Math.round(pocket * 22);
        const shoulder = tile * (.36 + random() * .34);
        const shoulderDepth = random() * 4;
        const shadowWidth = Math.round(tile * (.63 + pocket * .61));

        // Sombra moteada. Las lenguas de césped oscuro se van separando hacia el claro.
        for (let strip = -1; strip < spread; strip += 3) {
          const reach = Math.max(6, Math.round(shadowWidth * (1 - strip / (spread * 1.5))));
          const center = point(shoulder + (random() - .5) * 9, strip + shoulderDepth);
          const alpha = .38 * (1 - (strip + 1) / (spread + 2)) + .07;
          if (normal.col) add(center.x, center.y - reach * .5, 3, reach, shade[0], alpha);
          else add(center.x - reach * .5, center.y, reach, 3, shade[0], alpha);
        }

        for (let patch = 0; patch < 9; patch++) {
          const pointOnGrass = point(random() * tile, 2 + random() * (spread + 12));
          const w = 4 + Math.floor(random() * 9), h = 2 + Math.floor(random() * 3);
          add(pointOnGrass.x - w / 2, pointOnGrass.y, w, h, shade[1 + patch % 2], .20 + random() * .30);
        }

        const count = 2 + Math.round(pocket * 6);
        for (let tuft = 0; tuft < count; tuft++) {
          const closeness = random() ** 1.8;
          const along = 3 + random() * (tile - 6);
          const height = 2 + Math.round((1 - closeness) * (3 + random() * 6));
          const anchor = point(along, Math.max(6, height) + closeness * (spread + 8));
          const lean = random() < .5 ? -1 : 1;
          add(anchor.x - 4, anchor.y, 9, 2, shade[0], .58);
          add(anchor.x - 1, anchor.y - height + 1, 3, height, grass[0], .88);
          add(anchor.x, anchor.y - height, 1, Math.max(2, height - 2), grass[3], .96);
          add(anchor.x + lean * 2, anchor.y - Math.max(2, height - 3), 2, Math.max(2, height - 3), grass[1], .94);
          add(anchor.x + lean * 3, anchor.y - Math.max(2, height - 3), 1, 2, grass[4], .83);
          add(anchor.x - lean * 2, anchor.y - Math.max(2, height - 4), 1, Math.max(2, height - 4), grass[2], .92);
        }

        if (pocket > .67) {
          const origin = point(6 + random() * (tile - 12), 5);
          const direction = random() < .5 ? -1 : 1;
          const length = 6 + Math.round(random() * 10);
          for (let i = 0; i < length; i += 2) {
            const x = origin.x + direction * i;
            const y = origin.y + Math.round(i * .55) - (i > 7 ? 1 : 0);
            add(x, y, 3, 2, roots[0], .64);
            add(x + 1, y, 2, 1, roots[i < 6 ? 2 : 1], .72);
            if (i > 4 && i < 10) add(x - direction * 2, y + 3, 3, 1, roots[1], .66);
          }
        }
      }
    }
    return marks;
  }

  function draw(graphics, marks) {
    for (const mark of marks) {
      graphics.fillStyle(mark.color, mark.alpha).fillRect(mark.x, mark.y, mark.width, mark.height);
    }
    return graphics;
  }

  const api = { plan, draw };
  root.GoldenForestEdge = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
