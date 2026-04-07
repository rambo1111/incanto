// client/pages/lobby.js
// Lobby UI logic — wires wired-input / wired-button elements defined in index.html.

import { getSocket } from './socketClient.js';
import { showToast } from '../components/toast.js';

export function initLobby() {
  const socket = getSocket();

  // ── ELEMENT REFS ─────────────────────────────────────────────────
  const usernameInput = document.getElementById('username-input');
  const roomCodeInput = document.getElementById('room-code-input');
  const btnCreate     = document.getElementById('btn-create-room');
  const btnJoin       = document.getElementById('btn-join-room');
  const btnRandom     = document.getElementById('btn-random-room');
  const waitingBanner = document.getElementById('waiting-banner');
  const waitingCode   = document.getElementById('waiting-code');

  // ── AUTO-UPPERCASE ────────────────────────────────────────────────
  // wired-input fires standard 'input' events; .value mirrors native input value
  usernameInput?.addEventListener('input', () => {
    const pos = usernameInput.selectionStart;
    usernameInput.value = (usernameInput.value || '').toUpperCase();
    try { usernameInput.setSelectionRange(pos, pos); } catch (_) { /* ignore */ }
  });

  roomCodeInput?.addEventListener('input', () => {
    roomCodeInput.value = (roomCodeInput.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  });

  // ── HELPERS ──────────────────────────────────────────────────────

  function getUsername() {
    const name = ((usernameInput?.value) || '').trim().toUpperCase();
    if (!name)         { showToast('Enter your wizard name!', 'error');      usernameInput?.focus(); return null; }
    if (name.length < 2) { showToast('Name must be 2+ characters!', 'error'); usernameInput?.focus(); return null; }
    if (name.length > 14) { showToast('Name too long (max 14 chars)', 'error');                        return null; }
    return name;
  }

  function setButtonsDisabled(val) {
    [btnCreate, btnJoin, btnRandom].forEach(btn => {
      if (btn) btn.disabled = val;
    });
  }

  // ── BUTTON CLICK HANDLERS ─────────────────────────────────────────

  btnCreate?.addEventListener('click', () => {
    const username = getUsername();
    if (!username) return;
    setButtonsDisabled(true);
    socket.emit('create_room', { username });
  });

  btnJoin?.addEventListener('click', () => {
    const username = getUsername();
    if (!username) return;
    const code = ((roomCodeInput?.value) || '').trim().toUpperCase();
    if (!code)           { showToast('Enter a room code!', 'error'); roomCodeInput?.focus(); return; }
    if (code.length < 4) { showToast('Code too short!',   'error'); roomCodeInput?.focus(); return; }
    setButtonsDisabled(true);
    socket.emit('join_room', { username, roomCode: code });
  });

  btnRandom?.addEventListener('click', () => {
    const username = getUsername();
    if (!username) return;
    setButtonsDisabled(true);
    socket.emit('join_random', { username });
  });

  // Enter key in code input triggers join
  roomCodeInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnJoin?.click();
  });

  // Enter key in name input triggers create
  usernameInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnCreate?.click();
  });

  // Copy room code button
  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    const code = waitingCode?.textContent || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
        .then(()  => showToast('Code copied! ✓', 'success'))
        .catch(()  => showToast(`Code: ${code}`, 'info', 4000));
    } else {
      showToast(`Code: ${code}`, 'info', 4000);
    }
  });

  // ── SOCKET RESPONSES ──────────────────────────────────────────────

  socket.on('room_created', ({ roomCode, waiting }) => {
    waitingBanner?.classList.remove('hidden');
    if (waitingCode) waitingCode.textContent = roomCode;
    showToast(
      waiting ? '⏳ Waiting for an opponent…' : `✅ Room ${roomCode} ready!`,
      waiting ? 'info' : 'success',
      5000
    );
  });

  socket.on('room_joined', ({ roomCode, yourUsername }) => {
    const cur = ((usernameInput?.value) || '').trim().toUpperCase();
    if (yourUsername && yourUsername !== cur) {
      if (usernameInput) usernameInput.value = yourUsername;
      showToast(`Name taken — you are: ${yourUsername}`, 'warning', 4000);
    } else {
      showToast(`Joined room ${roomCode}! ✓`, 'success');
    }
  });

  socket.on('join_error', ({ message }) => {
    showToast(message || 'Could not join room', 'error');
    setButtonsDisabled(false);
  });

  socket.on('player_joined', ({ room }) => {
    const opp = (room.players || []).find(p => !p.isYou);
    if (opp) showToast(`${opp.username} joined the battle!`, 'success');
  });

  socket.on('connect_error', () => {
    showToast('Connection lost — retrying…', 'error', 3000);
    setButtonsDisabled(false);
  });
}
