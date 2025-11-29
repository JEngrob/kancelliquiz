import { Room, GameState, Player } from './types';
import { loadRoomsFromFile, saveRoomsToFile, startPeriodicBackup } from './persistence';

// Load rooms from backup on startup
const loadedRooms = loadRoomsFromFile();
const rooms = loadedRooms || new Map<string, Room>();

const INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const PLAYER_DISCONNECT_GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes before removing inactive players

// Start periodic backup
startPeriodicBackup(() => rooms);

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
export function addPlayerToRoom(roomId: string, playerId: string, playerName: string, sessionToken?: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  const player: Player = {
    id: playerId,
    name: playerName,
    isActive: true,
    score: 0,
    sessionToken: sessionToken,
    lastSeen: Date.now(),
  };
  
  room.gameState.players.set(playerId, player);
  room.lastActivity = Date.now();
  saveRoomsToFile(rooms); // Save after player joins
  return true;
}

/**
 * Finds a player by session token
 */
export function findPlayerBySessionToken(roomId: string, sessionToken: string): { player: Player; playerId: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  for (const [playerId, player] of room.gameState.players.entries()) {
    if (player.sessionToken === sessionToken) {
      return { player, playerId };
    }
  }
  return null;
}

/**
 * Updates a player's socket ID after reconnection
 */
export function updatePlayerSocketId(roomId: string, oldPlayerId: string, newPlayerId: string): Player | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  const player = room.gameState.players.get(oldPlayerId);
  if (!player) return null;
  
  // Remove old entry and add with new socket ID
  room.gameState.players.delete(oldPlayerId);
  player.id = newPlayerId;
  player.isActive = true;
  player.lastSeen = Date.now();
  room.gameState.players.set(newPlayerId, player);
  
  // Update host ID if this was the host
  if (room.gameState.hostId === oldPlayerId) {
    room.gameState.hostId = newPlayerId;
  }
  
  // Transfer any existing answers
  const answer = room.gameState.answers.get(oldPlayerId);
  const timestamp = room.gameState.answerTimestamps.get(oldPlayerId);
  if (answer !== undefined) {
    room.gameState.answers.delete(oldPlayerId);
    room.gameState.answers.set(newPlayerId, answer);
  }
  if (timestamp !== undefined) {
    room.gameState.answerTimestamps.delete(oldPlayerId);
    room.gameState.answerTimestamps.set(newPlayerId, timestamp);
  }
  
  room.lastActivity = Date.now();
  saveRoomsToFile(rooms);
  return player;
}

/**
 * Marks a player as inactive (disconnected but not removed)
 */
export function markPlayerInactive(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const player = room.gameState.players.get(playerId);
  if (player) {
    player.isActive = false;
    player.lastSeen = Date.now();
    room.lastActivity = Date.now();
    saveRoomsToFile(rooms);
  }
}

/**
 * Cleans up players who have been inactive for too long
 */
export function cleanupInactivePlayers(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  
  const now = Date.now();
  const removedPlayers: string[] = [];
  
  for (const [playerId, player] of room.gameState.players.entries()) {
    if (!player.isActive && player.lastSeen && (now - player.lastSeen > PLAYER_DISCONNECT_GRACE_PERIOD)) {
      room.gameState.players.delete(playerId);
      room.gameState.answers.delete(playerId);
      room.gameState.answerTimestamps.delete(playerId);
      removedPlayers.push(playerId);
    }
  }
  
  if (removedPlayers.length > 0) {
    room.lastActivity = Date.now();
    saveRoomsToFile(rooms);
  }
  
  return removedPlayers;
}

/**
 * Gets all rooms (for persistence)
 */
export function getAllRooms(): Map<string, Room> {
  return rooms;
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
