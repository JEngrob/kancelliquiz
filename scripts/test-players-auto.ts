import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';
const NUM_PLAYERS = 20;

// Danske navne
const PLAYER_NAMES = [
  'Anders Jensen', 'Birgitte Nielsen', 'Christian Pedersen', 'Dorthe Larsen',
  'Erik Hansen', 'Fiona Christensen', 'Grethe Andersen', 'Henrik Møller',
  'Inge Sørensen', 'Jens Michaelsen', 'Karen Olsen', 'Lars Rasmussen',
  'Mette Petersen', 'Niels Bergström', 'Olga Andersson', 'Peder Thomsen',
  'Quirine van der Berg', 'Rune Ødegård', 'Søren Frost', 'Tine Gaard'
];

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
  private answerTimeout: NodeJS.Timeout | null = null;

  async start() {
    console.log('🎮 Test Scenario: 10 Spillere (Auto)');
    console.log('================================\n');

    // Opret rum automatisk
    console.log('📋 Opretter nyt rum...\n');
    await this.setupHost();

    // Vent på at rum-koden er klar
    while (!this.roomId) {
      await this.sleep(100);
    }

    console.log(`\n📋 Rum-kode: ${this.roomId}`);
    console.log(`🌐 Åbn værten i browseren: http://localhost:3000/host/${this.roomId}\n`);
    
    // Skriv rum-koden til fil så browseren kan læse den
    const fs = require('fs');
    const path = require('path');
    const roomFile = path.join(process.cwd(), 'test-room-id.txt');
    fs.writeFileSync(roomFile, this.roomId);

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

  private async setupHost(): Promise<void> {
    return new Promise((resolve) => {
      this.hostSocket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      });
      let resolved = false;

      this.hostSocket.on('connect', () => {
        console.log('✅ Host forbindelse etableret');
        console.log('📤 Sender host:create-game...');
        this.hostSocket!.emit('host:create-game');
      });

      this.hostSocket.on('connect_error', (error) => {
        console.error('❌ Host forbindelsesfejl:', error.message);
        console.error('💡 Tjek at Socket.IO serveren kører på port 3001');
      });

      this.hostSocket.on('host:game-created', (data: { roomId: string }) => {
        this.roomId = data.roomId;
        console.log(`📋 Rum oprettet: ${data.roomId}`);
        
        // Skriv rum-koden til fil med det samme
        try {
          const fs = require('fs');
          const path = require('path');
          const roomFile = path.join(process.cwd(), 'test-room-id.txt');
          fs.writeFileSync(roomFile, data.roomId);
          console.log(`💾 Rum-kode gemt til fil: ${data.roomId}`);
        } catch (e) {
          console.error('Kunne ikke skrive rum-kode til fil:', e);
        }
        
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

      this.hostSocket.on('game:question', (data: any) => {
        // Data kan være enten {question: Question} eller direkte Question
        const question = data.question || data;
        this.currentQuestion = question;
        this.answeredCount = 0;
        console.log(`\n❓ Spørgsmål ${this.currentRound}/${this.totalRounds}: ${question.text.substring(0, 50)}...`);
        
        // Sæt timeout hvis ikke alle svarer inden for 8 sekunder
        if (this.answerTimeout) clearTimeout(this.answerTimeout);
        this.answerTimeout = setTimeout(() => {
          if (this.answeredCount < NUM_PLAYERS && this.currentQuestion) {
            console.log(`⏱️  Timeout - ${this.answeredCount}/${NUM_PLAYERS} har svaret`);
            this.revealAnswer();
          }
        }, 8000);
      });

      this.hostSocket.on('game:next-round', (data: { round: number; totalRounds: number }) => {
        this.currentRound = data.round;
        this.totalRounds = data.totalRounds;
      });

      this.hostSocket.on('host:answer-received', () => {
        this.answeredCount++;
        console.log(`📝 Svar modtaget: ${this.answeredCount}/${NUM_PLAYERS}`);
        if (this.answeredCount === NUM_PLAYERS) {
          // Alle har svaret, ryd timeout og reveal
          if (this.answerTimeout) {
            clearTimeout(this.answerTimeout);
            this.answerTimeout = null;
          }
          setTimeout(() => {
            this.revealAnswer();
          }, 2000); // Længere pause så du kan se alle svarene
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
          // Vent længere så du kan læse resultaterne
          setTimeout(() => {
            this.nextRound();
          }, 3000);
        }
      });

      this.hostSocket.on('error', (data: { message: string }) => {
        console.error(`❌ Host fejl: ${data.message}`);
      });
    });
  }

  private async setupPlayers(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < NUM_PLAYERS; i++) {
      promises.push(this.createPlayer(i, PLAYER_NAMES[i]));
    }

    await Promise.all(promises);
    console.log(`✅ ${NUM_PLAYERS} spillere tilsluttet`);
  }

  private async createPlayer(index: number, name: string): Promise<void> {
    return new Promise((resolve) => {
      const socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        if (this.roomId) {
          socket.emit('player:join', {
            roomId: this.roomId,
            playerName: name,
          });
        }
      });

      socket.on('player:joined', () => {
        const player: Player = {
          id: socket.id!,
          name: name,
          socket: socket,
          hasAnswered: false,
        };
        this.players.push(player);
        resolve();
      });

      socket.on('game:question', (data: any) => {
        const player = this.players.find(p => p.socket.id === socket.id);
        if (player) {
          // Data kan være enten {question: Question} eller direkte Question
          const question = data.question || data;
          player.currentQuestion = question;
          player.hasAnswered = false;
          
          // Svar tilfældigt (50% sandsynlighed for rigtigt)
          const correctIndex = question.correctIndex;
          let answerIndex: number;
          
          if (Math.random() < 0.5) {
            // 50% sandsynlighed for rigtigt svar
            answerIndex = correctIndex;
          } else {
            // 50% sandsynlighed for forkert svar (tilfældigt forkert)
            const wrongAnswers = [0, 1, 2, 3].filter(i => i !== correctIndex);
            answerIndex = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
          }

          // Simuler tænkning tid (500-3000ms) - længere så alle kan se det
          const thinkTime = 500 + Math.random() * 2500;
          setTimeout(() => {
            if (this.roomId && !player.hasAnswered && this.currentQuestion) {
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
    process.exit(0);
  }
}

// Start test scenario
const scenario = new TestScenario();
scenario.start().catch((error) => {
  console.error('❌ Fejl:', error);
  process.exit(1);
});

