import { useMemo, useCallback, useRef } from 'react';
import { debounce, throttle } from '../utils/performanceUtils';
import type { Node, Connection } from '../types';

interface UsePerformanceOptimizationsOptions {
  // Debounce delay for property updates (ms)
  propertyUpdateDelay?: number;
  // Throttle delay for position updates (ms)
  positionUpdateDelay?: number;
  // Maximum number of nodes to render without virtualization
  virtualizationThreshold?: number;
  // Enable/disable various optimizations
  enableDebouncing?: boolean;
  enableThrottling?: boolean;
  enableMemoization?: boolean;
}

export const usePerformanceOptimizations = ({
  propertyUpdateDelay = 300,
  positionUpdateDelay = 16, // ~60fps
  virtualizationThreshold = 100,
  enableDebouncing = true,
  enableThrottling = true,
  enableMemoization = true,
}: UsePerformanceOptimizationsOptions = {}) => {
  const updateCountRef = useRef(0);

  // Debounced property update function
  const debouncedPropertyUpdate = useMemo(() => {
    if (!enableDebouncing) {
      return (callback: () => void) => callback();
    }
    
    return debounce((callback: () => void) => {
      callback();
    }, propertyUpdateDelay);
  }, [enableDebouncing, propertyUpdateDelay]);

  // Throttled position update function
  const throttledPositionUpdate = useMemo(() => {
    if (!enableThrottling) {
      return (callback: () => void) => callback();
    }
    
    return throttle((callback: () => void) => {
      callback();
    }, positionUpdateDelay);
  }, [enableThrottling, positionUpdateDelay]);

  // Memoized node filtering for large workflows
  const getVisibleNodes = useCallback((
    nodes: Node[],
    viewport: { x: number; y: number; zoom: number },
    canvasSize: { width: number; height: number }
  ) => {
    if (!enableMemoization || nodes.length < virtualizationThreshold) {
      return nodes;
    }

    // Calculate visible area with some padding
    const padding = 200;
    const visibleArea = {
      left: -viewport.x / viewport.zoom - padding,
      top: -viewport.y / viewport.zoom - padding,
      right: (-viewport.x + canvasSize.width) / viewport.zoom + padding,
      bottom: (-viewport.y + canvasSize.height) / viewport.zoom + padding,
    };

    // Filter nodes that are within the visible area
    return nodes.filter(node => {
      const nodeSize = 200; // Approximate node size
      return (
        node.position.x + nodeSize >= visibleArea.left &&
        node.position.x <= visibleArea.right &&
        node.position.y + nodeSize >= visibleArea.top &&
        node.position.y <= visibleArea.bottom
      );
    });
  }, [enableMemoization, virtualizationThreshold]);

  // Memoized connection filtering
  const getVisibleConnections = useCallback((
    connections: Connection[],
    visibleNodeIds: Set<string>
  ) => {
    if (!enableMemoization) {
      return connections;
    }

    return connections.filter(connection => 
      visibleNodeIds.has(connection.sourceNodeId) || 
      visibleNodeIds.has(connection.targetNodeId)
    );
  }, [enableMemoization]);

  // Performance monitoring
  const trackUpdate = useCallback(() => {
    updateCountRef.current += 1;
    
    // Log performance metrics every 100 updates
    if (updateCountRef.current % 100 === 0) {
      console.log(`Performance: ${updateCountRef.current} updates processed`);
    }
  }, []);

  // Batch multiple updates together
  const batchUpdates = useCallback((updates: (() => void)[]) => {
    // Use React's automatic batching in React 18+
    updates.forEach(update => update());
  }, []);

  // Memory cleanup utility
  const cleanupResources = useCallback(() => {
    // Clear any pending debounced/throttled calls
    if (typeof debouncedPropertyUpdate === 'function' && 'cancel' in debouncedPropertyUpdate) {
      (debouncedPropertyUpdate as any).cancel?.();
    }
    if (typeof throttledPositionUpdate === 'function' && 'cancel' in throttledPositionUpdate) {
      (throttledPositionUpdate as any).cancel?.();
    }
  }, [debouncedPropertyUpdate, throttledPositionUpdate]);

  return {
    debouncedPropertyUpdate,
    throttledPositionUpdate,
    getVisibleNodes,
    getVisibleConnections,
    trackUpdate,
    batchUpdates,
    cleanupResources,
    shouldVirtualize: (nodeCount: number) => nodeCount >= virtualizationThreshold,
  };
};