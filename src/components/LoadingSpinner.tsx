import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 16, className }) => (
  <div
    className={`inline-block animate-spin rounded-full border-2 border-primary/40 border-t-primary ${className || ''}`}
    style={{ width: size, height: size }}
    aria-label="Chargement"
  />
);
