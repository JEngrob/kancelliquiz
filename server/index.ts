import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  createRoom,
  getRoom,
  addPlayerToRoom,
  removePlayerFromRoom,
  updateRoomActivity,
  findPlayerBySessionToken,
  updatePlayerSocketId,
  markPlayerInactive,
  cleanupInactivePlayers,
  getAllRooms,
} from './roomManager';
import { saveRoomsToFile } from './persistence';
import {
  evaluateAnswers,
  checkGameEnd,
  getWinners,
} from './gameLogic';
import { Room, Question } from './types';
import {
  sanitizePlayerName,
  sanitizeQuestionText,
  sanitizeOptionText,
  validateRoomId,
  checkRateLimit,
  RATE_LIMIT,
} from './security';
import { getQuizMetadataList, loadQuiz } from './quizLoader';

const app = express();

// Security middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const httpServer = createServer(app);

// Determine CORS origin
const getCorsOrigin = () => {
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  return "http://localhost:3000";
};

const io = new Server(httpServer, {
  cors: {
    origin: getCorsOrigin(),
    methods: ["GET", "POST"],
    credentials: false,
  },
  maxHttpBufferSize: 1e6,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

const PORT = process.env.PORT || 3001;

/**
 * Validates if a socket is authorized to perform host actions
 */
function validateAndUpdateHost(room: Room, socketId: string): boolean {
  const isHost = room.gameState.hostId === socketId;
  
  if (isHost) {
    return true;
  }
  
  const isInRoom = io.sockets.adapter.rooms.get(room.gameState.roomId)?.has(socketId);
  
  if (isInRoom) {
    const originalHostSocket = io.sockets.sockets.get(room.gameState.hostId);
    if (!originalHostSocket || !originalHostSocket.connected) {
      room.gameState.hostId = socketId;
      return true;
    }
  }
  
  return false;
}

// Track rooms per socket for DoS protection
const socketRoomCount = new Map<string, number>();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socketRoomCount.set(socket.id, 0);

  // Host creates a new game
  socket.on('host:create-game', () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Too many requests. Please wait.' });
      return;
    }
    
    const currentRoomCount = socketRoomCount.get(socket.id) || 0;
    if (currentRoomCount >= RATE_LIMIT.MAX_ROOMS_PER_SOCKET) {
      socket.emit('error', { message: 'Maximum number of rooms reached' });
      return;
    }
    
    const roomId = createRoom(socket.id);
    socket.join(roomId);
    socketRoomCount.set(socket.id, currentRoomCount + 1);
    socket.emit('host:game-created', { roomId });
    console.log('Game created:', roomId);
  });

  // Host requests player list
  socket.on('host:request-player-list', ({ roomId }: { roomId: string }) => {
    if (!checkRateLimit(socket.id)) {
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('error', { message: 'Invalid room ID format' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room) {
      return;
    }
    
    socket.join(roomId);
    
    socket.emit('room:player-list', {
      players: Array.from(room.gameState.players.values()),
    });
  });

  // Player joins a game
  socket.on('player:join', ({ roomId, playerName, sessionToken }: { roomId: string; playerName: string; sessionToken?: string }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('player:join-error', { message: 'Too many requests. Please wait.' });
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('player:join-error', { message: 'Invalid room ID format' });
      return;
    }
    
    const sanitizedName = sanitizePlayerName(playerName);
    if (!sanitizedName || sanitizedName.length === 0) {
      socket.emit('player:join-error', { message: 'Invalid player name' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room) {
      socket.emit('player:join-error', { message: 'Room not found' });
      return;
    }

    if (room.gameState.state !== 'lobby') {
      socket.emit('player:join-error', { message: 'Game already started' });
      return;
    }
    
    if (room.gameState.players.size >= RATE_LIMIT.MAX_PLAYERS_PER_ROOM) {
      socket.emit('player:join-error', { message: 'Room is full' });
      return;
    }

    addPlayerToRoom(roomId, socket.id, sanitizedName, sessionToken);
    socket.join(roomId);
    updateRoomActivity(roomId);

    socket.emit('player:joined', { roomId, playerName: sanitizedName, sessionToken });
    
    io.to(roomId).emit('room:player-list', {
      players: Array.from(room.gameState.players.values()),
    });
  });

  // Player rejoins after disconnect
  socket.on('player:rejoin', ({ roomId, sessionToken, playerName, isHost }: { 
    roomId: string; 
    sessionToken: string; 
    playerName: string;
    isHost: boolean;
  }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('player:rejoin-error', { message: 'Too many requests', shouldRejoin: false });
      return;
    }

    if (!validateRoomId(roomId)) {
      socket.emit('player:rejoin-error', { message: 'Invalid room', shouldRejoin: false });
      return;
    }

    const room = getRoom(roomId);
    if (!room) {
      socket.emit('player:rejoin-error', { message: 'Room no longer exists', shouldRejoin: false });
      return;
    }

    // Find existing player with sessionToken
    const existing = findPlayerBySessionToken(roomId, sessionToken);

    if (existing) {
      const { player: existingPlayer, playerId: oldPlayerId } = existing;
      
      // Update player with new socket.id
      const updatedPlayer = updatePlayerSocketId(roomId, oldPlayerId, socket.id);
      
      if (updatedPlayer) {
        socket.join(roomId);

        // Determine current question for rejoin
        let currentQuestion = null;
        if (room.gameState.currentQuestion && room.gameState.state === 'playing') {
          currentQuestion = {
            text: room.gameState.currentQuestion.text,
            options: room.gameState.currentQuestion.options,
          };
        }

        // Send full game state to rejoining player
        socket.emit('player:rejoin-success', {
          roomId,
          playerName: updatedPlayer.name,
          score: updatedPlayer.score,
          gameState: room.gameState.state,
          currentRound: room.gameState.currentRound,
          totalRounds: room.gameState.totalRounds,
          currentQuestion,
          isHost: room.gameState.hostId === socket.id,
          hasAnswered: room.gameState.answers.has(socket.id),
        });

        // Update all clients about player list
        io.to(roomId).emit('room:player-list', {
          players: Array.from(room.gameState.players.values()),
        });

        // If host rejoined, send quiz info too
        if (room.gameState.hostId === socket.id && room.gameState.currentQuestion) {
          socket.emit('host:question-info', {
            text: room.gameState.currentQuestion.text,
            options: room.gameState.currentQuestion.options,
            correctIndex: room.gameState.currentQuestion.correctIndex,
            round: room.gameState.currentRound,
            totalRounds: room.gameState.totalRounds,
          });
        }

        console.log(`Player ${updatedPlayer.name} rejoined room ${roomId}`);
        return;
      }
    }

    // No existing session found - need to rejoin fresh if in lobby
    if (room.gameState.state === 'lobby') {
      socket.emit('player:rejoin-error', { 
        message: 'Session expired. Please join again.',
        shouldRejoin: true,
        roomId,
      });
    } else {
      socket.emit('player:rejoin-error', { 
        message: 'Game in progress. Cannot rejoin.',
        shouldRejoin: false 
      });
    }
  });

  // Host requests list of available quizzes
  socket.on('host:get-quizzes', () => {
    if (!checkRateLimit(socket.id)) {
      return;
    }
    
    try {
      const quizzes = getQuizMetadataList();
      socket.emit('host:quizzes-list', { quizzes });
    } catch (error) {
      socket.emit('error', { message: 'Failed to load quizzes' });
    }
  });

  // Host selects a quiz
  socket.on('host:select-quiz', ({ roomId, quizFilename }: { roomId: string; quizFilename: string }) => {
    if (!checkRateLimit(socket.id)) {
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('error', { message: 'Invalid room ID format' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room || !validateAndUpdateHost(room, socket.id)) {
      socket.emit('error', { message: 'Room not found or not authorized' });
      return;
    }

    if (room.gameState.state !== 'lobby') {
      socket.emit('error', { message: 'Cannot change quiz after game started' });
      return;
    }

    const quiz = loadQuiz(quizFilename);
    if (!quiz) {
      socket.emit('error', { message: 'Quiz not found' });
      return;
    }

    room.gameState.quizFilename = quizFilename;
    room.gameState.quizQuestions = quiz.questions;
    room.gameState.quizQuestionIndex = 0;
    room.gameState.totalRounds = quiz.questions.length;
    updateRoomActivity(roomId);

    socket.emit('host:quiz-selected', {
      quiz: quiz.metadata,
      totalRounds: quiz.questions.length,
    });
  });

  // Host starts the game
  socket.on('host:start-game', ({ roomId, totalRounds, quizFilename }: { roomId: string; totalRounds?: number; quizFilename?: string }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('host:start-game-error', { message: 'Too many requests. Please wait.' });
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('host:start-game-error', { message: 'Invalid room ID format' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room) {
      socket.emit('host:start-game-error', { message: 'Room not found' });
      return;
    }

    if (!validateAndUpdateHost(room, socket.id)) {
      socket.emit('host:start-game-error', { message: 'Not authorized to start game' });
      return;
    }

    if (room.gameState.state !== 'lobby') {
      socket.emit('host:start-game-error', { message: 'Game already started' });
      return;
    }

    // Load quiz if specified
    if (quizFilename && !room.gameState.quizFilename) {
      const quiz = loadQuiz(quizFilename);
      if (quiz) {
        room.gameState.quizFilename = quizFilename;
        room.gameState.quizQuestions = quiz.questions;
        room.gameState.quizQuestionIndex = 0;
        room.gameState.totalRounds = quiz.questions.length;
      }
    }

    room.gameState.state = 'playing';
    room.gameState.currentRound = 1;
    
    // Use quiz totalRounds if available, otherwise use provided or default
    if (!room.gameState.totalRounds) {
      room.gameState.totalRounds = totalRounds || 10;
    }
    
    updateRoomActivity(roomId);

    // If using a quiz, automatically send first question
    if (room.gameState.quizQuestions && room.gameState.quizQuestions.length > 0) {
      const firstQuestion = room.gameState.quizQuestions[0];
      room.gameState.currentQuestion = firstQuestion;
      room.gameState.quizQuestionIndex = 0;
      room.gameState.answers.clear();
      room.gameState.answerTimestamps.clear();
      room.gameState.questionStartTime = Date.now(); // Gem starttidspunkt

      io.to(roomId).emit('game:started', {
        round: room.gameState.currentRound,
        totalRounds: room.gameState.totalRounds,
      });

        // Send first question immediately
        io.to(roomId).emit('game:question', {
          text: firstQuestion.text,
          options: firstQuestion.options,
          round: room.gameState.currentRound,
          totalRounds: room.gameState.totalRounds,
        });
        
        // Also send to host with correct index for display
        io.to(room.gameState.hostId).emit('host:question-info', {
          text: firstQuestion.text,
          options: firstQuestion.options,
          correctIndex: firstQuestion.correctIndex,
          round: room.gameState.currentRound,
          totalRounds: room.gameState.totalRounds,
        });
    } else {
      io.to(roomId).emit('game:started', {
        round: room.gameState.currentRound,
        totalRounds: room.gameState.totalRounds,
      });
    }
  });

  // Host sends a question
  socket.on('host:send-question', ({ roomId, question }: { roomId: string; question: Question }) => {
    if (!checkRateLimit(socket.id)) {
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('error', { message: 'Invalid room ID format' });
      return;
    }

    // Validate question structure
    if (!question || !question.text || !question.options || question.options.length !== 4) {
      socket.emit('error', { message: 'Invalid question format' });
      return;
    }

    if (question.correctIndex < 0 || question.correctIndex > 3) {
      socket.emit('error', { message: 'Invalid correct answer index' });
      return;
    }

    // Sanitize question text and options
    const sanitizedQuestion: Question = {
      text: sanitizeQuestionText(question.text),
      options: question.options.map(opt => sanitizeOptionText(opt)),
      correctIndex: question.correctIndex,
    };

    // Validate sanitized content is not empty
    if (!sanitizedQuestion.text || sanitizedQuestion.options.some(opt => !opt)) {
      socket.emit('error', { message: 'Question or options cannot be empty' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room || !validateAndUpdateHost(room, socket.id)) {
      return;
    }

    if (room.gameState.state !== 'playing') {
      return;
    }

    room.gameState.currentQuestion = sanitizedQuestion;
    room.gameState.answers.clear();
    room.gameState.answerTimestamps.clear();
    room.gameState.questionStartTime = Date.now(); // Gem starttidspunkt
    updateRoomActivity(roomId);

    // Send question to all players (without correct answer)
    io.to(roomId).emit('game:question', {
      text: sanitizedQuestion.text,
      options: sanitizedQuestion.options,
      round: room.gameState.currentRound,
      totalRounds: room.gameState.totalRounds,
    });
  });

  // Player submits an answer
  socket.on('player:submit-answer', ({ roomId, answerIndex }: { roomId: string; answerIndex: number }) => {
    if (!checkRateLimit(socket.id)) {
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('error', { message: 'Invalid room ID format' });
      return;
    }
    
    if (answerIndex < 0 || answerIndex > 3) {
      socket.emit('error', { message: 'Invalid answer' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room) return;

    const player = room.gameState.players.get(socket.id);
    if (!player || !player.isActive) return;

    if (room.gameState.state !== 'playing') return;
    if (!room.gameState.currentQuestion) return;

    room.gameState.answers.set(socket.id, answerIndex);
    room.gameState.answerTimestamps.set(socket.id, Date.now()); // Gem tidsstempel med millisekund præcision
    player.currentAnswer = answerIndex;
    updateRoomActivity(roomId);

    // Notify host of new answer
    io.to(room.gameState.hostId).emit('host:answer-received', {
      playerId: socket.id,
      playerName: player.name,
    });

    // Notify player
    socket.emit('player:answer-submitted', { answerIndex });
  });

  // Host reveals the answer
  socket.on('host:reveal-answer', ({ roomId }: { roomId: string }) => {
    if (!checkRateLimit(socket.id)) {
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('error', { message: 'Invalid room ID format' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room || !validateAndUpdateHost(room, socket.id)) {
      return;
    }

    if (!room.gameState.currentQuestion) {
      return;
    }

    room.gameState.state = 'round-results';
    updateRoomActivity(roomId);

    // Evaluate answers
    const { correct, incorrect } = evaluateAnswers(room.gameState);
    const correctIndex = room.gameState.currentQuestion.correctIndex;
    const correctAnswer = room.gameState.currentQuestion.options[correctIndex];

    // Check if game should end
    const gameEnded = checkGameEnd(room.gameState);
    const winners = gameEnded ? getWinners(room.gameState) : [];

    // Prepare answer results
    const answerResults = Array.from(room.gameState.players.entries()).map(([playerId, player]) => {
      const answer = room.gameState.answers.get(playerId);
      const isCorrect = correct.includes(playerId);
      return {
        playerId,
        playerName: player.name,
        answerIndex: answer,
        answerText: answer !== undefined ? room.gameState.currentQuestion!.options[answer] : undefined,
        isCorrect,
        score: player.score,
      };
    });

    // Send results to all
    io.to(roomId).emit('game:round-results', {
      correctIndex,
      correctAnswer,
      correct: correct.map(id => room.gameState.players.get(id)?.name).filter(Boolean),
      incorrect: incorrect.map(id => room.gameState.players.get(id)?.name).filter(Boolean),
      answerResults,
      gameEnded,
      winners: winners.map(w => ({ name: w.name, score: w.score })),
      players: Array.from(room.gameState.players.values()),
    });

    // Send individual results to players
    room.gameState.players.forEach((player, playerId) => {
      const answer = room.gameState.answers.get(playerId);
      const isCorrect = correct.includes(playerId);
      
      io.to(playerId).emit('player:round-result', {
        answerIndex: answer,
        correctIndex,
        correctAnswer,
        isCorrect,
        score: player.score,
      });
    });

    // Clear answers for next round
    room.gameState.answers.clear();
    room.gameState.answerTimestamps.clear();
    room.gameState.currentQuestion = undefined;
    room.gameState.questionStartTime = undefined;
  });

  // Host starts next round
  socket.on('host:next-round', ({ roomId }: { roomId: string }) => {
    if (!checkRateLimit(socket.id)) {
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('error', { message: 'Invalid room ID format' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room || !validateAndUpdateHost(room, socket.id)) {
      return;
    }

    if (room.gameState.state === 'finished') {
      return;
    }

    room.gameState.state = 'playing';
    room.gameState.currentRound += 1;
    updateRoomActivity(roomId);

    // If using a quiz, automatically send next question
    if (room.gameState.quizQuestions && room.gameState.quizQuestionIndex !== undefined) {
      const nextIndex = (room.gameState.quizQuestionIndex || 0) + 1;
      
      if (nextIndex < room.gameState.quizQuestions.length) {
        const nextQuestion = room.gameState.quizQuestions[nextIndex];
        room.gameState.currentQuestion = nextQuestion;
        room.gameState.quizQuestionIndex = nextIndex;
        room.gameState.answers.clear();
        room.gameState.answerTimestamps.clear();
        room.gameState.questionStartTime = Date.now(); // Gem starttidspunkt

        io.to(roomId).emit('game:next-round', {
          round: room.gameState.currentRound,
          totalRounds: room.gameState.totalRounds,
        });

        // Send next question immediately
        io.to(roomId).emit('game:question', {
          text: nextQuestion.text,
          options: nextQuestion.options,
          round: room.gameState.currentRound,
          totalRounds: room.gameState.totalRounds,
        });
        
        // Also send to host with correct index for display
        io.to(room.gameState.hostId).emit('host:question-info', {
          text: nextQuestion.text,
          options: nextQuestion.options,
          correctIndex: nextQuestion.correctIndex,
          round: room.gameState.currentRound,
          totalRounds: room.gameState.totalRounds,
        });
        return;
      }
    }

    io.to(roomId).emit('game:next-round', {
      round: room.gameState.currentRound,
      totalRounds: room.gameState.totalRounds,
    });
  });

  // Host resets game
  socket.on('host:reset-game', ({ roomId, keepPlayers }: { roomId: string; keepPlayers?: boolean }) => {
    if (!checkRateLimit(socket.id)) {
      return;
    }
    
    if (!validateRoomId(roomId)) {
      socket.emit('error', { message: 'Invalid room ID format' });
      return;
    }
    
    const room = getRoom(roomId);
    if (!room || !validateAndUpdateHost(room, socket.id)) {
      return;
    }

    room.gameState.state = 'lobby';
    room.gameState.currentRound = 0;
    room.gameState.currentQuestion = undefined;
    room.gameState.answers.clear();
    room.gameState.answerTimestamps.clear();
    room.gameState.questionStartTime = undefined;

    if (keepPlayers) {
      // Reset all players scores but keep them
      room.gameState.players.forEach(player => {
        player.isActive = true;
        player.score = 0;
        player.currentAnswer = undefined;
      });
    } else {
      room.gameState.players.clear();
    }

    updateRoomActivity(roomId);

    io.to(roomId).emit('game:reset', {
      players: Array.from(room.gameState.players.values()),
    });
  });

  // Disconnect handling - mark as inactive instead of removing immediately
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    for (const [roomId, socketSet] of Array.from(io.sockets.adapter.rooms.entries())) {
      if (socketSet.has(socket.id)) {
        const room = getRoom(roomId);
        if (room) {
          const player = room.gameState.players.get(socket.id);
          
          if (player) {
            // Mark player as inactive instead of removing
            markPlayerInactive(roomId, socket.id);
            
            // Notify others about the status change
            io.to(roomId).emit('room:player-list', {
              players: Array.from(room.gameState.players.values()),
            });
            
            io.to(roomId).emit('player:disconnected', {
              playerId: socket.id,
              playerName: player.name,
            });
            
            console.log(`Player ${player.name} marked as inactive in room ${roomId}`);
            
            // Set a timer to clean up inactive players after 5 minutes
            setTimeout(() => {
              const removedPlayers = cleanupInactivePlayers(roomId);
              if (removedPlayers.length > 0) {
                const currentRoom = getRoom(roomId);
                if (currentRoom) {
                  io.to(roomId).emit('room:player-list', {
                    players: Array.from(currentRoom.gameState.players.values()),
                  });
                  console.log(`Cleaned up ${removedPlayers.length} inactive player(s) from room ${roomId}`);
                }
              }
            }, 5 * 60 * 1000); // 5 minutes
          }

          if (room.gameState.hostId === socket.id) {
            const count = socketRoomCount.get(socket.id) || 0;
            socketRoomCount.set(socket.id, Math.max(0, count - 1));
            
            // Notify about host disconnect
            io.to(roomId).emit('host:disconnected', {
              message: 'Host disconnected. Waiting for reconnection...',
            });
          }
        }
        break;
      }
    }
    
    socketRoomCount.delete(socket.id);
  });
});

// Save rooms on server shutdown
process.on('SIGINT', () => {
  console.log('Saving game state before shutdown...');
  saveRoomsToFile(getAllRooms());
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Saving game state before shutdown...');
  saveRoomsToFile(getAllRooms());
  process.exit(0);
});

// Export httpServer, io, app, and PORT for use in combined server
export { httpServer, io, app, PORT };

// Function to start the server
export function startSocketServer(port?: number) {
  const serverPort = port || PORT;
  httpServer.listen(serverPort, () => {
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   🎯 Quiz Game Server (Backend)       ║');
    console.log(`║   Port: ${serverPort}                      ║`);
    console.log('║   Status: ✅ Kører                    ║');
    console.log('╚═══════════════════════════════════════╝\n');
  });
  return httpServer;
}

// Only start server if this file is run directly
if (typeof require !== 'undefined' && require.main === module) {
  startSocketServer();
}
