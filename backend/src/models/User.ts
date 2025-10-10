import { DataTypes, Model, Sequelize } from 'sequelize';

export interface UserAttributes {
  id: string;
  username: string;
  email: string;
  password: string; // Hashed password
  displayName?: string;
  avatar?: string;
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
    gameSettings?: {
      defaultGameType?: string;
      timerEnabled?: boolean;
      soundEnabled?: boolean;
    };
  };
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationAttributes extends Omit<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class UserModel extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public password!: string;
  public displayName?: string;
  public avatar?: string;
  public preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
    gameSettings?: {
      defaultGameType?: string;
      timerEnabled?: boolean;
      soundEnabled?: boolean;
    };
  };
  public isActive!: boolean;
  public lastLoginAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static async findByEmail(email: string): Promise<UserModel | null> {
    return await UserModel.findOne({ where: { email, isActive: true } });
  }

  static async findByUsername(username: string): Promise<UserModel | null> {
    return await UserModel.findOne({ where: { username, isActive: true } });
  }

  static async createUser(userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }): Promise<UserModel> {
    return await UserModel.create(userData);
  }
}

export const initUserModel = (sequelize: Sequelize) => {
  UserModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 50],
          isAlphanumeric: true,
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [6, 255],
        },
      },
      displayName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          len: [0, 100],
        },
      },
      avatar: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['username'],
        },
        {
          unique: true,
          fields: ['email'],
        },
        {
          fields: ['isActive'],
        },
        {
          fields: ['lastLoginAt'],
        },
      ],
    }
  );

  return UserModel;
};

export default UserModel;
