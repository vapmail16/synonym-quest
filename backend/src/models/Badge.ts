import { Model, DataTypes, Sequelize } from 'sequelize';
import { Badge, BadgeCategory, BadgeRarity, BadgeCriteria } from '../types';

export class BadgeModel extends Model<Badge> implements Badge {
  public id!: string;
  public name!: string;
  public description!: string;
  public category!: BadgeCategory;
  public icon!: string;
  public criteria!: BadgeCriteria;
  public rarity!: BadgeRarity;
  public createdAt!: Date;
  public updatedAt?: Date;
}

export const initBadgeModel = (sequelize: Sequelize): typeof BadgeModel => {
  BadgeModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [1, 100],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      category: {
        type: DataTypes.ENUM('learning', 'game', 'performance', 'special'),
        allowNull: false,
        validate: {
          isIn: [['learning', 'game', 'performance', 'special']],
        },
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 50],
        },
      },
      criteria: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          isValidCriteria(value: any) {
            if (!value || typeof value !== 'object') {
              throw new Error('Criteria must be an object');
            }
            if (!value.type || !value.value) {
              throw new Error('Criteria must have type and value');
            }
          },
        },
      },
      rarity: {
        type: DataTypes.ENUM('common', 'rare', 'epic', 'legendary'),
        allowNull: false,
        defaultValue: 'common',
        validate: {
          isIn: [['common', 'rare', 'epic', 'legendary']],
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'badges',
      timestamps: true,
      underscored: false,
    }
  );

  return BadgeModel;
};

