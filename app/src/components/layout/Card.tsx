import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'auto' | 'small' | 'medium' | 'large';
  hoverable?: boolean;
  clickable?: boolean;
  centered?: boolean;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'auto',
  hoverable = false,
  clickable = false,
  centered = false,
  className = '',
  onClick,
}) => {
  const cardClasses = [
    'card',
    variant !== 'default' ? variant : '',
    size !== 'auto' ? size : '',
    hoverable ? 'hoverable' : '',
    clickable ? 'clickable' : '',
    centered ? 'centered' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses} onClick={clickable ? onClick : undefined}>
      {children}
    </div>
  );
};

export default Card;
