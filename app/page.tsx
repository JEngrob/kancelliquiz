'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sagsnr] = useState(() => Math.floor(Math.random() * 9000 + 1000));
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentDate = new Date().toLocaleDateString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-');

  const currentTime = new Date().toLocaleTimeString('da-DK');

  return (
    <div className="min-h-screen bg-paper-cream paper-texture py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ASCII Top Border */}
        <div className="text-center text-brun-moerk font-bureau text-xs mb-0 overflow-hidden">
          <div>═══════════════════════════════════════════════════════════════</div>
          <div className="bg-brun-moerk text-paper-cream py-1 tracking-[0.5em] text-[10px]">
            ████████████████████████████████████████████████████████████████
          </div>
        </div>

        {/* Main Document */}
        <div className="panel-kommunal p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-typewriter text-2xl text-brun-moerk tracking-wide mb-1">
              RANDERS KOMMUNE
            </h1>
            <p className="text-ink-faded text-sm">Administrationsafdelingen</p>
            <p className="text-ink-light text-xs italic">
              Afdeling for Festlige Aktiviteter og Kollegial Underholdning
            </p>
          </div>

          {/* Divider */}
          <div className="sektion-divider">
            <span className="text-ink-faded text-xs px-2">※</span>
          </div>

          {/* Document Title */}
          <div className="text-center mb-8">
            <h2 className="font-typewriter text-3xl text-brun-dyb tracking-wider mb-2">
              QUIZ-PROTOKOL
            </h2>
            <p className="text-ink-faded text-sm">
              System til Videns-verifikation og Festlig Underholdning
            </p>
            
            {/* Document metadata */}
            <div className="mt-4 inline-block text-left text-xs text-ink-light border border-brun-moerk border-dashed p-3">
              <div>Dokument: QUIZ-PROTO-2025</div>
              <div>Sagsnr.: 2025-JUL-{mounted ? sagsnr : '----'}</div>
              <div>Dato: {currentDate}</div>
              <div>Status: <span className="text-godkendt font-bold">AKTIV</span></div>
            </div>
          </div>

          {/* Stamp decoration */}
          <div className="flex justify-center mb-8">
            <div className="stempel stempel-godkendt text-sm">
              GODKENDT TIL BRUG
            </div>
          </div>

          {/* Section: Choose Role */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-brun-moerk font-bold">§ 1.</span>
              <span className="font-bold text-ink-black">VÆLG DELTAGERROLLE</span>
            </div>
            <p className="text-ink-faded text-sm mb-6 pl-6">
              Vælg venligst den relevante funktion i henhold til din tildelte rolle 
              ved nærværende arrangement.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 mb-8">
            <Link href="/host/create" className="block">
              <button className="btn-kommunal btn-kommunal-primary w-full text-left flex items-center gap-4 group">
                <span className="w-12 h-12 bg-paper-cream/20 border-2 border-paper-cream/40 flex items-center justify-center text-2xl">
                  📋
                </span>
                <div>
                  <div className="text-lg font-bold">VÆRT / QUIZMASTER</div>
                  <div className="text-xs opacity-80">Opret og administrer quiz-session</div>
                </div>
              </button>
            </Link>

            <Link href="/player" className="block">
              <button className="btn-kommunal w-full text-left flex items-center gap-4 group">
                <span className="w-12 h-12 bg-brun-moerk/10 border-2 border-brun-moerk/30 flex items-center justify-center text-2xl">
                  ✋
                </span>
                <div>
                  <div className="text-lg font-bold">DELTAGER / SPILLER</div>
                  <div className="text-xs opacity-70">Tilslut eksisterende quiz-session</div>
                </div>
              </button>
            </Link>
          </div>

          {/* Footer note */}
          <div className="sektion-divider">
            <span className="text-ink-faded text-xs px-2">※</span>
          </div>

          <div className="text-center text-xs text-ink-light mt-6">
            <p className="mb-2">
              <strong>Fremgangsmåde:</strong> Værten opretter quiz → 
              Deltagere indtaster kode → Quiz gennemføres
            </p>
            <p className="italic">
              "Det understreges, at deltagelse i sig selv værdsættes højere end perfekt score."
            </p>
          </div>
        </div>

        {/* ASCII Bottom Border */}
        <div className="text-center text-brun-moerk font-bureau text-xs mt-0 overflow-hidden">
          <div className="bg-brun-moerk text-paper-cream py-1 tracking-[0.5em] text-[10px]">
            ████████████████████████████████████████████████████████████████
          </div>
          <div>═══════════════════════════════════════════════════════════════</div>
        </div>

        {/* Print timestamp */}
        <div className="text-center mt-4 text-xs text-ink-light font-bureau">
          &gt;&gt;&gt; UDSKREVET: {mounted ? `${currentDate} ${currentTime}` : '-- loading --'} &lt;&lt;&lt;
        </div>
      </div>
    </div>
  );
}
