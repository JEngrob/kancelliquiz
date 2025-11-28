import { GameState, Player, Question } from './types';

const MAX_TIME_SECONDS = 20;
const MAX_POINTS = 1000;

/**
 * Validates if a player's answer is correct
 */
export function validateAnswer(answer: number, correctIndex: number): boolean {
  return answer === correctIndex;
}

/**
 * Calculates points based on answer time with precision to 1/100 second (centiseconds)
 * @param answerTimeMs Time in milliseconds when answer was submitted
 * @param questionStartTimeMs Time in milliseconds when question was sent
 * @returns Points (0-1000) based on speed, calculated with centisecond precision
 */
export function calculateTimeBasedPoints(answerTimeMs: number, questionStartTimeMs: number): number {
  // Calculate elapsed time in seconds with millisecond precision
  const timeElapsedSeconds = (answerTimeMs - questionStartTimeMs) / 1000;
  
  // If answered after 20 seconds, no points
  if (timeElapsedSeconds >= MAX_TIME_SECONDS) {
    return 0;
  }
  
  // Linear interpolation: 1000 points at 0s, 0 points at 20s
  // Formula: points = 1000 * (1 - timeElapsed / 20)
  // This gives different points for every centisecond difference
  const points = MAX_POINTS * (1 - timeElapsedSeconds / MAX_TIME_SECONDS);
  
  // Round to 2 decimal places (centisecond precision in points)
  // This ensures that 0.01 second difference gives different points
  return Math.round(points * 100) / 100;
}

/**
 * Evaluates all answers and updates player scores with time-based points
 * Returns list of players who answered correctly and incorrectly
 */
export function evaluateAnswers(gameState: GameState): { correct: string[], incorrect: string[] } {
  const correct: string[] = [];
  const incorrect: string[] = [];
  
  if (!gameState.currentQuestion || !gameState.questionStartTime) {
    return { correct, incorrect };
  }
  
  const correctIndex = gameState.currentQuestion.correctIndex;
  
  gameState.players.forEach((player, playerId) => {
    if (!player.isActive) {
      return; // Already inactive
    }
    
    const answer = gameState.answers.get(playerId);
    const answerTimestamp = gameState.answerTimestamps.get(playerId);
    
    if (answer === undefined || answerTimestamp === undefined) {
      // No answer submitted - mark as incorrect
      incorrect.push(playerId);
      return;
    }
    
    const isCorrect = validateAnswer(answer, correctIndex);
    
    if (isCorrect) {
      correct.push(playerId);
      // Calculate time-based points with centisecond precision
      const points = calculateTimeBasedPoints(answerTimestamp, gameState.questionStartTime!);
      player.score += points;
    } else {
      incorrect.push(playerId);
    }
  });
  
  return { correct, incorrect };
}

/**
 * Checks if game should end (all rounds completed)
 */
export function checkGameEnd(gameState: GameState): boolean {
  if (gameState.currentRound >= gameState.totalRounds) {
    gameState.state = 'finished';
    return true;
  }
  
  return false;
}

/**
 * Gets the winner(s) based on highest score
 */
export function getWinners(gameState: GameState): Player[] {
  const players = Array.from(gameState.players.values());
  if (players.length === 0) return [];
  
  const maxScore = Math.max(...players.map(p => p.score));
  return players.filter(p => p.score === maxScore);
}
