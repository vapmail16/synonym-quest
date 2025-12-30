/**
 * Badge Seed Data
 * Initial badges for the Synonym Quest application
 */

import { BadgeCategory, BadgeRarity, BadgeCriteria } from '../types';
import { BadgeModel } from '../models';
import { sequelize } from '../models';

interface SeedBadge {
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  criteria: BadgeCriteria;
  rarity: BadgeRarity;
}

const badges: SeedBadge[] = [
  // Learning Badges
  {
    name: 'First Steps',
    description: 'Learn your first word',
    category: 'learning',
    icon: '🌱',
    criteria: { type: 'word_count', value: 1 },
    rarity: 'common',
  },
  {
    name: 'Word Explorer',
    description: 'Learn 10 words',
    category: 'learning',
    icon: '📚',
    criteria: { type: 'word_count', value: 10 },
    rarity: 'common',
  },
  {
    name: 'Vocabulary Builder',
    description: 'Learn 25 words',
    category: 'learning',
    icon: '📖',
    criteria: { type: 'word_count', value: 25 },
    rarity: 'rare',
  },
  {
    name: 'Word Master',
    description: 'Learn 50 words',
    category: 'learning',
    icon: '🎓',
    criteria: { type: 'word_count', value: 50 },
    rarity: 'rare',
  },
  {
    name: 'Lexicon Legend',
    description: 'Learn 100 words',
    category: 'learning',
    icon: '👑',
    criteria: { type: 'word_count', value: 100 },
    rarity: 'rare',
  },
  {
    name: 'Word Wizard',
    description: 'Learn 250 words',
    category: 'learning',
    icon: '🧙',
    criteria: { type: 'word_count', value: 250 },
    rarity: 'epic',
  },
  {
    name: 'Vocabulary Virtuoso',
    description: 'Learn 500 words',
    category: 'learning',
    icon: '🌟',
    criteria: { type: 'word_count', value: 500 },
    rarity: 'legendary',
  },

  // Game Mode Badges
  {
    name: 'Synonym Starter',
    description: 'Complete 5 synonym match games',
    category: 'game',
    icon: '🎯',
    criteria: { type: 'game_mode', value: 5, gameType: 'synonym-match' },
    rarity: 'common',
  },
  {
    name: 'Synonym Champion',
    description: 'Complete 25 synonym match games',
    category: 'game',
    icon: '🏆',
    criteria: { type: 'game_mode', value: 25, gameType: 'synonym-match' },
    rarity: 'rare',
  },
  {
    name: 'Synonym Master',
    description: 'Complete 50 synonym match games',
    category: 'game',
    icon: '⭐',
    criteria: { type: 'game_mode', value: 50, gameType: 'synonym-match' },
    rarity: 'rare',
  },
  {
    name: 'Letter Learner',
    description: 'Complete 10 letter-wise learning games',
    category: 'game',
    icon: '🔤',
    criteria: { type: 'game_mode', value: 10, gameType: 'letter-wise' },
    rarity: 'common',
  },
  {
    name: 'Alphabet Ace',
    description: 'Complete 50 letter-wise learning games',
    category: 'game',
    icon: '📝',
    criteria: { type: 'game_mode', value: 50, gameType: 'letter-wise' },
    rarity: 'rare',
  },
  {
    name: 'Quiz Quest',
    description: 'Complete 10 quiz games',
    category: 'game',
    icon: '❓',
    criteria: { type: 'game_mode', value: 10, gameType: 'quiz' },
    rarity: 'common',
  },
  {
    name: 'Quiz Master',
    description: 'Complete 50 quiz games',
    category: 'game',
    icon: '🎯',
    criteria: { type: 'game_mode', value: 50, gameType: 'quiz' },
    rarity: 'rare',
  },

  // Performance Badges
  {
    name: 'Three Day Streak',
    description: 'Maintain a 3-day learning streak',
    category: 'performance',
    icon: '🔥',
    criteria: { type: 'streak', value: 3 },
    rarity: 'common',
  },
  {
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    category: 'performance',
    icon: '💪',
    criteria: { type: 'streak', value: 7 },
    rarity: 'rare',
  },
  {
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day learning streak',
    category: 'performance',
    icon: '⚔️',
    criteria: { type: 'streak', value: 14 },
    rarity: 'rare',
  },
  {
    name: 'Monthly Master',
    description: 'Maintain a 30-day learning streak',
    category: 'performance',
    icon: '🏅',
    criteria: { type: 'streak', value: 30 },
    rarity: 'epic',
  },
  {
    name: 'Perfect Score',
    description: 'Get 100% accuracy in a game',
    category: 'performance',
    icon: '💯',
    criteria: { type: 'accuracy', value: 100, minAccuracy: 100 },
    rarity: 'rare',
  },
  {
    name: 'Speed Demon',
    description: 'Complete 10 games in one day',
    category: 'performance',
    icon: '⚡',
    criteria: { type: 'game_mode', value: 10 },
    rarity: 'rare',
  },

  // Special Badges
  {
    name: 'Early Bird',
    description: 'Complete your first game before 8 AM',
    category: 'special',
    icon: '🌅',
    criteria: { type: 'custom', value: 1 },
    rarity: 'rare',
  },
  {
    name: 'Night Owl',
    description: 'Complete a game after 10 PM',
    category: 'special',
    icon: '🦉',
    criteria: { type: 'custom', value: 1 },
    rarity: 'rare',
  },
  {
    name: 'Weekend Warrior',
    description: 'Play games on both Saturday and Sunday',
    category: 'special',
    icon: '🎮',
    criteria: { type: 'custom', value: 2 },
    rarity: 'rare',
  },
  {
    name: 'Dedicated Learner',
    description: 'Play every day for a week',
    category: 'special',
    icon: '📅',
    criteria: { type: 'streak', value: 7 },
    rarity: 'epic',
  },
];

export async function seedBadges(): Promise<void> {
  try {
    console.log('🌱 Seeding badges...');

    // Check if badges already exist
    const existingBadges = await BadgeModel.count();
    if (existingBadges > 0) {
      console.log(`⚠️  ${existingBadges} badges already exist. Skipping seed.`);
      console.log('   To re-seed, delete existing badges first.');
      return;
    }

    // Create badges
    const createdBadges = await BadgeModel.bulkCreate(badges as any);

    console.log(`✅ Successfully created ${createdBadges.length} badges!`);
    console.log('\n📊 Badge Summary:');
    
    const byCategory = badges.reduce((acc, badge) => {
      acc[badge.category] = (acc[badge.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byRarity = badges.reduce((acc, badge) => {
      acc[badge.rarity] = (acc[badge.rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('   By Category:');
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`     ${category}: ${count}`);
    });

    console.log('   By Rarity:');
    Object.entries(byRarity).forEach(([rarity, count]) => {
      console.log(`     ${rarity}: ${count}`);
    });
  } catch (error: any) {
    console.error('❌ Error seeding badges:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established.');
      
      await seedBadges();
      
      await sequelize.close();
      console.log('✅ Seed completed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    }
  })();
}

