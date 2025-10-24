import React, { useState, useEffect } from 'react';
import authService, { User } from '../services/authService';

interface UserProfileProps {
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      await authService.logout();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Profile update function (for future use)
  // const handleProfileUpdate = async (updates: any) => {
  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const result = await authService.updateProfile(updates);
      
  //     if (result.success && result.data) {
  //       setUser(result.data.user);
  //       setShowProfile(false);
  //     } else {
  //       setError(result.error || 'Profile update failed');
  //     }
  //   } catch (error) {
  //     setError('An unexpected error occurred');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <button
        className="profile-button"
        onClick={() => setShowProfile(!showProfile)}
        title={`Logged in as ${user.displayName || user.username}`}
      >
        <div className="user-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.displayName || user.username} />
          ) : (
            <span>{user.displayName?.charAt(0) || user.username.charAt(0)}</span>
          )}
        </div>
        <span className="user-name">{user.displayName || user.username}</span>
        <span className="dropdown-arrow">{showProfile ? '▲' : '▼'}</span>
      </button>

      {showProfile && (
        <div className="profile-dropdown">
          <div className="profile-header">
            <div className="profile-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.displayName || user.username} />
              ) : (
                <span>{user.displayName?.charAt(0) || user.username.charAt(0)}</span>
              )}
            </div>
            <div className="profile-info">
              <h4>{user.displayName || user.username}</h4>
              <p>{user.email}</p>
              <small>Member since {new Date(user.createdAt).toLocaleDateString()}</small>
            </div>
          </div>

          <div className="profile-actions">
            <button
              className="action-button"
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      )}

      <style>{`
        .user-profile {
          position: relative;
          display: inline-block;
        }

        .profile-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          color: #333;
        }

        .profile-button:hover {
          background: #e9ecef;
          border-color: #dee2e6;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #4F46E5;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          overflow: hidden;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-name {
          font-weight: 500;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown-arrow {
          font-size: 10px;
          color: #666;
        }

        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          min-width: 280px;
          z-index: 1000;
          overflow: hidden;
        }

        .profile-header {
          padding: 20px;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .profile-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #4F46E5;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-info h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .profile-info p {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #666;
        }

        .profile-info small {
          font-size: 12px;
          color: #999;
        }

        .profile-actions {
          padding: 16px 20px;
        }

        .action-button {
          width: 100%;
          padding: 10px 16px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .action-button:hover:not(:disabled) {
          background: #c82333;
        }

        .action-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          background: #FEE2E2;
          color: #DC2626;
          padding: 8px 12px;
          margin: 12px 20px;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid #FECACA;
        }

        @media (max-width: 480px) {
          .profile-dropdown {
            right: -20px;
            left: -20px;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default UserProfile;
