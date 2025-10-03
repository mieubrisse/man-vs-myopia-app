import React, { useState } from 'react';

import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { ROUTES } from '../lib/routes';
import { FirebaseError } from 'firebase/app';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Helper function to get user-friendly error messages
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email. Please check your email or sign up.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again or reset your password.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later or reset your password.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/invalid-login-credentials':
        return 'Invalid login credentials. Please check your email and password.';
      default:
        return 'Failed to log in. Please try again.';
    }
  };

  console.log(currentUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err.code));
        console.error(`Firebase error (${err.code}):`, err.message);
      } else {
        setError('Failed to log in');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(`Google sign-in failed: ${err.message}`);
        console.error(`Firebase error (${err.code}):`, err.message);
      } else {
        setError('Failed to log in with Google');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="divider">
        <span>OR</span>
      </div>

      <button className="google-button" onClick={handleGoogleLogin} disabled={loading}>
        Continue with Google
      </button>

      <div className="signup-link">
        Don't have an account? <Link to={ROUTES.SIGNUP}>Sign Up</Link>
      </div>
    </div>
  );
};

export default LoginPage;
