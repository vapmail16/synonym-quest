/**
 * UserBadge Model Tests (TDD)
 * Write tests first, then verify implementation
 */

import { DataTypes } from 'sequelize';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/test-db';

describe('UserBadge Model', () => {
  let sequelize: any;
  let UserModel: any;
  let BadgeModel: any;

  beforeAll(async () => {
    // Setup in-memory PostgreSQL database
    sequelize = await setupTestDatabase();
    
    // For pg-mem compatibility, define models with STRING instead of ENUM
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

    const TestBadgeModel = sequelize.define('Badge', {
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

    const TestUserBadgeModel = sequelize.define('UserBadge', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      badgeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Badges',
          key: 'id',
        },
        onDelete: 'CASCADE',
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

    // Define associations
    UserModel.hasMany(TestUserBadgeModel, { foreignKey: 'userId', as: 'badges' });
    TestUserBadgeModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
    
    TestBadgeModel.hasMany(TestUserBadgeModel, { foreignKey: 'badgeId', as: 'userBadges' });
    TestUserBadgeModel.belongsTo(TestBadgeModel, { foreignKey: 'badgeId', as: 'badge' });

    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await sequelize.models.UserBadge.destroy({ where: {}, force: true });
    await sequelize.models.Badge.destroy({ where: {}, force: true });
    await sequelize.models.User.destroy({ where: {}, force: true });
  });

  describe('Model Creation', () => {
    it('should create a user badge with all required fields', async () => {
      // Create test user and badge first
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Test User',
      });

      const badge = await sequelize.models.Badge.create({
        name: 'Test Badge',
        description: 'Test badge description',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      const userBadgeData = {
        userId: user.id,
        badgeId: badge.id,
        progress: 100,
        metadata: { earnedInGame: 'synonym-match' },
      };

      const userBadge = await sequelize.models.UserBadge.create(userBadgeData);

      expect(userBadge.id).toBeDefined();
      expect(userBadge.userId).toBe(user.id);
      expect(userBadge.badgeId).toBe(badge.id);
      expect(userBadge.progress).toBe(100);
      expect(userBadge.metadata).toEqual({ earnedInGame: 'synonym-match' });
      expect(userBadge.earnedAt).toBeDefined();
      expect(userBadge.createdAt).toBeDefined();
    });

    it('should default progress to 0 if not provided', async () => {
      const user = await UserModel.create({
        email: 'test2@example.com',
        password: 'hashedpassword',
        fullName: 'Test User 2',
      });

      const badge = await sequelize.models.Badge.create({
        name: 'Test Badge 2',
        description: 'Test badge',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      const userBadge = await sequelize.models.UserBadge.create({
        userId: user.id,
        badgeId: badge.id,
      });

      expect(userBadge.progress).toBe(0);
    });

    it('should default metadata to empty object if not provided', async () => {
      const user = await UserModel.create({
        email: 'test3@example.com',
        password: 'hashedpassword',
        fullName: 'Test User 3',
      });

      const badge = await sequelize.models.Badge.create({
        name: 'Test Badge 3',
        description: 'Test badge',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      const userBadge = await sequelize.models.UserBadge.create({
        userId: user.id,
        badgeId: badge.id,
      });

      expect(userBadge.metadata).toEqual({});
    });

    it('should require userId', async () => {
      const badge = await sequelize.models.Badge.create({
        name: 'Test Badge',
        description: 'Test',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      await expect(
        sequelize.models.UserBadge.create({
          badgeId: badge.id,
          // Missing userId
        })
      ).rejects.toThrow();
    });

    it('should require badgeId', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Test User',
      });

      await expect(
        sequelize.models.UserBadge.create({
          userId: user.id,
          // Missing badgeId
        })
      ).rejects.toThrow();
    });

    it('should validate progress is between 0 and 100', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Test User',
      });

      const badge = await sequelize.models.Badge.create({
        name: 'Test Badge',
        description: 'Test',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      // Test negative progress
      await expect(
        sequelize.models.UserBadge.create({
          userId: user.id,
          badgeId: badge.id,
          progress: -1,
        })
      ).rejects.toThrow();

      // Test progress > 100
      await expect(
        sequelize.models.UserBadge.create({
          userId: user.id,
          badgeId: badge.id,
          progress: 101,
        })
      ).rejects.toThrow();

      // Valid progress should work
      const validBadge = await sequelize.models.UserBadge.create({
        userId: user.id,
        badgeId: badge.id,
        progress: 50,
      });
      expect(validBadge.progress).toBe(50);
    });

    it('should not allow duplicate user-badge combinations', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Test User',
      });

      const badge = await sequelize.models.Badge.create({
        name: 'Test Badge',
        description: 'Test',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      await sequelize.models.UserBadge.create({
        userId: user.id,
        badgeId: badge.id,
      });

      // Try to create duplicate
      await expect(
        sequelize.models.UserBadge.create({
          userId: user.id,
          badgeId: badge.id,
        })
      ).rejects.toThrow();
    });
  });

  describe('Associations', () => {
    it('should associate with User', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Test User',
      });

      const badge = await sequelize.models.Badge.create({
        name: 'Test Badge',
        description: 'Test',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      const userBadge = await sequelize.models.UserBadge.create({
        userId: user.id,
        badgeId: badge.id,
      });

      const userWithBadges = await UserModel.findByPk(user.id, {
        include: [{ model: sequelize.models.UserBadge, as: 'badges' }],
      });

      expect(userWithBadges.badges).toBeDefined();
      expect(userWithBadges.badges.length).toBe(1);
      expect(userWithBadges.badges[0].id).toBe(userBadge.id);
    });

    it('should associate with Badge', async () => {
      const user = await UserModel.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Test User',
      });

      const badge = await sequelize.models.Badge.create({
        name: 'Test Badge',
        description: 'Test',
        category: 'learning',
        icon: '🎯',
        criteria: { type: 'word_count', value: 1 },
        rarity: 'common',
      });

      const userBadge = await sequelize.models.UserBadge.create({
        userId: user.id,
        badgeId: badge.id,
      });

      const badgeWithUsers = await sequelize.models.Badge.findByPk(badge.id, {
        include: [{ model: sequelize.models.UserBadge, as: 'userBadges' }],
      });

      expect(badgeWithUsers.userBadges).toBeDefined();
      expect(badgeWithUsers.userBadges.length).toBe(1);
      expect(badgeWithUsers.userBadges[0].id).toBe(userBadge.id);
    });
  });

  describe('Query Operations', () => {
    let testUser: any;
    let testBadges: any[];

    beforeEach(async () => {
      testUser = await UserModel.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Test User',
      });

      testBadges = await sequelize.models.Badge.bulkCreate([
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
        {
          name: 'Badge 3',
          description: 'Third badge',
          category: 'performance',
          icon: '🔥',
          criteria: { type: 'streak', value: 30 },
          rarity: 'epic',
        },
      ]);
    });

    it('should find user badges by userId', async () => {
      await sequelize.models.UserBadge.create({
        userId: testUser.id,
        badgeId: testBadges[0].id,
        progress: 100,
      });

      await sequelize.models.UserBadge.create({
        userId: testUser.id,
        badgeId: testBadges[1].id,
        progress: 50,
      });

      const userBadges = await sequelize.models.UserBadge.findAll({
        where: { userId: testUser.id },
      });

      expect(userBadges.length).toBe(2);
    });

    it('should find user badges by badgeId', async () => {
      const user2 = await UserModel.create({
        email: 'test2@example.com',
        password: 'hashedpassword',
        fullName: 'Test User 2',
      });

      await sequelize.models.UserBadge.create({
        userId: testUser.id,
        badgeId: testBadges[0].id,
      });

      await sequelize.models.UserBadge.create({
        userId: user2.id,
        badgeId: testBadges[0].id,
      });

      const badgeUsers = await sequelize.models.UserBadge.findAll({
        where: { badgeId: testBadges[0].id },
      });

      expect(badgeUsers.length).toBe(2);
    });

    it('should update user badge progress', async () => {
      const userBadge = await sequelize.models.UserBadge.create({
        userId: testUser.id,
        badgeId: testBadges[0].id,
        progress: 50,
      });

      await userBadge.update({ progress: 75 });

      const updated = await sequelize.models.UserBadge.findByPk(userBadge.id);
      expect(updated.progress).toBe(75);
    });

    it('should update user badge metadata', async () => {
      const userBadge = await sequelize.models.UserBadge.create({
        userId: testUser.id,
        badgeId: testBadges[0].id,
        metadata: { initial: 'data' },
      });

      await userBadge.update({ metadata: { updated: 'data', game: 'synonym-match' } });

      const updated = await sequelize.models.UserBadge.findByPk(userBadge.id);
      expect(updated.metadata).toEqual({ updated: 'data', game: 'synonym-match' });
    });

    it('should delete user badge', async () => {
      const userBadge = await sequelize.models.UserBadge.create({
        userId: testUser.id,
        badgeId: testBadges[0].id,
      });

      const userBadgeId = userBadge.id;
      await userBadge.destroy();

      const deleted = await sequelize.models.UserBadge.findByPk(userBadgeId);
      expect(deleted).toBeNull();
    });
  });
});

