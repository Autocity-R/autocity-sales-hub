import { useState, useEffect } from "react";

export type ScreenSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('lg');
  
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('sm');
      else if (width < 768) setScreenSize('md');
      else if (width < 1024) setScreenSize('lg');
      else if (width < 1280) setScreenSize('xl');
      else if (width < 1536) setScreenSize('2xl');
      else setScreenSize('3xl');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return {
    screenSize,
    isMobile: screenSize === 'sm',
    isTablet: screenSize === 'md',
    isDesktop: ['lg', 'xl', '2xl', '3xl'].includes(screenSize),
    isLargeDesktop: ['2xl', '3xl'].includes(screenSize),
    isExtraLarge: screenSize === '3xl'
  };
};
