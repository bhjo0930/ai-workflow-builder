import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, Bug } from 'lucide-react';
import type { ErrorBoundaryState } from '../types/errors';
import { errorHandler } from '../services/errorHandlingService';
import { errorLogger } from '../services/errorLoggingService';
import { generateUUID } from '../utils/uuid';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Global error boundary that catches React component errors
 * and provides user-friendly error handling with recovery options
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: generateUUID(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId || generateUUID();
    
    // Create a system error for the error boundary
    const systemError = errorHandler.createError(
      `React Error Boundary: ${error.message}`,
      'system',
      'critical',
      {
        errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.retryCount,
      }
    );

    // Log the error
    errorLogger.logError(systemError, {
      additionalData: {
        errorInfo,
        stack: error.stack,
      }
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleDownloadLogs = async () => {
    try {
      const logs = errorLogger.exportLogs();
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download logs:', error);
    }
  };

  handleReportError = async () => {
    if (!this.state.error || !this.state.errorInfo) return;

    const report = {
      errorId: this.state.errorId,
      error: {
        message: this.state.error.message,
        stack: this.state.error.stack,
        name: this.state.error.name,
      },
      errorInfo: this.state.errorInfo,
      logs: errorLogger.getErrorLogs({ since: new Date(Date.now() - 60 * 60 * 1000) }),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      alert('Error report copied to clipboard. Please share this with the development team.');
    } catch (clipboardError) {
      console.error('Failed to copy error report:', clipboardError);
      // Fallback: show the report in a new window
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(`<pre>${JSON.stringify(report, null, 2)}</pre>`);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Something went wrong
            </h1>

            {/* Error Message */}
            <p className="text-gray-600 text-center mb-6">
              The application encountered an unexpected error. You can try refreshing the page or report this issue.
            </p>

            {/* Error Details (in development) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                <div className="font-semibold mb-1">Error:</div>
                <div className="mb-2">{this.state.error.message}</div>
                {this.state.error.stack && (
                  <>
                    <div className="font-semibold mb-1">Stack:</div>
                    <div className="whitespace-pre-wrap">{this.state.error.stack}</div>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Retry Button */}
              {this.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </button>
              )}

              {/* Reload Button */}
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </button>

              {/* Secondary Actions */}
              <div className="flex space-x-2">
                {/* Download Logs */}
                <button
                  onClick={this.handleDownloadLogs}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Logs
                </button>

                {/* Report Error */}
                <button
                  onClick={this.handleReportError}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  <Bug className="w-4 h-4 mr-1" />
                  Report Issue
                </button>
              </div>
            </div>

            {/* Error ID */}
            {this.state.errorId && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Error ID: {this.state.errorId}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;