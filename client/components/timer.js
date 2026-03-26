// client/components/timer.js — circular countdown timer

export function createTimer(containerId, totalTime = 60) {
  const container = document.getElementById(containerId);
  if (!container) return { update: () => {} };

  const RADIUS = 28;
  const CIRC   = 2 * Math.PI * RADIUS;

  container.innerHTML = `
    <div class="timer-ring" id="${containerId}-ring">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle class="track"    cx="36" cy="36" r="${RADIUS}" fill="none" stroke-width="5"/>
        <circle class="progress" cx="36" cy="36" r="${RADIUS}" fill="none" stroke-width="5"
          id="${containerId}-progress"
          stroke-dasharray="${CIRC}"
          stroke-dashoffset="0"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div class="timer-text" id="${containerId}-text" aria-live="off">${totalTime}</div>
    </div>
  `;

  const ring     = document.getElementById(`${containerId}-ring`);
  const progress = document.getElementById(`${containerId}-progress`);
  const text     = document.getElementById(`${containerId}-text`);

  let _total = totalTime;

  function update(remaining) {
    const fraction = Math.max(0, Math.min(1, remaining / _total));
    const offset   = CIRC * (1 - fraction);

    progress.style.strokeDashoffset = offset;
    text.textContent = remaining;

    if (remaining <= 5) {
      progress.style.stroke = 'var(--red)';
      ring.classList.add('timer-urgent');
    } else if (remaining <= 10) {
      progress.style.stroke = 'var(--orange)';
      ring.classList.remove('timer-urgent');
    } else {
      progress.style.stroke = 'var(--black)';
      ring.classList.remove('timer-urgent');
    }
  }

  return { update };
}