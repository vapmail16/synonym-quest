import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        displayName?: string;
        avatar?: string;
        preferences?: any;
        lastLoginAt?: Date;
        createdAt: Date;
      };
    }
  }
}

/**
 * Authentication middleware - requires valid token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = await AuthService.verifyToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware - doesn't require token but adds user if valid
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await AuthService.verifyToken(token);
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error: any) {
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Admin authentication middleware (for future admin features)
 */
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authenticate(req, res, async () => {
      // For now, all authenticated users are "admins"
      // In the future, you can add role-based access control
      if (!req.user) {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      // Check if user has admin role (future enhancement)
      // if (req.user.role !== 'admin') {
      //   res.status(403).json({
      //     success: false,
      //     error: 'Admin access required'
      //   });
      //   return;
      // }

      next();
    });
  } catch (error: any) {
    console.error('Admin authentication error:', error);
    res.status(403).json({
      success: false,
      error: 'Admin authentication failed'
    });
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // Simple in-memory rate limiting (in production, use Redis)
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // This is a simplified rate limiter - in production use express-rate-limit
  if (!req.app.locals.rateLimit) {
    req.app.locals.rateLimit = new Map();
  }

  const attempts = req.app.locals.rateLimit.get(ip) || { count: 0, resetTime: now + windowMs };
  
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }

  if (attempts.count >= maxAttempts) {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again later.'
    });
    return;
  }

  attempts.count++;
  req.app.locals.rateLimit.set(ip, attempts);

  next();
};

export default {
  authenticate,
  optionalAuth,
  authenticateAdmin,
  authRateLimit
};
