import { Room, GameState, Player } from './types';

const rooms = new Map<string, Room>();
const INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Generates a random room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates a new game room
 */
export function createRoom(hostId: string): string {
  const roomId = generateRoomCode();
  
  const gameState: GameState = {
    roomId,
    hostId,
    players: new Map(),
    state: 'lobby',
    currentRound: 0,
    totalRounds: 10,
    answers: new Map(),
    answerTimestamps: new Map(),
  };
  
  const room: Room = {
    gameState,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  
  rooms.set(roomId, room);
  return roomId;
}

/**
 * Gets a room by ID
 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

/**
 * Adds a player to a room
 */
export function addPlayerToRoom(roomId: string, playerId: string, playerName: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  const player: Player = {
    id: playerId,
    name: playerName,
    isActive: true,
    score: 0,
  };
  
  room.gameState.players.set(playerId, player);
  room.lastActivity = Date.now();
  return true;
}

/**
 * Removes a player from a room
 */
export function removePlayerFromRoom(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.gameState.players.delete(playerId);
  room.gameState.answers.delete(playerId);
  room.gameState.answerTimestamps.delete(playerId);
  room.lastActivity = Date.now();
}

/**
 * Cleans up inactive rooms
 */
export function cleanupInactiveRooms(): void {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > INACTIVE_TIMEOUT) {
      rooms.delete(roomId);
    }
  }
}

/**
 * Updates room activity timestamp
 */
export function updateRoomActivity(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.lastActivity = Date.now();
  }
}

// Cleanup every 10 minutes
setInterval(cleanupInactiveRooms, 10 * 60 * 1000);
