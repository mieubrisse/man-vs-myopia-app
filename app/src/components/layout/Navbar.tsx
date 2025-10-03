import React from 'react';
import { useAuth } from '../../lib/AuthContext.tsx';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes.ts';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to={ROUTES.HOME} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2>Vision Assessment</h2>
          </Link>
        </div>
        <div className="navbar-user">
          <span className="user-email">{currentUser?.email}</span>
          <button onClick={handleSignOut} className="sign-out-button">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
