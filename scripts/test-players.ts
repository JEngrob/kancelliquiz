import { io, Socket } from 'socket.io-client';
import * as readline from 'readline';

const SOCKET_URL = 'http://localhost:3001';
const NUM_PLAYERS = 10;

interface Question {
  text: string;
  options: string[];
  correctIndex: number;
}

interface Player {
  id: string;
  name: string;
  socket: Socket;
  hasAnswered: boolean;
  currentQuestion?: Question;
}

class TestScenario {
  private hostSocket: Socket | null = null;
  private players: Player[] = [];
  private roomId: string | null = null;
  private currentQuestion: Question | null = null;
  private answeredCount = 0;
  private gameFinished = false;
  private currentRound = 0;
  private totalRounds = 0;
  private roomCreatedByScript = false;
  private answerTimeout: NodeJS.Timeout | null = null;
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start() {
    console.log('🎮 Test Scenario: 10 Spillere');
    console.log('================================\n');

    // Spørg om rum-kode eller opret nyt
    const roomId = await this.getRoomId();
    this.roomId = roomId;

    if (roomId) {
      console.log(`\n📋 Rum-kode: ${roomId}`);
      console.log(`🌐 Åbn værten i browseren: http://localhost:3000/host/${roomId}\n`);
    } else {
      console.log('\n📋 Opretter nyt rum...\n');
    }

    // Opret host forbindelse
    await this.setupHost();

    // Opret spiller forbindelser
    await this.setupPlayers();

    // Vent lidt for at sikre alle er tilsluttet
    await this.sleep(1000);

    // Start quizzen
    await this.startQuiz();

    // Vent på at spillet er færdigt
    while (!this.gameFinished) {
      await this.sleep(100);
    }

    console.log('\n✅ Test scenario færdigt!');
    this.cleanup();
  }

  private async getRoomId(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question('Indtast rum-kode (eller tryk Enter for at oprette nyt rum): ', (answer) => {
        if (answer.trim()) {
          resolve(answer.trim().toUpperCase());
        } else {
          // Marker at vi skal oprette rum når host forbindes
          this.roomCreatedByScript = true;
          resolve(''); // Vi opretter rummet senere i setupHost
        }
      });
    });
  }

  private async setupHost(): Promise<void> {
    return new Promise((resolve) => {
      this.hostSocket = io(SOCKET_URL);
      let resolved = false;

      this.hostSocket.on('connect', () => {
        console.log('✅ Host forbindelse etableret');
        
        // Hvis rum skal oprettes, opret det nu
        if (this.roomCreatedByScript) {
          this.hostSocket!.emit('host:create-game');
        } else if (this.roomId) {
          // Join eksisterende rum
          this.hostSocket!.emit('host:request-player-list', { roomId: this.roomId });
          if (!resolved) {
            resolved = true;
            resolve();
          }
        } else {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }
      });

      this.hostSocket.on('host:game-created', (data: { roomId: string }) => {
        this.roomId = data.roomId;
        console.log(`📋 Rum oprettet: ${data.roomId}`);
        // Opdater console output med rum-koden
        console.log(`\n📋 Rum-kode: ${data.roomId}`);
        console.log(`🌐 Åbn værten i browseren: http://localhost:3000/host/${data.roomId}\n`);
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });

      this.hostSocket.on('host:quizzes-list', async (data: { quizzes: Array<{ filename: string }> }) => {
        if (data.quizzes.length > 0 && this.roomId) {
          const firstQuiz = data.quizzes[0];
          console.log(`📚 Vælger quiz: ${firstQuiz.filename}`);
          this.hostSocket!.emit('host:select-quiz', {
            roomId: this.roomId,
            quizFilename: firstQuiz.filename,
          });
        }
      });

      this.hostSocket.on('host:quiz-selected', () => {
        console.log('✅ Quiz valgt');
      });

      this.hostSocket.on('game:started', (data: { round: number; totalRounds: number }) => {
        this.currentRound = data.round;
        this.totalRounds = data.totalRounds;
        console.log(`\n🎯 Spil startet - Runde ${data.round}/${data.totalRounds}`);
      });

      this.hostSocket.on('game:question', (data: { question: Question }) => {
        this.currentQuestion = data.question;
        this.answeredCount = 0;
        console.log(`\n❓ Spørgsmål ${this.currentRound}/${this.totalRounds}: ${data.question.text.substring(0, 50)}...`);
        
        // Sæt timeout hvis ikke alle svarer inden for 5 sekunder
        if (this.answerTimeout) clearTimeout(this.answerTimeout);
        this.answerTimeout = setTimeout(() => {
          if (this.answeredCount < NUM_PLAYERS && this.currentQuestion) {
            console.log(`⏱️  Timeout - ${this.answeredCount}/${NUM_PLAYERS} har svaret`);
            this.revealAnswer();
          }
        }, 5000);
      });

      this.hostSocket.on('game:next-round', (data: { round: number; totalRounds: number }) => {
        this.currentRound = data.round;
        this.totalRounds = data.totalRounds;
      });

      this.hostSocket.on('host:answer-received', () => {
        this.answeredCount++;
        if (this.answeredCount === NUM_PLAYERS) {
          // Alle har svaret, ryd timeout og reveal
          if (this.answerTimeout) {
            clearTimeout(this.answerTimeout);
            this.answerTimeout = null;
          }
          setTimeout(() => {
            this.revealAnswer();
          }, 500);
        }
      });

      this.hostSocket.on('game:round-results', (data: {
        correct: string[];
        incorrect: string[];
        gameEnded: boolean;
      }) => {
        console.log(`\n📊 Resultater:`);
        console.log(`   ✅ Rigtige: ${data.correct.length}`);
        console.log(`   ❌ Forkerte: ${data.incorrect.length}`);
        
        if (data.gameEnded) {
          this.gameFinished = true;
          console.log('\n🏁 Spillet er færdigt!');
        } else {
          // Vent lidt og gå til næste runde
          setTimeout(() => {
            this.nextRound();
          }, 2000);
        }
      });

      this.hostSocket.on('error', (data: { message: string }) => {
        console.error(`❌ Host fejl: ${data.message}`);
      });
    });
  }

  private async setupPlayers(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 1; i <= NUM_PLAYERS; i++) {
      promises.push(this.createPlayer(i));
    }

    await Promise.all(promises);
    console.log(`✅ ${NUM_PLAYERS} spillere tilsluttet`);
  }

  private async createPlayer(index: number): Promise<void> {
    return new Promise((resolve) => {
      const socket = io(SOCKET_URL);
      const playerName = `Spiller ${index}`;

      socket.on('connect', () => {
        if (this.roomId) {
          socket.emit('player:join', {
            roomId: this.roomId,
            playerName: playerName,
          });
        }
      });

      socket.on('player:joined', () => {
        const player: Player = {
          id: socket.id!,
          name: playerName,
          socket: socket,
          hasAnswered: false,
        };
        this.players.push(player);
        resolve();
      });

      socket.on('game:question', (data: { question: Question }) => {
        const player = this.players.find(p => p.socket.id === socket.id);
        if (player) {
          player.currentQuestion = data.question;
          player.hasAnswered = false;
          
          // Svar tilfældigt (50% sandsynlighed for rigtigt)
          const correctIndex = data.question.correctIndex;
          let answerIndex: number;
          
          if (Math.random() < 0.5) {
            // 50% sandsynlighed for rigtigt svar
            answerIndex = correctIndex;
          } else {
            // 50% sandsynlighed for forkert svar (tilfældigt forkert)
            const wrongAnswers = [0, 1, 2, 3].filter(i => i !== correctIndex);
            answerIndex = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
          }

          // Simuler lidt tænkning tid (100-2000ms)
          const thinkTime = 100 + Math.random() * 1900;
          setTimeout(() => {
            if (this.roomId && !player.hasAnswered) {
              socket.emit('player:submit-answer', {
                roomId: this.roomId,
                answerIndex: answerIndex,
              });
              player.hasAnswered = true;
            }
          }, thinkTime);
        }
      });

      socket.on('player:round-result', () => {
        const player = this.players.find(p => p.socket.id === socket.id);
        if (player) {
          player.hasAnswered = false;
        }
      });

      socket.on('game:next-round', () => {
        const player = this.players.find(p => p.socket.id === socket.id);
        if (player) {
          player.hasAnswered = false;
        }
      });
    });
  }

  private async startQuiz(): Promise<void> {
    if (!this.hostSocket || !this.roomId) return;

    // Hent quizzes
    this.hostSocket.emit('host:get-quizzes');

    // Vent lidt for at quiz bliver valgt
    await this.sleep(1000);

    // Start spillet
    console.log('🚀 Starter quiz...');
    this.hostSocket.emit('host:start-game', {
      roomId: this.roomId,
    });
  }

  private revealAnswer(): void {
    if (!this.hostSocket || !this.roomId) return;
    console.log('🔍 Afslører svar...');
    this.hostSocket.emit('host:reveal-answer', {
      roomId: this.roomId,
    });
  }

  private nextRound(): void {
    if (!this.hostSocket || !this.roomId) return;
    console.log('➡️  Næste runde...');
    this.hostSocket.emit('host:next-round', {
      roomId: this.roomId,
    });
  }


  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanup(): void {
    if (this.answerTimeout) {
      clearTimeout(this.answerTimeout);
    }
    if (this.hostSocket) {
      this.hostSocket.disconnect();
    }
    this.players.forEach(player => {
      player.socket.disconnect();
    });
    this.rl.close();
    process.exit(0);
  }
}

// Start test scenario
const scenario = new TestScenario();
scenario.start().catch((error) => {
  console.error('❌ Fejl:', error);
  process.exit(1);
});

