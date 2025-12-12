'use client';

interface Winner {
  name: string;
  score: number;
}

interface WinnerScreenProps {
  winners?: Winner[];
  topPlayers?: Winner[];
}

export default function WinnerScreen({ winners = [], topPlayers }: WinnerScreenProps) {
  // Use topPlayers if provided, otherwise use winners
  const displayPlayers = topPlayers && topPlayers.length >= 3 ? topPlayers : winners;
  
  if (!displayPlayers || displayPlayers.length === 0) {
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
    <div className="panel-kommunal p-8 text-center border-brun-lys bg-gradient-to-b from-paper-cream to-beige-lys">
      {/* ASCII decoration */}
      <div className="text-brun-lys font-bureau text-sm mb-4 overflow-hidden">
        ★═══════════════════════★
      </div>

      <div className="mb-4">
        <div className="inline-block bg-brun-lys text-paper-cream px-6 py-2 font-typewriter text-sm tracking-wider">
          OFFICIEL ERKLÆRING
        </div>
      </div>

      <div className="text-6xl mb-4">🏆</div>
      
      <h2 className="font-typewriter text-2xl text-brun-moerk mb-6">
        TILLYKKE!
      </h2>

      {/* Olympic Podium Style */}
      <div className="flex items-end justify-center gap-6 mb-8">
        {/* Second Place - Left (Height: 2) */}
        {displayPlayers[1] && (
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-3">🥈</div>
            <div className="bg-brun-lys/50 border-2 border-brun-lys p-3 w-32 mb-2">
              <div className="font-bold text-sm text-ink-black truncate">{displayPlayers[1].name}</div>
              <div className="text-sm text-ink-light font-bold">{displayPlayers[1].score.toFixed(1)}</div>
            </div>
            <div className="bg-brun-mellem text-paper-cream font-bold text-sm px-4 py-2 w-full text-center mb-2">2.</div>
            <div className="bg-brun-mellem w-16 h-20"></div>
          </div>
        )}

        {/* First Place - Center (Height: 3) */}
        {displayPlayers[0] && (
          <div className="flex flex-col items-center">
            <div className="text-5xl mb-3">🥇</div>
            <div className="bg-brun-lys border-2 border-brun-moerk p-4 w-36 mb-2">
              <div className="font-bold text-base text-ink-black truncate">{displayPlayers[0].name}</div>
              <div className="font-bold text-lg text-ink-black">{displayPlayers[0].score.toFixed(1)}</div>
            </div>
            <div className="bg-brun-moerk text-paper-cream font-bold text-sm px-4 py-2 w-full text-center mb-2">1.</div>
            <div className="bg-brun-moerk w-16 h-32"></div>
          </div>
        )}

        {/* Third Place - Right (Height: 1) */}
        {displayPlayers[2] && (
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-3">🥉</div>
            <div className="bg-brun-lys/30 border-2 border-brun-lys/60 p-3 w-32 mb-2">
              <div className="font-bold text-sm text-ink-black truncate">{displayPlayers[2].name}</div>
              <div className="text-sm text-ink-light font-bold">{displayPlayers[2].score.toFixed(1)}</div>
            </div>
            <div className="bg-brun-mellem/60 text-paper-cream font-bold text-sm px-4 py-2 w-full text-center mb-2">3.</div>
            <div className="bg-brun-mellem/60 w-16 h-12"></div>
          </div>
        )}
      </div>
      
      {/* Show 2nd and 3rd place at bottom if they exist */}
      {(displayPlayers[1] || displayPlayers[2]) && (
        <div className="mt-8 pt-6 border-t-2 border-brun-lys/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Second Place */}
            {displayPlayers[1] && (
              <div className="bg-brun-lys/30 border-2 border-brun-lys p-6 rounded">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="text-3xl">🥈</span>
                  <span className="font-bold text-lg text-brun-moerk">2. PLADS</span>
                </div>
                <div className="font-bold text-xl text-ink-black mb-2">{displayPlayers[1].name}</div>
                <div className="text-2xl font-bold text-brun-moerk">{displayPlayers[1].score.toFixed(1)}</div>
              </div>
            )}
            
            {/* Third Place */}
            {displayPlayers[2] && (
              <div className="bg-brun-lys/20 border-2 border-brun-lys/60 p-6 rounded">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="text-3xl">🥉</span>
                  <span className="font-bold text-lg text-brun-moerk">3. PLADS</span>
                </div>
                <div className="font-bold text-xl text-ink-black mb-2">{displayPlayers[2].name}</div>
                <div className="text-2xl font-bold text-brun-moerk">{displayPlayers[2].score.toFixed(1)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other participants - smaller */}
      {displayPlayers.length > 3 && (
        <div className="mt-6 pt-4 border-t border-brun-lys/30">
          <p className="text-sm text-ink-light mb-3">Andre deltagere:</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {displayPlayers.slice(3).map((winner, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm px-3 py-2 bg-paper-aged rounded">
                <span className="font-bold">{idx + 4}. {winner.name}</span>
                <span className="text-ink-light">{winner.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-ink-faded text-sm italic mt-4">
        "Det understreges, at deltagelse i sig selv værdsættes højere end sejr."
      </p>

      {/* ASCII decoration */}
      <div className="text-brun-lys font-bureau text-sm mt-4 overflow-hidden">
        ★═══════════════════════★
      </div>
    </div>
  );
}
