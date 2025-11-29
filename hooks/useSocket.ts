import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Determine Socket.IO URL
 * In production/Azure, Socket.IO runs on the same port as Next.js
 * In development, it runs on a separate port
 */
const getSocketUrl = () => {
  // If explicitly set, use that
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  
  // In browser, use current origin (same port as frontend)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Development fallback
  return 'http://localhost:3001';
};

const SESSION_KEY_PLAYER = 'quizgame_session_player';
const SESSION_KEY_HOST = 'quizgame_session_host';

export interface SessionData {
  sessionToken: string;
  roomId: string;
  playerName: string;
  isHost: boolean;
  score?: number;
}

function getSessionKey(isHost: boolean): string {
  return isHost ? SESSION_KEY_HOST : SESSION_KEY_PLAYER;
}

/**
 * Generates a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Session management functions
  const saveSession = useCallback((data: SessionData) => {
    if (typeof window !== 'undefined') {
      const key = getSessionKey(data.isHost);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }, []);

  const getSession = useCallback((isHost?: boolean): SessionData | null => {
    if (typeof window === 'undefined') return null;
    
    // If role is specified, get that specific session
    if (isHost !== undefined) {
      const key = getSessionKey(isHost);
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    
    // Otherwise, try to get any active session (player first, then host)
    const playerStored = localStorage.getItem(SESSION_KEY_PLAYER);
    if (playerStored) {
      try {
        return JSON.parse(playerStored);
      } catch {
        // ignore
      }
    }
    
    const hostStored = localStorage.getItem(SESSION_KEY_HOST);
    if (hostStored) {
      try {
        return JSON.parse(hostStored);
      } catch {
        // ignore
      }
    }
    
    return null;
  }, []);

  const clearSession = useCallback((isHost?: boolean) => {
    if (typeof window !== 'undefined') {
      if (isHost !== undefined) {
        localStorage.removeItem(getSessionKey(isHost));
      } else {
        // Clear both
        localStorage.removeItem(SESSION_KEY_PLAYER);
        localStorage.removeItem(SESSION_KEY_HOST);
      }
    }
  }, []);

  const getOrCreateSessionToken = useCallback(() => {
    const session = getSession();
    if (session?.sessionToken) return session.sessionToken;
    return generateUUID();
  }, [getSession]);

  const updateSessionScore = useCallback((score: number, isHost: boolean = false) => {
    const session = getSession(isHost);
    if (session) {
      session.score = score;
      saveSession(session);
    }
  }, [getSession, saveSession]);

  useEffect(() => {
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      // Enable reconnection for better reliability
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 15, // Increased from 5
      // Transports for Azure compatibility
      transports: ['websocket', 'polling'],
    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setSocket(newSocket);
      
      // Determine which session to use based on URL
      const isHostPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/host/');
      const isPlayerPage = typeof window !== 'undefined' && window.location.pathname === '/player';
      
      let session: SessionData | null = null;
      
      if (isHostPage) {
        session = getSession(true); // Get host session
      } else if (isPlayerPage) {
        session = getSession(false); // Get player session
      }
      
      // Auto-rejoin if we have a saved session for this role
      if (session && session.roomId) {
        console.log('Attempting to rejoin with session:', session.roomId, 'isHost:', session.isHost);
        newSocket.emit('player:rejoin', {
          roomId: session.roomId,
          sessionToken: session.sessionToken,
          playerName: session.playerName,
          isHost: session.isHost,
        });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      // If not a clean disconnect, mark as reconnecting
      if (reason !== 'io client disconnect') {
        setIsReconnecting(true);
      }
    });

    newSocket.io.on('reconnect_attempt', (attempt) => {
      setIsReconnecting(true);
      setReconnectAttempt(attempt);
      console.log(`Reconnection attempt ${attempt}`);
    });

    newSocket.io.on('reconnect', () => {
      console.log('Reconnected successfully');
      setIsReconnecting(false);
      setReconnectAttempt(0);
    });

    newSocket.io.on('reconnect_failed', () => {
      console.log('Reconnection failed');
      setIsReconnecting(false);
    });

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [getSession]);

  return { 
    socket, 
    isConnected, 
    isReconnecting,
    reconnectAttempt,
    saveSession, 
    getSession, 
    clearSession,
    getOrCreateSessionToken,
    updateSessionScore,
  };
}



