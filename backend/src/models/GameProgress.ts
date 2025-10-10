import { DataTypes, Model, Sequelize } from 'sequelize';

export interface GameProgressAttributes {
  id: string;
  gameType: string;
  letter?: string;
  wordsLearned: number;
  totalWords: number;
  bestScore: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayed: Date;
  createdAt: Date;
}

export class GameProgressModel extends Model<GameProgressAttributes> implements GameProgressAttributes {
  public id!: string;
  public gameType!: string;
  public letter?: string;
  public wordsLearned!: number;
  public totalWords!: number;
  public bestScore!: number;
  public currentStreak!: number;
  public longestStreak!: number;
  public lastPlayed!: Date;
  public createdAt!: Date;
}

export const initGameProgressModel = (sequelize: Sequelize): typeof GameProgressModel => {
  GameProgressModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      gameType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      letter: {
        type: DataTypes.STRING(1),
        allowNull: true,
      },
      wordsLearned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      totalWords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      bestScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      currentStreak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      longestStreak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastPlayed: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'GameProgress',
      tableName: 'game_progress',
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          fields: ['gameType'],
        },
        {
          fields: ['gameType', 'letter'],
          unique: true,
        },
      ],
    }
  );

  return GameProgressModel;
};
