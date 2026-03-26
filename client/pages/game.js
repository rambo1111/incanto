// client/pages/game.js — drawing battle arena

import { getSocket }           from './socketClient.js';
import { createDrawingCanvas } from '../components/drawingCanvas.js';
import { createTimer }         from '../components/timer.js';
import { showToast }           from '../components/toast.js';

export function initGame(onGameOver) {
  const socket = getSocket();

  const gameEl   = document.getElementById('page-game');
  const resultEl = document.getElementById('page-result');

  let timer             = null;
  let canvas            = null;
  let submitted         = false;
  let roomCode          = '';
  let countdownInterval = null;
  let autocastDone      = false;
  let gameActive        = false; // guard — prevents stale socket events acting on torn-down UI

  // ── START A ROUND ───────────────────────────────────────────────
  function startGame(data) {
    roomCode = data.roomCode || roomCode;
    gameActive = true;

    clearCountdown();
    destroyCanvas();
    timer        = null;
    submitted    = false;
    autocastDone = false;

    resultEl.classList.add('hidden');
    gameEl.classList.remove('hidden');
    renderGame(data);
  }

  // ── RENDER GAME ARENA ───────────────────────────────────────────
  function renderGame(data) {
    const players = data.players || [];
    const me   = players.find(p => p.isYou)  || { username: 'YOU',      lives: 3, isYou: true  };
    const them = players.find(p => !p.isYou) || { username: 'OPPONENT', lives: 3, isYou: false };

    gameEl.innerHTML = `
      <div class="game-layout">

        <!-- HUD -->
        <div class="game-hud">
          <div class="hud-player">
            <div class="hud-you-badge">YOU</div>
            <span class="hud-name hud-name-you">${esc(me.username)}</span>
            <div id="lives-me" class="hearts"></div>
          </div>

          <div class="hud-center">
            <div id="timer-container"></div>
            <div class="round-label">ROUND ${data.round}/${data.maxRounds}</div>
          </div>

          <div class="hud-player hud-player-right">
            <div class="hud-opp-badge">OPP</div>
            <span class="hud-name">${esc(them.username)}</span>
            <div id="lives-them" class="hearts"></div>
          </div>
        </div>

        <!-- Canvas -->
        <div class="game-canvas-area">
          <div class="canvas-container" id="canvas-wrapper"></div>
        </div>

        <!-- Bottom bar -->
        <div class="game-bottom">
          <input
            id="spell-name-input"
            class="nb-input spell-input"
            placeholder="✨ Name your spell..."
            maxlength="48"
            autocomplete="off"
            spellcheck="false"
          />
          <button id="btn-submit-spell" class="nb-btn nb-btn-red nb-btn-lg cast-btn">
            ⚡ CAST
          </button>
        </div>

        <!-- Judging overlay -->
        <div id="judging-overlay" class="judging-overlay hidden" aria-live="assertive">
          <div class="judging-inner">
            <div class="judging-icon">⚗️</div>
            <div class="judging-title">THE ORACLE DECIDES…</div>
            <div class="judging-dots"><span>●</span><span>●</span><span>●</span></div>
          </div>
        </div>

      </div>
    `;

    renderLives('lives-me',   me.lives);
    renderLives('lives-them', them.lives);

    timer  = createTimer('timer-container', data.drawTime || 60);
    canvas = createDrawingCanvas('canvas-wrapper');

    const submitBtn  = document.getElementById('btn-submit-spell');
    const spellInput = document.getElementById('spell-name-input');

    submitBtn.addEventListener('click', () => {
      if (submitted) return;
      const name = spellInput.value.trim();
      if (!name) { showToast('Name your spell first!', 'warning'); return; }
      doSubmit(name);
    });

    spellInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submitted) {
        const name = spellInput.value.trim();
        if (name) doSubmit(name);
        else showToast('Name your spell first!', 'warning');
      }
    });
  }

  // ── SUBMIT SPELL ─────────────────────────────────────────────────
  function doSubmit(spellName) {
    if (submitted) return;
    submitted    = true;
    autocastDone = true;

    const imageData = canvas?.getImageData() ?? null;
    canvas?.disable();

    const btn = document.getElementById('btn-submit-spell');
    if (btn) {
      btn.textContent = '✓ CAST!';
      btn.className   = 'nb-btn nb-btn-lime nb-btn-lg cast-btn';
      btn.disabled    = true;
    }

    showToast('Spell cast! Waiting for opponent…', 'success');
    socket.emit('submit_spell', { roomCode, imageData, spellName });
  }

  // ── LIVES ─────────────────────────────────────────────────────────
  function renderLives(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'hearts';
    el.innerHTML = Array.from({ length: 3 }, (_, i) =>
      `<span class="heart${i >= count ? ' lost' : ''}">❤️</span>`
    ).join('');
  }

  // ── COUNTDOWN ─────────────────────────────────────────────────────
  function startCountdown(seconds, onDone) {
    clearCountdown();
    let remaining = seconds;
    const tick = () => {
      const el = document.getElementById('next-round-countdown');
      if (el) el.textContent = remaining;
    };
    tick();
    countdownInterval = setInterval(() => {
      remaining--;
      tick();
      if (remaining <= 0) { clearCountdown(); onDone?.(); }
    }, 1000);
  }

  function clearCountdown() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  }

  function destroyCanvas() {
    if (canvas) {
      if (typeof canvas.destroy === 'function') canvas.destroy();
      canvas = null;
    }
  }

  // ── ROUND RESULT ──────────────────────────────────────────────────
  function showRoundResult(data) {
    if (!gameActive) return;

    gameEl.classList.add('hidden');
    resultEl.classList.remove('hidden');

    const players = data.players || [];
    const me   = players.find(p => p.isYou)  || players[0];
    const them = players.find(p => !p.isYou) || players[1];

    const outcomeMap = {
      p1_loses:         { label: `${esc(data.spells?.[0]?.username || 'P1')} LOSES A LIFE!`, bg: 'var(--red-200)',    fg: '#0d0d0d', icon: '💀' },
      p2_loses:         { label: `${esc(data.spells?.[1]?.username || 'P2')} LOSES A LIFE!`, bg: 'var(--lime-200)',   fg: '#0d0d0d', icon: '🏆' },
      both_lose:        { label: 'BOTH LOSE A LIFE!',              bg: 'var(--orange-200)', fg: '#0d0d0d', icon: '💥' },
      none_lose:        { label: 'STALEMATE — NO LIVES LOST!',     bg: 'var(--cyan-200)',   fg: '#0d0d0d', icon: '🛡️' },
      p1_inappropriate: { label: `${esc(data.spells?.[0]?.username || 'P1')} — FOUL SPELL!`, bg: 'var(--pink-200)',   fg: '#0d0d0d', icon: '🚫' },
      p2_inappropriate: { label: `${esc(data.spells?.[1]?.username || 'P2')} — FOUL SPELL!`, bg: 'var(--pink-200)',   fg: '#0d0d0d', icon: '🚫' },
    };
    const oc = outcomeMap[data.outcome] || { label: esc(String(data.outcome)), bg: 'var(--black)', fg: '#fff', icon: '❓' };

    const spellsHtml = (data.spells || []).map((s, i) => `
      <div class="spell-reveal-card${s.isYou ? ' spell-reveal-yours' : ''}">
        <div class="spell-reveal-name-top">
          ${esc(s.username)}${s.isYou ? ' <span class="you-tag">YOU</span>' : ''}
        </div>
        <img src="${s.imageData || ''}" class="spell-reveal-img" alt="drawing" loading="lazy"/>
        <div class="spell-reveal-label">&ldquo;${esc(s.spellName || '')}&rdquo;</div>
      </div>
      ${i === 0 && data.spells.length > 1 ? '<div class="vs-divider">VS</div>' : ''}
    `).join('');

    const livesHtml = [me, them].filter(Boolean).map(p => `
      <div class="result-player-lives">
        <span class="result-player-name">
          ${esc(p.username)}${p.isYou ? ' <span class="you-tag">YOU</span>' : ''}
        </span>
        <div class="hearts" id="result-lives-${p.isYou ? 'me' : 'them'}"></div>
      </div>
    `).join('');

    resultEl.innerHTML = `
      <div class="result-layout">

        <div class="result-header" style="background:${oc.bg}; color:${oc.fg};">
          <span class="result-icon">${oc.icon}</span>
          <h2 class="result-title">${oc.label}</h2>
          ${data.reason ? `<p class="result-reason">${esc(data.reason)}</p>` : ''}
        </div>

        <div class="result-middle">
          <div class="result-spells">${spellsHtml}</div>
          ${data.narrative ? `<div class="result-narrative">${esc(data.narrative)}</div>` : ''}
        </div>

        <div class="result-footer">
          <div class="result-lives-row">${livesHtml}</div>
          <div class="result-countdown-bar">
            <span>NEXT ROUND IN</span>
            <span id="next-round-countdown" class="countdown-number">${data.nextRoundIn || 5}</span>
            <span>SECONDS</span>
          </div>
        </div>

      </div>
    `;

    if (me)   renderLives('result-lives-me',   me.lives);
    if (them) renderLives('result-lives-them', them.lives);

    startCountdown(data.nextRoundIn || 5);
  }

  // ── SOCKET EVENTS ─────────────────────────────────────────────────

  socket.on('timer_tick', ({ remaining }) => {
    if (!gameActive) return;
    timer?.update(remaining);

    // Auto-cast at 3 seconds remaining
    if (remaining === 3 && !autocastDone) {
      autocastDone = true;
      const spellInput = document.getElementById('spell-name-input');
      const name = spellInput?.value?.trim() || 'Chaotic Scribble';
      showToast('⏰ Time up — auto-casting!', 'warning', 2000);
      setTimeout(() => { if (!submitted) doSubmit(name); }, 120);
    }
  });

  socket.on('spell_submitted', ({ submittedCount }) => {
    if (!gameActive) return;
    if (submittedCount === 2) showToast('Both spells cast! Judging…', 'info');
  });

  socket.on('judging_start', () => {
    if (!gameActive) return;
    document.getElementById('judging-overlay')?.classList.remove('hidden');
  });

  socket.on('round_result', (data) => {
    if (!gameActive) return;
    document.getElementById('judging-overlay')?.classList.add('hidden');
    clearCountdown();
    showRoundResult(data);
  });

  socket.on('game_over', (data) => {
    gameActive = false;
    document.getElementById('judging-overlay')?.classList.add('hidden');
    clearCountdown();
    destroyCanvas();
    gameEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    onGameOver(data);
  });

  socket.on('opponent_disconnected', ({ message }) => {
    if (!gameActive) return;
    showToast(message || 'Opponent disconnected!', 'warning', 5000);
  });

  return { startGame };
}

function esc(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}