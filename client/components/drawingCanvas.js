// client/components/drawingCanvas.js — whiteboard drawing component

export function createDrawingCanvas(containerId) {
  const container = document.getElementById(containerId);
  if (!container) { console.error(`drawingCanvas: #${containerId} not found`); return null; }
  container.innerHTML = '';

  // ── TOOLBAR ──────────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display:flex; gap:6px; padding:8px 10px; flex-wrap:wrap; align-items:center;
    border-bottom:3px solid #0d0d0d; background:#fafaf7; flex-shrink:0;
  `;

  // Color palette
  const COLORS = [
    '#0d0d0d','#FF3333','#0052FF','#00C96B',
    '#FFE500','#FF7A00','#8B00FF','#FF2DAA','#ffffff'
  ];
  let activeColor = '#0d0d0d';
  let isErasing   = false;

  const colorRow = document.createElement('div');
  colorRow.style.cssText = 'display:flex; gap:4px; flex-wrap:wrap; align-items:center;';

  const swatches = [];
  COLORS.forEach(c => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.title = c;
    sw.dataset.color = c;
    sw.style.cssText = `
      background:${c};
      width:26px; height:26px;
      border:3px solid ${c === activeColor ? '#0d0d0d' : 'transparent'};
      cursor:pointer; flex-shrink:0;
      box-shadow:2px 2px 0 #0d0d0d;
      padding:0;
      outline-offset:2px;
    `;
    if (c === '#ffffff') sw.style.border = '3px solid #0d0d0d';

    sw.addEventListener('click', () => {
      isErasing = false;
      activeColor = c;
      eraser.style.background = 'var(--white)';
      eraser.style.color = '#0d0d0d';
      swatches.forEach(s => {
        const col = s.dataset.color;
        s.style.border = col === '#ffffff' ? '3px solid #0d0d0d' : '3px solid transparent';
      });
      sw.style.border = '3px solid #0d0d0d';
      canvas.style.cursor = 'crosshair';
    });

    swatches.push(sw);
    colorRow.appendChild(sw);
  });

  // Brush sizes
  const SIZES = [2, 5, 10, 18];
  let brushSize = 5;

  const sizeRow = document.createElement('div');
  sizeRow.style.cssText = 'display:flex; gap:4px; align-items:center; margin-left:2px;';

  const sizeBtns = [];
  SIZES.forEach(s => {
    const btn = document.createElement('button');
    btn.type  = 'button';
    btn.title = `Brush size ${s}`;
    btn.style.cssText = `
      width:${s + 18}px; height:${s + 18}px; min-width:22px; min-height:22px;
      padding:0; display:flex; align-items:center; justify-content:center;
      border:3px solid #0d0d0d; cursor:pointer; flex-shrink:0;
      background:${s === brushSize ? '#0d0d0d' : '#fafaf7'};
      box-shadow:2px 2px 0 #0d0d0d;
    `;
    const dot = document.createElement('span');
    dot.style.cssText = `
      width:${s}px; height:${s}px; border-radius:50%; display:block; pointer-events:none;
      background:${s === brushSize ? '#fafaf7' : '#0d0d0d'};
    `;
    btn.appendChild(dot);

    btn.addEventListener('click', () => {
      brushSize = s;
      isErasing = false;
      eraser.style.background = '#fafaf7';
      eraser.style.color = '#0d0d0d';
      sizeBtns.forEach((b, i) => {
        b.style.background = SIZES[i] === s ? '#0d0d0d' : '#fafaf7';
        b.querySelector('span').style.background = SIZES[i] === s ? '#fafaf7' : '#0d0d0d';
      });
      canvas.style.cursor = 'crosshair';
    });

    sizeBtns.push(btn);
    sizeRow.appendChild(btn);
  });

  // Eraser
  const eraser = document.createElement('button');
  eraser.type    = 'button';
  eraser.style.cssText = `
    padding:4px 9px; font-size:0.7rem; font-family:inherit; font-weight:700;
    border:3px solid #0d0d0d; cursor:pointer; margin-left:auto; flex-shrink:0;
    background:#fafaf7; color:#0d0d0d; box-shadow:2px 2px 0 #0d0d0d;
    letter-spacing:0.04em; text-transform:uppercase;
  `;
  eraser.textContent = '⌫ ERASE';
  eraser.addEventListener('click', () => {
    isErasing = !isErasing;
    eraser.style.background = isErasing ? '#FF3333' : '#fafaf7';
    eraser.style.color      = isErasing ? '#fff'    : '#0d0d0d';
    canvas.style.cursor     = isErasing ? 'cell'    : 'crosshair';
  });

  // Clear
  const clearBtn = document.createElement('button');
  clearBtn.type  = 'button';
  clearBtn.style.cssText = `
    padding:4px 9px; font-size:0.7rem; font-family:inherit; font-weight:700;
    border:3px solid #0d0d0d; cursor:pointer; flex-shrink:0;
    background:#FFE500; color:#0d0d0d; box-shadow:2px 2px 0 #0d0d0d;
    letter-spacing:0.04em; text-transform:uppercase;
  `;
  clearBtn.textContent = '✕ CLEAR';

  toolbar.appendChild(colorRow);
  toolbar.appendChild(sizeRow);
  toolbar.appendChild(eraser);
  toolbar.appendChild(clearBtn);

  // ── CANVAS ───────────────────────────────────────────────────
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = 'flex:1; min-height:0; position:relative; overflow:hidden;';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    cursor:crosshair; touch-action:none; display:block;
    background:#ffffff;
  `;

  canvasWrapper.appendChild(canvas);
  container.appendChild(toolbar);
  container.appendChild(canvasWrapper);

  const ctx = canvas.getContext('2d');

  // ── RESIZE HANDLING (with cleanup) ───────────────────────────
  let resizeObserver = null;
  let resizeRAF      = null;

  function resizeCanvas() {
    const w = canvasWrapper.clientWidth;
    const h = canvasWrapper.clientHeight;
    if (w < 1 || h < 1) return;

    // Snapshot current drawing
    const snapshot = canvas.toDataURL();

    canvas.width  = w;
    canvas.height = h;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const img = new Image();
    img.onload = () => {
      if (canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(img, 0, 0, w, h);
      }
    };
    img.src = snapshot;
  }

  // Use ResizeObserver for reliable canvas sizing (avoids global resize event leak)
  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(resizeCanvas);
  });
  resizeObserver.observe(canvasWrapper);

  // Initial fill
  requestAnimationFrame(() => {
    resizeCanvas();
  });

  clearBtn.addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  // ── DRAWING LOGIC ─────────────────────────────────────────────
  let drawing = false;
  let lastX = 0, lastY = 0;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height)
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
    lastX = x; lastY = y;

    // Draw a dot at tap/click point
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

  canvas.addEventListener('mousedown',  startDraw);
  canvas.addEventListener('mousemove',  draw);
  canvas.addEventListener('mouseup',    stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove',  draw,      { passive: false });
  canvas.addEventListener('touchend',   stopDraw);
  canvas.addEventListener('touchcancel',stopDraw);

  // ── PUBLIC API ────────────────────────────────────────────────
  return {
    getImageData() {
      const offscreen = document.createElement('canvas');
      offscreen.width  = Math.max(canvas.width,  1);
      offscreen.height = Math.max(canvas.height, 1);
      const octx = offscreen.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, offscreen.width, offscreen.height);
      octx.drawImage(canvas, 0, 0);
      return offscreen.toDataURL('image/png');
    },

    clear() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    disable() {
      canvas.style.pointerEvents  = 'none';
      canvas.style.opacity        = '0.75';
      toolbar.style.pointerEvents = 'none';
      toolbar.style.opacity       = '0.4';
    },

    enable() {
      canvas.style.pointerEvents  = 'auto';
      canvas.style.opacity        = '1';
      toolbar.style.pointerEvents = 'auto';
      toolbar.style.opacity       = '1';
    },

    // Call this when the canvas component is no longer needed
    destroy() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      cancelAnimationFrame(resizeRAF);
    }
  };
}