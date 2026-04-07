// client/pages/gameOver.js
// Final results screen.
// Renders a Zdog 3D outcome animation (trophy/skull/rings),
// PaperCSS-inspired standings panel, and wired-button actions.

import { initZdogTrophy } from '../components/zdogTrophy.js';

/**
 * @param {Object} data  - game_over payload from server
 */
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

  // Outcome metadata
  let zdogType, heroCls, icon, headline, sub;

  if (isDraw) {
    zdogType = 'draw';
    heroCls  = 'go-draw';
    icon     = '🤝';
    headline = 'Draw!';
    sub      = 'The duel ends in stalemate';
  } else if (iWon) {
    zdogType = 'win';
    heroCls  = 'go-win';
    icon     = '🏆';
    headline = 'You Win!';
    sub      = isDisconnectWin ? 'Opponent fled the arena' : 'Supreme Spellcaster';
  } else {
    zdogType = 'lose';
    heroCls  = 'go-lose';
    icon     = '💀';
    headline = 'You Lose!';
    sub      = (data.winner ? esc(data.winner) + ' is the' : 'The') + ' Supreme Spellcaster';
  }

  // Standing rows — dashed ruled lines between them (notebook feel)
  const standingRows = players.map(p => {
    const hearts   = Array.from({ length: 3 }, (_, i) =>
      `<span class="heart${i >= p.lives ? ' lost' : ''}" style="transform:rotate(${(i-1)*4}deg)">❤️</span>`
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

  const narrativeHtml = data.narrative && !isDisconnectWin
    ? `<blockquote class="go-narrative">${esc(data.narrative)}</blockquote>`
    : '';

  el.innerHTML = `
    <div class="go-layout">

      <!-- Hero section with Zdog animation -->
      <div class="go-hero ${heroCls}">
        <div id="go-trophy-wrap" class="go-trophy-wrap"></div>
        <h1 class="go-headline">${headline}</h1>
        <p class="go-sub">${sub}</p>
      </div>

      ${narrativeHtml}

      <!-- Standings card — DoodleCSS-bordered -->
      <div class="go-standings sketch-card" style="padding:0;">
        <div class="go-standings-header">⚔️ Final Standings</div>
        ${standingRows || '<div class="go-row"><span class="go-player-name">Game ended</span></div>'}
      </div>

      <!-- Action buttons -->
      <div class="go-buttons">
        <wired-button id="btn-play-again" class="go-btn go-btn-again">🔄 Play Again</wired-button>
        <wired-button id="btn-home"       class="go-btn go-btn-home" >🏠 Home</wired-button>
      </div>

    </div>
  `;

  // ── INIT ZDOG TROPHY ANIMATION ──────────────────────────────────
  // Slight delay so the DOM is painted before we grab the container
  requestAnimationFrame(() => {
    initZdogTrophy('go-trophy-wrap', zdogType);
  });

  // ── BUTTON HANDLERS ──────────────────────────────────────────────
  document.getElementById('btn-home')?.addEventListener('click',       () => window.location.reload());
  document.getElementById('btn-play-again')?.addEventListener('click', () => window.location.reload());
}

/** Escape HTML special characters */
function esc(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
