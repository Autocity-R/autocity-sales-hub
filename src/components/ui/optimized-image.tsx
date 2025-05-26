
import React, { useState, useCallback, memo } from 'react';
import { Skeleton } from './skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  loading?: 'lazy' | 'eager';
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  className = "",
  placeholder,
  loading = 'lazy'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (hasError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-500 text-sm">Afbeelding niet gevonden</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <Skeleton 
          className={`absolute inset-0 ${className}`}
          style={{ width, height }}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        style={{ 
          display: isLoading ? 'none' : 'block',
          width,
          height
        }}
      />
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";
