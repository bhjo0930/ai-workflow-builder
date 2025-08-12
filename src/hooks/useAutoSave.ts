import { useEffect, useRef } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

interface UseAutoSaveOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onAutoSave?: () => void;
  onError?: (error: Error) => void;
}

export const useAutoSave = ({
  enabled = true,
  interval = 30000, // 30 seconds default
  onAutoSave,
  onError,
}: UseAutoSaveOptions = {}) => {
  const { workflow, hasUnsavedChanges } = useWorkflowStore();
  const intervalRef = useRef<number | null>(null);
  const lastSaveRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const autoSave = async () => {
      if (!hasUnsavedChanges) return;

      // Create a hash of the current workflow to avoid unnecessary saves
      const currentWorkflowHash = JSON.stringify({
        nodes: workflow.nodes,
        connections: workflow.connections,
        name: workflow.name,
      });

      if (currentWorkflowHash === lastSaveRef.current) return;

      try {
        // Save to localStorage as auto-save
        const autoSaveData = {
          workflow,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        };

        localStorage.setItem('workflow-autosave', JSON.stringify(autoSaveData));
        lastSaveRef.current = currentWorkflowHash;
        
        // Mark as saved in the store (but don't update lastSaved timestamp for manual saves)
        // This prevents the "unsaved changes" indicator from showing for auto-saves
        onAutoSave?.();
        
        console.log('Auto-saved workflow at', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Auto-save failed:', error);
        onError?.(error as Error);
      }
    };

    // Set up auto-save interval
    intervalRef.current = setInterval(autoSave, interval);

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, hasUnsavedChanges, workflow, onAutoSave, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isAutoSaveEnabled: enabled,
  };
};

// Utility function to recover from auto-save
export const getAutoSavedWorkflow = () => {
  try {
    const autoSaveData = localStorage.getItem('workflow-autosave');
    if (!autoSaveData) return null;

    const parsed = JSON.parse(autoSaveData);
    return {
      workflow: parsed.workflow,
      timestamp: new Date(parsed.timestamp),
      version: parsed.version,
    };
  } catch (error) {
    console.error('Failed to parse auto-saved workflow:', error);
    return null;
  }
};

// Utility function to clear auto-save data
export const clearAutoSave = () => {
  try {
    localStorage.removeItem('workflow-autosave');
  } catch (error) {
    console.error('Failed to clear auto-save data:', error);
  }
};