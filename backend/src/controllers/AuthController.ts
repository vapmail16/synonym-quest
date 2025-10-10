import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authRateLimit } from '../middleware/auth';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, displayName } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: 'Username, email, and password are required'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      // Validate password strength
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
        return;
      }

      // Validate username
      if (username.length < 3 || username.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Username must be between 3 and 50 characters'
        });
        return;
      }

      const result = await AuthService.register({
        username,
        email,
        password,
        displayName
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Registration failed'
      });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      // Get device info for session tracking
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        platform: req.headers['sec-ch-ua-platform'] || 'Unknown',
        browser: req.headers['sec-ch-ua'] || 'Unknown'
      };

      const result = await AuthService.login(
        { email, password },
        deviceInfo
      );

      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: error.message || 'Login failed'
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
        return;
      }

      const tokens = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: {
          tokens
        }
      });
    } catch (error: any) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: error.message || 'Token refresh failed'
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const { displayName, avatar, preferences } = req.body;

      const updatedUser = await AuthService.updateProfile(req.user.id, {
        displayName,
        avatar,
        preferences
      });

      res.json({
        success: true,
        data: {
          user: updatedUser
        }
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Profile update failed'
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long'
        });
        return;
      }

      await AuthService.changePassword(req.user.id, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.'
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Password change failed'
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await AuthService.logout(token);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      await AuthService.logoutAll(req.user.id);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error: any) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  /**
   * Get user sessions
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const sessions = await AuthService.getUserSessions(req.user.id);

      res.json({
        success: true,
        data: {
          sessions: sessions.map((session: any) => ({
            id: session.id,
            deviceInfo: session.deviceInfo,
            lastUsedAt: session.lastUsedAt,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt
          }))
        }
      });
    } catch (error: any) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }
  }

  /**
   * Deactivate specific session
   */
  async deactivateSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const { sessionId } = req.params;

      await AuthService.deactivateSession(req.user.id, sessionId);

      res.json({
        success: true,
        message: 'Session deactivated successfully'
      });
    } catch (error: any) {
      console.error('Deactivate session error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to deactivate session'
      });
    }
  }

  /**
   * Get router with all auth routes
   */
  getRouter() {
    const express = require('express');
    const router = express.Router();

    // Public routes
    router.post('/register', authRateLimit, this.register.bind(this));
    router.post('/login', authRateLimit, this.login.bind(this));
    router.post('/refresh-token', this.refreshToken.bind(this));

    // Protected routes (require authentication)
    const { authenticate } = require('../middleware/auth');
    
    router.get('/profile', authenticate, this.getProfile.bind(this));
    router.put('/profile', authenticate, this.updateProfile.bind(this));
    router.put('/change-password', authenticate, this.changePassword.bind(this));
    router.post('/logout', authenticate, this.logout.bind(this));
    router.post('/logout-all', authenticate, this.logoutAll.bind(this));
    router.get('/sessions', authenticate, this.getSessions.bind(this));
    router.delete('/sessions/:sessionId', authenticate, this.deactivateSession.bind(this));

    return router;
  }
}

export default new AuthController();
