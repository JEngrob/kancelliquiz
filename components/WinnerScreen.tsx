'use client';

interface WinnerScreenProps {
  winnerName?: string;
}

export default function WinnerScreen({ winnerName }: WinnerScreenProps) {
  if (!winnerName) {
    return (
      <div className="panel-kommunal p-8 text-center">
        <div className="stempel stempel-afvist text-sm mb-4 inline-block">
          INGEN VINDER
        </div>
        <div className="text-6xl mb-4 opacity-50">📋</div>
        <h2 className="font-typewriter text-xl text-brun-moerk mb-2">
          Ingen scorede point
        </h2>
        <p className="text-ink-light text-sm">
          Ingen deltagere besvarede spørgsmål korrekt i denne session.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-kommunal p-8 text-center border-brun-lys bg-gradient-to-b from-paper-cream to-beige-lys">
      {/* ASCII decoration */}
      <div className="text-brun-lys font-bureau text-xs mb-4 overflow-hidden">
        ★═══════════════════════════════════════★
      </div>

      <div className="mb-4">
        <div className="inline-block bg-brun-lys text-paper-cream px-6 py-2 font-typewriter text-sm tracking-wider">
          OFFICIEL ERKLÆRING
        </div>
      </div>

      <div className="text-7xl mb-4">🏆</div>
      
      <h2 className="font-typewriter text-2xl text-brun-moerk mb-2">
        TILLYKKE!
      </h2>
      
      <div className="stempel stempel-godkendt text-lg mb-6 inline-block transform rotate-0">
        VINDER
      </div>

      <div className="panel-kommunal-inset p-6 mb-6">
        <p className="text-xs text-ink-light mb-2">Vindende deltager(e):</p>
        <p className="text-xl font-bold text-brun-moerk">{winnerName}</p>
      </div>

      <p className="text-ink-faded text-sm italic">
        "Det understreges, at deltagelse i sig selv værdsættes højere end sejr."
      </p>

      <div className="flex justify-center gap-4 mt-6">
        <span className="text-3xl">🎉</span>
        <span className="text-3xl">🎊</span>
        <span className="text-3xl">🎉</span>
      </div>

      {/* ASCII decoration */}
      <div className="text-brun-lys font-bureau text-xs mt-4 overflow-hidden">
        ★═══════════════════════════════════════★
      </div>
    </div>
  );
}
