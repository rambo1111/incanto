// client/app.js — main entry point, wires all pages together

import { initLobby }    from './pages/lobby.js';
import { initGame }     from './pages/game.js';
import { showGameOver } from './pages/gameOver.js';
import { getSocket }    from './pages/socketClient.js';

const socket = getSocket();

// Track current room code globally
let activeRoomCode = '';

// ── INIT PAGE MODULES ─────────────────────────────────────────

const { startGame } = initGame((gameOverData) => {
  // Ensure all game/result pages are hidden before showing game over
  document.getElementById('page-lobby')?.classList.add('hidden');
  document.getElementById('page-result')?.classList.add('hidden');
  document.getElementById('page-game')?.classList.add('hidden');
  showGameOver(gameOverData);
});

initLobby();

// ── GLOBAL SOCKET ROUTING ─────────────────────────────────────

socket.on('room_created', ({ roomCode }) => {
  activeRoomCode = roomCode;
});

socket.on('room_joined', ({ roomCode }) => {
  activeRoomCode = roomCode;
});

socket.on('round_start', (data) => {
  data.roomCode = activeRoomCode;
  document.getElementById('page-lobby')?.classList.add('hidden');
  document.getElementById('page-result')?.classList.add('hidden');
  document.getElementById('page-gameover')?.classList.add('hidden');
  startGame(data);
});

// ── VISIBILITY CHANGE — pause / resume ────────────────────────
// Prevent auto-submit spamming if tab is backgrounded
document.addEventListener('visibilitychange', () => {
  // Nothing destructive — socket stays open, game continues server-side
});