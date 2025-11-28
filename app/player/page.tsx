'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

type PlayerState = 'join' | 'waiting' | 'answering' | 'answered' | 'result';

const optionLabels = ['A', 'B', 'C', 'D'];
const optionStyles = [
  'bg-gradient-to-b from-[#c98b8b] to-svar-a border-bordeaux',
  'bg-gradient-to-b from-[#c9a86b] to-svar-b border-[#6b5a2a]',
  'bg-gradient-to-b from-[#8bc98b] to-svar-c border-[#3a5a3a]',
  'bg-gradient-to-b from-[#8b8bc9] to-svar-d border-[#3a3a5a]',
];

export default function PlayerPage() {
  const { socket, isConnected } = useSocket();
  const [state, setState] = useState<PlayerState>('join');
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [roundResult, setRoundResult] = useState<{
    answerIndex?: number;
    correctIndex: number;
    correctAnswer: string;
    isCorrect: boolean;
    score: number;
  } | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleJoined = (data: { roomId: string; playerName: string }) => {
      setState('waiting');
      setRoomId(data.roomId);
      setError(null);
    };

    const handleJoinError = (data: { message: string }) => {
      setError(data.message);
    };

    const handleGameStarted = (data: { round: number; totalRounds: number }) => {
      setState('waiting');
      setCurrentRound(data.round);
      setTotalRounds(data.totalRounds);
      setSelectedAnswer(null);
      setRoundResult(null);
      setError(null);
    };

    const handleQuestion = (data: { text: string; options: string[]; round: number; totalRounds: number }) => {
      setState('answering');
      setQuestion(data.text);
      setOptions(data.options);
      setCurrentRound(data.round);
      setTotalRounds(data.totalRounds);
      setSelectedAnswer(null);
      setRoundResult(null);
    };

    const handleAnswerSubmitted = (data: { answerIndex: number }) => {
      setState('answered');
      setSelectedAnswer(data.answerIndex);
    };

    const handleRoundResult = (data: {
      answerIndex?: number;
      correctIndex: number;
      correctAnswer: string;
      isCorrect: boolean;
      score: number;
    }) => {
      setRoundResult(data);
      setScore(data.score);
      setState('result');
    };

    const handleNextRound = (data: { round: number; totalRounds: number }) => {
      setState('waiting');
      setCurrentRound(data.round);
      setTotalRounds(data.totalRounds);
      setSelectedAnswer(null);
      setRoundResult(null);
      setQuestion('');
      setOptions([]);
      setError(null);
    };

    const handleGameReset = () => {
      setState('waiting');
      setCurrentRound(0);
      setScore(0);
      setSelectedAnswer(null);
      setRoundResult(null);
      setQuestion('');
      setOptions([]);
    };

    const handleError = (data: { message: string }) => {
      setError(data.message || 'Der opstod en fejl');
    };

    socket.on('player:joined', handleJoined);
    socket.on('player:join-error', handleJoinError);
    socket.on('game:started', handleGameStarted);
    socket.on('game:question', handleQuestion);
    socket.on('player:answer-submitted', handleAnswerSubmitted);
    socket.on('player:round-result', handleRoundResult);
    socket.on('game:next-round', handleNextRound);
    socket.on('game:reset', handleGameReset);
    socket.on('error', handleError);

    return () => {
      socket.off('player:joined', handleJoined);
      socket.off('player:join-error', handleJoinError);
      socket.off('game:started', handleGameStarted);
      socket.off('game:question', handleQuestion);
      socket.off('player:answer-submitted', handleAnswerSubmitted);
      socket.off('player:round-result', handleRoundResult);
      socket.off('game:next-round', handleNextRound);
      socket.off('game:reset', handleGameReset);
      socket.off('error', handleError);
    };
  }, [socket, isConnected]);

  const handleJoin = () => {
    if (!socket || !roomId.trim() || !playerName.trim()) {
      setError('Udfyld begge felter');
      return;
    }

    const trimmedRoomId = roomId.toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(trimmedRoomId)) {
      setError('Ugyldig spil-kode. Skal være 6 tegn.');
      return;
    }

    const trimmedName = playerName.trim();
    if (trimmedName.length === 0 || trimmedName.length > 50) {
      setError('Navn skal være mellem 1 og 50 tegn');
      return;
    }

    setError(null);
    socket.emit('player:join', { roomId: trimmedRoomId, playerName: trimmedName });
  };

  const handleSubmitAnswer = (answerIndex: number) => {
    if (!socket || selectedAnswer !== null) {
      return;
    }

    setSelectedAnswer(answerIndex);
    setError(null);
    socket.emit('player:submit-answer', { roomId, answerIndex });
  };

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

  return (
    <div className="min-h-screen bg-paper-cream paper-texture py-6 px-4">
      <div className="max-w-md mx-auto">
        {/* Join Screen */}
        {state === 'join' && (
          <>
            {/* Header */}
            <div className="text-center text-brun-moerk font-bureau text-xs mb-0">
              <div>════════════════════════════════════════</div>
            </div>
            
            <div className="panel-kommunal p-6">
              <div className="text-center mb-6">
                <h1 className="font-typewriter text-xl text-brun-moerk tracking-wide mb-1">
                  DELTAGER-TILMELDING
                </h1>
                <p className="text-ink-light text-xs">Formular til quiz-deltagelse</p>
              </div>

              <div className="sektion-divider">
                <span className="text-ink-faded text-xs px-2">※</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-ink-black mb-2">
                    § 1. SPIL-KODE
                  </label>
                  <p className="text-xs text-ink-light mb-2">
                    Indtast den 6-cifrede kode oplyst af quizmaster:
                  </p>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="input-kommunal w-full text-center text-2xl tracking-[0.3em] uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-ink-black mb-2">
                    § 2. DELTAGER-NAVN
                  </label>
                  <p className="text-xs text-ink-light mb-2">
                    Angiv dit fulde navn eller ønskede kaldenavn:
                  </p>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Dit navn"
                    maxLength={20}
                    className="input-kommunal w-full"
                  />
                </div>

                {error && (
                  <div className="bg-stempel-roed/10 border-2 border-stempel-roed p-3 text-stempel-roed text-sm">
                    <span className="font-bold">FEJL:</span> {error}
                  </div>
                )}

                <button
                  onClick={handleJoin}
                  className="btn-kommunal btn-kommunal-primary w-full mt-4"
                >
                  BEKRÆFT TILMELDING
                </button>
              </div>
            </div>

            <div className="text-center text-brun-moerk font-bureau text-xs mt-0">
              <div>════════════════════════════════════════</div>
            </div>
          </>
        )}

        {/* Waiting Screen */}
        {state === 'waiting' && (
          <>
            <div className="text-center text-brun-moerk font-bureau text-xs mb-0">
              <div>════════════════════════════════════════</div>
            </div>
            
            <div className="panel-kommunal p-6 text-center">
              <div className="stempel stempel-godkendt text-xs mb-6 inline-block">
                REGISTRERET
              </div>
              
              <h2 className="font-typewriter text-xl text-brun-moerk mb-2">
                Velkommen, {playerName}!
              </h2>
              
              <div className="panel-kommunal-inset p-4 my-6">
                <div className="text-6xl mb-2 animate-pulse-subtle">📋</div>
                <p className="text-ink-faded text-sm">
                  Afventer spørgsmål fra quizmaster...
                </p>
              </div>

              {score > 0 && (
                <div className="bg-paper-aged border-2 border-brun-moerk p-4">
                  <p className="text-ink-light text-xs mb-1">AKKUMULERET SCORE</p>
                  <p className="text-4xl font-bold text-brun-moerk font-bureau">{score.toFixed(2)}</p>
                  <p className="text-xs text-ink-light">point</p>
                </div>
              )}
            </div>

            <div className="text-center text-brun-moerk font-bureau text-xs mt-0">
              <div>════════════════════════════════════════</div>
            </div>
          </>
        )}

        {/* Answering Screen */}
        {state === 'answering' && (
          <>
            <div className="panel-kommunal p-4 mb-4">
              <div className="flex justify-between items-center text-xs text-ink-faded mb-2">
                <span>RUNDE {currentRound}/{totalRounds}</span>
                <span>SCORE: {score}</span>
              </div>
              
              <div className="panel-kommunal-inset p-4 mb-4">
                <p className="text-ink-black font-bold text-center">{question}</p>
              </div>

              <p className="text-xs text-ink-light text-center mb-4">
                Vælg dit svar ved at trykke på den relevante svarmulighed:
              </p>

              <div className="space-y-3">
                {options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubmitAnswer(index)}
                    disabled={selectedAnswer !== null}
                    className={`w-full ${optionStyles[index]} border-2 text-paper-cream font-bold py-4 px-4 flex items-center gap-4 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{ boxShadow: '2px 2px 0 rgba(0,0,0,0.3)' }}
                  >
                    <span className="w-10 h-10 bg-white/20 border border-white/30 flex items-center justify-center text-xl font-black">
                      {optionLabels[index]}
                    </span>
                    <span className="text-left flex-1">{option}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Answered - Waiting for reveal */}
        {state === 'answered' && (
          <>
            <div className="text-center text-brun-moerk font-bureau text-xs mb-0">
              <div>════════════════════════════════════════</div>
            </div>
            
            <div className="panel-kommunal p-6 text-center">
              <div className="stempel stempel-godkendt text-xs mb-4 inline-block">
                MODTAGET
              </div>
              
              <div className="text-6xl mb-4">📬</div>
              <h2 className="font-typewriter text-xl text-brun-moerk mb-2">
                Svar afleveret!
              </h2>
              
              <div className="panel-kommunal-inset p-4 my-4">
                <p className="text-ink-light text-sm">Dit valg:</p>
                <p className="font-bold text-xl text-brun-moerk">
                  Svarmulighed {optionLabels[selectedAnswer!]}
                </p>
              </div>
              
              <p className="text-ink-light text-xs animate-pulse-subtle">
                Afventer at quizmaster afslører det korrekte svar...
              </p>
            </div>

            <div className="text-center text-brun-moerk font-bureau text-xs mt-0">
              <div>════════════════════════════════════════</div>
            </div>
          </>
        )}

        {/* Result Screen */}
        {state === 'result' && roundResult && (
          <>
            <div className="text-center text-brun-moerk font-bureau text-xs mb-0">
              <div>════════════════════════════════════════</div>
            </div>
            
            <div className="panel-kommunal p-6 text-center">
              {roundResult.isCorrect ? (
                <>
                  <div className="stempel stempel-godkendt text-lg mb-4 inline-block">
                    KORREKT!
                  </div>
                  <div className="text-6xl mb-4">✓</div>
                </>
              ) : (
                <>
                  <div className="stempel stempel-afvist text-lg mb-4 inline-block">
                    FORKERT
                  </div>
                  <div className="text-6xl mb-4">✗</div>
                </>
              )}

              <div className="space-y-3 mb-6">
                {roundResult.answerIndex !== undefined && (
                  <div className={`p-3 border-2 ${roundResult.isCorrect ? 'bg-godkendt/10 border-godkendt' : 'bg-stempel-roed/10 border-stempel-roed'}`}>
                    <p className="text-xs text-ink-light">Dit svar:</p>
                    <p className="font-bold text-ink-black">
                      {optionLabels[roundResult.answerIndex]}: {options[roundResult.answerIndex]}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-godkendt/10 border-2 border-godkendt">
                  <p className="text-xs text-ink-light">Korrekt svar:</p>
                  <p className="font-bold text-godkendt">
                    {optionLabels[roundResult.correctIndex]}: {roundResult.correctAnswer}
                  </p>
                </div>
              </div>

              <div className="bg-paper-aged border-2 border-brun-moerk p-4">
                <p className="text-ink-light text-xs mb-1">TOTAL SCORE</p>
                <p className="text-4xl font-bold text-brun-moerk font-bureau">{roundResult.score.toFixed(2)}</p>
                <p className="text-xs text-ink-light">point</p>
              </div>

              <p className="text-xs text-ink-light mt-4 animate-pulse-subtle">
                Afventer næste runde...
              </p>
            </div>

            <div className="text-center text-brun-moerk font-bureau text-xs mt-0">
              <div>════════════════════════════════════════</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
