import { useCallback, useEffect } from 'react';
import { useErrorStore, useErrorActions, useErrorNotifications } from '../stores/errorStore';
import { errorHandler } from '../services/errorHandlingService';
import type { 
  WorkflowBuilderError, 
  ErrorWithRecovery, 
  ErrorSeverity, 
  ErrorCategory,
  ValidationError
} from '../types/errors';

/**
 * Hook for handling errors throughout the application
 */
export const useErrorHandling = () => {
  const { addError, removeError, clearErrors, retryError, executeRecoveryAction } = useErrorActions();
  const { notifications, dismissNotification, clearNotifications } = useErrorNotifications();
  const errors = useErrorStore(state => state.errors);
  const criticalErrors = useErrorStore(state => state.criticalErrors);

  // Error creation helpers
  const createNodeError = useCallback((
    nodeId: string,
    nodeType: string,
    nodeTitle: string,
    message: string,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): Promise<ErrorWithRecovery> => {
    const error = errorHandler.createNodeError(nodeId, nodeType, nodeTitle, message, severity, context);
    const recoveryActions = errorHandler.createRecoveryActions(error);
    return errorHandler.handleError(error, recoveryActions);
  }, []);

  const createConnectionError = useCallback((
    message: string,
    severity: ErrorSeverity = 'medium',
    connectionId?: string,
    sourceNodeId?: string,
    targetNodeId?: string,
    context?: Record<string, unknown>
  ): Promise<ErrorWithRecovery> => {
    const error = errorHandler.createConnectionError(message, severity, connectionId, sourceNodeId, targetNodeId, context);
    const recoveryActions = errorHandler.createRecoveryActions(error);
    return errorHandler.handleError(error, recoveryActions);
  }, []);

  const createValidationError = useCallback((
    message: string,
    field?: string,
    value?: unknown,
    constraint?: string,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): Promise<ErrorWithRecovery> => {
    const error = errorHandler.createValidationError(message, field, value, constraint, severity, context);
    const recoveryActions = errorHandler.createRecoveryActions(error);
    return errorHandler.handleError(error, recoveryActions);
  }, []);

  const createAPIError = useCallback((
    message: string,
    endpoint?: string,
    statusCode?: number,
    responseData?: unknown,
    severity: ErrorSeverity = 'high',
    context?: Record<string, unknown>
  ): Promise<ErrorWithRecovery> => {
    const error = errorHandler.createAPIError(message, endpoint, statusCode, responseData, severity, context);
    const recoveryActions = errorHandler.createRecoveryActions(error);
    return errorHandler.handleError(error, recoveryActions);
  }, []);

  const createGenericError = useCallback((
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): Promise<ErrorWithRecovery> => {
    const error = errorHandler.createError(message, category, severity, context);
    const recoveryActions = errorHandler.createRecoveryActions(error);
    return errorHandler.handleError(error, recoveryActions);
  }, []);

  // Error handling helpers
  const handleError = useCallback(async (error: WorkflowBuilderError | Error): Promise<void> => {
    let processedError: ErrorWithRecovery;

    if (error instanceof Error) {
      // Convert native Error to WorkflowBuilderError
      processedError = await createGenericError(
        error.message,
        'system',
        'medium',
        { stack: error.stack, name: error.name }
      );
    } else {
      // Handle WorkflowBuilderError
      const recoveryActions = errorHandler.createRecoveryActions(error);
      processedError = await errorHandler.handleError(error, recoveryActions);
    }

    addError(processedError);
  }, [addError, createGenericError]);

  const handleNodeError = useCallback(async (
    nodeId: string,
    nodeType: string,
    nodeTitle: string,
    error: Error | string,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): Promise<void> => {
    const message = error instanceof Error ? error.message : error;
    const errorContext = {
      ...context,
      ...(error instanceof Error && { stack: error.stack, name: error.name })
    };

    const processedError = await createNodeError(nodeId, nodeType, nodeTitle, message, severity, errorContext);
    addError(processedError);
  }, [addError, createNodeError]);

  const handleValidationErrors = useCallback(async (validationErrors: ValidationError[]): Promise<void> => {
    const processedErrors = await Promise.all(
      validationErrors.map(error => {
        const recoveryActions = errorHandler.createRecoveryActions(error);
        return errorHandler.handleError(error, recoveryActions);
      })
    );

    processedErrors.forEach(error => addError(error));
  }, [addError]);

  // Error recovery helpers
  const retryErrorById = useCallback(async (errorId: string): Promise<void> => {
    await retryError(errorId);
  }, [retryError]);

  const executeRecoveryActionById = useCallback(async (errorId: string, actionId: string): Promise<void> => {
    await executeRecoveryAction(errorId, actionId);
  }, [executeRecoveryAction]);

  // Error filtering and querying
  const getErrorsByNode = useCallback((nodeId: string): ErrorWithRecovery[] => {
    return errors.filter(error => 'nodeId' in error && error.nodeId === nodeId);
  }, [errors]);

  const getErrorsBySeverity = useCallback((severity: ErrorSeverity): ErrorWithRecovery[] => {
    return errors.filter(error => error.severity === severity);
  }, [errors]);

  const getErrorsByCategory = useCallback((category: ErrorCategory): ErrorWithRecovery[] => {
    return errors.filter(error => error.category === category);
  }, [errors]);

  const hasBlockingErrors = useCallback((): boolean => {
    return errors.some(error => error.severity === 'critical' || error.severity === 'high');
  }, [errors]);

  // Error statistics
  const getErrorStats = useCallback(() => {
    const stats = {
      total: errors.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCategory: {} as Record<ErrorCategory, number>,
      recentErrors: 0,
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    errors.forEach(error => {
      // Count by severity
      stats[error.severity]++;
      
      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      
      // Count recent errors
      if (error.timestamp >= oneHourAgo) {
        stats.recentErrors++;
      }
    });

    return stats;
  }, [errors]);

  // Setup error event listeners
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      handleError(event.error || new Error(event.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    };

    // Listen for unhandled errors
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Listen for custom error events
    const handleCustomError = (event: CustomEvent) => {
      handleError(event.detail.error);
    };

    window.addEventListener('workflow-error', handleCustomError as EventListener);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('workflow-error', handleCustomError as EventListener);
    };
  }, [handleError]);

  return {
    // Error state
    errors,
    notifications,
    criticalErrors,
    
    // Error creation
    createNodeError,
    createConnectionError,
    createValidationError,
    createAPIError,
    createGenericError,
    
    // Error handling
    handleError,
    handleNodeError,
    handleValidationErrors,
    
    // Error management
    addError,
    removeError,
    clearErrors,
    
    // Error recovery
    retryErrorById,
    executeRecoveryActionById,
    
    // Notifications
    dismissNotification,
    clearNotifications,
    
    // Error querying
    getErrorsByNode,
    getErrorsBySeverity,
    getErrorsByCategory,
    hasBlockingErrors,
    getErrorStats,
    
    // Utilities
    getUserFriendlyMessage: errorHandler.getUserFriendlyMessage,
    getSeverityColor: errorHandler.getSeverityColor,
    getSeverityIcon: errorHandler.getSeverityIcon,
  };
};

/**
 * Hook for node-specific error handling
 */
export const useNodeErrorHandling = (nodeId: string, nodeType: string, nodeTitle: string) => {
  const { handleNodeError, getErrorsByNode } = useErrorHandling();

  const nodeErrors = getErrorsByNode(nodeId);

  const handleError = useCallback(async (
    error: Error | string,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): Promise<void> => {
    await handleNodeError(nodeId, nodeType, nodeTitle, error, severity, context);
  }, [handleNodeError, nodeId, nodeType, nodeTitle]);

  const clearNodeErrors = useCallback(() => {
    useErrorStore.getState().clearErrorsByNodeId(nodeId);
  }, [nodeId]);

  const hasErrors = nodeErrors.length > 0;
  const hasBlockingErrors = nodeErrors.some(error => 
    error.severity === 'critical' || error.severity === 'high'
  );

  return {
    nodeErrors,
    hasErrors,
    hasBlockingErrors,
    handleError,
    clearNodeErrors,
  };
};

export default useErrorHandling;