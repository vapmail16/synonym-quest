import React, { useState, useEffect } from 'react';
import authService, { LoginCredentials, RegisterData } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [loginData, setLoginData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    displayName: ''
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
      setLoginData({ email: '', password: '' });
      setRegisterData({ username: '', email: '', password: '', displayName: '' });
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login(loginData);
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authService.register(registerData);
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string, isLoginForm: boolean) => {
    if (isLoginForm) {
      setLoginData(prev => ({ ...prev, [field]: value }));
    } else {
      setRegisterData(prev => ({ ...prev, [field]: value }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab-button ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`tab-button ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={loginData.email}
                onChange={(e) => handleInputChange('email', e.target.value, true)}
                required
                disabled={loading}
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={loginData.password}
                onChange={(e) => handleInputChange('password', e.target.value, true)}
                required
                disabled={loading}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="auth-button primary"
              disabled={loading || !loginData.email || !loginData.password}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                value={registerData.username}
                onChange={(e) => handleInputChange('username', e.target.value, false)}
                required
                disabled={loading}
                placeholder="Choose a username"
                minLength={3}
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                value={registerData.email}
                onChange={(e) => handleInputChange('email', e.target.value, false)}
                required
                disabled={loading}
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-display-name">Display Name (Optional)</label>
              <input
                id="register-display-name"
                type="text"
                value={registerData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value, false)}
                disabled={loading}
                placeholder="How should we call you?"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                value={registerData.password}
                onChange={(e) => handleInputChange('password', e.target.value, false)}
                required
                disabled={loading}
                placeholder="Create a password (min 6 characters)"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="auth-button primary"
              disabled={loading || !registerData.username || !registerData.email || !registerData.password}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="link-button"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .auth-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .auth-modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .auth-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 0;
          border-bottom: 1px solid #eee;
          margin-bottom: 24px;
        }

        .auth-modal-header h2 {
          margin: 0;
          color: #333;
          font-size: 24px;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          color: #666;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }

        .close-button:hover {
          color: #333;
        }

        .auth-tabs {
          display: flex;
          margin: 0 24px 24px;
          border-bottom: 1px solid #eee;
        }

        .tab-button {
          flex: 1;
          padding: 12px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          color: #666;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-button.active {
          color: #4F46E5;
          border-bottom-color: #4F46E5;
          font-weight: 600;
        }

        .auth-form {
          padding: 0 24px 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          color: #333;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-group input:disabled {
          background: #f5f5f5;
          color: #666;
        }

        .auth-button {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 16px;
        }

        .auth-button.primary {
          background: #4F46E5;
          color: white;
        }

        .auth-button.primary:hover:not(:disabled) {
          background: #4338CA;
        }

        .auth-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .auth-footer {
          padding: 0 24px 24px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        .link-button {
          background: none;
          border: none;
          color: #4F46E5;
          cursor: pointer;
          font-weight: 600;
          text-decoration: underline;
        }

        .link-button:hover {
          color: #4338CA;
        }

        .error-message {
          background: #FEE2E2;
          color: #DC2626;
          padding: 12px;
          margin: 0 24px 16px;
          border-radius: 8px;
          font-size: 14px;
          border: 1px solid #FECACA;
        }

        @media (max-width: 480px) {
          .auth-modal {
            margin: 20px;
            max-width: none;
          }
          
          .auth-modal-header,
          .auth-form,
          .auth-footer {
            padding-left: 20px;
            padding-right: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthModal;
