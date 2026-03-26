// server/socket/socketHandler.js — all Socket.IO event logic

const {
  createRoom, joinRoom, getRoom, getRoomBySocketId,
  removePlayerFromRoom, startRound, submitSpell,
  applyRoundResult, generateRoomCode, findRandomWaitingRoom,
  DRAW_TIME, MAX_ROUNDS
} = require('../game/gameState');
const { startTimer, stopTimer } = require('../game/roundTimer');
const { judgeRound } = require('../ai/geminiJudge');

const NEXT_ROUND_DELAY = parseInt(process.env.NEXT_ROUND_DELAY, 10) || 5;

// Grace-period timers: let in-flight submissions arrive after draw timer ends
const graceTimers = new Map(); // roomCode → NodeJS.Timeout

function clearGraceTimer(roomCode) {
  const t = graceTimers.get(roomCode);
  if (t) { clearTimeout(t); graceTimers.delete(roomCode); }
}

function setupSocketHandlers(io) {

  io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    // ── CREATE ROOM ────────────────────────────────────────────────
    socket.on('create_room', ({ username }) => {
      if (!username || typeof username !== 'string') return;
      const code = generateRoomCode();
      const room = createRoom(code, socket.id, username.trim().toUpperCase().slice(0, 14));
      socket.join(code);
      socket.emit('room_created', { roomCode: code, room: sanitizeRoom(room, socket.id) });
      console.log(`🏠 Room ${code} created by ${username}`);
    });

    // ── JOIN SPECIFIC ROOM ─────────────────────────────────────────
    socket.on('join_room', ({ username, roomCode }) => {
      if (!username || !roomCode) return;
      const code   = roomCode.toUpperCase().trim();
      const result = joinRoom(code, socket.id, username.trim().toUpperCase().slice(0, 14));

      if (result.error) {
        socket.emit('join_error', { message: result.error });
        return;
      }

      socket.join(code);
      const me = result.room.players.find(p => p.socketId === socket.id);
      socket.emit('room_joined', {
        roomCode: code,
        room: sanitizeRoom(result.room, socket.id),
        yourUsername: me?.username
      });
      io.to(code).emit('player_joined', { room: sanitizeRoom(result.room, socket.id) });

      if (result.room.players.length === 2) {
        startNextRound(io, code);
      }
    });

    // ── JOIN RANDOM ROOM ───────────────────────────────────────────
    socket.on('join_random', ({ username }) => {
      if (!username || typeof username !== 'string') return;
      const cleanName      = username.trim().toUpperCase().slice(0, 14);
      const existingRoom   = findRandomWaitingRoom(socket.id);

      if (existingRoom) {
        const result = joinRoom(existingRoom.code, socket.id, cleanName);
        if (!result.error) {
          socket.join(existingRoom.code);
          const me = result.room.players.find(p => p.socketId === socket.id);
          socket.emit('room_joined', {
            roomCode: existingRoom.code,
            room: sanitizeRoom(result.room, socket.id),
            yourUsername: me?.username
          });
          io.to(existingRoom.code).emit('player_joined', { room: sanitizeRoom(result.room, socket.id) });
          if (result.room.players.length === 2) {
            startNextRound(io, existingRoom.code);
          }
        } else {
          _createWaitingRoom(socket, cleanName);
        }
      } else {
        _createWaitingRoom(socket, cleanName);
      }
    });

    // ── SUBMIT SPELL ───────────────────────────────────────────────
    socket.on('submit_spell', ({ roomCode, imageData, spellName }) => {
      if (!roomCode || typeof roomCode !== 'string') return;
      const code = roomCode.toUpperCase().trim();
      const room = getRoom(code);
      if (!room || room.state !== 'drawing') return;

      // Guard: don't let the same player submit twice
      if (room.submissions[socket.id]) return;

      const safeName  = (typeof spellName === 'string' ? spellName.trim().slice(0, 64) : '') || 'Unknown Spell';
      const safeImage = (typeof imageData === 'string' && imageData.startsWith('data:image/'))
        ? imageData
        : whiteCanvas();

      submitSpell(code, socket.id, safeImage, safeName);
      const updatedRoom = getRoom(code);
      if (!updatedRoom) return;
      const subCount = Object.keys(updatedRoom.submissions).length;

      io.to(code).emit('spell_submitted', { submittedCount: subCount });

      if (subCount === 2) {
        // Both submitted — cancel draw timer + any pending grace timeout, then judge
        stopTimer(code);
        clearGraceTimer(code);
        processRound(io, code);
      }
    });

    // ── DISCONNECT ─────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.id}`);
      const result = removePlayerFromRoom(socket.id);
      if (!result) return;

      stopTimer(result.roomCode);
      clearGraceTimer(result.roomCode);

      if (!result.roomDeleted && result.room) {
        const remaining = result.room.players[0];
        if (!remaining) return;

        // If a game was in progress, give the remaining player an immediate game_over win
        const room = result.room;
        if (['drawing', 'judging', 'round_result'].includes(room.state)) {
          io.to(remaining.socketId).emit('game_over', {
            winner: remaining.username,
            players: [
              { username: remaining.username, lives: remaining.lives, isYou: true }
            ],
            narrative: 'Your opponent vanished mid-duel — their spell unraveled into smoke. Victory is yours!',
            reason: 'Opponent disconnected',
            outcome: 'opponent_disconnected'
          });
        } else {
          // Waiting state — just notify
          io.to(remaining.socketId).emit('opponent_disconnected', {
            message: 'Your opponent disconnected!'
          });
        }
      }
    });
  });

  // ── HELPERS ───────────────────────────────────────────────────────

  function _createWaitingRoom(socket, username) {
    const code = generateRoomCode();
    const room = createRoom(code, socket.id, username);
    socket.join(code);
    socket.emit('room_created', {
      roomCode: code,
      room: sanitizeRoom(room, socket.id),
      waiting: true
    });
  }

  // ── START NEXT ROUND ───────────────────────────────────────────────
  function startNextRound(io, roomCode) {
    const room = startRound(roomCode);
    if (!room) return;

    console.log(`⚔️  Round ${room.round}/${MAX_ROUNDS} in room ${roomCode}`);

    room.players.forEach((player) => {
      io.to(player.socketId).emit('round_start', {
        round:     room.round,
        maxRounds: MAX_ROUNDS,
        drawTime:  DRAW_TIME,
        players:   room.players.map(p => ({
          username: p.username,
          lives:    p.lives,
          isYou:    p.socketId === player.socketId
        }))
      });
    });

    startTimer(
      roomCode,
      DRAW_TIME,
      (remaining) => io.to(roomCode).emit('timer_tick', { remaining }),
      () => {
        // Grace period: 1 second for in-flight submissions after draw timer expires
        const t = setTimeout(() => {
          graceTimers.delete(roomCode);
          processRound(io, roomCode);
        }, 1000);
        graceTimers.set(roomCode, t);
      }
    );
  }

  // ── PROCESS ROUND ──────────────────────────────────────────────────
  async function processRound(io, roomCode) {
    const room = getRoom(roomCode);
    if (!room) return;

    // Guard: only process once per round
    if (['judging', 'round_result', 'game_over'].includes(room.state)) return;

    room.state = 'judging';
    io.to(roomCode).emit('judging_start');

    const [p1, p2] = room.players;
    const sub1 = room.submissions[p1?.socketId] || {};
    const sub2 = room.submissions[p2?.socketId] || {};

    const spell1 = {
      username:  p1.username,
      spellName: sub1.spellName || 'An empty canvas',
      imageData: sub1.imageData || whiteCanvas()
    };
    const spell2 = {
      username:  p2.username,
      spellName: sub2.spellName || 'An empty canvas',
      imageData: sub2.imageData || whiteCanvas()
    };

    const outcome = await judgeRound(spell1, spell2);

    // ── Safety: re-fetch room after async call — players may have disconnected ──
    const freshRoom = getRoom(roomCode);
    if (!freshRoom) {
      console.log(`⚠️  Room ${roomCode} gone after judging — skipping result emit`);
      return;
    }

    // If only one player remains (other disconnected during judging), declare them winner
    if (freshRoom.players.length < 2) {
      const survivor = freshRoom.players[0];
      if (survivor) {
        io.to(survivor.socketId).emit('game_over', {
          winner: survivor.username,
          players: [{ username: survivor.username, lives: survivor.lives, isYou: true }],
          narrative: 'Your opponent fled while the oracle was deliberating. The victory is undisputed!',
          reason: 'Opponent disconnected during judging',
          outcome: 'opponent_disconnected'
        });
      }
      return;
    }

    const result = applyRoundResult(roomCode, outcome);
    if (!result) return; // room vanished between re-fetch and applyRoundResult

    const { room: updatedRoom, gameOver } = result;

    updatedRoom.players.forEach((viewer) => {
      const payload = {
        round:       updatedRoom.round,
        outcome:     outcome.type,
        reason:      outcome.reason    || '',
        narrative:   outcome.narrative || '',
        gameOver,
        nextRoundIn: gameOver ? null : NEXT_ROUND_DELAY,
        players: updatedRoom.players.map(p => ({
          username: p.username,
          lives:    p.lives,
          isYou:    p.socketId === viewer.socketId
        })),
        spells: [
          { username: p1.username, spellName: spell1.spellName, imageData: spell1.imageData, isYou: p1.socketId === viewer.socketId },
          { username: p2.username, spellName: spell2.spellName, imageData: spell2.imageData, isYou: p2.socketId === viewer.socketId }
        ]
      };

      if (gameOver) {
        const [fp1, fp2] = updatedRoom.players;
        payload.winner = fp1.lives > fp2.lives ? fp1.username
                       : fp2.lives > fp1.lives ? fp2.username
                       : null; // draw
        io.to(viewer.socketId).emit('game_over', payload);
      } else {
        io.to(viewer.socketId).emit('round_result', payload);
      }
    });

    if (!gameOver) {
      console.log(`⏳ Next round in ${NEXT_ROUND_DELAY}s (room ${roomCode})`);
      setTimeout(() => startNextRound(io, roomCode), NEXT_ROUND_DELAY * 1000);
    }
  }
}

// ── UTILITIES ─────────────────────────────────────────────────────

function sanitizeRoom(room, viewerSocketId) {
  return {
    code:    room.code,
    state:   room.state,
    round:   room.round,
    players: room.players.map(p => ({
      username: p.username,
      lives:    p.lives,
      isYou:    p.socketId === viewerSocketId
    }))
  };
}

// Solid-white 1×1 PNG — placeholder for missing submissions
function whiteCanvas() {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
}

module.exports = { setupSocketHandlers };