/**
 * EarnedBadgesDisplay Component
 * Displays earned badges in a compact way on the home screen
 */

import React, { useState, useEffect } from 'react';
import { BadgeProgress } from '../types/badge';
import config from '../config/api';
import authService from '../services/authService';

interface EarnedBadgesDisplayProps {
  userId?: string;
  maxDisplay?: number; // Maximum number of badges to display
  refreshTrigger?: number; // Trigger refresh when this changes
}

const EarnedBadgesDisplay: React.FC<EarnedBadgesDisplayProps> = ({ 
  userId, 
  maxDisplay = 5,
  refreshTrigger = 0
}) => {
  const [earnedBadges, setEarnedBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Debounce refresh trigger to avoid too many requests
    const timeoutId = setTimeout(() => {
      const fetchEarnedBadges = async () => {
        try {
          const token = authService.getToken();
          if (!token) {
            setLoading(false);
            return;
          }

          const response = await fetch(config.BADGE_ENDPOINTS.GET_USER_PROGRESS, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Filter only earned badges
              const earned = (data.data as BadgeProgress[]).filter(b => b.isEarned);
              setEarnedBadges(earned);
            }
          }
        } catch (error) {
          console.error('Error fetching earned badges:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchEarnedBadges();
    }, refreshTrigger > 0 ? 500 : 0); // Only debounce if refreshTrigger changed (not initial load)

    return () => clearTimeout(timeoutId);
  }, [userId, refreshTrigger]);

  if (loading || !userId || earnedBadges.length === 0) {
    return null; // Don't show anything if no badges or not logged in
  }

  const displayedBadges = showAll ? earnedBadges : earnedBadges.slice(0, maxDisplay);
  const hasMore = earnedBadges.length > maxDisplay;

  return (
    <div style={{
      marginBottom: '20px',
      padding: '12px 16px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '1.2rem' }}>🏆</span>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#1e293b',
          }}>
            Your Badges ({earnedBadges.length})
          </span>
        </div>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              color: '#3b82f6',
              background: 'transparent',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6';
              (e.target as HTMLButtonElement).style.color = 'white';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.target as HTMLButtonElement).style.color = '#3b82f6';
            }}
          >
            {showAll ? 'Show Less' : `+${earnedBadges.length - maxDisplay} More`}
          </button>
        )}
      </div>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        {displayedBadges.map((badgeProgress) => (
          <div
            key={badgeProgress.badgeId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.85rem',
              cursor: 'default',
              transition: 'all 0.2s',
            }}
            title={`${badgeProgress.badge.name}: ${badgeProgress.badge.description}`}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{badgeProgress.badge.icon}</span>
            <span style={{
              color: '#1e293b',
              fontWeight: '500',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {badgeProgress.badge.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EarnedBadgesDisplay;

