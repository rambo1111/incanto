// pages/socketClient.js — singleton socket connection

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(); // connects to same origin
  }
  return socket;
}
