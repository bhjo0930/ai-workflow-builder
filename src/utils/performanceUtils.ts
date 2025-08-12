// Debounce function - delays execution until after wait milliseconds have elapsed
// since the last time the debounced function was invoked
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T & { cancel: () => void } {
  let timeout: number | null = null;
  let result: ReturnType<T>;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) result = func.apply(context, args);
    };

    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) result = func.apply(context, args);
    
    return result;
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

// Throttle function - ensures function is called at most once per specified time period
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T & { cancel: () => void } {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (!inThrottle) {
      lastResult = func.apply(context, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    
    return lastResult;
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    inThrottle = false;
  };

  return throttled;
}

// Memoization utility for expensive calculations
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T & { cache: Map<string, ReturnType<T>>; clear: () => void } {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = function (this: any, ...args: Parameters<T>) {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func.apply(this, args);
    cache.set(key, result);
    
    return result;
  } as T & { cache: Map<string, ReturnType<T>>; clear: () => void };

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return memoized;
}

// Batch DOM updates to avoid layout thrashing
export function batchDOMUpdates(updates: (() => void)[]): void {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

// Measure performance of a function
export function measurePerformance<T extends (...args: any[]) => any>(
  func: T,
  label?: string
): T {
  return function (this: any, ...args: Parameters<T>) {
    const startTime = performance.now();
    const result = func.apply(this, args);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    const functionLabel = label || func.name || 'Anonymous function';
    
    if (duration > 16) { // Log if slower than 60fps
      console.warn(`Performance: ${functionLabel} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } as T;
}

// Virtual scrolling utility for large lists
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function calculateVirtualScrollRange(
  scrollTop: number,
  totalItems: number,
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );
  
  const start = Math.max(0, visibleStart - overscan);
  const end = Math.min(totalItems - 1, visibleEnd + overscan);
  
  return {
    start,
    end,
    visibleStart,
    visibleEnd,
    totalHeight: totalItems * itemHeight,
    offsetY: start * itemHeight,
  };
}

// Intersection Observer utility for lazy loading
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
}

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    };
  }
  return null;
}

// Frame rate monitoring
export class FrameRateMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();

  update(): number {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.frames.push(1000 / delta);
    
    // Keep only the last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }

    return this.getAverageFPS();
  }

  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.frames.length);
  }

  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
  }
}