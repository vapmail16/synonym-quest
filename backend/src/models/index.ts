import { sequelize, testConnection } from '../config/database';
import { initWordModel, WordModel } from './Word';
import { initQuizSessionModel, QuizSessionModel } from './QuizSession';
import { initGameProgressModel, GameProgressModel } from './GameProgress';
import { initDailyQuestModel, DailyQuestModel } from './DailyQuest';
import { initUserModel } from './User';
import { initUserSessionModel } from './UserSession';
import { initUserProgressModel, UserProgressModel } from './UserProgress';
import { initBadgeModel, BadgeModel } from './Badge';
import { initUserBadgeModel, UserBadgeModel } from './UserBadge';

// Initialize models
const Word = initWordModel(sequelize);
const QuizSession = initQuizSessionModel(sequelize);
const GameProgress = initGameProgressModel(sequelize);
const DailyQuest = initDailyQuestModel(sequelize);
const User = initUserModel(sequelize);
const UserSession = initUserSessionModel(sequelize);
const UserProgress = initUserProgressModel(sequelize);
const Badge = initBadgeModel(sequelize);
const UserBadge = initUserBadgeModel(sequelize);

// Define associations
Word.hasMany(UserProgress, { foreignKey: 'wordId', as: 'userProgress' });
UserProgress.belongsTo(Word, { foreignKey: 'wordId', as: 'word' });

User.hasMany(UserProgress, { foreignKey: 'userId', as: 'progress' });
UserProgress.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Badge associations - define AFTER sync to avoid foreign key creation issues
// We'll define these after the tables are created
User.hasMany(UserBadge, { foreignKey: 'userId', as: 'badges', constraints: false });
UserBadge.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

Badge.hasMany(UserBadge, { foreignKey: 'badgeId', as: 'userBadges', constraints: false });
UserBadge.belongsTo(Badge, { foreignKey: 'badgeId', as: 'badge', constraints: false });

// Database initialization
export const initDatabase = async (): Promise<void> => {
  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Sync database - use sequelize.sync() which handles foreign keys properly
    // Individual model sync() can cause issues with foreign key constraints
    // when associations are defined before sync
    await sequelize.sync({ force: false, alter: false });
    
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

export { 
  sequelize, 
  Word, 
  QuizSession, 
  GameProgress, 
  DailyQuest, 
  User, 
  UserSession, 
  UserProgress,
  Badge,
  UserBadge,
  BadgeModel,
  UserBadgeModel,
  UserProgressModel
};
export type { WordModel, QuizSessionModel, GameProgressModel, DailyQuestModel };
