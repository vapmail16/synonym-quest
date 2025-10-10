import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserSession } from '../models';
import { Op } from 'sequelize';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  preferences?: any;
  lastLoginAt?: Date;
  createdAt: Date;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  private static readonly JWT_EXPIRES_IN = '7d';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '30d';
  private static readonly BCRYPT_ROUNDS = 12;

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(data.email);
    if (existingUserByEmail) {
      throw new Error('User with this email already exists');
    }

    const existingUserByUsername = await User.findByUsername(data.username);
    if (existingUserByUsername) {
      throw new Error('Username is already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS);

    // Create user
    const user = await User.createUser({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      displayName: data.displayName || data.username,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Create session
    await UserSession.createSession(user.id, tokens.accessToken, tokens.refreshToken);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: this.formatUserProfile(user),
      tokens
    };
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials, deviceInfo?: any): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    // Find user by email
    const user = await User.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Create session
    await UserSession.createSession(user.id, tokens.accessToken, tokens.refreshToken, deviceInfo);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: this.formatUserProfile(user),
      tokens
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const session = await UserSession.findByRefreshToken(refreshToken);
    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(session.userId);

    // Update session with new tokens
    session.token = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.lastUsedAt = new Date();
    await session.save();

    return tokens;
  }

  /**
   * Verify access token
   */
  static async verifyToken(token: string): Promise<UserProfile | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Check if session exists and is active
      const session = await UserSession.findByToken(token);
      if (!session) {
        return null;
      }

      // Update last used
      await session.updateLastUsed();

      // Get user from session
      const user = await User.findByPk(session.userId);
      if (!user) {
        return null;
      }
      return this.formatUserProfile(user);
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout user (deactivate session)
   */
  static async logout(token: string): Promise<void> {
    const session = await UserSession.findByToken(token);
    if (session) {
      await session.deactivate();
    }
  }

  /**
   * Logout user from all devices
   */
  static async logoutAll(userId: string): Promise<void> {
    await UserSession.deactivateAllUserSessions(userId);
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      return null;
    }

    return this.formatUserProfile(user);
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: {
    displayName?: string;
    avatar?: string;
    preferences?: any;
  }): Promise<UserProfile> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.displayName) user.displayName = updates.displayName;
    if (updates.avatar) user.avatar = updates.avatar;
    if (updates.preferences) user.preferences = { ...user.preferences, ...updates.preferences };

    await user.save();

    return this.formatUserProfile(user);
  }

  /**
   * Change password
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    user.password = hashedPassword;

    await user.save();

    // Logout from all devices for security
    await this.logoutAll(userId);
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    return await UserSession.findAll({
      where: { userId, isActive: true },
      order: [['lastUsedAt', 'DESC']]
    });
  }

  /**
   * Deactivate specific session
   */
  static async deactivateSession(userId: string, sessionId: string): Promise<void> {
    const session = await UserSession.findOne({
      where: { id: sessionId, userId, isActive: true }
    });

    if (session) {
      await session.deactivate();
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const result = await UserSession.update(
      { isActive: false },
      {
        where: {
          isActive: true,
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      }
    );

    return result[0];
  }

  /**
   * Generate JWT tokens
   */
  private static async generateTokens(userId: string): Promise<AuthTokens> {
    const payload = { userId, type: 'access' };
    const refreshPayload = { userId, type: 'refresh' };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(refreshPayload, this.JWT_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    };
  }

  /**
   * Format user profile (remove sensitive data)
   */
  private static formatUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      preferences: user.preferences,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    };
  }
}

export default AuthService;
