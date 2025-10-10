import { DataTypes, Model, Sequelize, Op } from 'sequelize';

export interface UserProgressAttributes {
  id: string;
  userId: string;
  wordId: string;
  gameType: string;
  correctCount: number;
  incorrectCount: number;
  lastPlayedAt: Date;
  masteryLevel: number; // 0-5 scale (0=never seen, 5=mastered)
  streak: number;
  totalTimeSpent: number; // in milliseconds
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProgressCreationAttributes extends Omit<UserProgressAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class UserProgressModel extends Model<UserProgressAttributes, UserProgressCreationAttributes> implements UserProgressAttributes {
  public id!: string;
  public userId!: string;
  public wordId!: string;
  public gameType!: string;
  public correctCount!: number;
  public incorrectCount!: number;
  public lastPlayedAt!: Date;
  public masteryLevel!: number;
  public streak!: number;
  public totalTimeSpent!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static async updateProgress(
    userId: string,
    wordId: string,
    gameType: string,
    isCorrect: boolean,
    timeSpent: number = 0
  ): Promise<UserProgressModel> {
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

    // Update counts
    if (isCorrect) {
      progress.correctCount += 1;
      progress.streak += 1;
    } else {
      progress.incorrectCount += 1;
      progress.streak = 0;
    }

    // Update mastery level based on performance
    const totalAttempts = progress.correctCount + progress.incorrectCount;
    const accuracy = totalAttempts > 0 ? progress.correctCount / totalAttempts : 0;
    
    // More lenient mastery level calculation for better learning experience
    if (progress.correctCount >= 2 && accuracy >= 0.8) {
      progress.masteryLevel = Math.min(5, Math.max(4, progress.masteryLevel + 1));
    } else if (progress.correctCount >= 2 && accuracy >= 0.6) {
      progress.masteryLevel = Math.min(3, Math.max(2, progress.masteryLevel + 1));
    } else if (progress.correctCount >= 1 && accuracy >= 0.5) {
      progress.masteryLevel = Math.min(2, Math.max(1, progress.masteryLevel + 1));
    } else if (accuracy < 0.3 && totalAttempts >= 2) {
      progress.masteryLevel = Math.max(0, progress.masteryLevel - 1);
    }

    progress.lastPlayedAt = new Date();
    progress.totalTimeSpent += timeSpent;

    await progress.save();
    return progress;
  }

  static async getUserStats(userId: string): Promise<{
    totalWordsLearned: number;
    totalGamesPlayed: number;
    currentStreak: number;
    longestStreak: number;
    averageAccuracy: number;
    favoriteGameType?: string;
    masteryDistribution: { [level: number]: number };
  }> {
    const allProgress = await UserProgressModel.findAll({
      where: { userId }
    });

    const totalWordsLearned = allProgress.filter(p => p.masteryLevel >= 2).length;
    const totalGamesPlayed = allProgress.reduce((sum, p) => sum + p.correctCount + p.incorrectCount, 0);
    
    const currentStreak = Math.max(...allProgress.map(p => p.streak), 0);
    const longestStreak = Math.max(...allProgress.map(p => p.streak), 0);
    
    const totalCorrect = allProgress.reduce((sum, p) => sum + p.correctCount, 0);
    const totalAttempts = allProgress.reduce((sum, p) => sum + p.correctCount + p.incorrectCount, 0);
    const averageAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    // Find favorite game type
    const gameTypeCounts: { [key: string]: number } = {};
    allProgress.forEach(p => {
      gameTypeCounts[p.gameType] = (gameTypeCounts[p.gameType] || 0) + 1;
    });
    const favoriteGameType = Object.keys(gameTypeCounts).reduce((a, b) => 
      gameTypeCounts[a] > gameTypeCounts[b] ? a : b, 'random-new'
    );

    // Mastery distribution
    const masteryDistribution: { [level: number]: number } = {};
    for (let i = 0; i <= 5; i++) {
      masteryDistribution[i] = allProgress.filter(p => p.masteryLevel === i).length;
    }

    return {
      totalWordsLearned,
      totalGamesPlayed,
      currentStreak,
      longestStreak,
      averageAccuracy,
      favoriteGameType,
      masteryDistribution
    };
  }

  static async getWordsForGame(userId: string, gameType: string, limit: number = 10): Promise<UserProgressModel[]> {
    let whereClause: any = { userId };
    
    if (gameType.includes('new')) {
      // New words: mastery level 0 or 1
      whereClause.masteryLevel = { [Op.lte]: 1 };
    } else if (gameType.includes('old') || gameType.includes('review')) {
      // Review words: mastery level 2 or higher
      whereClause.masteryLevel = { [Op.gte]: 2 };
    }

    return await UserProgressModel.findAll({
      where: whereClause,
      order: [
        ['masteryLevel', 'ASC'], // Prioritize lower mastery levels
        ['lastPlayedAt', 'ASC'] // Then prioritize older last played
      ],
      limit
    });
  }
}

export const initUserProgressModel = (sequelize: Sequelize) => {
  UserProgressModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      wordId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'words',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      gameType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['new-letter', 'old-letter', 'random-new', 'random-old', 'synonym-match', 'spelling', 'word-ladder', 'daily-quest', 'speed-round']]
        }
      },
      correctCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      incorrectCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      lastPlayedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      masteryLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 5,
        },
      },
      streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      totalTimeSpent: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'UserProgress',
      tableName: 'user_progress',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'wordId', 'gameType'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['gameType'],
        },
        {
          fields: ['masteryLevel'],
        },
        {
          fields: ['lastPlayedAt'],
        },
      ],
    }
  );

  return UserProgressModel;
};

export default UserProgressModel;
