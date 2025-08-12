import type { 
  WorkflowBuilderError, 
  ErrorLogConfig, 
  ErrorContext,
  ErrorSeverity 
} from '../types/errors';
import { generateUUID } from '../utils/uuid';

/**
 * Service for logging and monitoring errors throughout the application
 */
export class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private config: ErrorLogConfig;
  private errorLog: WorkflowBuilderError[] = [];
  private sessionId: string;

  private constructor() {
    this.sessionId = generateUUID();
    this.config = {
      enableConsoleLogging: true,
      enableRemoteLogging: false,
      logLevel: 'low',
      maxLogEntries: 1000,
    };
  }

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Configure error logging settings
   */
  configure(config: Partial<ErrorLogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log an error with context
   */
  async logError(error: WorkflowBuilderError, context?: Partial<ErrorContext>): Promise<void> {
    // Check if error severity meets logging threshold
    if (!this.shouldLogError(error.severity)) {
      return;
    }

    // Add context information
    const enrichedError: WorkflowBuilderError = {
      ...error,
      context: {
        ...error.context,
        ...context,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date(),
      },
    };

    // Add to local log
    this.addToLog(enrichedError);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(enrichedError);
    }

    // Remote logging
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      try {
        await this.logToRemote(enrichedError);
      } catch (remoteError) {
        console.error('Failed to log error remotely:', remoteError);
      }
    }
  }

  /**
   * Log multiple errors at once
   */
  async logErrors(errors: WorkflowBuilderError[], context?: Partial<ErrorContext>): Promise<void> {
    await Promise.all(errors.map(error => this.logError(error, context)));
  }

  /**
   * Get error logs with optional filtering
   */
  getErrorLogs(filter?: {
    category?: string;
    severity?: ErrorSeverity;
    nodeId?: string;
    since?: Date;
  }): WorkflowBuilderError[] {
    let logs = [...this.errorLog];

    if (filter) {
      if (filter.category) {
        logs = logs.filter(log => log.category === filter.category);
      }
      if (filter.severity) {
        logs = logs.filter(log => this.getSeverityLevel(log.severity) >= this.getSeverityLevel(filter.severity!));
      }
      if (filter.nodeId && 'nodeId' in logs[0]) {
        logs = logs.filter(log => 'nodeId' in log && log.nodeId === filter.nodeId);
      }
      if (filter.since) {
        logs = logs.filter(log => log.timestamp >= filter.since!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let recentErrors = 0;

    this.errorLog.forEach(error => {
      // Count by category
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      
      // Count by severity
      bySeverity[error.severity]++;
      
      // Count recent errors
      if (error.timestamp >= oneHourAgo) {
        recentErrors++;
      }
    });

    return {
      total: this.errorLog.length,
      byCategory,
      bySeverity,
      recentErrors,
    };
  }

  /**
   * Export error logs for debugging
   */
  exportLogs(): string {
    const logs = this.getErrorLogs();
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      config: this.config,
      stats: this.getErrorStats(),
      logs,
    }, null, 2);
  }

  private shouldLogError(severity: ErrorSeverity): boolean {
    const currentLevel = this.getSeverityLevel(this.config.logLevel);
    const errorLevel = this.getSeverityLevel(severity);
    return errorLevel >= currentLevel;
  }

  private getSeverityLevel(severity: ErrorSeverity): number {
    switch (severity) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
      default: return 1;
    }
  }

  private addToLog(error: WorkflowBuilderError): void {
    this.errorLog.push(error);
    
    // Maintain max log entries
    if (this.errorLog.length > this.config.maxLogEntries) {
      this.errorLog = this.errorLog.slice(-this.config.maxLogEntries);
    }
  }

  private logToConsole(error: WorkflowBuilderError): void {
    const logMethod = this.getConsoleMethod(error.severity);
    const prefix = `[${error.category.toUpperCase()}] ${error.severity.toUpperCase()}:`;
    
    logMethod(`${prefix} ${error.message}`, {
      error,
      context: error.context,
      stack: error.stack,
    });
  }

  private getConsoleMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case 'critical':
      case 'high':
        return console.error;
      case 'medium':
        return console.warn;
      case 'low':
      default:
        return console.log;
    }
  }

  private async logToRemote(error: WorkflowBuilderError): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    const payload = {
      error,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    };

    await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }
}

// Singleton instance
export const errorLogger = ErrorLoggingService.getInstance();