/**
 * BadgeService Tests (TDD)
 * Write tests first, then implement the service
 */

import { BadgeService } from '../../../src/services/BadgeService';
import { BadgeEvent, BadgeCriteria, BadgeCategory, BadgeRarity } from '../../../src/types';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/test-db';
import { DataTypes } from 'sequelize';

describe('BadgeService', () => {
  let sequelize: any;
  let badgeService: BadgeService;
  let UserModel: any;
  let BadgeModel: any;
  let UserBadgeModel: any;
  let UserProgressModel: any;

  beforeAll(async () => {
    sequelize = await setupTestDatabase();

    // Define test models
    UserModel = sequelize.define('User', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      fullName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    BadgeModel = sequelize.define('Badge', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      criteria: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      rarity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'common',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    UserBadgeModel = sequelize.define('UserBadge', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      badgeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      earnedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      progress: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }, {
      indexes: [
        {
          unique: true,
          fields: ['userId', 'badgeId'],
          name: 'unique_user_badge',
        },
      ],
    });

    UserProgressModel = sequelize.define('UserProgress', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      wordId: {
        type: DataTypes.STRING(255), // Use string instead of UUID for test simplicity
        allowNull: false,
      },
      gameType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      masteryLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      correctCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      incorrectCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      lastPlayedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    // Define associations
    UserModel.hasMany(UserBadgeModel, { foreignKey: 'userId', as: 'badges' });
    UserBadgeModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
    
    BadgeModel.hasMany(UserBadgeModel, { foreignKey: 'badgeId', as: 'userBadges' });
    UserBadgeModel.belongsTo(BadgeModel, { foreignKey: 'badgeId', as: 'badge' });

    UserModel.hasMany(UserProgressModel, { foreignKey: 'userId', as: 'progress' });
    UserProgressModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

    await sequelize.sync({ force: true });

    // Initialize BadgeService with test models
    // Cast to any to work with test models
    badgeService = new BadgeService(
      BadgeModel as any,
      UserBadgeModel as any,
      UserProgressModel as any
    );
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await UserBadgeModel.destroy({ where: {}, force: true });
    await UserProgressModel.destroy({ where: {}, force: true });
    await BadgeModel.destroy({ where: {}, force: true });
    await UserModel.destroy({ where: {}, force: true });
  });

  describe('checkAndAwardBadges', () => {
    it('should award badge when word_count criteria is met', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge = await BadgeModel.create({
        name: 'First Word Learned',
        description: 'Learn your first word',
        category: 'learning' as BadgeCategory,
        icon: '🎯',
        criteria: {
          type: 'word_count',
          value: 1,
        } as BadgeCriteria,
        rarity: 'common' as BadgeRarity,
      });

      // Create user progress for 1 word
      await UserProgressModel.create({
        userId: user.id,
        wordId: 'word-1',
        gameType: 'synonym-match',
        masteryLevel: 1,
        correctCount: 1,
      });

      const event: BadgeEvent = {
        type: 'WORD_LEARNED',
        userId: user.id,
        data: {
          wordId: 'word-1',
          wordCount: 1,
        },
      };

      const awardedBadges = await badgeService.checkAndAwardBadges(event);

      expect(awardedBadges.length).toBe(1);
      expect(awardedBadges[0].id).toBe(badge.id);

      // Verify badge was saved
      const userBadge = await UserBadgeModel.findOne({
        where: { userId: user.id, badgeId: badge.id },
      });
      expect(userBadge).toBeDefined();
      expect(userBadge.progress).toBe(100);
    });

    it('should not award badge if criteria not met', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge = await BadgeModel.create({
        name: 'Ten Words Learned',
        description: 'Learn 10 words',
        category: 'learning' as BadgeCategory,
        icon: '📚',
        criteria: {
          type: 'word_count',
          value: 10,
        } as BadgeCriteria,
        rarity: 'common' as BadgeRarity,
      });

      // User only has 1 word learned
      await UserProgressModel.create({
        userId: user.id,
        wordId: 'word-1',
        gameType: 'synonym-match',
        masteryLevel: 1,
        correctCount: 1,
      });

      const event: BadgeEvent = {
        type: 'WORD_LEARNED',
        userId: user.id,
        data: {
          wordId: 'word-1',
          wordCount: 1,
        },
      };

      const awardedBadges = await badgeService.checkAndAwardBadges(event);

      expect(awardedBadges.length).toBe(0);

      // Verify badge was not saved
      const userBadge = await UserBadgeModel.findOne({
        where: { userId: user.id, badgeId: badge.id },
      });
      expect(userBadge).toBeNull();
    });

    it('should not award duplicate badges', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge = await BadgeModel.create({
        name: 'First Word Learned',
        description: 'Learn your first word',
        category: 'learning' as BadgeCategory,
        icon: '🎯',
        criteria: {
          type: 'word_count',
          value: 1,
        } as BadgeCriteria,
        rarity: 'common' as BadgeRarity,
      });

      // Award badge first time
      await UserBadgeModel.create({
        userId: user.id,
        badgeId: badge.id,
        progress: 100,
      });

      await UserProgressModel.create({
        userId: user.id,
        wordId: 'word-1',
        gameType: 'synonym-match',
        masteryLevel: 1,
        correctCount: 1,
      });

      const event: BadgeEvent = {
        type: 'WORD_LEARNED',
        userId: user.id,
        data: {
          wordId: 'word-1',
          wordCount: 1,
        },
      };

      const awardedBadges = await badgeService.checkAndAwardBadges(event);

      expect(awardedBadges.length).toBe(0); // Should not award again

      // Verify only one badge exists
      const userBadges = await UserBadgeModel.findAll({
        where: { userId: user.id, badgeId: badge.id },
      });
      expect(userBadges.length).toBe(1);
    });

    it('should award streak badge when streak criteria is met', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge = await BadgeModel.create({
        name: 'Perfect Week',
        description: '7 day streak',
        category: 'performance' as BadgeCategory,
        icon: '🔥',
        criteria: {
          type: 'streak',
          value: 7,
        } as BadgeCriteria,
        rarity: 'rare' as BadgeRarity,
      });

      const event: BadgeEvent = {
        type: 'STREAK_UPDATED',
        userId: user.id,
        data: {
          streak: 7,
        },
      };

      const awardedBadges = await badgeService.checkAndAwardBadges(event);

      expect(awardedBadges.length).toBe(1);
      expect(awardedBadges[0].id).toBe(badge.id);
    });

    it('should award game mode badge when criteria is met', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge = await BadgeModel.create({
        name: 'Synonym Match Master',
        description: 'Complete 10 synonym match games',
        category: 'game' as BadgeCategory,
        icon: '🎮',
        criteria: {
          type: 'game_mode',
          value: 10,
          gameType: 'synonym-match',
        } as BadgeCriteria,
        rarity: 'rare' as BadgeRarity,
      });

      // Create 10 game progress entries for synonym-match
      for (let i = 0; i < 10; i++) {
        await UserProgressModel.create({
          userId: user.id,
          wordId: `word-${i}`,
          gameType: 'synonym-match',
          masteryLevel: 1,
          correctCount: 1,
        });
      }

      const event: BadgeEvent = {
        type: 'GAME_COMPLETED',
        userId: user.id,
        data: {
          gameType: 'synonym-match',
        },
      };

      const awardedBadges = await badgeService.checkAndAwardBadges(event);

      expect(awardedBadges.length).toBe(1);
      expect(awardedBadges[0].id).toBe(badge.id);
    });
  });

  describe('getUserBadges', () => {
    it('should return all badges earned by user', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge1 = await BadgeModel.create({
        name: 'Badge 1',
        description: 'First badge',
        category: 'learning' as BadgeCategory,
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 } as BadgeCriteria,
        rarity: 'common' as BadgeRarity,
      });

      const badge2 = await BadgeModel.create({
        name: 'Badge 2',
        description: 'Second badge',
        category: 'game' as BadgeCategory,
        icon: '🎮',
        criteria: { type: 'game_mode', value: 5 } as BadgeCriteria,
        rarity: 'rare' as BadgeRarity,
      });

      await UserBadgeModel.create({
        userId: user.id,
        badgeId: badge1.id,
        progress: 100,
      });

      await UserBadgeModel.create({
        userId: user.id,
        badgeId: badge2.id,
        progress: 100,
      });

      const userBadges = await badgeService.getUserBadges(user.id);

      expect(userBadges.length).toBe(2);
      expect(userBadges.map(b => b.badgeId)).toContain(badge1.id);
      expect(userBadges.map(b => b.badgeId)).toContain(badge2.id);
    });

    it('should return empty array if user has no badges', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const userBadges = await badgeService.getUserBadges(user.id);

      expect(userBadges.length).toBe(0);
    });
  });

  describe('getBadgeProgress', () => {
    it('should return progress for word_count badge', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge = await BadgeModel.create({
        name: 'Ten Words Learned',
        description: 'Learn 10 words',
        category: 'learning' as BadgeCategory,
        icon: '📚',
        criteria: {
          type: 'word_count',
          value: 10,
        } as BadgeCriteria,
        rarity: 'common' as BadgeRarity,
      });

      // User has learned 5 words (50% progress)
      for (let i = 0; i < 5; i++) {
        await UserProgressModel.create({
          userId: user.id,
          wordId: `word-${i}`,
          gameType: 'synonym-match',
          masteryLevel: 1,
          correctCount: 1,
        });
      }

      const progress = await badgeService.getBadgeProgress(user.id, badge.id);

      expect(progress).toBe(50); // 5/10 = 50%
    });

    it('should return 100 if badge is already earned', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge = await BadgeModel.create({
        name: 'First Word Learned',
        description: 'Learn your first word',
        category: 'learning' as BadgeCategory,
        icon: '🎯',
        criteria: {
          type: 'word_count',
          value: 1,
        } as BadgeCriteria,
        rarity: 'common' as BadgeRarity,
      });

      await UserBadgeModel.create({
        userId: user.id,
        badgeId: badge.id,
        progress: 100,
      });

      const progress = await badgeService.getBadgeProgress(user.id, badge.id);

      expect(progress).toBe(100);
    });
  });

  describe('awardBadge', () => {
    it('should create UserBadge record when awarding badge', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      const badge = await BadgeModel.create({
        name: 'Test Badge',
        description: 'Test',
        category: 'learning' as BadgeCategory,
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 } as BadgeCriteria,
        rarity: 'common' as BadgeRarity,
      });

      const userBadge = await badgeService.awardBadge(user.id, badge.id, {
        earnedInGame: 'synonym-match',
      });

      expect(userBadge).toBeDefined();
      expect(userBadge.userId).toBe(user.id);
      expect(userBadge.badgeId).toBe(badge.id);
      expect(userBadge.progress).toBe(100);
      expect(userBadge.metadata).toEqual({ earnedInGame: 'synonym-match' });

      // Verify it was saved
      const saved = await UserBadgeModel.findByPk(userBadge.id);
      expect(saved).toBeDefined();
    });

    it('should throw error if badge does not exist', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      await expect(
        badgeService.awardBadge(user.id, 'non-existent-badge-id')
      ).rejects.toThrow();
    });
  });
});

