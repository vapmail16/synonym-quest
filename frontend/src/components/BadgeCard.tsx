/**
 * BadgeCard Component
 * Displays a single badge with its icon, name, description, and progress
 */

import React from 'react';
import { Badge, BadgeProgress } from '../types/badge';
import { formatBadgeRequirement } from '../utils/badgeUtils';

interface BadgeCardProps {
  badge: Badge | BadgeProgress;
  progress?: number;
  isEarned?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  progress,
  isEarned,
  onClick,
  size = 'medium',
}) => {
  const badgeData = 'badge' in badge ? badge.badge : badge;
  const badgeProgress = 'progress' in badge ? badge.progress : progress || 0;
  const earned = 'isEarned' in badge ? badge.isEarned : isEarned || false;

  const sizeStyles = {
    small: {
      container: { padding: '12px', minHeight: '120px' },
      icon: { fontSize: '2rem' },
      name: { fontSize: '0.9rem' },
      description: { fontSize: '0.75rem' },
    },
    medium: {
      container: { padding: '16px', minHeight: '160px' },
      icon: { fontSize: '3rem' },
      name: { fontSize: '1rem' },
      description: { fontSize: '0.85rem' },
    },
    large: {
      container: { padding: '20px', minHeight: '200px' },
      icon: { fontSize: '4rem' },
      name: { fontSize: '1.2rem' },
      description: { fontSize: '1rem' },
    },
  };

  const rarityColors = {
    common: { border: '#94a3b8', bg: '#f1f5f9', text: '#64748b' },
    rare: { border: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
    epic: { border: '#a855f7', bg: '#f3e8ff', text: '#7c3aed' },
    legendary: { border: '#f59e0b', bg: '#fef3c7', text: '#d97706' },
  };

  const style = sizeStyles[size];
  const colors = rarityColors[badgeData.rarity];

  return (
    <div
      onClick={onClick}
      style={{
        ...style.container,
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        opacity: earned ? 1 : 0.6,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        boxShadow: earned ? `0 4px 12px ${colors.border}40` : '0 2px 4px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 16px ${colors.border}60`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = earned 
            ? `0 4px 12px ${colors.border}40` 
            : '0 2px 4px rgba(0,0,0,0.1)';
        }
      }}
    >
      {earned && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '1.2rem',
          }}
        >
          ✓
        </div>
      )}
      
      <div style={{ ...style.icon, marginBottom: '8px' }}>
        {badgeData.icon}
      </div>
      
      <div style={{ ...style.name, fontWeight: 'bold', color: colors.text, marginBottom: '4px' }}>
        {badgeData.name}
      </div>
      
      <div style={{ ...style.description, color: '#64748b', marginBottom: '4px' }}>
        {badgeData.description}
      </div>
      
      {!earned && (
        <div style={{ 
          ...style.description, 
          fontSize: '0.7rem', 
          color: colors.text, 
          fontWeight: '600',
          marginBottom: '8px',
          padding: '4px 8px',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '4px',
        }}>
          {formatBadgeRequirement(badgeData.criteria)}
        </div>
      )}

      {!earned && badgeProgress > 0 && (
        <div style={{ width: '100%', marginTop: '8px' }}>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#e2e8f0',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${badgeProgress}%`,
                height: '100%',
                backgroundColor: colors.border,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.text, marginTop: '4px' }}>
            {badgeProgress}%
          </div>
        </div>
      )}

      {earned && (
        <div style={{ fontSize: '0.75rem', color: colors.text, marginTop: '4px', fontWeight: 'bold' }}>
          Earned!
        </div>
      )}
    </div>
  );
};

export default BadgeCard;

