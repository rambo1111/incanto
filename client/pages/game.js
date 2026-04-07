// client/pages/game.js
// Drawing battle arena — renders HUD, canvas, spell input, judging overlay,
// and round result. Uses wired elements for interactive controls,
// Zdog oracle for the judging animation.

import { getSocket }           from './socketClient.js';
import { createDrawingCanvas } from '../components/drawingCanvas.js';
import { createTimer }         from '../components/timer.js';
import { showToast }           from '../components/toast.js';
import { initZdogOracle }      from '../components/zdogOracle.js';

export function initGame(onGameOver) {
  const socket = getSocket();

  const gameEl   = document.getElementById('page-game');
  const resultEl = document.getElementById('page-result');

  let timer             = null;
  let canvas            = null;
  let oracleAnim        = null; // zdogOracle instance
  let submitted         = false;
  let roomCode          = '';
  let countdownInterval = null;
  let autocastDone      = false;
  let gameActive        = false;

  // ── START A ROUND ────────────────────────────────────────────────
  function startGame(data) {
    roomCode = data.roomCode || roomCode;
    gameActive = true;

    clearCountdown();
    destroyCanvas();
    stopOracle();
    timer        = null;
    submitted    = false;
    autocastDone = false;

    resultEl.classList.add('hidden');
    gameEl.classList.remove('hidden');
    renderGame(data);
  }

  // ── RENDER GAME ARENA ────────────────────────────────────────────
  function renderGame(data) {
    const players = data.players || [];
    const me   = players.find(p => p.isYou)  || { username: 'YOU',      lives: 3 };
    const them = players.find(p => !p.isYou) || { username: 'OPPONENT', lives: 3 };

    gameEl.innerHTML = `
      <div class="game-layout">

        <!-- HUD -->
        <div class="game-hud">
          <div class="hud-player">
            <div class="hud-badge hud-badge-you">YOU</div>
            <span class="hud-name hud-name-you">${esc(me.username)}</span>
            <div id="lives-me" class="hearts"></div>
          </div>

          <div class="hud-center">
            <div id="timer-container"></div>
            <div class="round-label">Round ${data.round} / ${data.maxRounds}</div>
          </div>

          <div class="hud-player hud-player-right">
            <div class="hud-badge hud-badge-opp">OPP</div>
            <span class="hud-name">${esc(them.username)}</span>
            <div id="lives-them" class="hearts"></div>
          </div>
        </div>

        <!-- Canvas area (drawingCanvas.js renders into this) -->
        <div class="game-canvas-area">
          <div class="canvas-container" id="canvas-wrapper"></div>
        </div>

        <!-- Bottom: spell name + cast button -->
        <div class="game-bottom">
          <div class="spell-input-wrap">
            <wired-input
              id="spell-name-input"
              placeholder="✨ Name your spell…"
              maxlength="48"
              autocomplete="off"
              spellcheck="false"
            ></wired-input>
          </div>
          <wired-button id="btn-cast-spell" class="cast-btn">⚡ Cast</wired-button>
        </div>

        <!-- Judging overlay (shown when both spells submitted) -->
        <div id="judging-overlay" class="judging-overlay hidden" aria-live="assertive">
          <div class="judging-card sketch-card">
            <div id="oracle-canvas-container" class="oracle-canvas-wrap"></div>
            <div class="judging-title">The Oracle Decides…</div>
            <div class="judging-dots">
              <span>●</span><span>●</span><span>●</span>
            </div>
          </div>
        </div>

      </div>
    `;

    // Render hearts
    renderLives('lives-me',   me.lives);
    renderLives('lives-them', them.lives);

    // Init timer
    timer  = createTimer('timer-container', data.drawTime || 60);

    // Init drawing canvas
    canvas = createDrawingCanvas('canvas-wrapper');

    // ── SUBMIT HANDLERS ──────────────────────────────────────────────
    const castBtn   = document.getElementById('btn-cast-spell');
    const spellInput = document.getElementById('spell-name-input');

    castBtn?.addEventListener('click', () => {
      if (submitted) return;
      const name = (spellInput?.value || '').trim();
      if (!name) { showToast('Name your spell first!', 'warning'); return; }
      doSubmit(name);
    });

    spellInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !submitted) {
        const name = (spellInput?.value || '').trim();
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

    const btn = document.getElementById('btn-cast-spell');
    if (btn) {
      btn.textContent = '✓ Cast!';
      btn.classList.add('submitted');
      btn.disabled = true;
    }

    showToast('Spell cast! Waiting for opponent…', 'success');
    socket.emit('submit_spell', { roomCode, imageData, spellName });
  }

  // ── LIVES ────────────────────────────────────────────────────────
  function renderLives(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'hearts';
    el.innerHTML = Array.from({ length: 3 }, (_, i) =>
      `<span class="heart${i >= count ? ' lost' : ''}" style="transform:rotate(${(i-1)*4}deg)">❤️</span>`
    ).join('');
  }

  // ── COUNTDOWN ────────────────────────────────────────────────────
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
    canvas?.destroy?.();
    canvas = null;
  }

  // ── ORACLE ANIMATION ─────────────────────────────────────────────
  function startOracle() {
    // Only initialise once; start/stop on show/hide
    if (!oracleAnim) {
      oracleAnim = initZdogOracle('oracle-canvas-container');
    }
    oracleAnim?.start();
  }

  function stopOracle() {
    oracleAnim?.stop();
    oracleAnim = null; // reset so it reinits for next judging overlay
  }

  // ── ROUND RESULT ─────────────────────────────────────────────────
  function showRoundResult(data) {
    if (!gameActive) return;

    gameEl.classList.add('hidden');
    resultEl.classList.remove('hidden');

    const players = data.players || [];
    const me   = players.find(p => p.isYou)  || players[0];
    const them = players.find(p => !p.isYou) || players[1];

    // Outcome → CSS class + icon + label
    const OUTCOME_MAP = {
      p1_loses:        { cls: 'outcome-lose',  icon: '💀', label: `${esc(data.spells?.[0]?.username || 'P1')} Loses a Life` },
      p2_loses:        { cls: 'outcome-win',   icon: '🏆', label: `${esc(data.spells?.[1]?.username || 'P2')} Loses a Life` },
      both_lose:       { cls: 'outcome-both',  icon: '💥', label: 'Both Lose a Life!' },
      none_lose:       { cls: 'outcome-stale', icon: '🛡️', label: 'Stalemate — No Lives Lost' },
      p1_inappropriate:{ cls: 'outcome-foul',  icon: '🚫', label: `${esc(data.spells?.[0]?.username || 'P1')} — Foul Spell!` },
      p2_inappropriate:{ cls: 'outcome-foul',  icon: '🚫', label: `${esc(data.spells?.[1]?.username || 'P2')} — Foul Spell!` },
    };

    const oc = OUTCOME_MAP[data.outcome] || { cls: 'outcome-stale', icon: '❓', label: esc(String(data.outcome)) };

    // Spell reveal cards HTML
    const spellsHtml = (data.spells || []).map((s, i) => `
      <div class="spell-reveal-card${s.isYou ? ' is-yours' : ''}">
        <div class="spell-reveal-top">
          ${esc(s.username)}${s.isYou ? ' <span class="you-tag">YOU</span>' : ''}
        </div>
        <img src="${s.imageData || ''}" class="spell-reveal-img" alt="spell drawing" loading="lazy"/>
        <div class="spell-reveal-name">&ldquo;${esc(s.spellName || '')}&rdquo;</div>
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

        <div class="result-header ${oc.cls}">
          <div class="result-icon">${oc.icon}</div>
          <h2 class="result-title">${oc.label}</h2>
          ${data.reason ? `<p class="result-reason">${esc(data.reason)}</p>` : ''}
        </div>

        <div class="result-middle">
          <div class="result-spells">${spellsHtml}</div>
          ${data.narrative ? `<blockquote class="result-narrative">${esc(data.narrative)}</blockquote>` : ''}
        </div>

        <div class="result-footer">
          <div class="result-lives-row">${livesHtml}</div>
          <div class="result-countdown-bar">
            <span>Next round in</span>
            <span id="next-round-countdown" class="countdown-number">${data.nextRoundIn || 5}</span>
            <span>seconds</span>
          </div>
          <wired-progress
            id="round-countdown-bar"
            min="0"
            max="${data.nextRoundIn || 5}"
            value="${data.nextRoundIn || 5}"
          ></wired-progress>
        </div>

      </div>
    `;

    // Render hearts in result footer
    if (me)   renderLives('result-lives-me',   me.lives);
    if (them) renderLives('result-lives-them', them.lives);

    // Countdown with wired-progress animation
    const progressBar = document.getElementById('round-countdown-bar');
    const total = data.nextRoundIn || 5;
    startCountdown(total, undefined);

    if (progressBar) {
      let remaining = total;
      const pInterval = setInterval(() => {
        remaining--;
        progressBar.value = remaining;
        if (remaining <= 0) clearInterval(pInterval);
      }, 1000);
    }
  }

  // ── SOCKET EVENTS ─────────────────────────────────────────────────

  socket.on('timer_tick', ({ remaining }) => {
    if (!gameActive) return;
    timer?.update(remaining);

    // Auto-cast at 3 seconds remaining if player hasn't submitted
    if (remaining === 3 && !autocastDone) {
      autocastDone = true;
      const spellInput = document.getElementById('spell-name-input');
      const name = (spellInput?.value || '').trim() || 'Chaotic Scribble';
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
    startOracle();
  });

  socket.on('round_result', (data) => {
    if (!gameActive) return;
    document.getElementById('judging-overlay')?.classList.add('hidden');
    stopOracle();
    clearCountdown();
    showRoundResult(data);
  });

  socket.on('game_over', (data) => {
    gameActive = false;
    document.getElementById('judging-overlay')?.classList.add('hidden');
    stopOracle();
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

// ── UTILITY ──────────────────────────────────────────────────────

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
