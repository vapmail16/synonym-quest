/**
 * BadgeNotification Component
 * Shows a notification when a user earns a new badge
 */

import React, { useEffect, useState } from 'react';
import { Badge } from '../types/badge';

interface BadgeNotificationProps {
  badge: Badge | null;
  onClose: () => void;
  autoCloseDelay?: number; // milliseconds
}

const BadgeNotification: React.FC<BadgeNotificationProps> = ({
  badge,
  onClose,
  autoCloseDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (badge) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [badge, autoCloseDelay, onClose]);

  if (!badge) return null;

  const rarityColors = {
    common: { border: '#94a3b8', bg: '#f1f5f9' },
    rare: { border: '#3b82f6', bg: '#dbeafe' },
    epic: { border: '#a855f7', bg: '#f3e8ff' },
    legendary: { border: '#f59e0b', bg: '#fef3c7' },
  };

  const colors = rarityColors[badge.rarity];

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: colors.bg,
        border: `3px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '20px',
        minWidth: '300px',
        maxWidth: '400px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 10000,
        transform: isVisible ? 'translateX(0)' : 'translateX(400px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '3rem' }}>{badge.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>
          🎉 Badge Earned!
        </div>
        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
          {badge.name}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          {badge.description}
        </div>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          color: '#64748b',
          padding: '4px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
};

export default BadgeNotification;

