import { DataTypes, Model, Sequelize } from 'sequelize';
import { Word } from '../types';

export class WordModel extends Model<Word> implements Word {
  public id!: string;
  public word!: string;
  public synonyms!: string[];
  public category?: string;
  public difficulty!: 'easy' | 'medium' | 'hard';
  public meaning?: string;
  public createdAt!: Date;
  public lastReviewed?: Date;
  public correctCount!: number;
  public incorrectCount!: number;
  public tags?: string[];
}

export const initWordModel = (sequelize: Sequelize): typeof WordModel => {
  WordModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      word: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          len: [1, 100],
          notEmpty: true,
        },
      },
      synonyms: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        validate: {
          isValidSynonyms(value: any) {
            if (!Array.isArray(value)) {
              throw new Error('Synonyms must be an array');
            }
            if (value.length === 0) {
              throw new Error('At least one synonym is required');
            }
            value.forEach((synonym: any) => {
              // Accept both string format and object format { word: string, type: string }
              if (typeof synonym === 'string') {
                if (synonym.trim().length === 0) {
                  throw new Error('Each synonym must be a non-empty string');
                }
              } else if (typeof synonym === 'object' && synonym !== null) {
                // Object format: { word: string, type: string }
                if (!synonym.word || typeof synonym.word !== 'string' || synonym.word.trim().length === 0) {
                  throw new Error('Each synonym object must have a non-empty word property');
                }
              } else {
                throw new Error('Each synonym must be a string or an object with a word property');
              }
            });
          },
        },
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          len: [0, 50],
        },
      },
      difficulty: {
        type: DataTypes.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'easy',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      lastReviewed: {
        type: DataTypes.DATE,
        allowNull: true,
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
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        validate: {
          isValidTags(value: any) {
            if (value && !Array.isArray(value)) {
              throw new Error('Tags must be an array');
            }
            if (value) {
              value.forEach((tag: any) => {
                if (typeof tag !== 'string' || tag.trim().length === 0) {
                  throw new Error('Each tag must be a non-empty string');
                }
              });
            }
          },
        },
      },
      meaning: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 500],
        },
      },
    },
    {
      sequelize,
      modelName: 'Word',
      tableName: 'words',
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          fields: ['word'],
          unique: true,
        },
        {
          fields: ['category'],
        },
        {
          fields: ['difficulty'],
        },
        {
          fields: ['createdAt'],
        },
        {
          fields: ['lastReviewed'],
        },
        // Note: GIN index for synonyms removed due to PostgreSQL operator class requirements
      ],
    }
  );

  return WordModel;
};
