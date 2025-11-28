'use client';

interface Player {
  id: string;
  name: string;
  isActive: boolean;
  score: number;
  currentAnswer?: number;
}

interface PlayerListProps {
  players: Player[];
  gameState?: 'lobby' | 'playing' | 'round-results' | 'finished';
}

export default function PlayerList({ players, gameState = 'lobby' }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="panel-kommunal-inset p-6 text-center">
        <div className="text-4xl mb-2 opacity-50">📭</div>
        <p className="text-ink-light text-sm">Ingen deltagere registreret endnu</p>
        <p className="text-ink-light text-xs mt-1 italic">
          Del adgangskoden med potentielle deltagere
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {players.map((player, index) => (
        <div
          key={player.id}
          className={`flex items-center justify-between p-3 border-2 transition-all ${
            player.isActive
              ? 'bg-godkendt/10 border-godkendt'
              : 'bg-paper-aged border-brun-moerk/30 opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-light font-bureau w-6">{index + 1}.</span>
            <span className={`w-3 h-3 ${
              player.isActive ? 'bg-godkendt' : 'bg-ink-light/30'
            }`}></span>
            <span className={`font-bold ${
              player.isActive ? 'text-ink-black' : 'text-ink-light'
            }`}>
              {player.name}
            </span>
            {!player.isActive && (
              <span className="text-xs text-stempel-roed italic">(offline)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {gameState !== 'lobby' && (
              <span className="score-badge text-sm">{player.score}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
