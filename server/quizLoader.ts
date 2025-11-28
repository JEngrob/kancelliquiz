import { Question } from './types';
import * as fs from 'fs';
import * as path from 'path';

export interface QuizMetadata {
  title: string;
  description: string;
  questionCount: number;
  filename: string;
}

export interface Quiz {
  metadata: QuizMetadata;
  questions: Question[];
}

/**
 * Parses a quiz markdown file and returns a Quiz object
 */
function parseQuizMarkdown(content: string, filename: string): Quiz {
  const lines = content.split('\n');
  let currentQuestion: Partial<Question> | null = null;
  const questions: Question[] = [];
  
  let title = '';
  let description = '';
  let questionCount = 0;
  
  let i = 0;
  
  // Parse header
  if (lines[0].startsWith('# ')) {
    title = lines[0].substring(2).trim();
  }
  
  // Parse metadata
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line.startsWith('**Titel:**')) {
      title = line.substring(9).trim();
    } else if (line.startsWith('**Beskrivelse:**')) {
      description = line.substring(16).trim();
    } else if (line.startsWith('**Antal spørgsmål:**')) {
      questionCount = parseInt(line.substring(20).trim(), 10);
    } else if (line.startsWith('## Spørgsmål')) {
      // Start of a new question
      if (currentQuestion && currentQuestion.text && currentQuestion.options && currentQuestion.options.length === 4) {
        questions.push(currentQuestion as Question);
      }
      currentQuestion = {
        text: '',
        options: [],
        correctIndex: -1,
      };
    } else if (line.startsWith('**Tekst:**')) {
      if (currentQuestion) {
        currentQuestion.text = line.substring(9).trim();
      }
    } else if (line.match(/^\*\*[A-D]\)\*\*/)) {
      // Answer option
      if (currentQuestion) {
        const optionText = line.replace(/^\*\*[A-D]\)\*\*\s*/, '').trim();
        if (!currentQuestion.options) {
          currentQuestion.options = [];
        }
        currentQuestion.options.push(optionText);
      }
    } else if (line.startsWith('**Korrekt svar:**')) {
      const correctAnswer = line.substring(17).trim();
      if (currentQuestion) {
        const index = correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
        if (index >= 0 && index <= 3) {
          currentQuestion.correctIndex = index;
        }
      }
    } else if (currentQuestion && currentQuestion.text && line && !line.startsWith('---')) {
      // Continue text if it spans multiple lines
      currentQuestion.text += ' ' + line.trim();
    }
    
    i++;
  }
  
  // Add last question
  if (currentQuestion && currentQuestion.text && currentQuestion.options && currentQuestion.options.length === 4) {
    questions.push(currentQuestion as Question);
  }
  
  // Validate all questions have correct answers
  const validQuestions = questions.filter(q => 
    q.text && 
    q.options.length === 4 && 
    q.correctIndex >= 0 && 
    q.correctIndex <= 3
  );
  
  return {
    metadata: {
      title: title || path.basename(filename, '.md'),
      description: description || '',
      questionCount: validQuestions.length,
      filename: path.basename(filename),
    },
    questions: validQuestions,
  };
}

/**
 * Loads all quiz files from the quizzes directory
 */
export function loadAllQuizzes(): Quiz[] {
  const quizzesDir = path.join(process.cwd(), 'quizzes');
  
  if (!fs.existsSync(quizzesDir)) {
    console.warn(`Quizzes directory not found: ${quizzesDir}`);
    return [];
  }
  
  const files = fs.readdirSync(quizzesDir);
  const quizFiles = files.filter(f => f.endsWith('.md'));
  
  const quizzes: Quiz[] = [];
  
  for (const file of quizFiles) {
    try {
      const filePath = path.join(quizzesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const quiz = parseQuizMarkdown(content, file);
      
      if (quiz.questions.length > 0) {
        quizzes.push(quiz);
      } else {
        console.warn(`No valid questions found in quiz: ${file}`);
      }
    } catch (error) {
      console.error(`Error loading quiz ${file}:`, error);
    }
  }
  
  return quizzes;
}

/**
 * Gets metadata for all available quizzes
 */
export function getQuizMetadataList(): QuizMetadata[] {
  const quizzes = loadAllQuizzes();
  return quizzes.map(q => q.metadata);
}

/**
 * Loads a specific quiz by filename
 */
export function loadQuiz(filename: string): Quiz | null {
  const quizzesDir = path.join(process.cwd(), 'quizzes');
  const filePath = path.join(quizzesDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseQuizMarkdown(content, filename);
  } catch (error) {
    console.error(`Error loading quiz ${filename}:`, error);
    return null;
  }
}

