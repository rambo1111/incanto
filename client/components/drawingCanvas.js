// client/components/drawingCanvas.js
// Whiteboard drawing component.
// Logic is unchanged; toolbar buttons are now wired-button elements
// and colour swatches use native buttons styled to match the sketchbook theme.

export function createDrawingCanvas(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`drawingCanvas: #${containerId} not found`);
    return null;
  }
  container.innerHTML = '';

  // ── COLOUR PALETTE ──────────────────────────────────────────────
  const COLORS = [
    '#2c1810', // ink (default)
    '#c05a5a', // muted red
    '#6a9cb8', // slate blue
    '#7b9e87', // sage
    '#c4873e', // amber
    '#8b7fa8', // violet
    '#a8d4e8', // light blue
    '#e8c07a', // amber light
    '#ffffff', // white (eraser colour)
  ];

  const BRUSH_SIZES = [2, 5, 10, 18];

  let activeColor = '#2c1810';
  let brushSize   = 5;
  let isErasing   = false;

  // ── TOOLBAR ─────────────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.className = 'canvas-toolbar';

  // Colour swatches
  const colorRow = document.createElement('div');
  colorRow.style.cssText = 'display:flex; gap:4px; align-items:center; flex-wrap:wrap;';

  const swatches = [];
  COLORS.forEach(hex => {
    const swatch = document.createElement('button');
    swatch.className = `color-swatch${hex === activeColor ? ' active' : ''}`;
    swatch.style.background = hex;
    swatch.title = hex;
    swatch.dataset.color = hex;
    // White swatch always gets a visible border so it's findable
    if (hex === '#ffffff') swatch.style.border = '2px solid #2c1810';

    swatch.addEventListener('click', () => {
      isErasing = false;
      activeColor = hex;
      updateEraserState();
      swatches.forEach(s => s.classList.toggle('active', s.dataset.color === hex));
    });

    swatches.push(swatch);
    colorRow.appendChild(swatch);
  });

  // Brush size buttons (small native buttons with dot indicator)
  const sizeRow = document.createElement('div');
  sizeRow.style.cssText = 'display:flex; gap:4px; align-items:center;';

  const sizeBtns = [];
  BRUSH_SIZES.forEach(size => {
    const btn = document.createElement('button');
    btn.title = `Brush ${size}px`;
    btn.style.cssText = `
      width:${size + 16}px; height:${size + 16}px; min-width:22px; min-height:22px;
      padding:0; display:flex; align-items:center; justify-content:center;
      border: 2px solid #2c1810; cursor:pointer; flex-shrink:0;
      background: ${size === brushSize ? '#2c1810' : '#f8f7ef'};
      border-radius: 2px;
    `;
    const dot = document.createElement('span');
    dot.style.cssText = `
      width:${size}px; height:${size}px; border-radius:50%; display:block;
      background: ${size === brushSize ? '#f8f7ef' : '#2c1810'};
      pointer-events:none;
    `;
    btn.appendChild(dot);

    btn.addEventListener('click', () => {
      brushSize = size;
      isErasing = false;
      updateEraserState();
      sizeBtns.forEach((b, i) => {
        const s = BRUSH_SIZES[i];
        b.style.background = s === size ? '#2c1810' : '#f8f7ef';
        b.querySelector('span').style.background = s === size ? '#f8f7ef' : '#2c1810';
      });
    });

    sizeBtns.push(btn);
    sizeRow.appendChild(btn);
  });

  // Eraser — wired-button
  const eraser = document.createElement('wired-button');
  eraser.textContent = '⌫ Erase';
  eraser.style.cssText = `
    font-family: var(--font-hand) !important;
    font-size: 0.68rem;
    margin-left: auto;
    --wired-item-color: var(--ink);
  `;

  eraser.addEventListener('click', () => {
    isErasing = !isErasing;
    updateEraserState();
  });

  // Clear — wired-button
  const clearBtn = document.createElement('wired-button');
  clearBtn.textContent = '✕ Clear';
  clearBtn.style.cssText = `
    font-family: var(--font-hand) !important;
    font-size: 0.68rem;
    background: var(--sage-light);
    --wired-item-color: var(--ink);
  `;

  toolbar.appendChild(colorRow);
  toolbar.appendChild(sizeRow);
  toolbar.appendChild(eraser);
  toolbar.appendChild(clearBtn);

  // ── CANVAS ──────────────────────────────────────────────────────
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = 'flex:1; min-height:0; position:relative; overflow:hidden;';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    cursor:crosshair; touch-action:none; display:block; background:#ffffff;
  `;

  canvasWrapper.appendChild(canvas);
  container.appendChild(toolbar);
  container.appendChild(canvasWrapper);

  const ctx = canvas.getContext('2d');

  // ── RESIZE HANDLING ─────────────────────────────────────────────
  let resizeObserver = null;
  let resizeRAF      = null;

  function resizeCanvas() {
    const w = canvasWrapper.clientWidth;
    const h = canvasWrapper.clientHeight;
    if (w < 1 || h < 1) return;
    const snapshot = canvas.toDataURL();
    canvas.width  = w;
    canvas.height = h;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, w, h); };
    img.src = snapshot;
  }

  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(resizeCanvas);
  });
  resizeObserver.observe(canvasWrapper);
  requestAnimationFrame(resizeCanvas);

  clearBtn.addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  // ── DRAWING LOGIC ────────────────────────────────────────────────
  let drawing = false;
  let lastX = 0, lastY = 0;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
    lastX = x; lastY = y;
    ctx.beginPath();
    const r = (isErasing ? brushSize * 2 : brushSize) / 2;
    ctx.arc(x, y, Math.max(r, 0.5), 0, Math.PI * 2);
    ctx.fillStyle = isErasing ? '#ffffff' : activeColor;
    ctx.fill();
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = isErasing ? '#ffffff' : activeColor;
    ctx.lineWidth   = isErasing ? brushSize * 2 : brushSize;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    lastX = x; lastY = y;
  }

  function stopDraw() { drawing = false; }

  canvas.addEventListener('mousedown',   startDraw);
  canvas.addEventListener('mousemove',   draw);
  canvas.addEventListener('mouseup',     stopDraw);
  canvas.addEventListener('mouseleave',  stopDraw);
  canvas.addEventListener('touchstart',  startDraw, { passive: false });
  canvas.addEventListener('touchmove',   draw,      { passive: false });
  canvas.addEventListener('touchend',    stopDraw);
  canvas.addEventListener('touchcancel', stopDraw);

  // ── ERASER STATE ─────────────────────────────────────────────────
  function updateEraserState() {
    if (isErasing) {
      eraser.style.background = 'var(--muted-red-light)';
      canvas.style.cursor = 'cell';
    } else {
      eraser.style.background = '';
      canvas.style.cursor = 'crosshair';
    }
  }

  // ── PUBLIC API ───────────────────────────────────────────────────
  return {
    /** Export the canvas as a PNG data URL */
    getImageData() {
      const off = document.createElement('canvas');
      off.width  = Math.max(canvas.width,  1);
      off.height = Math.max(canvas.height, 1);
      const octx = off.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, off.width, off.height);
      octx.drawImage(canvas, 0, 0);
      return off.toDataURL('image/png');
    },

    clear() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    disable() {
      canvas.style.pointerEvents  = 'none';
      canvas.style.opacity        = '0.7';
      toolbar.style.pointerEvents = 'none';
      toolbar.style.opacity       = '0.38';
    },

    enable() {
      canvas.style.pointerEvents  = 'auto';
      canvas.style.opacity        = '1';
      toolbar.style.pointerEvents = 'auto';
      toolbar.style.opacity       = '1';
    },

    destroy() {
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      cancelAnimationFrame(resizeRAF);
    },
  };
}
