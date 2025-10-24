// Frontend TypeScript interfaces for Synonym Quest API communication

export interface Word {
  id: string;
  word: string;
  synonyms: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
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
}

export interface UpdateWordRequest {
  word?: string;
  synonyms?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
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

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User related types (if needed for frontend)
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
