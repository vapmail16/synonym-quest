import { DataTypes, Model, Sequelize } from 'sequelize';
import { QuizSession } from '../../../shared/types';

export class QuizSessionModel extends Model<QuizSession> implements QuizSession {
  public id!: string;
  public words!: string[];
  public currentIndex!: number;
  public score!: number;
  public totalQuestions!: number;
  public startTime!: Date;
  public endTime?: Date;
  public answers!: QuizAnswer[];
}

interface QuizAnswer {
  wordId: string;
  userAnswer: string[];
  correctSynonyms: string[];
  isCorrect: boolean;
  timestamp: Date;
  hintsUsed: number;
}

export const initQuizSessionModel = (sequelize: Sequelize): typeof QuizSessionModel => {
  QuizSessionModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      words: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        validate: {
          isValidWords(value: any) {
            if (!Array.isArray(value)) {
              throw new Error('Words must be an array');
            }
            value.forEach((word: any) => {
              if (typeof word !== 'string' || word.trim().length === 0) {
                throw new Error('Each word must be a non-empty string');
              }
            });
          },
        },
      },
      currentIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 1,
        },
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      endTime: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      answers: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        validate: {
          isValidAnswers(value: any) {
            if (!Array.isArray(value)) {
              throw new Error('Answers must be an array');
            }
            value.forEach((answer: any) => {
              if (!answer.wordId || !Array.isArray(answer.userAnswer) || !Array.isArray(answer.correctSynonyms)) {
                throw new Error('Invalid answer structure');
              }
            });
          },
        },
      },
    },
    {
      sequelize,
      modelName: 'QuizSession',
      tableName: 'quiz_sessions',
      timestamps: true,
      updatedAt: false,
    }
  );

  return QuizSessionModel;
};
