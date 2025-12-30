// Backend TypeScript interfaces for Synonym Quest

export interface Word {
  id: string;
  word: string;
  synonyms: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  meaning?: string;
  correctCount?: number;
  incorrectCount?: number;
  lastReviewed?: Date;
  createdAt: Date;
}

export interface CreateWordRequest {
  word: string;
  synonyms: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  meaning?: string;
}

export interface UpdateWordRequest {
  word?: string;
  synonyms?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  meaning?: string;
}

export interface SearchFilters {
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  searchTerm?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuizAnswer {
  wordId: string;
  userAnswer: string[];
  correctSynonyms: string[];
  isCorrect: boolean;
  timestamp: Date;
  hintsUsed: number;
}

export interface QuizSession {
  id: string;
  words: string[]; // Array of word IDs
  currentIndex: number;
  answers: QuizAnswer[];
  score: number;
  startTime: Date;
  endTime?: Date;
  totalQuestions: number;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  streak: number;
  timeSpent: number;
  achievements: string[];
  feedback: AnswerFeedback[];
  hintsUsed: number;
  wordId?: string;
  userAnswer?: string[];
  correctSynonyms?: string[];
}

export interface AnswerFeedback {
  isCorrect: boolean | string;
  correctAnswers: string[];
  userAnswer: string;
  explanation?: string;
  synonym?: string;
  status?: string;
  userProvided?: string | boolean;
}

export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  numberOfQuestions: number;
  quizLength?: number;
  categories?: string[];
  timeLimit?: number;
  hintsEnabled: boolean;
}

export interface AISuggestionRequest {
  word: string;
  context?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  maxSynonyms?: number;
}

export interface AIValidationRequest {
  word: string;
  userAnswer: string;
  correctSynonyms: string[];
}

export interface AIValidationResponse {
  isCorrect?: boolean;
  confidence: number;
  explanation?: string;
  suggestions?: string[];
  isValid?: boolean;
  feedback?: string;
}

// Badge System Types
export type BadgeCategory = 'learning' | 'game' | 'performance' | 'special';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCriteriaType = 'word_count' | 'streak' | 'accuracy' | 'game_mode' | 'letter_completion' | 'custom';

export interface BadgeCriteria {
  type: BadgeCriteriaType;
  value: number;
  gameType?: string;
  letter?: string;
  minAccuracy?: number;
  minStreak?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string; // Emoji or icon URL
  criteria: BadgeCriteria;
  rarity: BadgeRarity;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  progress: number; // For progress-based badges (0-100)
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BadgeEvent {
  type: 'WORD_LEARNED' | 'GAME_COMPLETED' | 'STREAK_UPDATED' | 'LETTER_COMPLETED' | 'PERFECT_SCORE' | 'CUSTOM';
  userId: string;
  data: {
    wordId?: string;
    gameType?: string;
    accuracy?: number;
    streak?: number;
    letter?: string;
    wordCount?: number;
    [key: string]: any;
  };
}

export interface BadgeProgress {
  badgeId: string;
  badge: Badge;
  progress: number;
  isEarned: boolean;
  earnedAt?: Date;
}
