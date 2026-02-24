


export enum GameState {
  MENU = 'MENU',
  DASHBOARD = 'DASHBOARD',
  DIAGNOSTIC = 'DIAGNOSTIC',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export type GameMode = 'CLASSIC' | 'ASSEMBLY' | 'SURF' | 'STACK' | 'SURVIVOR' | 'LEARN' | 'QUIZ';

export enum QuestionType {
  VERSE_BUILDER = 'VERSE_BUILDER',
  VERSE_FLOW = 'VERSE_FLOW',
  VERSE_BRIDGE = 'VERSE_BRIDGE', // Classic Echo Bridge
  VERSE_ASSEMBLY = 'VERSE_ASSEMBLY', // Puzzle Mode
  VERSE_SURFER = 'VERSE_SURFER', // Runner Mode
  VERSE_STACK = 'VERSE_STACK', // Stacker Mode
  VERSE_SURVIVOR = 'VERSE_SURVIVOR', // Vampire Survivors Mode
  VERSE_LEARN = 'VERSE_LEARN', // Progressive Memorization
  VERSE_QUIZ = 'VERSE_QUIZ' // Multiple Choice Quiz
}

export interface AssemblyFragment {
  id: string;
  text: string;
  type: 'CORRECT' | 'DISTRACTOR';
  orderIndex: number; // 0-based for correct, -1 for distractor
}

export interface SurferData {
  words: string[]; // Correct sequence of words for the verses
  distractors: string[]; // Pool of wrong words
  wordChallenges?: { word: string, distractors: string[] }[]; // Specific mapping (Survivor Game)
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  arabicText: string; // The 'Anchor' verse text
  correctAnswer?: string; // The text of the NEXT verse or correct option
  nextVerseFirstWord?: string; // For Echo Bridge
  options?: string[]; // Options for the next verse (ideally sharing the first word)
  words?: string[]; // For Builder mode
  translation?: string;
  points: number;
  verseNumber: number;
  // New AI assistance fields
  hint?: string; // Contextual meaning of the next verse
  wordDistractors?: string[]; // Similar words to the first word
  memorizationTip?: string; // Structural pattern or guide

  // Quiz Specific
  explanation?: string; // Tafseer or detailed context
  quizSubType?: 'VOCABULARY' | 'TAFSEER' | 'THEME' | 'PRECISION' | 'SCENARIO' | 'PUZZLE' | 'CONNECTION' | 'ORDER'; // Type of quiz question
  scenario?: string; // For SCENARIO type
  emojis?: string; // For PUZZLE type

  // Verse Assembler Data
  assemblyData?: {
    fragments: AssemblyFragment[];
  };

  // Surfer & Survivor Data (Shared structure)
  surferData?: SurferData;

  // Stack Data
  stackData?: {
    words: string[];
  }
}

export interface LevelData {
  surahName: string;
  questions: Question[];
}

export interface DiagnosticMistake {
  type: 'MEMORIZATION' | 'TAJWEED' | 'PRONUNCIATION';
  verse: number;
  text: string; // The text where the issue occurred
  correction?: string;
  description: string; // What went wrong
  advice: string; // How to ameliorate/fix it
}

export interface DiagnosticMetrics {
  memorization: number; // 0-100
  tajweed: number; // 0-100
  pronunciation: number; // 0-100
}

export interface DiagnosticResult {
  surahName: string;
  startVerse: number;
  endVerse?: number;
  overallScore: number; // 0-100
  metrics: DiagnosticMetrics;
  mistakes: DiagnosticMistake[];
  diagnosis: string; // General summary
  identifiedText: string;
}

export interface PlayerStats {
  score: number;
  highScore: number;
  streak: number;
  maxStreak: number;
  accuracy: number;
  correctAnswers: number;
  totalQuestions: number;
}

// --- NEW PERSISTENCE TYPES ---

export interface SurahStats {
  surahName: string;
  masteryLevel: number; // 0-100%
  stars: 0 | 1 | 2 | 3; // Best performance
  highScore: number;
  lastPlayed: number; // Timestamp
  gamesPlayed: number;
  versesMastered: number; // Count of verses passed perfectly
  masteredVersesList?: number[]; // List of specific mastered verses
}

export interface UserGoal {
  id: string;
  surahName: string;
  targetDate?: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface GlobalStats {
  totalXp: number;
  level: number;
  totalGamesPlayed: number;
  streakDays: number;
  lastLoginDate: string; // ISO Date string for streak calc
  achievements: string[]; // IDs of unlocked achievements
  goals: UserGoal[];
}

export interface UserProfile {
  name: string;
  email: string;
  level: number;
  xp: number;
  streak: number;
  badges: string[];
  accuracy: number;
  currentSurah?: {
    name: string;
    progress: number;
  };
  totalGamesPlayed: number;
  isAdmin?: boolean;
}
