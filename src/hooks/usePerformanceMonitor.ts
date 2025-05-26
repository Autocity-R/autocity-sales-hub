
import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
}

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>();
  const renderEndTime = useRef<number>();

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    renderEndTime.current = performance.now();
    
    if (renderStartTime.current && renderEndTime.current) {
      const renderTime = renderEndTime.current - renderStartTime.current;
      
      // Log alleen als render tijd > 16ms (60fps threshold)
      if (renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    }
  });

  return {
    startMeasure: () => {
      renderStartTime.current = performance.now();
    },
    endMeasure: () => {
      renderEndTime.current = performance.now();
      if (renderStartTime.current && renderEndTime.current) {
        return renderEndTime.current - renderStartTime.current;
      }
      return 0;
    }
  };
}
