// client/pages/gameOver.js — final results screen

function esc(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

export function showGameOver(data) {
  const el = document.getElementById('page-gameover');
  if (!el) return;
  el.classList.remove('hidden');

  const players = data.players || [];
  const me      = players.find(p => p.isYou);
  const them    = players.find(p => !p.isYou);

  const isDisconnectWin = data.outcome === 'opponent_disconnected';
  const isDraw = !data.winner && !isDisconnectWin;
  const iWon   = isDisconnectWin || (!isDraw && data.winner === me?.username);

  // All palette colors — no pure black backgrounds
  let icon, headline, sub, heroBg, heroFg;
  const CHARCOAL = '#1a1a1a';

  if (isDraw) {
    icon     = '🤝';
    headline = 'Draw!';
    sub      = 'The duel ends in stalemate';
    heroBg   = '#a6faff';    // paleturquoise
    heroFg   = CHARCOAL;
  } else if (iWon) {
    icon     = '🏆';
    headline = 'You Win!';
    sub      = isDisconnectWin ? 'Opponent fled the arena' : 'Supreme Spellcaster';
    heroBg   = '#b8ff9f';    // palegreen
    heroFg   = CHARCOAL;
  } else {
    icon     = '💀';
    headline = 'You Lose!';
    sub      = (data.winner ? esc(data.winner) + ' is the' : 'The') + ' Supreme Spellcaster';
    heroBg   = 'rgb(255,160,122)';  // lightsalmon — palette-safe, not red
    heroFg   = CHARCOAL;
  }

  const standingRows = players.map(p => {
    const hearts   = Array.from({ length: 3 }, (_, i) =>
      `<span class="heart${i >= p.lives ? ' lost' : ''}">❤️</span>`
    ).join('');
    const isWinner = !isDraw && data.winner === p.username;
    return `
      <div class="go-row">
        <span class="go-player-name">
          ${isWinner ? '👑 ' : ''}${esc(p.username)}
          ${p.isYou ? '<span class="you-tag">YOU</span>' : ''}
        </span>
        <div class="hearts">${hearts}</div>
      </div>`;
  }).join('');

  const narrativeHtml = data.narrative && !isDisconnectWin ? `
    <div class="go-narrative">${esc(data.narrative)}</div>
  ` : '';

  el.innerHTML = `
    <div class="go-layout">

      <div class="go-hero" style="background:${heroBg}; color:${heroFg};">
        <div class="go-icon">${icon}</div>
        <h1 class="go-headline">${headline}</h1>
        <p class="go-sub">${sub}</p>
      </div>

      ${narrativeHtml}

      <div class="go-standings">
        <div class="go-standings-header">⚔️ Final Standings</div>
        ${standingRows || '<div class="go-row"><span class="go-player-name">Game ended</span></div>'}
      </div>

      <div class="go-buttons">
        <button id="btn-play-again" class="nb-btn nb-btn-violet nb-btn-lg" style="flex:1;">
          🔄 Play Again
        </button>
        <button id="btn-home" class="nb-btn nb-btn-black nb-btn-lg" style="flex:1;">
          🏠 Home
        </button>
      </div>

    </div>
  `;

  document.getElementById('btn-home')      ?.addEventListener('click', () => window.location.reload());
  document.getElementById('btn-play-again')?.addEventListener('click', () => window.location.reload());
}