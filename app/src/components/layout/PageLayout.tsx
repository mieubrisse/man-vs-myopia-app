import React from 'react';
import './PageLayout.css';
import Navbar from './Navbar.tsx';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showNavbar?: boolean;
  containerWidth?: 'narrow' | 'medium' | 'full';
  centered?: boolean;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  showNavbar = true,
  containerWidth = 'medium',
  centered = false,
  className = '',
}) => {
  return (
    <div className={`page-layout ${className}`}>
      {showNavbar && <Navbar />}
      <div className="main-content">
        <div
          className={`page-layout-container ${containerWidth} ${centered ? 'page-layout-centered' : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
