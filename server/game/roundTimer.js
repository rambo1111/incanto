// server/game/roundTimer.js — manages per-room countdown timers

const timers = new Map(); // roomCode -> { interval, remaining }

function startTimer(roomCode, duration, onTick, onEnd) {
  stopTimer(roomCode); // clear any existing timer for this room

  let remaining = duration;
  onTick(remaining);

  const interval = setInterval(() => {
    remaining -= 1;
    onTick(remaining);
    if (remaining <= 0) {
      clearInterval(interval);
      timers.delete(roomCode);
      onEnd();
    }
  }, 1000);

  timers.set(roomCode, { interval, remaining });
}

function stopTimer(roomCode) {
  const t = timers.get(roomCode);
  if (t) {
    clearInterval(t.interval);
    timers.delete(roomCode);
  }
}

function getRemainingTime(roomCode) {
  const t = timers.get(roomCode);
  return t ? t.remaining : 0;
}

module.exports = { startTimer, stopTimer, getRemainingTime };
