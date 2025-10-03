import React, { useState } from 'react';
import "./SignupPage.css"
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { ROUTES } from '../lib/routes';
import { FirebaseError } from 'firebase/app';

const SignupPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    // Helper function to get user-friendly error messages
    const getErrorMessage = (errorCode: string): string => {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'This email is already registered. Try logging in instead.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/weak-password':
                return 'Password is too weak. Use at least 6 characters.';
            case 'auth/operation-not-allowed':
                return 'Email/password accounts are not enabled. Please contact support.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your internet connection.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again later.';
            default:
                return 'Failed to create an account. Please try again.';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        try {
            setError('');
            setLoading(true);
            await signup(email, password);
            navigate(ROUTES.HOME);
        } catch (err) {
            if (err instanceof FirebaseError) {
                setError(getErrorMessage(err.code));
                console.error(`Firebase error (${err.code}):`, err.message);
            } else {
                setError('Failed to create an account');
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle();
            navigate(ROUTES.HOME);
        } catch (err) {
            if (err instanceof FirebaseError) {
                setError(`Google sign-in failed: ${err.message}`);
                console.error(`Firebase error (${err.code}):`, err.message);
            } else {
                setError('Failed to sign up with Google');
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-container">
            <h2>Sign Up</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <input
                        type="password"
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>

            <div className="divider">
                <span>OR</span>
            </div>

            <button
                className="google-button"
                onClick={handleGoogleSignup}
                disabled={loading}
            >
                Continue with Google
            </button>

            <div className="login-link">
                Already have an account? <Link to={ROUTES.LOGIN}>Log In</Link>
            </div>
        </div>
    );
};

export default SignupPage;