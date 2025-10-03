import { ROUTES } from '../../lib/routes.ts';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import './HomeLinkButton.css';

export const HomeLinkButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-link">
      <button onClick={() => navigate(ROUTES.HOME)} className="home-link-button">
        ← Home
      </button>
    </div>
  );
};
