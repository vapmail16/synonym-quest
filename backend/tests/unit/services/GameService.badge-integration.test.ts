/**
 * GameService Badge Integration Tests (TDD)
 * Test badge checking integration into game flows
 */

import { GameService } from '../../../src/services/GameService';
import { BadgeService } from '../../../src/services/BadgeService';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/test-db';
import { DataTypes } from 'sequelize';

// Mock BadgeService
jest.mock('../../../src/services/BadgeService');

// Mock UserProgress to use test database
jest.mock('../../../src/models', () => {
  const actualModels = jest.requireActual('../../../src/models');
  return {
    ...actualModels,
    UserProgress: {
      updateProgress: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
    },
  };
});

describe('GameService Badge Integration', () => {
  let sequelize: any;
  let gameService: GameService;
  let UserModel: any;
  let WordModel: any;
  let UserProgressModel: any;
  let mockBadgeService: jest.Mocked<BadgeService>;
  let testUser: any;
  let testWord: any;
  let mockUpdateProgress: jest.Mock;
  let mockCount: jest.Mock;

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

    WordModel = sequelize.define('Word', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      word: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      synonyms: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      difficulty: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'medium',
      },
      meaning: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      correctCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      incorrectCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
        type: DataTypes.STRING(255),
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
      streak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      totalTimeSpent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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

    await sequelize.sync({ force: true });

    // Create test data
    testUser = await UserModel.create({
      email: 'test@example.com',
      password: 'hashed',
      fullName: 'Test User',
      username: 'testuser',
      isActive: true,
    });

    testWord = await WordModel.create({
      word: 'test',
      synonyms: [{ word: 'exam', type: 'exact' }],
      difficulty: 'medium',
    });

    // Setup mocks
    mockUpdateProgress = jest.fn().mockImplementation(async (userId, wordId, gameType, isCorrect, timeSpent) => {
      let progress = await UserProgressModel.findOne({
        where: { userId, wordId, gameType }
      });

      if (!progress) {
        progress = await UserProgressModel.create({
          userId,
          wordId,
          gameType,
          correctCount: 0,
          incorrectCount: 0,
          lastPlayedAt: new Date(),
          masteryLevel: 0,
          streak: 0,
          totalTimeSpent: 0,
        });
      }

      if (isCorrect) {
        progress.correctCount += 1;
        progress.streak += 1;
        if (progress.correctCount >= 1) {
          progress.masteryLevel = 2;
        }
      } else {
        progress.incorrectCount += 1;
        progress.streak = 0;
      }

      progress.lastPlayedAt = new Date();
      progress.totalTimeSpent += timeSpent;
      await progress.save();
      return progress;
    });

    mockCount = jest.fn().mockImplementation(async (options: any) => {
      return UserProgressModel.count(options);
    });

    // Set up mocked UserProgress
    const { UserProgress } = require('../../../src/models');
    UserProgress.updateProgress = mockUpdateProgress;
    UserProgress.count = mockCount;

    // Create mock BadgeService
    mockBadgeService = {
      checkAndAwardBadges: jest.fn().mockResolvedValue([]),
      getUserBadges: jest.fn().mockResolvedValue([]),
      getBadgeProgress: jest.fn().mockResolvedValue(0),
      awardBadge: jest.fn(),
      getAllBadgesWithProgress: jest.fn().mockResolvedValue([]),
    } as any;

    // Create GameService with mocked BadgeService
    gameService = new GameService(mockBadgeService as any);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await UserProgressModel.destroy({ where: {}, force: true });
    jest.clearAllMocks();
  });

  describe('updateUserGameProgress - Badge Integration', () => {
    it('should check for WORD_LEARNED badge when user learns first word', async () => {
      // Setup: user has no progress yet
      mockCount.mockResolvedValueOnce(1); // First word learned

      await gameService.updateUserGameProgress(
        testUser.id,
        testWord.id,
        'synonym-match',
        true,
        5000
      );

      // Verify badge checking was called
      expect(mockBadgeService.checkAndAwardBadges).toHaveBeenCalledTimes(2); // WORD_LEARNED and GAME_COMPLETED
      
      // Check WORD_LEARNED event
      const wordLearnedCall = mockBadgeService.checkAndAwardBadges.mock.calls.find(
        call => call[0].type === 'WORD_LEARNED'
      );
      expect(wordLearnedCall).toBeDefined();
      expect(wordLearnedCall![0].userId).toBe(testUser.id);
      expect(wordLearnedCall![0].data.wordId).toBe(testWord.id);
      expect(wordLearnedCall![0].data.wordCount).toBe(1);
    });

    it('should not break existing functionality when badge service fails', async () => {
      // Make badge service throw an error
      mockBadgeService.checkAndAwardBadges.mockRejectedValueOnce(new Error('Badge service error'));
      mockCount.mockResolvedValueOnce(1);

      // Should still update progress successfully
      await expect(
        gameService.updateUserGameProgress(
          testUser.id,
          testWord.id,
          'synonym-match',
          true,
          5000
        )
      ).resolves.not.toThrow();

      // Verify progress was still updated
      expect(mockUpdateProgress).toHaveBeenCalled();
    });

    it('should pass correct gameType to badge service', async () => {
      mockCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      await gameService.updateUserGameProgress(
        testUser.id,
        testWord.id,
        'letter-wise',
        true,
        5000
      );

      const wordLearnedCall = mockBadgeService.checkAndAwardBadges.mock.calls.find(
        call => call[0].type === 'WORD_LEARNED'
      );
      expect(wordLearnedCall![0].data.gameType).toBe('letter-wise');
    });

    it('should check badges for multiple word learning milestones', async () => {
      // First word
      mockCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      await gameService.updateUserGameProgress(
        testUser.id,
        testWord.id,
        'synonym-match',
        true,
        5000
      );

      // Second word
      const word2 = await WordModel.create({
        word: 'test2',
        synonyms: [{ word: 'exam2', type: 'exact' }],
        difficulty: 'medium',
      });

      mockCount.mockResolvedValueOnce(2).mockResolvedValueOnce(2);
      await gameService.updateUserGameProgress(
        testUser.id,
        word2.id,
        'synonym-match',
        true,
        5000
      );

      // Should have been called 4 times (2 words × 2 events each)
      expect(mockBadgeService.checkAndAwardBadges).toHaveBeenCalledTimes(4);
      
      // Second word should have wordCount = 2
      const secondWordCall = mockBadgeService.checkAndAwardBadges.mock.calls.find(
        call => call[0].type === 'WORD_LEARNED' && call[0].data.wordId === word2.id
      );
      expect(secondWordCall![0].data.wordCount).toBe(2);
    });

    it('should not check badges for incorrect answers', async () => {
      mockCount.mockResolvedValueOnce(0);

      await gameService.updateUserGameProgress(
        testUser.id,
        testWord.id,
        'synonym-match',
        false, // Incorrect answer
        5000
      );

      // Should not check badges for incorrect answers
      expect(mockBadgeService.checkAndAwardBadges).not.toHaveBeenCalled();
    });
  });
});
