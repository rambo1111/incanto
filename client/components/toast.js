// client/components/toast.js — temporary notification banners

let toastContainer = null;
let styleInjected  = false;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.setAttribute('role', 'status');
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.style.cssText = `
      position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
      z-index:9999; display:flex; flex-direction:column-reverse; gap:8px;
      align-items:center; pointer-events:none; max-width:90vw;
    `;
    document.body.appendChild(toastContainer);
  }

  if (!styleInjected) {
    styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes toastIn  { from{transform:scale(0.84) translateY(14px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
      @keyframes toastOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(0.9) translateY(6px)} }
    `;
    document.head.appendChild(style);
  }
}

// Palette-aligned toast colours
const STYLES = {
  default: 'background:#1a1a1a; color:rgb(248,248,242);',               // charcoal on floralwhite
  success: 'background:#b8ff9f; color:#1a1a1a;',                        // palegreen
  error:   'background:rgb(255,160,122); color:#1a1a1a;',               // lightsalmon
  warning: 'background:#ffc29f; color:#1a1a1a;',                        // peachpuff
  info:    'background:#a8a6ff; color:#1a1a1a;',                        // cornflowerblue
};

export function showToast(message, type = 'default', duration = 2500) {
  ensureContainer();

  const colorCss = STYLES[type] || STYLES.default;

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding:9px 18px;
    border:3px solid #1a1a1a;
    box-shadow:4px 4px 0 #1a1a1a;
    font-family:'Space Grotesk', system-ui, sans-serif;
    font-size:0.8rem;
    font-weight:700;
    letter-spacing:0.04em;
    animation:toastIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
    pointer-events:auto;
    white-space:nowrap;
    max-width:90vw;
    overflow:hidden;
    text-overflow:ellipsis;
    ${colorCss}
  `;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  const removeToast = () => {
    toast.style.animation = 'toastOut 0.2s ease forwards';
    setTimeout(() => toast.remove(), 220);
  };

  const timer = setTimeout(removeToast, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); removeToast(); });
}