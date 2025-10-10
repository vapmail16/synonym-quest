import React, { useState, useEffect } from 'react';
import './App.css';
import Games from './Games';
import './Games.css';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';
import authService, { User } from './services/authService';

const AppHeader: React.FC<{ 
  user: User | null; 
  onLoginClick: () => void; 
  onLogout: () => void; 
}> = ({ user, onLoginClick, onLogout }) => (
  <header style={{ 
    backgroundColor: '#3b82f6', 
    color: 'white', 
    padding: '2rem',
    position: 'relative'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px'
    }}>
      <div style={{ textAlign: 'left' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>🧠 Synonym Quest</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '1.2rem', opacity: 0.9 }}>
          Choose from 9 different vocabulary games to enhance your learning!
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {user ? (
          <UserProfile onLogout={onLogout} />
        ) : (
          <button 
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
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.2)'}
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

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            // Try to get fresh user data
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
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        background: '#f8f9fa'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e9ecef',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
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
      />
      <Games user={user} />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;