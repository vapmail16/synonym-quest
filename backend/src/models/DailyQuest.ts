import { DataTypes, Model, Sequelize } from 'sequelize';

export interface DailyQuestAttributes {
  id: string;
  date: string; // YYYY-MM-DD format
  wordId: string;
  completed: boolean;
  completedAt?: Date;
  streak: number;
  createdAt: Date;
}

export class DailyQuestModel extends Model<DailyQuestAttributes> implements DailyQuestAttributes {
  public id!: string;
  public date!: string;
  public wordId!: string;
  public completed!: boolean;
  public completedAt?: Date;
  public streak!: number;
  public createdAt!: Date;
}

export const initDailyQuestModel = (sequelize: Sequelize): typeof DailyQuestModel => {
  DailyQuestModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      date: {
        type: DataTypes.STRING(10), // YYYY-MM-DD
        allowNull: false,
        unique: true,
      },
      wordId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'DailyQuest',
      tableName: 'daily_quests',
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          fields: ['date'],
          unique: true,
        },
        {
          fields: ['completed'],
        },
      ],
    }
  );

  return DailyQuestModel;
};
