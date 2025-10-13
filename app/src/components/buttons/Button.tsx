import React from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'neutral';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  icon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const buttonClasses = [
    'action-button',
    `action-button-${variant}`,
    `action-button-${size}`,
    fullWidth ? 'action-button-full-width' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClasses} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <span className="loading-spinner"></span>
      ) : (
        <>
          {icon && <span className="button-icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
