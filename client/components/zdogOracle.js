// client/components/zdogOracle.js
// Zdog 3D crystal ball — spins in the judging overlay while AI deliberates

const TAU = Math.PI * 2;

/**
 * Initialises the crystal ball in the given container.
 * Returns start/stop controls so the animation only runs when visible.
 *
 * @param {string} containerId
 * @returns {{ start: Function, stop: Function } | null}
 */
export function initZdogOracle(containerId) {
  if (typeof Zdog === 'undefined') return null;

  const container = document.getElementById(containerId);
  if (!container) return null;

  const canvas = document.createElement('canvas');
  canvas.width  = 120;
  canvas.height = 120;
  canvas.className = 'zdog-canvas';
  container.appendChild(canvas);

  const illo = new Zdog.Illustration({
    element: canvas,
    dragRotate: false,
    zoom: 1.4,
  });

  // ── SPHERE ──────────────────────────────────────────────────────
  // Two hemispheres assembled back-to-back to form a full sphere
  const sphereGroup = new Zdog.Anchor({ addTo: illo });

  // Front hemisphere (faces viewer)
  new Zdog.Hemisphere({
    addTo: sphereGroup,
    diameter: 70,
    stroke: false,
    color: '#a8d4e8',
    backface: '#7ab4c8',
  });

  // Back hemisphere (rotated 180° on Y so it completes the sphere)
  new Zdog.Hemisphere({
    addTo: sphereGroup,
    diameter: 70,
    stroke: false,
    color: '#7ab4c8',
    backface: '#a8d4e8',
    rotate: { y: TAU / 2 },
  });

  // ── INNER SPARKLES ───────────────────────────────────────────────
  // Small dots scattered inside the sphere to suggest magical depth
  const sparklePositions = [
    { x:  14, y: -10, z:  8 },
    { x: -16, y:  6,  z: 12 },
    { x:   4, y:  14, z: -6 },
    { x: -8,  y: -14, z:  4 },
    { x:  18, y:  2,  z: -10 },
    { x: -4,  y:  8,  z:  16 },
  ];

  sparklePositions.forEach(pos => {
    new Zdog.Ellipse({
      addTo: sphereGroup,
      diameter: 5,
      stroke: 0,
      fill: true,
      color: '#e8f4fb',
      translate: pos,
    });
  });

  // ── EQUATOR RING ─────────────────────────────────────────────────
  // Thin ring around the ball's equator for the "crystal ball" look
  new Zdog.Ellipse({
    addTo: sphereGroup,
    diameter: 74,
    stroke: 2.5,
    color: '#5a94b0',
    fill: false,
    rotate: { x: TAU / 4 }, // lay flat horizontally
  });

  // ── BASE PEDESTAL ────────────────────────────────────────────────
  // Small dish/stand underneath the sphere
  new Zdog.Ellipse({
    addTo: illo,
    diameter: 52,
    stroke: 8,
    color: '#4a3728',
    fill: true,
    translate: { y: 38 },
  });

  new Zdog.Cylinder({
    addTo: illo,
    diameter: 20,
    length: 8,
    stroke: false,
    color: '#4a3728',
    backface: '#2c1810',
    translate: { y: 36 },
  });

  // ── ANIMATION ────────────────────────────────────────────────────
  let rafId = null;
  let running = false;
  let tick = 0;

  function animate() {
    if (!running) return;
    tick++;
    sphereGroup.rotate.y += 0.022;
    sphereGroup.rotate.x = Math.sin(tick * 0.02) * 0.18; // gentle wobble
    illo.updateRenderGraph();
    rafId = requestAnimationFrame(animate);
  }

  return {
    start() {
      if (running) return;
      running = true;
      animate();
    },
    stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    },
    destroy() {
      this.stop();
      canvas.remove();
    },
  };
}
