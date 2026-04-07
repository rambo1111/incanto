// client/components/zdogHero.js
// Zdog 3D spinning wizard hat — displayed in the lobby hero area

const TAU = Math.PI * 2;

/**
 * Creates and animates a 3D wizard hat in the given container.
 * @param {string} containerId - The DOM element ID to render into
 * @returns {{ destroy: Function } | null}
 */
export function initZdogHero(containerId) {
  if (typeof Zdog === 'undefined') {
    console.warn('zdogHero: Zdog not loaded yet');
    return null;
  }

  const container = document.getElementById(containerId);
  if (!container) return null;

  // Create the canvas element
  const canvas = document.createElement('canvas');
  canvas.width  = 160;
  canvas.height = 140;
  canvas.className = 'zdog-canvas';
  container.appendChild(canvas);

  // ── ILLUSTRATION ────────────────────────────────────────────────
  const illo = new Zdog.Illustration({
    element: canvas,
    dragRotate: false,
    zoom: 1.8,
  });

  // Root anchor — we rotate this to spin the whole hat
  const hatRoot = new Zdog.Anchor({ addTo: illo });

  // ── HAT BRIM ────────────────────────────────────────────────────
  // Flat disk, positioned slightly below center
  new Zdog.Ellipse({
    addTo: hatRoot,
    diameter: 76,
    stroke: 10,
    color: '#2c1810',
    fill: true,
    translate: { y: 22 },
  });

  // Brim underside highlight ring
  new Zdog.Ellipse({
    addTo: hatRoot,
    diameter: 80,
    stroke: 2,
    color: '#4a3728',
    fill: false,
    translate: { y: 23 },
  });

  // ── HAT BODY (cone pointing upward) ─────────────────────────────
  // rotate.x = -TAU/4 makes the cone's tip point toward -Y (up)
  new Zdog.Cone({
    addTo: hatRoot,
    diameter: 56,
    length: 68,
    stroke: false,
    color: '#8b7fa8',
    backface: '#6a5e8a',
    translate: { y: 22 },
    rotate: { x: -TAU / 4 },
  });

  // ── HAT BAND ────────────────────────────────────────────────────
  new Zdog.Ellipse({
    addTo: hatRoot,
    diameter: 58,
    stroke: 6,
    color: '#c4873e',
    fill: false,
    translate: { y: 22 },
  });

  // ── STAR DECORATION ─────────────────────────────────────────────
  // 5-pointed star built from a closed Shape path (10 alternating points)
  const starPath = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * TAU / 10) - TAU / 4;
    const r = i % 2 === 0 ? 9 : 4; // outer vs inner radius
    starPath.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }

  new Zdog.Shape({
    addTo: hatRoot,
    path: starPath,
    closed: true,
    fill: true,
    stroke: 1,
    color: '#e8c07a',
    // Positioned on the front face of the cone
    translate: { x: 10, y: -4, z: 20 },
  });

  // Small crescent moon (two overlapping ellipses on the other side)
  const moonGroup = new Zdog.Anchor({
    addTo: hatRoot,
    translate: { x: -12, y: -12, z: 18 },
  });

  new Zdog.Ellipse({
    addTo: moonGroup,
    diameter: 10,
    stroke: 0,
    fill: true,
    color: '#a8d4e8',
  });

  // Slightly offset circle creates the crescent negative space
  new Zdog.Ellipse({
    addTo: moonGroup,
    diameter: 8,
    stroke: 0,
    fill: true,
    color: '#8b7fa8', // matches hat body — "cuts into" the moon
    translate: { x: 4, y: -2 },
  });

  // ── ANIMATION LOOP ───────────────────────────────────────────────
  let rafId = null;
  let running = true;

  function animate() {
    if (!running) return;
    hatRoot.rotate.y += 0.016;
    // Gentle bob up/down
    hatRoot.translate.y = Math.sin(hatRoot.rotate.y * 0.7) * 3;
    illo.updateRenderGraph();
    rafId = requestAnimationFrame(animate);
  }

  animate();

  return {
    destroy() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.remove();
    },
  };
}
