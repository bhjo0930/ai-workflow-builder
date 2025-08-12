import type { 
  WorkflowBuilderError, 
  ErrorWithRecovery, 
  NodeError,
  ConnectionError,
  WorkflowError,
  ValidationError,
  APIError,
  ErrorRecoveryAction,
  ErrorSeverity,
  ErrorCategory
} from '../types/errors';
import { errorLogger } from './errorLoggingService';
import { generateUUID } from '../utils/uuid';

/**
 * Service for creating, handling, and managing errors throughout the application
 */
export class ErrorHandlingService {
  private static instance: ErrorHandlingService;

  private constructor() {}

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Create a node-specific error
   */
  createNodeError(
    nodeId: string,
    nodeType: string,
    nodeTitle: string,
    message: string,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): NodeError {
    return {
      id: generateUUID(),
      message,
      category: 'execution',
      severity,
      timestamp: new Date(),
      nodeId,
      nodeType,
      nodeTitle,
      context,
      stack: new Error().stack,
    };
  }

  /**
   * Create a connection-specific error
   */
  createConnectionError(
    message: string,
    severity: ErrorSeverity = 'medium',
    connectionId?: string,
    sourceNodeId?: string,
    targetNodeId?: string,
    context?: Record<string, unknown>
  ): ConnectionError {
    return {
      id: generateUUID(),
      message,
      category: 'connection',
      severity,
      timestamp: new Date(),
      connectionId,
      sourceNodeId,
      targetNodeId,
      context,
      stack: new Error().stack,
    };
  }

  /**
   * Create a workflow-specific error
   */
  createWorkflowError(
    workflowId: string,
    workflowName: string,
    message: string,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): WorkflowError {
    return {
      id: generateUUID(),
      message,
      category: 'execution',
      severity,
      timestamp: new Date(),
      workflowId,
      workflowName,
      context,
      stack: new Error().stack,
    };
  }

  /**
   * Create a validation error
   */
  createValidationError(
    message: string,
    field?: string,
    value?: unknown,
    constraint?: string,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): ValidationError {
    return {
      id: generateUUID(),
      message,
      category: 'validation',
      severity,
      timestamp: new Date(),
      field,
      value,
      constraint,
      context,
      stack: new Error().stack,
    };
  }

  /**
   * Create an API error
   */
  createAPIError(
    message: string,
    endpoint?: string,
    statusCode?: number,
    responseData?: unknown,
    severity: ErrorSeverity = 'high',
    context?: Record<string, unknown>
  ): APIError {
    return {
      id: generateUUID(),
      message,
      category: 'api',
      severity,
      timestamp: new Date(),
      endpoint,
      statusCode,
      responseData,
      context,
      stack: new Error().stack,
    };
  }

  /**
   * Create a generic error
   */
  createError(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, unknown>
  ): WorkflowBuilderError {
    return {
      id: generateUUID(),
      message,
      category,
      severity,
      timestamp: new Date(),
      context,
      stack: new Error().stack,
    };
  }

  /**
   * Handle an error with logging and optional recovery actions
   */
  async handleError(
    error: WorkflowBuilderError,
    recoveryActions?: ErrorRecoveryAction[]
  ): Promise<ErrorWithRecovery> {
    // Log the error
    await errorLogger.logError(error);

    // Create error with recovery actions
    const errorWithRecovery: ErrorWithRecovery = {
      ...error,
      recoveryActions,
      canRetry: this.canRetry(error),
      autoRetryCount: 0,
      maxRetries: this.getMaxRetries(error),
    };

    return errorWithRecovery;
  }

  /**
   * Handle multiple errors
   */
  async handleErrors(
    errors: WorkflowBuilderError[]
  ): Promise<ErrorWithRecovery[]> {
    return Promise.all(
      errors.map(error => this.handleError(error))
    );
  }

  /**
   * Create common recovery actions
   */
  createRecoveryActions(error: WorkflowBuilderError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    // Retry action for retryable errors
    if (this.canRetry(error)) {
      actions.push({
        id: 'retry',
        label: 'Retry',
        description: 'Try the operation again',
        action: () => this.retryOperation(error),
        isPrimary: true,
      });
    }

    // Reset action for node errors
    if ('nodeId' in error) {
      actions.push({
        id: 'reset-node',
        label: 'Reset Node',
        description: 'Reset the node to its initial state',
        action: () => this.resetNode(error.nodeId),
      });
    }

    // Reload workflow action for critical errors
    if (error.severity === 'critical') {
      actions.push({
        id: 'reload-workflow',
        label: 'Reload Workflow',
        description: 'Reload the entire workflow',
        action: () => this.reloadWorkflow(),
      });
    }

    // Report error action
    actions.push({
      id: 'report',
      label: 'Report Issue',
      description: 'Report this issue to the development team',
      action: () => this.reportError(error),
    });

    return actions;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: WorkflowBuilderError): string {
    // Check for specific error patterns and provide better messages
    if (error.message.includes('API key')) {
      return 'API key is missing or invalid. Please check your configuration.';
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }

    if (error.message.includes('validation')) {
      return 'Invalid input detected. Please check your data and try again.';
    }

    if (error.message.includes('circular dependency')) {
      return 'Circular dependency detected. Please check your node connections.';
    }

    if (error.category === 'execution' && 'nodeId' in error) {
      return `Error in ${error.nodeTitle}: ${error.message}`;
    }

    // Return original message if no specific pattern matches
    return error.message;
  }

  /**
   * Get error severity color for UI
   */
  getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Get error icon for UI
   */
  getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warning';
      case 'high':
        return 'alert-triangle';
      case 'critical':
        return 'alert-circle';
      default:
        return 'info';
    }
  }

  private canRetry(error: WorkflowBuilderError): boolean {
    // API errors are usually retryable
    if (error.category === 'api') {
      return true;
    }

    // Network-related errors are retryable
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return true;
    }

    // Execution errors might be retryable
    if (error.category === 'execution') {
      return true;
    }

    // Validation errors are usually not retryable without fixing the input
    if (error.category === 'validation') {
      return false;
    }

    return false;
  }

  private getMaxRetries(error: WorkflowBuilderError): number {
    switch (error.severity) {
      case 'low':
        return 3;
      case 'medium':
        return 2;
      case 'high':
        return 1;
      case 'critical':
        return 0;
      default:
        return 1;
    }
  }

  private async retryOperation(error: WorkflowBuilderError): Promise<void> {
    // This would be implemented based on the specific error type
    console.log('Retrying operation for error:', error.id);
    
    // Emit a custom event that components can listen to
    window.dispatchEvent(new CustomEvent('error-retry', {
      detail: { error }
    }));
  }

  private async resetNode(nodeId: string): Promise<void> {
    // Emit a custom event for node reset
    window.dispatchEvent(new CustomEvent('node-reset', {
      detail: { nodeId }
    }));
  }

  private async reloadWorkflow(): Promise<void> {
    // Emit a custom event for workflow reload
    window.dispatchEvent(new CustomEvent('workflow-reload'));
  }

  private async reportError(error: WorkflowBuilderError): Promise<void> {
    // Create error report
    const report = {
      error,
      logs: errorLogger.getErrorLogs({ since: new Date(Date.now() - 60 * 60 * 1000) }),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Copy to clipboard for now (could be extended to send to a reporting service)
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      console.log('Error report copied to clipboard');
    } catch (clipboardError) {
      console.error('Failed to copy error report:', clipboardError);
    }
  }
}

// Singleton instance
export const errorHandler = ErrorHandlingService.getInstance();