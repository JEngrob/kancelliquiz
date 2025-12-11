import fs from 'fs';
import path from 'path';
import { Room, GameState, Player, Question } from './types';

const BACKUP_FILE = path.join(process.cwd(), 'game-state-backup.json');
const BACKUP_INTERVAL = 30 * 1000; // Hver 30. sekund

interface SerializableRoom {
  gameState: {
    roomId: string;
    hostId: string;
    players: [string, Player][];
    state: string;
    currentRound: number;
    totalRounds: number;
    quizFilename?: string;
    quizQuestionIndex?: number;
    quizQuestions?: Question[];
  };
  createdAt: number;
  lastActivity: number;
}

/**
 * Saves all rooms to a JSON file for persistence across server restarts
 */
export function saveRoomsToFile(rooms: Map<string, Room>): void {
  const serializable: Record<string, SerializableRoom> = {};
  
  for (const [roomId, room] of rooms.entries()) {
    serializable[roomId] = {
      gameState: {
        roomId: room.gameState.roomId,
        hostId: room.gameState.hostId,
        players: Array.from(room.gameState.players.entries()),
        state: room.gameState.state,
        currentRound: room.gameState.currentRound,
        totalRounds: room.gameState.totalRounds,
        quizFilename: room.gameState.quizFilename,
        quizQuestionIndex: room.gameState.quizQuestionIndex,
        quizQuestions: room.gameState.quizQuestions,
      },
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    };
  }
  
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(serializable, null, 2));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

/**
 * Loads rooms from backup file after server restart
 */
export function loadRoomsFromFile(): Map<string, Room> | null {
  try {
    if (!fs.existsSync(BACKUP_FILE)) return null;
    
    const data = fs.readFileSync(BACKUP_FILE, 'utf-8');
    const parsed = JSON.parse(data) as Record<string, SerializableRoom>;
    
    const rooms = new Map<string, Room>();
    
    for (const [roomId, serialized] of Object.entries(parsed)) {
      // Skip rooms older than 30 minutes
      if (Date.now() - serialized.lastActivity > 30 * 60 * 1000) continue;
      
      const gameState: GameState = {
        roomId: serialized.gameState.roomId,
        hostId: serialized.gameState.hostId,
        players: new Map(serialized.gameState.players),
        state: serialized.gameState.state as 'lobby' | 'playing' | 'round-results' | 'finished',
        currentRound: serialized.gameState.currentRound,
        totalRounds: serialized.gameState.totalRounds,
        answers: new Map(),
        answerTimestamps: new Map(),
        quizFilename: serialized.gameState.quizFilename,
        quizQuestionIndex: serialized.gameState.quizQuestionIndex,
        quizQuestions: serialized.gameState.quizQuestions,
      };

      // Mark all players as inactive since they need to reconnect
      gameState.players.forEach(player => {
        player.isActive = false;
        player.lastSeen = serialized.lastActivity;
      });
      
      rooms.set(roomId, {
        gameState,
        createdAt: serialized.createdAt,
        lastActivity: serialized.lastActivity,
      });
    }
    
    if (rooms.size > 0) {
      console.log(`✅ Restored ${rooms.size} room(s) from backup`);
    }
    return rooms;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

/**
 * Deletes the backup file
 */
export function clearBackupFile(): void {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      fs.unlinkSync(BACKUP_FILE);
    }
  } catch (error) {
    console.error('Failed to clear backup file:', error);
  }
}

/**
 * Starts periodic backup of rooms
 */
export function startPeriodicBackup(getRooms: () => Map<string, Room>): NodeJS.Timeout {
  return setInterval(() => {
    const rooms = getRooms();
    if (rooms.size > 0) {
      saveRoomsToFile(rooms);
    }
  }, BACKUP_INTERVAL);
}






