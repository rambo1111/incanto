// client/components/toast.js
// Temporary notification banners — styled as hand-torn sticky notes.
// Uses a single shared container defined in index.html (#toast-container).

// Palette-aligned background colours per type
const TOAST_STYLES = {
  default: { bg: '#f8f7ef', border: '#2c1810', color: '#2c1810' },
  success: { bg: '#adc9b5', border: '#5a7d66', color: '#2c1810' },
  error:   { bg: '#e8a0a0', border: '#9e3e3e', color: '#2c1810' },
  warning: { bg: '#e8c07a', border: '#9e6a28', color: '#2c1810' },
  info:    { bg: '#b8aed4', border: '#6a5e8a', color: '#2c1810' },
};

/**
 * @param {string} message
 * @param {'default'|'success'|'error'|'warning'|'info'} type
 * @param {number} duration - milliseconds before auto-dismiss
 */
export function showToast(message, type = 'default', duration = 2600) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const style = TOAST_STYLES[type] || TOAST_STYLES.default;

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 8px 16px;
    background: ${style.bg};
    color: ${style.color};
    border: 2px solid ${style.border};
    border-radius: 2px;
    /* Slight random rotation — sticky note feel */
    transform: rotate(${(Math.random() - 0.5) * 2.4}deg);
    /* Hand-drawn shadow */
    box-shadow: 3px 4px 0 ${style.border}33;
    font-family: 'Short Stack', cursive;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    pointer-events: auto;
    white-space: nowrap;
    max-width: 88vw;
    overflow: hidden;
    text-overflow: ellipsis;
    animation: toastIn 0.24s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  `;
  toast.textContent = message;

  // Inject keyframes once
  if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.textContent = `
      @keyframes toastIn  {
        from { transform: scale(0.82) translateY(10px); opacity: 0; }
        to   { transform: scale(1)    translateY(0);    opacity: 1; }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: scale(1); }
        to   { opacity: 0; transform: scale(0.88) translateY(6px); }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(toast);

  const dismiss = () => {
    toast.style.animation = 'toastOut 0.2s ease forwards';
    setTimeout(() => toast.remove(), 220);
  };

  const timer = setTimeout(dismiss, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}
