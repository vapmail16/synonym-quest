import React, { useState, useEffect } from 'react';
import './App.css';
import Games from './Games';
import './Games.css';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';
import BadgesPage from './components/BadgesPage';
import BadgeNotification from './components/BadgeNotification';
import MathPractice from './components/MathPractice';
import authService, { User } from './services/authService';
import { Badge } from './types/badge';

type AppView = 'games' | 'math' | 'badges';

const navBtn = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  background: active ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.15)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
});

const AppHeader: React.FC<{
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}> = ({ user, onLoginClick, onLogout, currentView, setCurrentView }) => (
  <header
    style={{
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '2rem',
      position: 'relative',
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              color: '#ff69b4',
              fontSize: '2.5rem',
              lineHeight: '1',
              display: 'inline-block',
            }}
          >
            ♥
          </span>
          Synonym Quest
        </h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
          {currentView === 'math'
            ? '11+ maths practice — by topic, with hints when you choose.'
            : currentView === 'badges'
              ? 'Your badges and progress.'
              : 'Vocabulary games and more — sign in for maths topics too.'}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {user && (
          <>
            <button type="button" style={navBtn(currentView === 'games')} onClick={() => setCurrentView('games')}>
              📚 Vocabulary
            </button>
            <button type="button" style={navBtn(currentView === 'math')} onClick={() => setCurrentView('math')}>
              🔢 11+ Maths
            </button>
            <button type="button" style={navBtn(currentView === 'badges')} onClick={() => setCurrentView('badges')}>
              🏆 Badges
            </button>
          </>
        )}
        {user ? (
          <UserProfile onLogout={onLogout} />
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  </header>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('games');
  const [earnedBadge, setEarnedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            const freshUser = await authService.getProfile();
            if (freshUser) {
              setUser(freshUser);
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!user && currentView !== 'games') {
      setCurrentView('games');
    }
  }, [user, currentView]);

  const handleAuthSuccess = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const handleLoginClick = () => {
    setShowAuthModal(true);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          background: '#f8f9fa',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e9ecef',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px',
          }}
        />
        <p style={{ margin: 0, color: '#666' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="App">
      <AppHeader
        user={user}
        onLoginClick={handleLoginClick}
        onLogout={handleLogout}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {currentView === 'games' && <Games user={user} onBadgeEarned={setEarnedBadge} />}
      {currentView === 'math' && user && <MathPractice />}
      {currentView === 'badges' && <BadgesPage userId={user?.id} />}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />

      <BadgeNotification badge={earnedBadge} onClose={() => setEarnedBadge(null)} />
    </div>
  );
}

export default App;
