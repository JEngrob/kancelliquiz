/**
 * Security utilities for input validation and sanitization
 */

// Max lengths for content
const MAX_LENGTHS = {
  PLAYER_NAME: 50,
  QUESTION_TEXT: 500,
  OPTION_TEXT: 200,
};

/**
 * Base sanitization function to prevent XSS attacks
 */
function sanitizeText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitizes player name to prevent XSS attacks
 */
export function sanitizePlayerName(name: string): string {
  const sanitized = sanitizeText(name, MAX_LENGTHS.PLAYER_NAME);
  return sanitized || 'Spiller';
}

/**
 * Sanitizes question text to prevent XSS attacks
 */
export function sanitizeQuestionText(text: string): string {
  return sanitizeText(text, MAX_LENGTHS.QUESTION_TEXT);
}

/**
 * Sanitizes answer option text to prevent XSS attacks
 */
export function sanitizeOptionText(text: string): string {
  return sanitizeText(text, MAX_LENGTHS.OPTION_TEXT);
}

/**
 * Validates room ID format
 */
export function validateRoomId(roomId: string): boolean {
  if (!roomId || typeof roomId !== 'string') {
    return false;
  }
  
  // Room ID should be 6 alphanumeric characters
  return /^[A-Z0-9]{6}$/.test(roomId.toUpperCase());
}

/**
 * Rate limiting map to track requests per socket
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  MAX_REQUESTS: 100, // Max requests per window
  WINDOW_MS: 60000, // 1 minute window
  MAX_PLAYERS_PER_ROOM: 50,
  MAX_ROOMS_PER_SOCKET: 5,
};

/**
 * Checks if socket has exceeded rate limit
 */
export function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(socketId);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(socketId, {
      count: 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    });
    return true;
  }
  
  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Cleans up old rate limit records
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [socketId, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(socketId);
    }
  }
}

// Cleanup rate limits every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

export { RATE_LIMIT };
