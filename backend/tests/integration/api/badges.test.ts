/**
 * BadgeController Integration Tests (TDD)
 * Write tests first, then implement the controller
 */

import request from 'supertest';
import express, { Express } from 'express';
import { BadgeController } from '../../../src/controllers/BadgeController';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/test-db';
import { initBadgeModel, BadgeModel } from '../../../src/models/Badge';
import { initUserBadgeModel, UserBadgeModel } from '../../../src/models/UserBadge';
import { initUserProgressModel, UserProgressModel } from '../../../src/models/UserProgress';
import { initUserModel } from '../../../src/models/User';

// Mock the authenticate middleware
jest.mock('../../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (req.headers.authorization) {
      // Get testUser from closure - we'll set it up in beforeAll
      const testUserId = (global as any).__testUserId;
      if (testUserId) {
        (req as any).user = { id: testUserId };
        next();
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      }
    } else {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  },
}));

describe('BadgeController API Endpoints', () => {
  let app: Express;
  let sequelize: any;
  let UserModel: any;
  let BadgeModelInstance: typeof BadgeModel;
  let UserBadgeModelInstance: typeof UserBadgeModel;
  let UserProgressModelInstance: typeof UserProgressModel;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    sequelize = await setupTestDatabase();

    // For pg-mem compatibility, we need to use STRING instead of ENUM
    // So we'll define test models directly instead of using init functions
    const { DataTypes } = await import('sequelize');
    
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

    BadgeModelInstance = sequelize.define('Badge', {
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
    }) as typeof BadgeModel;

    UserBadgeModelInstance = sequelize.define('UserBadge', {
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
    }) as typeof UserBadgeModel;

    UserProgressModelInstance = sequelize.define('UserProgress', {
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }) as typeof UserProgressModel;

    // Define associations
    UserModel.hasMany(UserBadgeModelInstance, { foreignKey: 'userId', as: 'badges' });
    UserBadgeModelInstance.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
    
    BadgeModelInstance.hasMany(UserBadgeModelInstance, { foreignKey: 'badgeId', as: 'userBadges' });
    UserBadgeModelInstance.belongsTo(BadgeModelInstance, { foreignKey: 'badgeId', as: 'badge' });

    UserModel.hasMany(UserProgressModelInstance, { foreignKey: 'userId', as: 'progress' });
    UserProgressModelInstance.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

    await sequelize.sync({ force: true });

    // Create test user
    testUser = await UserModel.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      fullName: 'Test User',
      username: 'testuser',
      isActive: true,
    });

    // Set global test user ID for mocked authenticate middleware
    (global as any).__testUserId = testUser.id;

    // Mock auth token
    authToken = 'mock-auth-token';

    // Setup Express app with BadgeController
    app = express();
    app.use(express.json());

    // Create BadgeController with test models
    const badgeController = new BadgeController(
      BadgeModelInstance as any,
      UserBadgeModelInstance as any,
      UserProgressModelInstance as any
    );
    const router = badgeController.getRouter();

    app.use('/api/badges', router);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await UserBadgeModelInstance.destroy({ where: {}, force: true });
    await BadgeModelInstance.destroy({ where: {}, force: true });
  });

  describe('GET /api/badges', () => {
    it('should return all available badges', async () => {
      // Create test badges
      await BadgeModelInstance.bulkCreate([
        {
          name: 'Badge 1',
          description: 'First badge',
          category: 'learning',
          icon: '🎯',
          criteria: { type: 'word_count', value: 1 },
          rarity: 'common',
        },
        {
          name: 'Badge 2',
          description: 'Second badge',
          category: 'game',
          icon: '🎮',
          criteria: { type: 'game_mode', value: 5 },
          rarity: 'rare',
        },
      ]);

      const response = await request(app)
        .get('/api/badges')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should return empty array if no badges exist', async () => {
      const response = await request(app)
        .get('/api/badges')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should filter badges by category', async () => {
      await BadgeModelInstance.bulkCreate([
        {
          name: 'Learning Badge',
          description: 'Learning',
          category: 'learning',
          icon: '📚',
          criteria: { type: 'word_count', value: 1 },
          rarity: 'common',
        },
        {
          name: 'Game Badge',
          description: 'Game',
          category: 'game',
          icon: '🎮',
          criteria: { type: 'game_mode', value: 5 },
          rarity: 'rare',
        },
      ]);

      const response = await request(app)
        .get('/api/badges?category=learning')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].category).toBe('learning');
    });
  });

  describe('GET /api/badges/user', () => {
    it('should return user\'s earned badges', async () => {
      const badge1 = await BadgeModelInstance.create({
        name: 'Badge 1',
        description: 'First badge',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      const badge2 = await BadgeModelInstance.create({
        name: 'Badge 2',
        description: 'Second badge',
        category: 'game',
        icon: '🎮',
        criteria: { type: 'game_mode', value: 5 },
        rarity: 'rare',
      });

      // User earned badge1
      await UserBadgeModelInstance.create({
        userId: testUser.id,
        badgeId: badge1.id,
        progress: 100,
      });

      const response = await request(app)
        .get('/api/badges/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].badgeId).toBe(badge1.id);
    });

    it('should return empty array if user has no badges', async () => {
      const response = await request(app)
        .get('/api/badges/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/badges/user')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/badges/user/progress', () => {
    it('should return all badges with user progress', async () => {
      const badge1 = await BadgeModelInstance.create({
        name: 'Badge 1',
        description: 'First badge',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      const badge2 = await BadgeModelInstance.create({
        name: 'Badge 2',
        description: 'Second badge',
        category: 'game',
        icon: '🎮',
        criteria: { type: 'word_count', value: 10 },
        rarity: 'rare',
      });

      // User earned badge1
      await UserBadgeModelInstance.create({
        userId: testUser.id,
        badgeId: badge1.id,
        progress: 100,
      });

      const response = await request(app)
        .get('/api/badges/user/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      const badge1Progress = response.body.data.find((b: any) => b.badgeId === badge1.id);
      expect(badge1Progress.progress).toBe(100);
      expect(badge1Progress.isEarned).toBe(true);

      const badge2Progress = response.body.data.find((b: any) => b.badgeId === badge2.id);
      expect(badge2Progress.progress).toBeDefined();
      expect(badge2Progress.isEarned).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/badges/user/progress')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/badges/:id', () => {
    it('should return specific badge by ID', async () => {
      const badge = await BadgeModelInstance.create({
        name: 'Test Badge',
        description: 'Test badge description',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      const response = await request(app)
        .get(`/api/badges/${badge.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(badge.id);
      expect(response.body.data.name).toBe('Test Badge');
    });

    it('should return 404 if badge not found', async () => {
      const response = await request(app)
        .get('/api/badges/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/badges/check', () => {
    it('should check and award badges based on event', async () => {
      const badge = await BadgeModelInstance.create({
        name: 'First Word Learned',
        description: 'Learn your first word',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      // Create user progress for 1 word
      await UserProgressModelInstance.create({
        userId: testUser.id,
        wordId: 'word-1',
        gameType: 'synonym-match',
        masteryLevel: 1,
        correctCount: 1,
      });

      const event = {
        type: 'WORD_LEARNED',
        data: {
          wordId: 'word-1',
          wordCount: 1,
        },
      };

      const response = await request(app)
        .post('/api/badges/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should award Perfect Score badge when accuracy is 100', async () => {
      // Create Perfect Score badge
      const perfectBadge = await BadgeModelInstance.create({
        name: 'Perfect Score',
        description: 'Get 100% accuracy in a game',
        category: 'performance',
        icon: '💯',
        criteria: { type: 'accuracy', value: 100, minAccuracy: 100 },
        rarity: 'rare',
      });

      const event = {
        type: 'PERFECT_SCORE',
        data: {
          accuracy: 100,
          gameType: 'synonym-match',
        },
      };

      const response = await request(app)
        .post('/api/badges/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(perfectBadge.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/badges/check')
        .send({ type: 'WORD_LEARNED', data: {} })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
