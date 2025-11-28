'use client';

interface Winner {
  name: string;
  score: number;
}

interface WinnerScreenProps {
  winners?: Winner[];
}

export default function WinnerScreen({ winners = [] }: WinnerScreenProps) {
  if (!winners || winners.length === 0) {
    return (
      <div className="panel-kommunal p-4 text-center">
        <div className="stempel stempel-afvist text-xs mb-2 inline-block">
          INGEN VINDER
        </div>
        <div className="text-3xl mb-2 opacity-50">📋</div>
        <h2 className="font-typewriter text-sm text-brun-moerk mb-1">
          Ingen scorede point
        </h2>
        <p className="text-ink-light text-xs">
          Ingen deltagere besvarede spørgsmål korrekt.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-kommunal p-4 text-center border-brun-lys bg-gradient-to-b from-paper-cream to-beige-lys">
      {/* ASCII decoration */}
      <div className="text-brun-lys font-bureau text-xs mb-2 overflow-hidden">
        ★═══════════════════════★
      </div>

      <div className="mb-2">
        <div className="inline-block bg-brun-lys text-paper-cream px-4 py-1 font-typewriter text-xs tracking-wider">
          OFFICIEL ERKLÆRING
        </div>
      </div>

      <div className="text-4xl mb-2">🏆</div>
      
      <h2 className="font-typewriter text-lg text-brun-moerk mb-2">
        TILLYKKE!
      </h2>

      {/* Olympic Podium Style */}
      <div className="flex items-end justify-center gap-4 mb-6">
        {/* Second Place - Left (Height: 2) */}
        {winners[1] && (
          <div className="flex flex-col items-center">
            <div className="text-2xl mb-2">🥈</div>
            <div className="bg-brun-lys/50 border-2 border-brun-lys p-2 w-24 mb-1">
              <div className="font-bold text-xs text-ink-black truncate">{winners[1].name}</div>
              <div className="text-xs text-ink-light">{winners[1].score.toFixed(1)}</div>
            </div>
            <div className="bg-brun-mellem text-paper-cream font-bold text-xs px-3 py-1 w-full text-center mb-1">2.</div>
            <div className="bg-brun-mellem w-12 h-16"></div>
          </div>
        )}

        {/* First Place - Center (Height: 3) */}
        {winners[0] && (
          <div className="flex flex-col items-center">
            <div className="text-3xl mb-2">🥇</div>
            <div className="bg-brun-lys border-2 border-brun-moerk p-2 w-24 mb-1">
              <div className="font-bold text-sm text-ink-black truncate">{winners[0].name}</div>
              <div className="font-bold text-sm text-ink-black">{winners[0].score.toFixed(1)}</div>
            </div>
            <div className="bg-brun-moerk text-paper-cream font-bold text-xs px-3 py-1 w-full text-center mb-1">1.</div>
            <div className="bg-brun-moerk w-12 h-24"></div>
          </div>
        )}

        {/* Third Place - Right (Height: 1) */}
        {winners[2] && (
          <div className="flex flex-col items-center">
            <div className="text-2xl mb-2">🥉</div>
            <div className="bg-brun-lys/30 border-2 border-brun-lys/60 p-2 w-24 mb-1">
              <div className="font-bold text-xs text-ink-black truncate">{winners[2].name}</div>
              <div className="text-xs text-ink-light">{winners[2].score.toFixed(1)}</div>
            </div>
            <div className="bg-brun-mellem/60 text-paper-cream font-bold text-xs px-3 py-1 w-full text-center mb-1">3.</div>
            <div className="bg-brun-mellem/60 w-12 h-8"></div>
          </div>
        )}
      </div>

      {/* Other participants - smaller */}
      {winners.length > 3 && (
        <div className="mt-3 pt-3 border-t border-brun-lys/30">
          <p className="text-xs text-ink-light mb-2">Andre deltagere:</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {winners.slice(3).map((winner, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs px-2 py-1 bg-paper-aged rounded">
                <span className="font-bold">{idx + 4}. {winner.name}</span>
                <span className="text-ink-light">{winner.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-ink-faded text-xs italic mt-2">
        "Det understreges, at deltagelse i sig selv værdsættes højere end sejr."
      </p>

      {/* ASCII decoration */}
      <div className="text-brun-lys font-bureau text-xs mt-2 overflow-hidden">
        ★═══════════════════════★
      </div>
    </div>
  );
}
