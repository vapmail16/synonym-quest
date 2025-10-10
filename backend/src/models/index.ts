import { sequelize, testConnection } from '../config/database';
import { initWordModel, WordModel } from './Word';
import { initQuizSessionModel, QuizSessionModel } from './QuizSession';
import { initGameProgressModel, GameProgressModel } from './GameProgress';
import { initDailyQuestModel, DailyQuestModel } from './DailyQuest';
import { initUserModel } from './User';
import { initUserSessionModel } from './UserSession';
import { initUserProgressModel } from './UserProgress';

// Initialize models
const Word = initWordModel(sequelize);
const QuizSession = initQuizSessionModel(sequelize);
const GameProgress = initGameProgressModel(sequelize);
const DailyQuest = initDailyQuestModel(sequelize);
const User = initUserModel(sequelize);
const UserSession = initUserSessionModel(sequelize);
const UserProgress = initUserProgressModel(sequelize);

// Define associations
Word.hasMany(UserProgress, { foreignKey: 'wordId', as: 'userProgress' });
UserProgress.belongsTo(Word, { foreignKey: 'wordId', as: 'word' });

User.hasMany(UserProgress, { foreignKey: 'userId', as: 'progress' });
UserProgress.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Database initialization
export const initDatabase = async (): Promise<void> => {
  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Sync database (create tables if they don't exist)
    await sequelize.sync({ force: false });
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
  UserProgress 
};
export type { WordModel, QuizSessionModel, GameProgressModel, DailyQuestModel };
