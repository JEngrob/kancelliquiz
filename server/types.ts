export interface Player {
  id: string;
  name: string;
  isActive: boolean;
  score: number;
  currentAnswer?: number; // Index of chosen option (0-3)
  sessionToken?: string; // For reconnect/rejoin functionality
  lastSeen?: number; // Timestamp for disconnect detection
}

export interface Question {
  text: string;
  options: string[];
  correctIndex: number; // Index of correct option (0-3)
}

export interface GameState {
  roomId: string;
  hostId: string;
  players: Map<string, Player>;
  state: 'lobby' | 'playing' | 'round-results' | 'finished';
  currentQuestion?: Question;
  currentRound: number;
  totalRounds: number;
  answers: Map<string, number>; // playerId -> answer index
  answerTimestamps: Map<string, number>; // playerId -> timestamp when answered (milliseconds)
  questionStartTime?: number; // Timestamp when question was sent (milliseconds)
  quizFilename?: string; // Filename of selected quiz
  quizQuestions?: Question[]; // Pre-loaded quiz questions
  quizQuestionIndex?: number; // Current index in quiz questions array
}

export interface Room {
  gameState: GameState;
  createdAt: number;
  lastActivity: number;
}
