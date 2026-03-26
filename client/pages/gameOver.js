// client/pages/gameOver.js — final results screen, perspective-aware, no scroll

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

  // Handle opponent_disconnected as a win
  const isDisconnectWin = data.outcome === 'opponent_disconnected';

  const isDraw = !data.winner && !isDisconnectWin;
  const iWon   = isDisconnectWin || (!isDraw && data.winner === me?.username);
  const iLost  = !isDraw && !iWon;

  let icon, headline, sub, heroBg, heroFg;

  if (isDraw) {
    icon     = '🤝';
    headline = 'DRAW!';
    sub      = 'THE DUEL ENDS IN STALEMATE';
    heroBg   = '#A6FAFF';
    heroFg   = '#0d0d0d';
  } else if (iWon) {
    icon     = '🏆';
    headline = 'YOU WIN!';
    sub      = isDisconnectWin ? 'OPPONENT FLED THE ARENA' : 'SUPREME SPELLCASTER';
    heroBg   = '#B8FF9F';
    heroFg   = '#0d0d0d';
  } else {
    icon     = '💀';
    headline = 'YOU LOSE!';
    sub      = (data.winner ? esc(data.winner) + ' IS THE' : 'THE') + ' SUPREME SPELLCASTER';
    heroBg   = '#FF9F9F';
    heroFg   = '#0d0d0d';
  }

  // Only show standings if we have two players
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

  // Show narrative only if it exists and game wasn't a disconnect mid-judging
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
        <div class="go-standings-header">⚔️ FINAL STANDINGS</div>
        ${standingRows || '<div class="go-row"><span class="go-player-name">Game ended</span></div>'}
      </div>

      <div class="go-buttons">
        <button id="btn-play-again" class="nb-btn nb-btn-yellow nb-btn-lg" style="flex:1;">
          🔄 PLAY AGAIN
        </button>
        <button id="btn-home" class="nb-btn nb-btn-black nb-btn-lg" style="flex:1;">
          🏠 HOME
        </button>
      </div>

    </div>
  `;

  document.getElementById('btn-home')      ?.addEventListener('click', () => window.location.reload());
  document.getElementById('btn-play-again')?.addEventListener('click', () => window.location.reload());
}