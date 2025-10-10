import { DataTypes, Model, Sequelize, Op } from 'sequelize';

export interface UserSessionAttributes {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    platform?: string;
    browser?: string;
  };
  expiresAt: Date;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSessionCreationAttributes extends Omit<UserSessionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class UserSessionModel extends Model<UserSessionAttributes, UserSessionCreationAttributes> implements UserSessionAttributes {
  public id!: string;
  public userId!: string;
  public token!: string;
  public refreshToken!: string;
  public deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    platform?: string;
    browser?: string;
  };
  public expiresAt!: Date;
  public isActive!: boolean;
  public lastUsedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static async createSession(userId: string, token: string, refreshToken: string, deviceInfo?: any): Promise<UserSessionModel> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    return await UserSessionModel.create({
      userId,
      token,
      refreshToken,
      deviceInfo,
      expiresAt,
      isActive: true,
      lastUsedAt: new Date(),
    });
  }

  static async findByToken(token: string): Promise<UserSessionModel | null> {
    return await UserSessionModel.findOne({
      where: { 
        token,
        isActive: true,
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });
  }

  static async findByRefreshToken(refreshToken: string): Promise<UserSessionModel | null> {
    return await UserSessionModel.findOne({
      where: { 
        refreshToken,
        isActive: true,
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });
  }

  static async deactivateAllUserSessions(userId: string): Promise<void> {
    await UserSessionModel.update(
      { isActive: false },
      { where: { userId, isActive: true } }
    );
  }

  async updateLastUsed(): Promise<void> {
    this.lastUsedAt = new Date();
    await this.save();
  }

  async deactivate(): Promise<void> {
    this.isActive = false;
    await this.save();
  }
}

export const initUserSessionModel = (sequelize: Sequelize) => {
  UserSessionModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      deviceInfo: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'UserSession',
      tableName: 'user_sessions',
      timestamps: true,
      indexes: [
        {
          fields: ['userId'],
        },
        {
          unique: true,
          fields: ['token'],
        },
        {
          unique: true,
          fields: ['refreshToken'],
        },
        {
          fields: ['isActive'],
        },
        {
          fields: ['expiresAt'],
        },
      ],
    }
  );

  return UserSessionModel;
};

export default UserSessionModel;
