// client/app.js — entry point, wires all pages + socket routing

import { initLobby }    from './pages/lobby.js';
import { initGame }     from './pages/game.js';
import { showGameOver } from './pages/gameOver.js';
import { getSocket }    from './pages/socketClient.js';
import { initZdogHero } from './components/zdogHero.js';

const socket = getSocket();

// Track current room code across pages
let activeRoomCode = '';

// ── INIT PAGES ─────────────────────────────────────────────────

const { startGame } = initGame((gameOverData) => {
  document.getElementById('page-lobby')?.classList.add('hidden');
  document.getElementById('page-result')?.classList.add('hidden');
  document.getElementById('page-game')?.classList.add('hidden');
  showGameOver(gameOverData);
});

initLobby();

// Launch 3D hero after DOM is ready (lobby is visible on load)
document.addEventListener('DOMContentLoaded', () => {
  initZdogHero('zdog-hero-container');
});

// Fallback if DOMContentLoaded already fired (script is deferred as module)
if (document.readyState !== 'loading') {
  initZdogHero('zdog-hero-container');
}

// ── GLOBAL SOCKET ROUTING ──────────────────────────────────────

socket.on('room_created', ({ roomCode }) => {
  activeRoomCode = roomCode;
});

socket.on('room_joined', ({ roomCode }) => {
  activeRoomCode = roomCode;
});

socket.on('round_start', (data) => {
  data.roomCode = activeRoomCode;
  // Hide all other pages
  document.getElementById('page-lobby')?.classList.add('hidden');
  document.getElementById('page-result')?.classList.add('hidden');
  document.getElementById('page-gameover')?.classList.add('hidden');
  startGame(data);
});
