import { useEffect, useRef, useState } from 'react';
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

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      // Enable reconnection for better reliability
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      // Transports for Azure compatibility
      transports: ['websocket', 'polling'],
    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, []);

  return { socket, isConnected };
}



