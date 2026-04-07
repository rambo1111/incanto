// client/components/timer.js
// Circular SVG countdown timer.
// Colours updated to match sketchbook theme; logic is unchanged.

export function createTimer(containerId, totalTime = 60) {
  const container = document.getElementById(containerId);
  if (!container) return { update: () => {} };

  const RADIUS = 24;
  const CIRC   = 2 * Math.PI * RADIUS;

  container.innerHTML = `
    <div class="timer-ring" id="${containerId}-ring">
      <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
        <circle class="track" cx="29" cy="29" r="${RADIUS}"
          fill="none" stroke-width="4"/>
        <circle class="progress" cx="29" cy="29" r="${RADIUS}"
          fill="none" stroke-width="4"
          id="${containerId}-progress"
          stroke-dasharray="${CIRC}"
          stroke-dashoffset="0"
          transform="rotate(-90 29 29)"
        />
      </svg>
      <div class="timer-text" id="${containerId}-text" aria-live="off">${totalTime}</div>
    </div>
  `;

  const ring     = document.getElementById(`${containerId}-ring`);
  const progress = document.getElementById(`${containerId}-progress`);
  const text     = document.getElementById(`${containerId}-text`);

  function update(remaining) {
    const fraction = Math.max(0, Math.min(1, remaining / totalTime));
    progress.style.strokeDashoffset = CIRC * (1 - fraction);
    text.textContent = remaining;

    if (remaining <= 5) {
      progress.style.stroke = 'var(--muted-red)';
      ring.classList.add('timer-urgent');
    } else if (remaining <= 15) {
      progress.style.stroke = 'var(--amber)';
      ring.classList.remove('timer-urgent');
    } else {
      progress.style.stroke = 'var(--ink)';
      ring.classList.remove('timer-urgent');
    }
  }

  return { update };
}
