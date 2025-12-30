/**
 * Badge-related TypeScript interfaces for frontend
 */

export type BadgeCategory = 'learning' | 'game' | 'performance' | 'special';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface BadgeCriteria {
  type: 'word_count' | 'streak' | 'game_mode' | 'letter_completion' | 'accuracy' | 'custom';
  value?: number; // Made optional to match backend (accuracy uses minAccuracy instead)
  gameType?: string;
  letter?: string;
  minAccuracy?: number;
  minStreak?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  criteria: BadgeCriteria;
  rarity: BadgeRarity;
  createdAt: string;
  updatedAt?: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  progress: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  badge?: Badge;
}

export interface BadgeProgress {
  badgeId: string;
  badge: Badge;
  progress: number; // 0-100
  isEarned: boolean;
  earnedAt?: string;
}

export interface BadgeEvent {
  type: 'WORD_LEARNED' | 'GAME_COMPLETED' | 'STREAK_UPDATED' | 'LETTER_COMPLETED' | 'PERFECT_SCORE' | 'CUSTOM';
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

