'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useParams } from 'next/navigation';
import PlayerList from '@/components/PlayerList';
import WinnerScreen from '@/components/WinnerScreen';

interface Player {
  id: string;
  name: string;
  isActive: boolean;
  score: number;
  currentAnswer?: number;
}

interface AnswerResult {
  playerId: string;
  playerName: string;
  answerIndex?: number;
  answerText?: string;
  isCorrect: boolean;
  score: number;
}

interface Winner {
  name: string;
  score: number;
}

const optionLabels = ['A', 'B', 'C', 'D'];

export default function HostPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { socket, isConnected } = useSocket();

  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'question-sent' | 'round-results' | 'finished'>('lobby');
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [answerResults, setAnswerResults] = useState<AnswerResult[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  
  // Quiz selection state
  const [availableQuizzes, setAvailableQuizzes] = useState<Array<{ title: string; description: string; questionCount: number; filename: string }>>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [showQuizSelection, setShowQuizSelection] = useState(true);
  
  // Question form state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [answerRevealed, setAnswerRevealed] = useState(false);

  const currentDate = new Date().toLocaleDateString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-');

  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;

    socket.emit('host:request-player-list', { roomId });
    
    // Request available quizzes
    socket.emit('host:get-quizzes');

    const handlePlayerList = (data: { players: Player[] }) => {
      setPlayers(data.players);
    };

    const handleGameStarted = (data: { round: number; totalRounds: number }) => {
      setGameState('playing');
      setCurrentRound(data.round);
      setTotalRounds(data.totalRounds);
      setAnswerResults([]);
      setAnsweredCount(0);
      setAnswerRevealed(false);
    };

    const handleAnswerReceived = () => {
      setAnsweredCount(prev => prev + 1);
    };

    const handleRoundResults = (data: {
      correctIndex: number;
      correctAnswer: string;
      correct: string[];
      incorrect: string[];
      answerResults: AnswerResult[];
      gameEnded: boolean;
      winners: Winner[];
      players: Player[];
    }) => {
      setGameState(data.gameEnded ? 'finished' : 'round-results');
      setAnswerResults(data.answerResults);
      setCorrectAnswer(data.correctAnswer);
      setPlayers(data.players);
      if (data.gameEnded) {
        setWinners(data.winners);
      }
    };

    const handleNextRound = (data: { round: number; totalRounds: number }) => {
      setCurrentRound(data.round);
      setTotalRounds(data.totalRounds);
      setAnswerResults([]);
      setAnsweredCount(0);
      setAnswerRevealed(false);
      // If using a quiz, question will be sent automatically
      if (!selectedQuiz) {
        setGameState('playing');
        setQuestionText('');
        setOptions(['', '', '', '']);
        setCorrectIndex(0);
      } else {
        // Quiz question is sent automatically, so we're waiting for it
        setGameState('question-sent');
      }
    };

    const handleQuestion = (data: { text: string; options: string[]; round: number; totalRounds: number; correctIndex?: number }) => {
      // When a quiz question arrives, show it as sent
      if (selectedQuiz) {
        setGameState('question-sent');
        setQuestionText(data.text);
        setOptions(data.options);
        setCurrentRound(data.round);
        setTotalRounds(data.totalRounds);
        setAnsweredCount(0);
        setAnswerRevealed(false);
        // Set correct index if provided (for quiz questions) - but don't show it yet
        if (data.correctIndex !== undefined) {
          setCorrectIndex(data.correctIndex);
        }
      } else {
        // Manual question - keep state as playing
        setGameState('playing');
        setAnswerRevealed(false);
      }
    };

    const handleQuestionInfo = (data: { text: string; options: string[]; correctIndex: number; round: number; totalRounds: number }) => {
      // Host-specific question info with correct answer (for quiz questions)
      setQuestionText(data.text);
      setOptions(data.options);
      setCorrectIndex(data.correctIndex);
      setCurrentRound(data.round);
      setTotalRounds(data.totalRounds);
      setGameState('question-sent');
      setAnsweredCount(0);
      setAnswerRevealed(false); // Don't reveal until button is clicked
    };

    const handleGameReset = (data: { players: Player[] }) => {
      setGameState('lobby');
      setPlayers(data.players);
      setCurrentRound(0);
      setAnswerResults([]);
      setWinners([]);
      setAnsweredCount(0);
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectIndex(0);
      setAnswerRevealed(false);
      setShowQuizSelection(true);
      setSelectedQuiz(null);
    };

    const handleError = (data: { message: string }) => {
      console.error('Socket error:', data.message);
    };

    const handleQuizzesList = (data: { quizzes: Array<{ title: string; description: string; questionCount: number; filename: string }> }) => {
      setAvailableQuizzes(data.quizzes);
    };

    const handleQuizSelected = (data: { quiz: { title: string; description: string; questionCount: number; filename: string }; totalRounds: number }) => {
      setSelectedQuiz(data.quiz.filename);
      setTotalRounds(data.totalRounds);
      setShowQuizSelection(false);
    };

    socket.on('room:player-list', handlePlayerList);
    socket.on('host:quizzes-list', handleQuizzesList);
    socket.on('host:quiz-selected', handleQuizSelected);
    socket.on('game:started', handleGameStarted);
    socket.on('game:question', handleQuestion);
    socket.on('host:question-info', handleQuestionInfo);
    socket.on('host:answer-received', handleAnswerReceived);
    socket.on('game:round-results', handleRoundResults);
    socket.on('game:next-round', handleNextRound);
    socket.on('game:reset', handleGameReset);
    socket.on('error', handleError);
    socket.on('host:start-game-error', handleError);

    return () => {
      socket.off('room:player-list', handlePlayerList);
      socket.off('game:started', handleGameStarted);
      socket.off('game:question', handleQuestion);
      socket.off('host:question-info', handleQuestionInfo);
      socket.off('host:answer-received', handleAnswerReceived);
      socket.off('game:round-results', handleRoundResults);
      socket.off('game:next-round', handleNextRound);
      socket.off('game:reset', handleGameReset);
      socket.off('error', handleError);
      socket.off('host:start-game-error', handleError);
      socket.off('host:quizzes-list', handleQuizzesList);
      socket.off('host:quiz-selected', handleQuizSelected);
    };
  }, [socket, isConnected, roomId, selectedQuiz]);

  const handleSelectQuiz = (quizFilename: string) => {
    if (socket && isConnected) {
      socket.emit('host:select-quiz', { roomId, quizFilename });
    }
  };

  const handleStartGame = () => {
    if (socket && isConnected && selectedQuiz) {
      socket.emit('host:start-game', { 
        roomId, 
        quizFilename: selectedQuiz
      });
      setShowQuizSelection(false);
    }
  };

    const handleSendQuestion = () => {
      if (!socket || !questionText.trim() || options.some(o => !o.trim())) {
        return;
      }

      socket.emit('host:send-question', {
        roomId,
        question: {
          text: questionText,
          options: options,
          correctIndex: correctIndex,
        },
      });
      setGameState('question-sent');
      setAnsweredCount(0);
      setAnswerRevealed(false);
    };

  const handleRevealAnswer = () => {
    if (socket) {
      setAnswerRevealed(true);
      socket.emit('host:reveal-answer', { roomId });
    }
  };

  const handleNextRound = () => {
    if (socket) {
      socket.emit('host:next-round', { roomId });
    }
  };

  const handleReset = (keepPlayers: boolean) => {
    if (socket) {
      socket.emit('host:reset-game', { roomId, keepPlayers });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-paper-cream paper-texture flex items-center justify-center p-4">
        <div className="panel-kommunal p-8 text-center">
          <div className="spinner-kommunal mx-auto mb-4"></div>
          <p className="text-ink-faded font-bureau">Etablerer forbindelse til server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-cream paper-texture py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ASCII Top Border */}
        <div className="text-center text-brun-moerk font-bureau text-xs mb-0 overflow-hidden">
          <div>═══════════════════════════════════════════════════════════════════════════════</div>
          <div className="bg-brun-moerk text-paper-cream py-1 tracking-[0.3em] text-[10px]">
            ██████████████████████████████████████████████████████████████████████████████████
          </div>
        </div>

        {/* Header Panel */}
        <div className="panel-kommunal p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h1 className="font-typewriter text-2xl text-brun-moerk tracking-wide">
                QUIZMASTER-KONTROLPANEL
              </h1>
              <p className="text-ink-light text-xs">
                Administrationssystem for quiz-afvikling
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs text-ink-light mb-1">ADGANGSKODE TIL DELTAGELSE</p>
              <div className="bg-paper-aged border-3 border-brun-moerk p-3 shadow-kommunal-sm">
                <p className="text-4xl font-bureau font-bold text-brun-moerk tracking-[0.3em]">
                  {roomId}
                </p>
              </div>
              <p className="text-xs text-ink-light mt-1">
                Del denne kode med deltagerne
              </p>
            </div>

            <div className="text-xs text-ink-light text-center md:text-right border border-dashed border-brun-moerk p-2">
              <div>Sagsnr.: QUIZ-{roomId}</div>
              <div>Dato: {currentDate}</div>
              <div>Status: <span className="text-godkendt font-bold">AKTIV</span></div>
            </div>
          </div>
        </div>

        {/* Winner Screen */}
        {gameState === 'finished' && (
          <div className="mb-6">
            <WinnerScreen winnerName={winners.length > 0 ? winners.map(w => `${w.name} (${w.score} point)`).join(', ') : undefined} />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Quiz Selection */}
            {gameState === 'lobby' && showQuizSelection && (
              <div className="panel-kommunal p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-brun-moerk font-bold">§ 0.</span>
                  <span className="font-bold text-ink-black">VÆLG QUIZ</span>
                </div>
                {availableQuizzes.length > 0 ? (
                  <>
                    <p className="text-ink-light text-sm mb-4 pl-6">
                      Vælg en præ-genereret quiz:
                    </p>
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {availableQuizzes.map((quiz) => (
                        <button
                          key={quiz.filename}
                          onClick={() => handleSelectQuiz(quiz.filename)}
                          className={`w-full text-left p-3 border-2 transition-all ${
                            selectedQuiz === quiz.filename
                              ? 'bg-brun-lys/30 border-brun-moerk'
                              : 'bg-paper-aged border-brun-moerk/30 hover:bg-beige-mellem'
                          }`}
                        >
                          <div className="font-bold text-ink-black">{quiz.title}</div>
                          {quiz.description && (
                            <div className="text-xs text-ink-light mt-1">{quiz.description}</div>
                          )}
                          <div className="text-xs text-ink-faded mt-1">
                            {quiz.questionCount} spørgsmål
                          </div>
                        </button>
                      ))}
                    </div>
                    {selectedQuiz && (
                      <div className="mb-4 p-3 bg-godkendt/10 border-2 border-godkendt">
                        <div className="text-xs text-ink-light mb-1">Valgt quiz:</div>
                        <div className="font-bold text-godkendt">
                          {availableQuizzes.find(q => q.filename === selectedQuiz)?.title}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-paper-aged border-2 border-brun-moerk/30">
                    <p className="text-ink-light text-sm mb-2">
                      Indlæser quizer...
                    </p>
                    <p className="text-xs text-ink-faded">
                      Vent venligst mens quizer indlæses fra serveren.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Lobby Controls */}
            {gameState === 'lobby' && !showQuizSelection && (
              <div className="panel-kommunal p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-brun-moerk font-bold">§ 1.</span>
                  <span className="font-bold text-ink-black">IGANGSÆTTELSE AF QUIZ</span>
                </div>
                {selectedQuiz && (
                  <div className="mb-4 p-3 bg-paper-aged border-2 border-brun-moerk/30">
                    <div className="text-xs text-ink-light mb-1">Valgt quiz:</div>
                    <div className="font-bold text-ink-black">
                      {availableQuizzes.find(q => q.filename === selectedQuiz)?.title}
                    </div>
                    <div className="text-xs text-ink-faded mt-1">
                      {totalRounds} spørgsmål
                    </div>
                  </div>
                )}
                <p className="text-ink-light text-sm mb-4 pl-6">
                  Når alle deltagere er registreret, kan quiz-sessionen påbegyndes.
                </p>
                <button
                  onClick={handleStartGame}
                  disabled={players.length === 0 || !selectedQuiz}
                  className="btn-kommunal btn-kommunal-primary w-full"
                >
                  {!selectedQuiz
                    ? 'VÆLG QUIZ FØRST'
                    : players.length === 0 
                    ? 'AFVENTER DELTAGERE...' 
                    : `START QUIZ (${players.length} ${players.length === 1 ? 'deltager' : 'deltagere'})`
                  }
                </button>
                {!showQuizSelection && (
                  <button
                    onClick={() => setShowQuizSelection(true)}
                    className="btn-kommunal w-full mt-2"
                  >
                    VÆLG ANDEN QUIZ
                  </button>
                )}
              </div>
            )}

            {/* Playing - Show current quiz question info */}
            {gameState === 'playing' && selectedQuiz && (
              <div className="panel-kommunal p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-brun-moerk font-bold">RUNDE</span>
                    <span className="score-badge">{currentRound}/{totalRounds}</span>
                  </div>
                  <div className="stempel text-xs">QUIZ-AKTIV</div>
                </div>
                <div className="panel-kommunal-inset p-4">
                  <p className="text-xs text-ink-light mb-2">Quiz:</p>
                  <p className="font-bold text-ink-black">
                    {availableQuizzes.find(q => q.filename === selectedQuiz)?.title}
                  </p>
                  <p className="text-xs text-ink-faded mt-2">
                    Spørgsmål sendes automatisk fra quiz
                  </p>
                </div>
              </div>
            )}

            {/* Question Sent - Waiting for answers */}
            {gameState === 'question-sent' && (
              <div className="panel-kommunal p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-brun-moerk font-bold">RUNDE {currentRound}/{totalRounds}</span>
                  <div className="stempel text-xs">AFVENTER SVAR</div>
                </div>

                <div className="panel-kommunal-inset p-4 mb-4">
                  <p className="text-xs text-ink-light mb-1">Spørgsmål:</p>
                  <p className="text-ink-black font-bold">{questionText}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {options.map((option, index) => (
                    <div
                      key={index}
                      className={`p-2 text-xs border-2 ${
                        answerRevealed && correctIndex === index
                          ? 'bg-godkendt/20 border-godkendt'
                          : 'bg-paper-aged border-brun-moerk/50'
                      }`}
                    >
                      <span className="font-bold">{optionLabels[index]}:</span> {option}
                    </div>
                  ))}
                </div>

                <div className="text-center mb-4 p-4 bg-paper-aged border-2 border-brun-moerk">
                  <p className="text-xs text-ink-light mb-1">MODTAGNE SVAR</p>
                  <p className="text-3xl font-bold text-brun-moerk font-bureau">
                    {answeredCount}
                    <span className="text-lg text-ink-light"> / {players.filter(p => p.isActive).length}</span>
                  </p>
                </div>

                <button
                  onClick={handleRevealAnswer}
                  className="btn-kommunal w-full bg-gradient-to-b from-[#c9a86b] to-svar-b text-paper-cream border-[#6b5a2a]"
                >
                  AFSLØRING AF KORREKT SVAR
                </button>
              </div>
            )}

            {/* Round Results */}
            {gameState === 'round-results' && (
              <div className="panel-kommunal p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-brun-moerk font-bold">§</span>
                  <span className="font-bold text-ink-black">RUNDE-RESULTAT</span>
                </div>

                <div className="bg-godkendt/20 border-2 border-godkendt p-4 mb-4">
                  <p className="text-xs text-ink-light">Korrekt svar:</p>
                  <p className="text-godkendt font-bold text-lg">{correctAnswer}</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleNextRound}
                    className="btn-kommunal btn-kommunal-primary w-full"
                  >
                    FORTSÆT TIL NÆSTE RUNDE
                  </button>
                  <button
                    onClick={() => handleReset(true)}
                    className="btn-kommunal w-full"
                  >
                    NULSTIL QUIZ
                  </button>
                </div>
              </div>
            )}

            {/* Game Finished */}
            {gameState === 'finished' && (
              <div className="panel-kommunal p-6">
                <div className="stempel stempel-godkendt text-sm mb-4 inline-block">
                  AFSLUTTET
                </div>
                <h3 className="font-typewriter text-xl text-brun-moerk mb-4">
                  Quiz gennemført!
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleReset(true)}
                    className="btn-kommunal btn-kommunal-primary w-full"
                  >
                    NY QUIZ (BEHOLD DELTAGERE)
                  </button>
                  <button
                    onClick={() => handleReset(false)}
                    className="btn-kommunal w-full bg-stempel-roed/20 border-stempel-roed text-stempel-roed hover:bg-stempel-roed/30"
                  >
                    AFSLUT OG NULSTIL ALT
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Players Panel - Only show in lobby */}
            {gameState === 'lobby' && (
              <div className="panel-kommunal p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-brun-moerk font-bold">§ 2.</span>
                  <span className="font-bold text-ink-black">
                    DELTAGERLISTE ({players.length})
                  </span>
                </div>
                <PlayerList
                  players={players}
                  gameState={gameState}
                />
              </div>
            )}

            {/* Answer Results */}
            {(gameState === 'round-results' || gameState === 'finished') && answerResults.length > 0 && (
              <div className="panel-kommunal p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-brun-moerk font-bold">§ 3.</span>
                  <span className="font-bold text-ink-black">SVARPROTOKOL</span>
                </div>
                <div className="space-y-2">
                  {answerResults.map((result) => (
                    <div
                      key={result.playerId}
                      className={`flex justify-between items-center p-3 border-2 ${
                        result.isCorrect
                          ? 'bg-godkendt/10 border-godkendt'
                          : 'bg-stempel-roed/10 border-stempel-roed'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 ${
                          result.isCorrect ? 'bg-godkendt' : 'bg-stempel-roed'
                        }`}></span>
                        <span className="font-bold text-ink-black">{result.playerName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {result.answerText !== undefined ? (
                          <span className="text-sm text-ink-faded">{result.answerText}</span>
                        ) : (
                          <span className="text-sm text-ink-light italic">Intet svar</span>
                        )}
                        <span className={`font-bold text-lg ${
                          result.isCorrect ? 'text-godkendt' : 'text-stempel-roed'
                        }`}>
                          {result.isCorrect ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scoreboard */}
            {gameState !== 'lobby' && (
              <div className="panel-kommunal p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🏆</span>
                  <span className="font-bold text-ink-black">POINTTAVLE</span>
                </div>
                <div className="space-y-2">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex justify-between items-center p-3 border-2 ${
                          index === 0 && player.score > 0
                            ? 'bg-brun-lys/30 border-brun-lys'
                            : 'bg-paper-aged border-brun-moerk/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl w-8 text-center">
                            {index === 0 && player.score > 0 ? '🥇' : 
                             index === 1 && player.score > 0 ? '🥈' : 
                             index === 2 && player.score > 0 ? '🥉' : 
                             `${index + 1}.`}
                          </span>
                          <span className="font-bold text-ink-black">{player.name}</span>
                        </div>
                        <span className="score-badge text-lg">{player.score.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ASCII Bottom Border */}
        <div className="text-center text-brun-moerk font-bureau text-xs mt-6 overflow-hidden">
          <div className="bg-brun-moerk text-paper-cream py-1 tracking-[0.3em] text-[10px]">
            ██████████████████████████████████████████████████████████████████████████████████
          </div>
          <div>═══════════════════════════════════════════════════════════════════════════════</div>
        </div>

        {/* Print timestamp */}
        <div className="text-center mt-4 text-xs text-ink-light font-bureau">
          &gt;&gt;&gt; UDSKREVET: {currentDate} {new Date().toLocaleTimeString('da-DK')} &lt;&lt;&lt;
        </div>
      </div>
    </div>
  );
}
