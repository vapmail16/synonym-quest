import { Model, DataTypes, Sequelize } from 'sequelize';
import { UserBadge } from '../types';

export class UserBadgeModel extends Model<UserBadge> implements UserBadge {
  public id!: string;
  public userId!: string;
  public badgeId!: string;
  public earnedAt!: Date;
  public progress!: number;
  public metadata!: Record<string, any>;
  public createdAt!: Date;
  public updatedAt?: Date;
}

export const initUserBadgeModel = (sequelize: Sequelize): typeof UserBadgeModel => {
  UserBadgeModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      badgeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      earnedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      progress: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
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
      tableName: 'user_badges',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'badgeId'],
          name: 'unique_user_badge',
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['badgeId'],
        },
      ],
    }
  );

  return UserBadgeModel;
};
