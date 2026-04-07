// client/components/lives.js
// Heart life display — same API as before, sketchbook-themed.

/**
 * @param {string} containerId
 * @param {number} maxLives
 * @returns {{ update: (current: number) => void }}
 */
export function createLives(containerId, maxLives = 3) {
  const container = document.getElementById(containerId);
  if (!container) return { update: () => {} };

  function render(current) {
    container.innerHTML = '';
    container.className = 'hearts';

    for (let i = 0; i < maxLives; i++) {
      const heart = document.createElement('span');
      heart.className = `heart${i >= current ? ' lost' : ''}`;
      heart.textContent = '❤️';
      // Slight rotation for each heart — hand-scattered feel
      heart.style.transform = `rotate(${(i - 1) * 4}deg)`;
      container.appendChild(heart);
    }
  }

  render(maxLives);
  return { update: render };
}
