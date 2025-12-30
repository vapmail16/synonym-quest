/**
 * Utility functions for badge display and formatting
 */

import { BadgeCriteria } from '../types/badge';

/**
 * Formats badge criteria into human-readable requirements
 */
export function formatBadgeRequirement(criteria: BadgeCriteria): string {
  switch (criteria.type) {
    case 'word_count':
      const wordCount = criteria.value || 0;
      return `Learn ${wordCount} word${wordCount === 1 ? '' : 's'}`;
    
    case 'game_mode':
      const gameTypeName = formatGameTypeName(criteria.gameType || '');
      const gameCount = criteria.value || 0;
      return `Complete ${gameCount} ${gameTypeName} game${gameCount === 1 ? '' : 's'}`;
    
    case 'streak':
      const streakDays = criteria.minStreak || criteria.value || 0;
      return `Maintain a ${streakDays}-day streak`;
    
    case 'accuracy':
      const accuracyPercent = criteria.minAccuracy || criteria.value || 0;
      return `Achieve ${accuracyPercent}% accuracy`;
    
    case 'letter_completion':
      return `Complete all words for letter "${criteria.letter?.toUpperCase() || ''}"`;
    
    case 'custom':
      // Custom badges have specific logic - return description-based requirement
      return 'Complete special challenge';
    
    default:
      return 'Complete the challenge';
  }
}

/**
 * Formats game type name for display
 */
function formatGameTypeName(gameType: string): string {
  const gameTypeMap: { [key: string]: string } = {
    'synonym-match': 'Synonym Match',
    'spelling': 'Spelling Challenge',
    'word-ladder': 'Word Ladder',
    'speed-round': 'Speed Round',
    'new-letter': 'Letter Learning (New)',
    'old-letter': 'Letter Learning (Review)',
    'random-new': 'Random New Words',
    'random-old': 'Random Review',
    'daily-quest': 'Daily Quest',
  };
  
  return gameTypeMap[gameType] || gameType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Gets a detailed explanation of how to earn a badge
 */
export function getBadgeHowToEarn(criteria: BadgeCriteria): string {
  switch (criteria.type) {
    case 'word_count':
      return `Keep learning new words! Each word you master counts toward this badge.`;
    
    case 'game_mode':
      const gameTypeName = formatGameTypeName(criteria.gameType || '');
      return `Play ${gameTypeName} games and answer questions correctly. Each completed game counts toward this badge.`;
    
    case 'streak':
      return `Log in and play every day to build your streak. Missing a day resets your streak to zero.`;
    
    case 'accuracy':
      return `Focus on getting answers right! Your accuracy is calculated from your correct vs incorrect answers.`;
    
    case 'letter_completion':
      return `Learn all words that start with the letter "${criteria.letter?.toUpperCase() || ''}". Complete all words in that letter's category.`;
    
    case 'custom':
      return `This is a special badge with unique requirements. Check the description for details.`;
    
    default:
      return `Complete the requirements to earn this badge!`;
  }
}

