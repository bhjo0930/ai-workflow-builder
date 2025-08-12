import React, { useEffect, useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ErrorWithRecovery, ErrorSeverity } from '../types/errors';
import { errorHandler } from '../services/errorHandlingService';

interface ErrorNotificationProps {
  error: ErrorWithRecovery;
  onDismiss: () => void;
  autoHideAfter?: number;
  showRecoveryActions?: boolean;
}

/**
 * Individual error notification component
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  autoHideAfter,
  showRecoveryActions = true,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  useEffect(() => {
    if (autoHideAfter && autoHideAfter > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideAfter);

      return () => clearTimeout(timer);
    }
  }, [autoHideAfter]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  };

  const handleRecoveryAction = async (action: any) => {
    setIsExecutingAction(true);
    try {
      await action.action();
      if (action.id === 'retry') {
        handleDismiss(); // Auto-dismiss on successful retry
      }
    } catch (actionError) {
      console.error('Recovery action failed:', actionError);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const getIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      case 'low':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityStyles = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-md w-full border rounded-lg shadow-lg p-4 mb-3
        ${getSeverityStyles(error.severity)}
      `}
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className={`flex-shrink-0 ${getIconColor(error.severity)}`}>
          {getIcon(error.severity)}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1 min-w-0">
          {/* Error Message */}
          <div className="text-sm font-medium">
            {errorHandler.getUserFriendlyMessage(error)}
          </div>

          {/* Error Details */}
          {error.context && (
            <div className="mt-1 text-xs opacity-75">
              {error.category} • {error.timestamp.toLocaleTimeString()}
            </div>
          )}

          {/* Node Information */}
          {'nodeId' in error && (
            <div className="mt-1 text-xs opacity-75">
              Node: {error.nodeTitle}
            </div>
          )}

          {/* Recovery Actions */}
          {showRecoveryActions && error.recoveryActions && error.recoveryActions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {error.recoveryActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleRecoveryAction(action)}
                  disabled={isExecutingAction}
                  className={`
                    px-3 py-1 text-xs rounded-md transition-colors
                    ${action.isPrimary
                      ? 'bg-white bg-opacity-20 hover:bg-opacity-30 font-medium'
                      : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                    }
                    ${isExecutingAction ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  title={action.description}
                >
                  {isExecutingAction && action.id === 'retry' ? 'Retrying...' : action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ErrorNotificationContainerProps {
  errors: ErrorWithRecovery[];
  onDismiss: (errorId: string) => void;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Container for managing multiple error notifications
 */
export const ErrorNotificationContainer: React.FC<ErrorNotificationContainerProps> = ({
  errors,
  onDismiss,
  maxVisible = 5,
  position = 'top-right',
}) => {
  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = errors.length - maxVisible;

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (errors.length === 0) return null;

  return (
    <div className={`fixed ${getPositionStyles()} z-50 max-w-md w-full pointer-events-none`}>
      <div className="space-y-2 pointer-events-auto">
        {visibleErrors.map((error) => (
          <ErrorNotification
            key={error.id}
            error={error}
            onDismiss={() => onDismiss(error.id)}
            autoHideAfter={error.severity === 'low' ? 5000 : undefined}
            showRecoveryActions={true}
          />
        ))}

        {/* Hidden errors indicator */}
        {hiddenCount > 0 && (
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
            +{hiddenCount} more error{hiddenCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorNotification;