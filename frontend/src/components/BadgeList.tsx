/**
 * BadgeList Component
 * Displays a list of badges with filtering and progress
 */

import React, { useState, useEffect } from 'react';
import { BadgeProgress, BadgeCategory, BadgeRarity } from '../types/badge';
import BadgeCard from './BadgeCard';
import config from '../config/api';
import authService from '../services/authService';

interface BadgeListProps {
  userId?: string;
  showProgress?: boolean;
  filterByCategory?: BadgeCategory;
  filterByRarity?: BadgeRarity;
  onBadgeClick?: (badge: BadgeProgress) => void;
}

const BadgeList: React.FC<BadgeListProps> = ({
  userId,
  showProgress = true,
  filterByCategory,
  filterByRarity,
  onBadgeClick,
}) => {
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>(filterByCategory || 'all');
  const [selectedRarity, setSelectedRarity] = useState<BadgeRarity | 'all'>(filterByRarity || 'all');

  useEffect(() => {
    fetchBadges();
  }, [userId, selectedCategory, selectedRarity]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always fetch all badges first to show all available badges
      const categoryParam = selectedCategory !== 'all' ? selectedCategory : undefined;
      const rarityParam = selectedRarity !== 'all' ? selectedRarity : undefined;
      const allBadgesUrl = config.BADGE_ENDPOINTS.GET_ALL(categoryParam, rarityParam);
      
      const allBadgesResponse = await fetch(allBadgesUrl);
      if (!allBadgesResponse.ok) {
        throw new Error('Failed to fetch badges');
      }

      const allBadgesData = await allBadgesResponse.json();
      if (!allBadgesData.success) {
        throw new Error('Failed to fetch badges');
      }

      // Convert all badges to BadgeProgress format
      let allBadges: BadgeProgress[] = allBadgesData.data.map((badge: any) => ({
        badgeId: badge.id,
        badge,
        progress: 0,
        isEarned: false,
      }));

      // If user is logged in and we want to show progress, fetch user progress and merge
      if (userId && showProgress) {
        const token = authService.getToken();
        if (token) {
          try {
            const progressResponse = await fetch(config.BADGE_ENDPOINTS.GET_USER_PROGRESS, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              if (progressData.success) {
                // Create a map of user progress by badgeId
                const progressMap = new Map<string, BadgeProgress>();
                progressData.data.forEach((bp: BadgeProgress) => {
                  progressMap.set(bp.badgeId, bp);
                });

                // Merge user progress with all badges
                allBadges = allBadges.map(badge => {
                  const userProgress = progressMap.get(badge.badgeId);
                  return userProgress || badge;
                });
              }
            }
          } catch (progressError) {
            // If progress fetch fails, just show all badges without progress
            console.warn('Could not fetch user progress, showing all badges:', progressError);
          }
        }
      }

      setBadges(allBadges);
    } catch (err: any) {
      setError(err.message || 'Failed to load badges');
      console.error('Error fetching badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories: (BadgeCategory | 'all')[] = ['all', 'learning', 'game', 'performance', 'special'];
  const rarities: (BadgeRarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'legendary'];

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: '#64748b' }}>Loading badges...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444' }}>Error: {error}</div>
        <button
          onClick={fetchBadges}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const earnedCount = badges.filter(b => b.isEarned).length;
  const totalCount = badges.length;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', color: '#1e293b' }}>
          Available Badges {showProgress && userId && `(${earnedCount}/${totalCount} earned)`}
        </h2>
        {!userId && (
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 16px 0' }}>
            Sign in to see your progress toward earning these badges!
          </p>
        )}

        {!filterByCategory && (
          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.9rem', color: '#64748b', marginRight: '8px' }}>Category:</label>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedCategory === cat ? '#3b82f6' : '#f1f5f9',
                  color: selectedCategory === cat ? 'white' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {!filterByRarity && (
          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.9rem', color: '#64748b', marginRight: '8px' }}>Rarity:</label>
            {rarities.map(rarity => (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(rarity)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedRarity === rarity ? '#3b82f6' : '#f1f5f9',
                  color: selectedRarity === rarity ? 'white' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textTransform: 'capitalize',
                }}
              >
                {rarity}
              </button>
            ))}
          </div>
        )}
      </div>

      {badges.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          No badges found
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {badges.map(badgeProgress => (
            <BadgeCard
              key={badgeProgress.badgeId}
              badge={badgeProgress}
              onClick={onBadgeClick ? () => onBadgeClick(badgeProgress) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BadgeList;

