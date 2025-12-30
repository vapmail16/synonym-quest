/**
 * BadgesPage Component
 * Main page for viewing all badges and user progress
 */

import React, { useState } from 'react';
import BadgeList from './BadgeList';
import { BadgeProgress } from '../types/badge';
import { formatBadgeRequirement, getBadgeHowToEarn } from '../utils/badgeUtils';

interface BadgesPageProps {
  userId?: string;
}

const BadgesPage: React.FC<BadgesPageProps> = ({ userId }) => {
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#1e293b' }}>
          🏆 All Badges
        </h1>
        <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
          View all available badges and see what you need to do to earn them. Click on any badge to see detailed requirements!
        </p>
      </div>

      <BadgeList
        userId={userId}
        showProgress={!!userId}
        onBadgeClick={(badge) => setSelectedBadge(badge)}
      />

      {selectedBadge && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedBadge(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedBadge(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              ×
            </button>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '12px' }}>
                {selectedBadge.badge.icon}
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: '#1e293b' }}>
                {selectedBadge.badge.name}
              </h2>
              <p style={{ margin: '0 0 16px 0', color: '#64748b' }}>
                {selectedBadge.badge.description}
              </p>
              {selectedBadge.isEarned ? (
                <div style={{ color: '#16a34a', fontWeight: 'bold' }}>
                  ✓ Earned on {new Date(selectedBadge.earnedAt!).toLocaleDateString()}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '8px', color: '#64748b' }}>
                    Progress: {selectedBadge.progress}%
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${selectedBadge.progress}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  How to Earn
                </div>
                <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: '600', marginBottom: '8px' }}>
                  {formatBadgeRequirement(selectedBadge.badge.criteria)}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }}>
                  {getBadgeHowToEarn(selectedBadge.badge.criteria)}
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Category:</span>{' '}
                  <span style={{ color: '#1e293b', textTransform: 'capitalize', fontWeight: '500' }}>
                    {selectedBadge.badge.category}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Rarity:</span>{' '}
                  <span style={{ color: '#1e293b', textTransform: 'capitalize', fontWeight: '500' }}>
                    {selectedBadge.badge.rarity}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgesPage;

