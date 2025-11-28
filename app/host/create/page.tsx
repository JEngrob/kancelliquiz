'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useRouter } from 'next/navigation';

export default function CreateGame() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleGameCreated = (data: { roomId: string }) => {
      setRoomId(data.roomId);
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
    };

    socket.on('host:game-created', handleGameCreated);
    socket.on('error', handleError);

    // Create game automatically when connected
    socket.emit('host:create-game');

    return () => {
      socket.off('host:game-created', handleGameCreated);
      socket.off('error', handleError);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    if (roomId) {
      router.push(`/host/${roomId}`);
    }
  }, [roomId, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-paper-cream paper-texture flex items-center justify-center p-4">
        <div className="panel-kommunal p-8 text-center">
          <div className="spinner-kommunal mx-auto mb-4"></div>
          <p className="text-ink-faded font-bureau">Etablerer forbindelse til server...</p>
          <p className="text-xs text-ink-light mt-2">Vent venligst</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper-cream paper-texture flex items-center justify-center p-4">
        <div className="panel-kommunal p-8 text-center">
          <div className="stempel stempel-afvist text-sm mb-4 inline-block">
            FEJL
          </div>
          <p className="text-stempel-roed font-bold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-cream paper-texture flex items-center justify-center p-4">
      <div className="panel-kommunal p-8 text-center">
        <div className="text-6xl mb-4 animate-pulse-subtle">📋</div>
        <div className="spinner-kommunal mx-auto mb-4"></div>
        <p className="font-typewriter text-brun-moerk">Opretter quiz-session...</p>
        <p className="text-xs text-ink-light mt-2">
          Sagsnummer tildeles automatisk
        </p>
      </div>
    </div>
  );
}
