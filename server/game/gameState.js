// server/game/gameState.js — manages all room and game state in memory

const rooms = new Map(); // roomCode -> roomState

const MAX_ROUNDS     = parseInt(process.env.MAX_ROUNDS,     10) || 7;
const STARTING_LIVES = parseInt(process.env.STARTING_LIVES, 10) || 3;
const DRAW_TIME      = parseInt(process.env.DRAW_TIME,      10) || 60;

console.log(`⚙️  Game config: ${MAX_ROUNDS} rounds | ${STARTING_LIVES} lives | ${DRAW_TIME}s draw time`);

function createRoom(roomCode, hostSocketId, hostUsername) {
  const room = {
    code: roomCode,
    players: [
      { socketId: hostSocketId, username: hostUsername, lives: STARTING_LIVES },
    ],
    state: 'waiting',
    round: 0,
    submissions: {},
    roundResults: [],
    createdAt: Date.now(),
  };
  rooms.set(roomCode, room);
  return room;
}

function joinRoom(roomCode, socketId, username) {
  const room = rooms.get(roomCode);
  if (!room)                      return { error: 'Room not found' };
  if (room.players.length >= 2)   return { error: 'Room is full' };
  if (room.state !== 'waiting')   return { error: 'Game already in progress' };

  // Deduplicate name
  const takenNames = room.players.map(p => p.username.toUpperCase());
  let finalUsername = username;
  if (takenNames.includes(username.toUpperCase())) {
    finalUsername = username + '_2';
  }

  room.players.push({ socketId, username: finalUsername, lives: STARTING_LIVES });
  return { room };
}

function getRoom(roomCode)            { return rooms.get(roomCode) || null; }

function getRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room;
  }
  return null;
}

function removePlayerFromRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    const idx = room.players.findIndex(p => p.socketId === socketId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        rooms.delete(code);
        return { roomDeleted: true, roomCode: code };
      }
      return { roomDeleted: false, roomCode: code, room };
    }
  }
  return null;
}

function startRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  room.round      += 1;
  room.state       = 'drawing';
  room.submissions = {};
  return room;
}

function submitSpell(roomCode, socketId, imageData, spellName) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  room.submissions[socketId] = { imageData, spellName };
  return room;
}

function applyRoundResult(roomCode, outcome) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const [p1, p2] = room.players;

  switch (outcome.type) {
    case 'p1_loses':          p1.lives = Math.max(0, p1.lives - 1); break;
    case 'p2_loses':          p2.lives = Math.max(0, p2.lives - 1); break;
    case 'both_lose':         p1.lives = Math.max(0, p1.lives - 1); p2.lives = Math.max(0, p2.lives - 1); break;
    case 'p1_inappropriate':  p1.lives = Math.max(0, p1.lives - 1); break;
    case 'p2_inappropriate':  p2.lives = Math.max(0, p2.lives - 1); break;
    case 'none_lose': default: break;
  }

  room.roundResults.push({ round: room.round, outcome });
  room.state = 'round_result';

  const gameOver = p1.lives <= 0 || p2.lives <= 0 || room.round >= MAX_ROUNDS;
  if (gameOver) room.state = 'game_over';

  return { room, gameOver };
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function findRandomWaitingRoom(excludeSocketId) {
  for (const room of rooms.values()) {
    if (
      room.state === 'waiting' &&
      room.players.length === 1 &&
      room.players[0].socketId !== excludeSocketId
    ) {
      return room;
    }
  }
  return null;
}

function getAllRooms() { return rooms; }

module.exports = {
  createRoom, joinRoom, getRoom, getRoomBySocketId,
  removePlayerFromRoom, startRound, submitSpell,
  applyRoundResult, generateRoomCode, findRandomWaitingRoom,
  getAllRooms,
  MAX_ROUNDS, STARTING_LIVES, DRAW_TIME,
};
