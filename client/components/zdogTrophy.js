// client/components/zdogTrophy.js
// Zdog 3D outcome animation — trophy (win), skull (lose), linked rings (draw)

const TAU = Math.PI * 2;

/**
 * @param {string} containerId
 * @param {'win'|'lose'|'draw'} outcome
 * @returns {{ destroy: Function } | null}
 */
export function initZdogTrophy(containerId, outcome = 'win') {
  if (typeof Zdog === 'undefined') return null;

  const container = document.getElementById(containerId);
  if (!container) return null;

  const canvas = document.createElement('canvas');
  canvas.width  = 160;
  canvas.height = 150;
  canvas.className = 'zdog-canvas';
  container.appendChild(canvas);

  const illo = new Zdog.Illustration({
    element: canvas,
    dragRotate: false,
    zoom: 1.5,
  });

  const root = new Zdog.Anchor({ addTo: illo });

  if (outcome === 'win') {
    buildTrophy(root);
  } else if (outcome === 'lose') {
    buildSkull(root);
  } else {
    buildLinkedRings(root);
  }

  // ── ANIMATION ────────────────────────────────────────────────────
  let rafId = null;
  let tick = 0;

  function animate() {
    tick++;
    root.rotate.y += 0.018;
    // Gentle float up and down
    root.translate.y = Math.sin(tick * 0.025) * 4;
    illo.updateRenderGraph();
    rafId = requestAnimationFrame(animate);
  }

  animate();

  return {
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      canvas.remove();
    },
  };
}

// ── TROPHY ───────────────────────────────────────────────────────

function buildTrophy(root) {
  // Cup bowl (open hemisphere facing up)
  new Zdog.Hemisphere({
    addTo: root,
    diameter: 56,
    stroke: false,
    color: '#c4873e',
    backface: '#a86e2e',
    translate: { y: -14 },
    rotate: { x: -TAU / 4 }, // face upward
  });

  // Cup lower body (cylinder)
  new Zdog.Cylinder({
    addTo: root,
    diameter: 56,
    length: 18,
    stroke: false,
    color: '#c4873e',
    backface: '#a86e2e',
    translate: { y: -5 },
  });

  // Left handle
  new Zdog.Ellipse({
    addTo: root,
    width: 22,
    height: 20,
    stroke: 6,
    color: '#a86e2e',
    fill: false,
    translate: { x: -34, y: -8 },
    rotate: { y: TAU / 4 },
  });

  // Right handle
  new Zdog.Ellipse({
    addTo: root,
    width: 22,
    height: 20,
    stroke: 6,
    color: '#a86e2e',
    fill: false,
    translate: { x: 34, y: -8 },
    rotate: { y: TAU / 4 },
  });

  // Stem
  new Zdog.Cylinder({
    addTo: root,
    diameter: 10,
    length: 20,
    stroke: false,
    color: '#9e6a28',
    backface: '#7e5018',
    translate: { y: 18 },
  });

  // Base plate
  new Zdog.Box({
    addTo: root,
    width: 56,
    height: 7,
    depth: 18,
    stroke: false,
    color: '#7e5018',
    translate: { y: 32 },
  });

  // Star on the cup
  const starPath = buildStarPath(9, 4, 10);
  new Zdog.Shape({
    addTo: root,
    path: starPath,
    closed: true,
    fill: true,
    stroke: 1,
    color: '#f8e89a',
    translate: { z: 30, y: -14 },
  });
}

// ── SKULL ─────────────────────────────────────────────────────────

function buildSkull(root) {
  // Cranium
  new Zdog.Hemisphere({
    addTo: root,
    diameter: 62,
    stroke: false,
    color: '#d4cfc0',
    backface: '#b8b4a0',
    translate: { y: -8 },
    rotate: { x: -TAU / 4 },
  });

  // Lower jaw (rounded rect)
  new Zdog.RoundedRect({
    addTo: root,
    width: 48,
    height: 22,
    cornerRadius: 6,
    stroke: 4,
    color: '#d4cfc0',
    fill: true,
    translate: { y: 12 },
  });

  // Left eye socket
  new Zdog.Ellipse({
    addTo: root,
    diameter: 16,
    stroke: 0,
    fill: true,
    color: '#2c1810',
    translate: { x: -12, y: -4, z: 18 },
  });

  // Right eye socket
  new Zdog.Ellipse({
    addTo: root,
    diameter: 16,
    stroke: 0,
    fill: true,
    color: '#2c1810',
    translate: { x: 12, y: -4, z: 18 },
  });

  // Nose void
  new Zdog.Shape({
    addTo: root,
    path: [
      { x: 0,  y: -5 },
      { x: -4, y:  4 },
      { x:  4, y:  4 },
    ],
    closed: true,
    fill: true,
    stroke: 0,
    color: '#2c1810',
    translate: { z: 20, y: 6 },
  });

  // Teeth (3 small rectangles)
  for (let i = -1; i <= 1; i++) {
    new Zdog.Rect({
      addTo: root,
      width: 9,
      height: 11,
      stroke: 2,
      color: '#2c1810',
      fill: false,
      translate: { x: i * 12, y: 17, z: 14 },
    });
  }
}

// ── LINKED RINGS (draw) ───────────────────────────────────────────

function buildLinkedRings(root) {
  // Left ring — violet
  new Zdog.Ellipse({
    addTo: root,
    diameter: 50,
    stroke: 8,
    color: '#8b7fa8',
    fill: false,
    translate: { x: -16 },
  });

  // Right ring — slate blue
  new Zdog.Ellipse({
    addTo: root,
    diameter: 50,
    stroke: 8,
    color: '#6a9cb8',
    fill: false,
    translate: { x: 16 },
  });

  // Handshake center dot
  new Zdog.Ellipse({
    addTo: root,
    diameter: 12,
    stroke: 0,
    fill: true,
    color: '#c4873e',
    translate: { z: 6 },
  });
}

// ── HELPERS ──────────────────────────────────────────────────────

/** Build a 5-pointed star path for Zdog.Shape */
function buildStarPath(outerR, innerR, points) {
  const path = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * TAU / (points * 2)) - TAU / 4;
    const r = i % 2 === 0 ? outerR : innerR;
    path.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return path;
}
