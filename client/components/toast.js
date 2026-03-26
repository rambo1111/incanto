// client/components/toast.js — temporary notification banners

let toastContainer = null;
let styleInjected  = false;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.setAttribute('role', 'status');
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      z-index:9999; display:flex; flex-direction:column-reverse; gap:8px;
      align-items:center; pointer-events:none; max-width:90vw;
    `;
    document.body.appendChild(toastContainer);
  }

  if (!styleInjected) {
    styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes toastIn  { from{transform:scale(0.82) translateY(16px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
      @keyframes toastOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(0.88) translateY(8px)} }
    `;
    document.head.appendChild(style);
  }
}

const COLORS = {
  default: 'background:#0d0d0d; color:#fafaf7;',
  success: 'background:#00C96B; color:#0d0d0d;',
  error:   'background:#FF3333; color:#fafaf7;',
  warning: 'background:#FFE500; color:#0d0d0d;',
  info:    'background:#0052FF; color:#fafaf7;',
};

export function showToast(message, type = 'default', duration = 2500) {
  ensureContainer();

  const colorCss = COLORS[type] || COLORS.default;

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding:9px 18px;
    border:3px solid #0d0d0d;
    box-shadow:4px 4px 0 #0d0d0d;
    font-family:'Space Grotesk', system-ui, monospace;
    font-size:0.8rem;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:0.07em;
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