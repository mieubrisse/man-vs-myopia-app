import React, { useEffect, useState } from 'react';
import './PageLayout.css';
import Navbar from './Navbar.tsx';
import Callout from '../helpers/Callout.tsx';

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
  const [isChrome, setIsChrome] = useState(true);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsChrome(userAgent.includes('chrome') && !userAgent.includes('edge'));
  }, []);
  return (
    <div className={`page-layout ${className}`}>
      {showNavbar && <Navbar />}
      {!isChrome && (
        <Callout type={'warning'}>
          This application requires Google Chrome browser to run tests properly. Please switch to
          Chrome for the best experience.
        </Callout>
      )}
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
