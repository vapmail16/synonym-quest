import { Model, DataTypes, Sequelize } from 'sequelize';

export interface MathOption {
  label: string;
  value: string;
}

export interface MathQuestionAttributes {
  id: string;
  mathTopicId: string;
  externalId: string;
  questionText: string;
  options: MathOption[];
  correctAnswer: string;
  explanation: string;
  working: string | null;
  svgData: string | null;
  imageAltText: string | null;
  imageRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MathQuestionModel extends Model<MathQuestionAttributes> implements MathQuestionAttributes {
  public id!: string;
  public mathTopicId!: string;
  public externalId!: string;
  public questionText!: string;
  public options!: MathOption[];
  public correctAnswer!: string;
  public explanation!: string;
  public working!: string | null;
  public svgData!: string | null;
  public imageAltText!: string | null;
  public imageRequired!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export const initMathQuestionModel = (sequelize: Sequelize): typeof MathQuestionModel => {
  MathQuestionModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      mathTopicId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'math_topic_id',
        references: { model: 'math_topics', key: 'id' },
        onDelete: 'CASCADE',
      },
      externalId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: 'external_id',
      },
      questionText: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'question_text',
      },
      options: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      correctAnswer: {
        type: DataTypes.STRING(1),
        allowNull: false,
        field: 'correct_answer',
        validate: { isIn: [['A', 'B', 'C', 'D', 'E']] },
      },
      explanation: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      working: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      svgData: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'svg_data',
      },
      imageAltText: {
        type: DataTypes.STRING(512),
        allowNull: true,
        field: 'image_alt_text',
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
      modelName: 'MathQuestion',
      tableName: 'math_questions',
      underscored: true,
      timestamps: true,
    }
  );

  return MathQuestionModel;
};
