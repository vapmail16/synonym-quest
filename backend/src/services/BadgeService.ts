import { Op, QueryTypes } from 'sequelize';
import { BadgeEvent, Badge, UserBadge, BadgeProgress, BadgeCriteria } from '../types';
import { BadgeModel, UserBadgeModel, UserProgressModel } from '../models';

export class BadgeService {
  constructor(
    private badgeModel: typeof BadgeModel,
    private userBadgeModel: typeof UserBadgeModel,
    private userProgressModel: typeof UserProgressModel
  ) {}

  /**
   * Check if user qualifies for badges based on event and award them
   */
  async checkAndAwardBadges(event: BadgeEvent): Promise<Badge[]> {
    const awardedBadges: Badge[] = [];

    // Get all badges
    const allBadges = await this.badgeModel.findAll();

    for (const badge of allBadges) {
      // Check if user already has this badge
      const existingUserBadge = await this.userBadgeModel.findOne({
        where: {
          userId: event.userId,
          badgeId: badge.id,
        },
      });

      if (existingUserBadge) {
        continue; // Skip if already earned
      }

      // Check if user meets criteria
      const meetsCriteria = await this.checkCriteria(event, badge.criteria);

      if (meetsCriteria) {
        // Award the badge
        await this.awardBadge(event.userId, badge.id, {
          eventType: event.type,
          ...event.data,
        });
        awardedBadges.push(badge.toJSON() as Badge);
      }
    }

    return awardedBadges;
  }

  /**
   * Check if user meets badge criteria
   */
  private async checkCriteria(event: BadgeEvent, criteria: BadgeCriteria): Promise<boolean> {
    switch (criteria.type) {
      case 'word_count':
        const wordCount = await this.getUserWordCount(event.userId);
        return wordCount >= criteria.value;

      case 'streak':
        return (event.data.streak || 0) >= criteria.value;

      case 'game_mode':
        if (criteria.gameType && event.data.gameType) {
          const gameCount = await this.getUserGameCount(
            event.userId,
            criteria.gameType
          );
          return gameCount >= criteria.value;
        }
        return false;

      case 'letter_completion':
        if (criteria.letter) {
          const letterProgress = await this.getLetterProgress(
            event.userId,
            criteria.letter
          );
          return letterProgress >= 100; // 100% means completed
        }
        return false;

      case 'accuracy':
        if (criteria.minAccuracy) {
          const accuracy = event.data.accuracy || 0;
          return accuracy >= criteria.minAccuracy;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get total number of words learned by user
   */
  private async getUserWordCount(userId: string): Promise<number> {
    const count = await this.userProgressModel.count({
      where: {
        userId,
        masteryLevel: {
          [Op.gte]: 1, // At least level 1 mastery
        },
      },
      distinct: true,
      col: 'wordId',
    });
    return count;
  }

  /**
   * Get number of games played by user for a specific game type
   */
  private async getUserGameCount(userId: string, gameType: string): Promise<number> {
    const count = await this.userProgressModel.count({
      where: {
        userId,
        gameType,
      },
      distinct: true,
      col: 'wordId',
    });
    return count;
  }

  /**
   * Get letter progress percentage (0-100)
   */
  private async getLetterProgress(userId: string, letter: string): Promise<number> {
    // This would need to query words starting with the letter
    // For now, return 0 as placeholder
    // TODO: Implement letter progress calculation
    return 0;
  }

  /**
   * Get all badges earned by a user
   */
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const userBadges = await this.userBadgeModel.findAll({
        where: { userId },
        include: [
          {
            model: this.badgeModel,
            as: 'badge',
            required: false, // Left join in case badge doesn't exist
          },
        ],
        order: [['earnedAt', 'DESC']],
      });

      return userBadges.map(ub => ub.toJSON() as UserBadge);
    } catch (error: any) {
      // If include fails (e.g., association not set up), just return user badges without badge data
      const userBadges = await this.userBadgeModel.findAll({
        where: { userId },
        order: [['earnedAt', 'DESC']],
      });
      return userBadges.map(ub => ub.toJSON() as UserBadge);
    }
  }

  /**
   * Get progress toward a specific badge (0-100)
   */
  async getBadgeProgress(userId: string, badgeId: string): Promise<number> {
    // Check if already earned
    const userBadge = await this.userBadgeModel.findOne({
      where: {
        userId,
        badgeId,
      },
    });

    if (userBadge && userBadge.progress === 100) {
      return 100;
    }

    // Get badge criteria
    const badge = await this.badgeModel.findByPk(badgeId);
    if (!badge) {
      throw new Error('Badge not found');
    }

    // Calculate progress based on criteria
    const criteria = badge.criteria;
    let current = 0;
    let target = 1;

    switch (criteria.type) {
      case 'word_count':
        current = await this.getUserWordCount(userId);
        target = criteria.value;
        break;

      case 'game_mode':
        if (criteria.gameType) {
          current = await this.getUserGameCount(userId, criteria.gameType);
          target = criteria.value;
        }
        break;

      case 'streak':
        // Would need to get current streak from user stats
        // For now, return 0
        return 0;

      default:
        return 0;
    }

    const progress = Math.min(100, Math.round((current / target) * 100));
    return progress;
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(
    userId: string,
    badgeId: string,
    metadata: Record<string, any> = {}
  ): Promise<UserBadge> {
    // Verify badge exists
    const badge = await this.badgeModel.findByPk(badgeId);
    if (!badge) {
      throw new Error('Badge not found');
    }

    // Check if already awarded
    const existing = await this.userBadgeModel.findOne({
      where: {
        userId,
        badgeId,
      },
    });

    if (existing) {
      return existing.toJSON() as UserBadge;
    }

    // Create user badge
    const userBadge = await this.userBadgeModel.create({
      userId,
      badgeId,
      progress: 100,
      metadata,
      earnedAt: new Date(),
    });

    return userBadge.toJSON() as UserBadge;
  }

  /**
   * Get all badges with user's progress
   * Optimized to batch queries instead of individual queries per badge
   */
  async getAllBadgesWithProgress(userId: string): Promise<BadgeProgress[]> {
    const allBadges = await this.badgeModel.findAll();
    const userBadges = await this.userBadgeModel.findAll({
      where: { userId },
    });

    const userBadgeMap = new Map(
      userBadges.map(ub => [ub.badgeId, ub.toJSON() as UserBadge])
    );

    // Batch fetch user stats once instead of per badge
    const [totalWordCount, gameTypeCounts] = await Promise.all([
      this.getUserWordCount(userId),
      this.getUserGameCountsByType(userId),
    ]);

    const results: BadgeProgress[] = [];

    for (const badge of allBadges) {
      const userBadge = userBadgeMap.get(badge.id);
      
      // If already earned, use stored progress
      if (userBadge && userBadge.progress === 100) {
        results.push({
          badgeId: badge.id,
          badge: badge.toJSON() as Badge,
          progress: 100,
          isEarned: true,
          earnedAt: userBadge.earnedAt,
        });
        continue;
      }

      // Calculate progress from cached stats
      const criteria = badge.criteria;
      let progress = 0;

      switch (criteria.type) {
        case 'word_count':
          progress = Math.min(100, Math.round((totalWordCount / (criteria.value || 1)) * 100));
          break;

        case 'game_mode':
          if (criteria.gameType) {
            const gameCount = gameTypeCounts.get(criteria.gameType) || 0;
            progress = Math.min(100, Math.round((gameCount / (criteria.value || 1)) * 100));
          }
          break;

        case 'streak':
          // Streak badges need to be checked individually
          progress = userBadge?.progress || 0;
          break;

        default:
          progress = userBadge?.progress || 0;
      }

      results.push({
        badgeId: badge.id,
        badge: badge.toJSON() as Badge,
        progress,
        isEarned: progress === 100,
        earnedAt: userBadge?.earnedAt,
      });
    }

    return results;
  }

  /**
   * Get game counts by type for a user (batched query)
   */
  private async getUserGameCountsByType(userId: string): Promise<Map<string, number>> {
    const { sequelize } = this.userProgressModel;
    if (!sequelize) {
      return new Map();
    }

    const gameProgress = await sequelize.query(
      `SELECT "gameType", COUNT(DISTINCT "wordId") as count 
       FROM "user_progress" 
       WHERE "userId" = :userId 
       GROUP BY "gameType"`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      }
    ) as Array<{ gameType: string; count: string | number }>;

    const counts = new Map<string, number>();
    for (const row of gameProgress) {
      const count = typeof row.count === 'string' ? parseInt(row.count, 10) : row.count;
      counts.set(row.gameType, count || 0);
    }
    return counts;
  }
}

