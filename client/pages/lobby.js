// client/pages/lobby.js

import { getSocket } from './socketClient.js';
import { showToast } from '../components/toast.js';

export function initLobby() {
  const socket = getSocket();

  const usernameInput = document.getElementById('username-input');
  const roomCodeInput = document.getElementById('room-code-input');
  const btnCreate     = document.getElementById('btn-create-room');
  const btnJoin       = document.getElementById('btn-join-room');
  const btnRandom     = document.getElementById('btn-random-room');
  const waitingBanner = document.getElementById('waiting-banner');
  const waitingCode   = document.getElementById('waiting-code');

  // Auto-uppercase
  usernameInput?.addEventListener('input', () => {
    const pos = usernameInput.selectionStart;
    usernameInput.value = usernameInput.value.toUpperCase();
    usernameInput.setSelectionRange(pos, pos);
  });
  roomCodeInput?.addEventListener('input', () => {
    const pos = roomCodeInput.selectionStart;
    roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    roomCodeInput.setSelectionRange(pos, pos);
  });

  function getUsername() {
    const name = (usernameInput?.value || '').trim().toUpperCase();
    if (!name)       { showToast('Enter your wizard name!', 'error');              usernameInput?.focus(); return null; }
    if (name.length < 2) { showToast('Name must be 2+ characters!', 'error');     usernameInput?.focus(); return null; }
    if (name.length > 14) { showToast('Name too long (max 14 chars)', 'error');                           return null; }
    return name;
  }

  function setButtonsDisabled(val) {
    [btnCreate, btnJoin, btnRandom].forEach(b => { if (b) b.disabled = val; });
  }

  // ── Buttons ──────────────────────────────────────────────────

  btnCreate?.addEventListener('click', () => {
    const username = getUsername(); if (!username) return;
    setButtonsDisabled(true);
    socket.emit('create_room', { username });
  });

  btnJoin?.addEventListener('click', () => {
    const username = getUsername(); if (!username) return;
    const code = (roomCodeInput?.value || '').trim().toUpperCase();
    if (!code)             { showToast('Enter a room code!',      'error'); roomCodeInput?.focus(); setButtonsDisabled(false); return; }
    if (code.length < 4)   { showToast('Code too short!',        'error'); roomCodeInput?.focus(); return; }
    setButtonsDisabled(true);
    socket.emit('join_room', { username, roomCode: code });
  });

  btnRandom?.addEventListener('click', () => {
    const username = getUsername(); if (!username) return;
    setButtonsDisabled(true);
    socket.emit('join_random', { username });
  });

  roomCodeInput?.addEventListener('keydown', e => { if (e.key === 'Enter') btnJoin?.click(); });
  usernameInput?.addEventListener('keydown', e => { if (e.key === 'Enter') btnCreate?.click(); });

  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    const code = waitingCode?.textContent || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
        .then(()  => showToast('Code copied!', 'success'))
        .catch(()  => showToast(`Code: ${code}`, 'info', 4000));
    } else {
      showToast(`Code: ${code}`, 'info', 4000);
    }
  });

  // ── Socket responses ─────────────────────────────────────────

  socket.on('room_created', ({ roomCode, waiting }) => {
    waitingBanner?.classList.remove('hidden');
    if (waitingCode) waitingCode.textContent = roomCode;
    showToast(waiting ? '⏳ Waiting for opponent…' : `✅ Room ${roomCode} ready!`,
              waiting ? 'info' : 'success', 5000);
  });

  socket.on('room_joined', ({ roomCode, yourUsername }) => {
    const cur = (usernameInput?.value || '').trim().toUpperCase();
    if (yourUsername && yourUsername !== cur) {
      if (usernameInput) usernameInput.value = yourUsername;
      showToast(`Name taken — you are now: ${yourUsername}`, 'warning', 4000);
    } else {
      showToast(`Joined room ${roomCode}!`, 'success');
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