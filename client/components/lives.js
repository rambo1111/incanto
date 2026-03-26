// components/lives.js — heart life display

export function createLives(containerId, maxLives = 3) {
  const container = document.getElementById(containerId);

  function render(current) {
    container.innerHTML = '';
    container.className = 'hearts';
    for (let i = 0; i < maxLives; i++) {
      const h = document.createElement('span');
      h.className = 'heart' + (i >= current ? ' lost' : '');
      h.textContent = '❤️';
      container.appendChild(h);
    }
  }

  render(maxLives);
  return { update: render };
}
