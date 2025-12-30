import { Request, Response, Router } from 'express';
import { BadgeService } from '../services/BadgeService';
import { BadgeEvent } from '../types';
import { authenticate } from '../middleware/auth';
import { BadgeModel, UserBadgeModel, UserProgressModel } from '../models';

export class BadgeController {
  private badgeService: BadgeService;
  private badgeModel: typeof BadgeModel;

  constructor(
    badgeModelInstance?: typeof BadgeModel,
    userBadgeModelInstance?: typeof UserBadgeModel,
    userProgressModelInstance?: typeof UserProgressModel
  ) {
    // Use provided models or default to actual models
    const badgeModel = badgeModelInstance || BadgeModel;
    const userBadgeModel = userBadgeModelInstance || UserBadgeModel;
    const userProgressModel = userProgressModelInstance || UserProgressModel;

    this.badgeModel = badgeModel;
    this.badgeService = new BadgeService(
      badgeModel,
      userBadgeModel,
      userProgressModel
    );
  }

  public getRouter(): Router {
    const router = Router();

    // Public endpoints
    router.get('/', this.getAllBadges.bind(this));
    
    // Protected endpoints (require authentication) - must come before /:id
    router.get('/user', authenticate, this.getUserBadges.bind(this));
    router.get('/user/progress', authenticate, this.getUserBadgeProgress.bind(this));
    router.post('/check', authenticate, this.checkAndAwardBadges.bind(this));
    
    // Dynamic routes must come last
    router.get('/:id', this.getBadgeById.bind(this));

    return router;
  }

  /**
   * Get all available badges
   */
  async getAllBadges(req: Request, res: Response): Promise<void> {
    try {
      const { category, rarity } = req.query;

      const whereClause: any = {};
      if (category) {
        whereClause.category = category;
      }
      if (rarity) {
        whereClause.rarity = rarity;
      }

      const badges = await this.badgeModel.findAll({
        where: whereClause,
        order: [['category', 'ASC'], ['rarity', 'ASC'], ['name', 'ASC']],
      });

      res.json({
        success: true,
        data: badges.map(badge => badge.toJSON()),
      });
    } catch (error: any) {
      console.error('Error in getAllBadges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch badges',
      });
    }
  }

  /**
   * Get a specific badge by ID
   */
  async getBadgeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(404).json({
          success: false,
          error: 'Badge not found',
        });
        return;
      }

      const badge = await this.badgeModel.findByPk(id);

      if (!badge) {
        res.status(404).json({
          success: false,
          error: 'Badge not found',
        });
        return;
      }

      res.json({
        success: true,
        data: badge.toJSON(),
      });
    } catch (error: any) {
      console.error('Error in getBadgeById:', error);
      // If it's a UUID parsing error, return 404 instead of 500
      if (error.message && error.message.includes('uuid') || error.message && error.message.includes('invalid input')) {
        res.status(404).json({
          success: false,
          error: 'Badge not found',
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch badge',
      });
    }
  }

  /**
   * Get all badges earned by the authenticated user
   */
  async getUserBadges(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const userBadges = await this.badgeService.getUserBadges(userId);

      res.json({
        success: true,
        data: userBadges,
      });
    } catch (error: any) {
      console.error('Error in getUserBadges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user badges',
      });
    }
  }

  /**
   * Get all badges with user's progress
   */
  async getUserBadgeProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const badgeProgress = await this.badgeService.getAllBadgesWithProgress(userId);

      res.json({
        success: true,
        data: badgeProgress,
      });
    } catch (error: any) {
      console.error('Error in getUserBadgeProgress:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch badge progress',
      });
    }
  }

  /**
   * Check and award badges based on an event
   */
  async checkAndAwardBadges(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { type, data } = req.body;

      if (!type) {
        res.status(400).json({
          success: false,
          error: 'Event type is required',
        });
        return;
      }

      const event: BadgeEvent = {
        type,
        userId,
        data: data || {},
      };

      const awardedBadges = await this.badgeService.checkAndAwardBadges(event);

      res.json({
        success: true,
        data: awardedBadges,
        message: awardedBadges.length > 0
          ? `Congratulations! You earned ${awardedBadges.length} badge(s)!`
          : 'No new badges earned',
      });
    } catch (error: any) {
      console.error('Error in checkAndAwardBadges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check and award badges',
      });
    }
  }
}

export const badgeController = new BadgeController();

