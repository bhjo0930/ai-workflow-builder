import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ErrorWithRecovery, ErrorNotification } from '../types/errors';
import { errorHandler } from '../services/errorHandlingService';

interface ErrorState {
  // Active errors
  errors: ErrorWithRecovery[];
  notifications: ErrorNotification[];
  
  // Error statistics
  totalErrors: number;
  criticalErrors: number;
  
  // UI state
  showErrorPanel: boolean;
  selectedErrorId: string | null;
  
  // Actions
  addError: (error: ErrorWithRecovery) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  clearErrorsByCategory: (category: string) => void;
  clearErrorsByNodeId: (nodeId: string) => void;
  
  // Notification actions
  showNotification: (error: ErrorWithRecovery) => void;
  dismissNotification: (errorId: string) => void;
  clearNotifications: () => void;
  
  // UI actions
  toggleErrorPanel: () => void;
  selectError: (errorId: string | null) => void;
  
  // Recovery actions
  retryError: (errorId: string) => Promise<void>;
  executeRecoveryAction: (errorId: string, actionId: string) => Promise<void>;
}

export const useErrorStore = create<ErrorState>()(
  immer((set, get) => ({
    // Initial state
    errors: [],
    notifications: [],
    totalErrors: 0,
    criticalErrors: 0,
    showErrorPanel: false,
    selectedErrorId: null,

    // Add error to the store
    addError: (error: ErrorWithRecovery) => {
      set((state) => {
        // Check if error already exists (prevent duplicates)
        const existingIndex = state.errors.findIndex(e => e.id === error.id);
        
        if (existingIndex >= 0) {
          // Update existing error
          state.errors[existingIndex] = error;
        } else {
          // Add new error
          state.errors.push(error);
          state.totalErrors++;
          
          if (error.severity === 'critical') {
            state.criticalErrors++;
          }
        }
        
        // Auto-show error panel for critical errors
        if (error.severity === 'critical') {
          state.showErrorPanel = true;
        }
      });
      
      // Show notification for the error
      get().showNotification(error);
    },

    // Remove error from the store
    removeError: (errorId: string) => {
      set((state) => {
        const errorIndex = state.errors.findIndex(e => e.id === errorId);
        
        if (errorIndex >= 0) {
          const error = state.errors[errorIndex];
          state.errors.splice(errorIndex, 1);
          
          if (error.severity === 'critical') {
            state.criticalErrors = Math.max(0, state.criticalErrors - 1);
          }
          
          // Clear selection if this error was selected
          if (state.selectedErrorId === errorId) {
            state.selectedErrorId = null;
          }
        }
      });
    },

    // Clear all errors
    clearErrors: () => {
      set((state) => {
        state.errors = [];
        state.totalErrors = 0;
        state.criticalErrors = 0;
        state.selectedErrorId = null;
      });
    },

    // Clear errors by category
    clearErrorsByCategory: (category: string) => {
      set((state) => {
        const removedErrors = state.errors.filter(e => e.category === category);
        state.errors = state.errors.filter(e => e.category !== category);
        
        // Update counters
        const removedCritical = removedErrors.filter(e => e.severity === 'critical').length;
        state.criticalErrors = Math.max(0, state.criticalErrors - removedCritical);
        
        // Clear selection if selected error was removed
        if (state.selectedErrorId && removedErrors.some(e => e.id === state.selectedErrorId)) {
          state.selectedErrorId = null;
        }
      });
    },

    // Clear errors by node ID
    clearErrorsByNodeId: (nodeId: string) => {
      set((state) => {
        const removedErrors = state.errors.filter(e => 'nodeId' in e && e.nodeId === nodeId);
        state.errors = state.errors.filter(e => !('nodeId' in e) || e.nodeId !== nodeId);
        
        // Update counters
        const removedCritical = removedErrors.filter(e => e.severity === 'critical').length;
        state.criticalErrors = Math.max(0, state.criticalErrors - removedCritical);
        
        // Clear selection if selected error was removed
        if (state.selectedErrorId && removedErrors.some(e => e.id === state.selectedErrorId)) {
          state.selectedErrorId = null;
        }
      });
    },

    // Show notification for an error
    showNotification: (error: ErrorWithRecovery) => {
      set((state) => {
        // Check if notification already exists
        const existingIndex = state.notifications.findIndex(n => n.id === error.id);
        
        if (existingIndex >= 0) {
          // Update existing notification
          state.notifications[existingIndex].error = error;
        } else {
          // Create new notification
          const notification: ErrorNotification = {
            id: error.id,
            error,
            type: 'toast',
            isVisible: true,
            isDismissible: true,
            autoHideAfter: error.severity === 'low' ? 5000 : undefined,
          };
          
          state.notifications.push(notification);
        }
      });
    },

    // Dismiss notification
    dismissNotification: (errorId: string) => {
      set((state) => {
        state.notifications = state.notifications.filter(n => n.id !== errorId);
      });
    },

    // Clear all notifications
    clearNotifications: () => {
      set((state) => {
        state.notifications = [];
      });
    },

    // Toggle error panel visibility
    toggleErrorPanel: () => {
      set((state) => {
        state.showErrorPanel = !state.showErrorPanel;
      });
    },

    // Select an error for detailed view
    selectError: (errorId: string | null) => {
      set((state) => {
        state.selectedErrorId = errorId;
        if (errorId) {
          state.showErrorPanel = true;
        }
      });
    },

    // Retry an error
    retryError: async (errorId: string) => {
      const { errors } = get();
      const error = errors.find(e => e.id === errorId);
      
      if (!error || !error.canRetry) {
        return;
      }

      // Increment retry count
      set((state) => {
        const errorIndex = state.errors.findIndex(e => e.id === errorId);
        if (errorIndex >= 0) {
          const currentError = state.errors[errorIndex];
          if (currentError.autoRetryCount !== undefined && currentError.maxRetries !== undefined) {
            if (currentError.autoRetryCount < currentError.maxRetries) {
              state.errors[errorIndex] = {
                ...currentError,
                autoRetryCount: currentError.autoRetryCount + 1,
              };
            }
          }
        }
      });

      // Execute retry logic
      try {
        // Emit retry event
        window.dispatchEvent(new CustomEvent('error-retry', {
          detail: { error }
        }));
        
        // Remove error on successful retry
        get().removeError(errorId);
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    },

    // Execute a recovery action
    executeRecoveryAction: async (errorId: string, actionId: string) => {
      const { errors } = get();
      const error = errors.find(e => e.id === errorId);
      
      if (!error || !error.recoveryActions) {
        return;
      }

      const action = error.recoveryActions.find(a => a.id === actionId);
      if (!action) {
        return;
      }

      try {
        await action.action();
        
        // Remove error if action was successful and it was a primary action
        if (action.isPrimary) {
          get().removeError(errorId);
        }
      } catch (actionError) {
        console.error('Recovery action failed:', actionError);
        
        // Create a new error for the failed recovery action
        const recoveryError = errorHandler.createError(
          `Recovery action "${action.label}" failed: ${actionError instanceof Error ? actionError.message : 'Unknown error'}`,
          'system',
          'medium',
          {
            originalErrorId: errorId,
            recoveryActionId: actionId,
          }
        );
        
        const errorWithRecovery = await errorHandler.handleError(recoveryError);
        get().addError(errorWithRecovery);
      }
    },
  }))
);

// Helper hooks for common error operations
export const useErrorActions = () => {
  const store = useErrorStore();
  
  return {
    addError: store.addError,
    removeError: store.removeError,
    clearErrors: store.clearErrors,
    retryError: store.retryError,
    executeRecoveryAction: store.executeRecoveryAction,
  };
};

export const useErrorNotifications = () => {
  const notifications = useErrorStore(state => state.notifications);
  const dismissNotification = useErrorStore(state => state.dismissNotification);
  const clearNotifications = useErrorStore(state => state.clearNotifications);
  
  return {
    notifications,
    dismissNotification,
    clearNotifications,
  };
};

export const useErrorPanel = () => {
  const showErrorPanel = useErrorStore(state => state.showErrorPanel);
  const selectedErrorId = useErrorStore(state => state.selectedErrorId);
  const errors = useErrorStore(state => state.errors);
  const toggleErrorPanel = useErrorStore(state => state.toggleErrorPanel);
  const selectError = useErrorStore(state => state.selectError);
  
  const selectedError = selectedErrorId ? errors.find(e => e.id === selectedErrorId) : null;
  
  return {
    showErrorPanel,
    selectedError,
    errors,
    toggleErrorPanel,
    selectError,
  };
};