import { Model, DataTypes, Sequelize } from 'sequelize';

export interface MathTopicAttributes {
  id: string;
  bankId: string;
  topic: string;
  sourceQ: string | null;
  difficulty: string;
  skill: string;
  imageRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MathTopicModel extends Model<MathTopicAttributes> implements MathTopicAttributes {
  public id!: string;
  public bankId!: string;
  public topic!: string;
  public sourceQ!: string | null;
  public difficulty!: string;
  public skill!: string;
  public imageRequired!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export const initMathTopicModel = (sequelize: Sequelize): typeof MathTopicModel => {
  MathTopicModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      bankId: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
        field: 'bank_id',
      },
      topic: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      sourceQ: {
        type: DataTypes.STRING(32),
        allowNull: true,
        field: 'source_q',
      },
      difficulty: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'medium',
      },
      skill: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      imageRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'image_required',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'MathTopic',
      tableName: 'math_topics',
      underscored: true,
      timestamps: true,
    }
  );

  return MathTopicModel;
};
