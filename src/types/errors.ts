// Error types and interfaces for comprehensive error handling

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'validation' | 'execution' | 'connection' | 'persistence' | 'api' | 'ui' | 'system';

export interface BaseError {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, unknown>;
  stack?: string;
}

export interface NodeError extends BaseError {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
}

export interface ConnectionError extends BaseError {
  connectionId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
}

export interface WorkflowError extends BaseError {
  workflowId: string;
  workflowName: string;
}

export interface ValidationError extends BaseError {
  field?: string;
  value?: unknown;
  constraint?: string;
}

export interface APIError extends BaseError {
  endpoint?: string;
  statusCode?: number;
  responseData?: unknown;
}

export type WorkflowBuilderError = 
  | NodeError 
  | ConnectionError 
  | WorkflowError 
  | ValidationError 
  | APIError 
  | BaseError;

// Error recovery actions
export interface ErrorRecoveryAction {
  id: string;
  label: string;
  description?: string;
  action: () => void | Promise<void>;
  isPrimary?: boolean;
}

export interface ErrorWithRecovery {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, unknown>;
  stack?: string;
  recoveryActions?: ErrorRecoveryAction[];
  canRetry?: boolean;
  autoRetryCount?: number;
  maxRetries?: number;
  // Additional properties from specific error types
  nodeId?: string;
  nodeType?: string;
  nodeTitle?: string;
  connectionId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  workflowId?: string;
  workflowName?: string;
  field?: string;
  value?: unknown;
  constraint?: string;
  endpoint?: string;
  statusCode?: number;
  responseData?: unknown;
}

// Error boundary state
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any; // React.ErrorInfo
  errorId?: string;
}

// Error notification types
export type ErrorNotificationType = 'toast' | 'modal' | 'inline' | 'banner';

export interface ErrorNotification {
  id: string;
  error: ErrorWithRecovery;
  type: ErrorNotificationType;
  isVisible: boolean;
  isDismissible: boolean;
  autoHideAfter?: number;
}

// Error logging configuration
export interface ErrorLogConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  logLevel: ErrorSeverity;
  maxLogEntries: number;
  remoteEndpoint?: string;
}

// Error context for better debugging
export interface ErrorContext {
  userId?: string;
  sessionId: string;
  workflowId?: string;
  nodeId?: string;
  userAgent: string;
  timestamp: Date;
  url: string;
  additionalData?: Record<string, unknown>;
}