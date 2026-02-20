/**
 * UserProgress Model Tests
 * Verifies totalWordsLearned returns distinct word count (not row count)
 * to align with badge logic and fix UI/badge mismatch
 */

import { DataTypes } from 'sequelize';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/test-db';
import { initUserProgressModel } from '../../../src/models/UserProgress';

describe('UserProgress Model - getUserStats', () => {
  let sequelize: any;
  let UserModel: any;
  let WordModel: any;
  let UserProgressModel: any;

  beforeAll(async () => {
    sequelize = await setupTestDatabase();

    UserModel = sequelize.define('User', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: { type: DataTypes.STRING(255), allowNull: false },
      password: { type: DataTypes.STRING(255), allowNull: false },
      fullName: { type: DataTypes.STRING(255), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    }, { tableName: 'users' });

    WordModel = sequelize.define('Word', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      word: { type: DataTypes.STRING(100), allowNull: false },
      synonyms: { type: DataTypes.JSONB, allowNull: false },
      difficulty: { type: DataTypes.STRING(20), allowNull: false },
      correctCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      incorrectCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    }, { tableName: 'words' });

    UserProgressModel = initUserProgressModel(sequelize);

    UserModel.hasMany(UserProgressModel, { foreignKey: 'userId' });
    UserProgressModel.belongsTo(UserModel, { foreignKey: 'userId' });
    WordModel.hasMany(UserProgressModel, { foreignKey: 'wordId' });
    UserProgressModel.belongsTo(WordModel, { foreignKey: 'wordId' });

    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await UserProgressModel.destroy({ where: {}, force: true });
    await WordModel.destroy({ where: {}, force: true });
    await UserModel.destroy({ where: {}, force: true });
  });

  it('should return distinct word count when same word appears in multiple game types', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'hashed',
      fullName: 'Test User',
    });

    const word1 = await WordModel.create({
      word: 'happy',
      synonyms: ['joyful'],
      difficulty: 'easy',
    });

    // Same word in 3 different game types = 3 rows
    await UserProgressModel.create({
      userId: user.id,
      wordId: word1.id,
      gameType: 'synonym-match',
      correctCount: 1,
      incorrectCount: 0,
      masteryLevel: 2,
      streak: 1,
      totalTimeSpent: 0,
    });
    await UserProgressModel.create({
      userId: user.id,
      wordId: word1.id,
      gameType: 'new-letter',
      correctCount: 1,
      incorrectCount: 0,
      masteryLevel: 2,
      streak: 1,
      totalTimeSpent: 0,
    });
    await UserProgressModel.create({
      userId: user.id,
      wordId: word1.id,
      gameType: 'spelling',
      correctCount: 1,
      incorrectCount: 0,
      masteryLevel: 2,
      streak: 1,
      totalTimeSpent: 0,
    });

    const stats = await UserProgressModel.getUserStats(user.id);

    // Should count 1 distinct word, NOT 3 rows
    expect(stats.totalWordsLearned).toBe(1);
  });

  it('should return correct distinct count for multiple words across game types', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'hashed',
      fullName: 'Test User',
    });

    const words = await Promise.all([
      WordModel.create({ word: 'happy', synonyms: ['joyful'], difficulty: 'easy' }),
      WordModel.create({ word: 'sad', synonyms: ['unhappy'], difficulty: 'easy' }),
      WordModel.create({ word: 'big', synonyms: ['large'], difficulty: 'easy' }),
    ]);

    // Word 1 in 2 game types, word 2 in 1, word 3 in 2 = 5 rows, 3 distinct words
    await UserProgressModel.create({
      userId: user.id,
      wordId: words[0].id,
      gameType: 'synonym-match',
      correctCount: 1,
      masteryLevel: 2,
      streak: 1,
      totalTimeSpent: 0,
    });
    await UserProgressModel.create({
      userId: user.id,
      wordId: words[0].id,
      gameType: 'spelling',
      correctCount: 1,
      masteryLevel: 2,
      streak: 1,
      totalTimeSpent: 0,
    });
    await UserProgressModel.create({
      userId: user.id,
      wordId: words[1].id,
      gameType: 'synonym-match',
      correctCount: 1,
      masteryLevel: 2,
      streak: 1,
      totalTimeSpent: 0,
    });
    await UserProgressModel.create({
      userId: user.id,
      wordId: words[2].id,
      gameType: 'new-letter',
      correctCount: 1,
      masteryLevel: 2,
      streak: 1,
      totalTimeSpent: 0,
    });
    await UserProgressModel.create({
      userId: user.id,
      wordId: words[2].id,
      gameType: 'old-letter',
      correctCount: 1,
      masteryLevel: 2,
      streak: 1,
      totalTimeSpent: 0,
    });

    const stats = await UserProgressModel.getUserStats(user.id);

    expect(stats.totalWordsLearned).toBe(3);
  });
});
