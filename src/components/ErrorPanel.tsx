import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Trash2, 
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useErrorPanel, useErrorActions } from '../stores/errorStore';
import { errorLogger } from '../services/errorLoggingService';
import { errorHandler } from '../services/errorHandlingService';
import type { ErrorSeverity, ErrorCategory, ErrorWithRecovery } from '../types/errors';

interface ErrorPanelProps {
  className?: string;
}

/**
 * Comprehensive error management panel
 */
export const ErrorPanel: React.FC<ErrorPanelProps> = ({ className = '' }) => {
  const { showErrorPanel, errors, selectedError, toggleErrorPanel, selectError } = useErrorPanel();
  const { removeError, clearErrors, retryError, executeRecoveryAction } = useErrorActions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ErrorCategory | 'all'>('all');
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  if (!showErrorPanel) return null;

  // Filter errors based on search and filters
  const filteredErrors = errors.filter(error => {
    const matchesSearch = searchTerm === '' || 
      error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ('nodeTitle' in error && error.nodeTitle && String(error.nodeTitle).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSeverity = severityFilter === 'all' || error.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || error.category === categoryFilter;
    
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  // Group errors by severity
  const errorsBySeverity = filteredErrors.reduce((acc, error) => {
    if (!acc[error.severity]) {
      acc[error.severity] = [];
    }
    acc[error.severity].push(error);
    return acc;
  }, {} as Record<ErrorSeverity, ErrorWithRecovery[]>);

  const handleDownloadLogs = async () => {
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

  const toggleErrorExpansion = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const getErrorIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadgeColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-40 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Error Console
          </h2>
          {errors.length > 0 && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              {errors.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadLogs}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Download error logs"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={clearErrors}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear all errors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleErrorPanel}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search errors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex space-x-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as ErrorSeverity | 'all')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ErrorCategory | 'all')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="validation">Validation</option>
            <option value="execution">Execution</option>
            <option value="connection">Connection</option>
            <option value="persistence">Persistence</option>
            <option value="api">API</option>
            <option value="ui">UI</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Error List */}
      <div className="flex-1 overflow-y-auto">
        {filteredErrors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {errors.length === 0 ? (
              <>
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No errors</p>
                <p className="text-sm">Your workflow is running smoothly!</p>
              </>
            ) : (
              <>
                <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No matching errors</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {Object.entries(errorsBySeverity)
              .sort(([a], [b]) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return severityOrder[b as ErrorSeverity] - severityOrder[a as ErrorSeverity];
              })
              .map(([severity, severityErrors]) => (
                <div key={severity} className="space-y-2">
                  {/* Severity Header */}
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    {getErrorIcon(severity as ErrorSeverity)}
                    <span className="capitalize">{severity}</span>
                    <span className="text-gray-500">({severityErrors.length})</span>
                  </div>

                  {/* Errors in this severity */}
                  {severityErrors.map((error) => (
                    <div
                      key={error.id}
                      className={`
                        border rounded-lg p-3 cursor-pointer transition-colors
                        ${selectedError?.id === error.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      onClick={() => selectError(error.id)}
                    >
                      {/* Error Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 text-xs border rounded ${getSeverityBadgeColor(error.severity)}`}>
                              {error.severity}
                            </span>
                            <span className="text-xs text-gray-500">
                              {error.category}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium text-gray-900 break-words">
                            {errorHandler.getUserFriendlyMessage(error)}
                          </p>
                          
                          {'nodeTitle' in error && (
                            <p className="text-xs text-gray-500 mt-1">
                              Node: {error.nodeTitle}
                            </p>
                          )}
                          
                          <p className="text-xs text-gray-400 mt-1">
                            {error.timestamp.toLocaleString()}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleErrorExpansion(error.id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {expandedErrors.has(error.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Expanded Error Details */}
                      {expandedErrors.has(error.id) && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                          {/* Original Error Message */}
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Original Message:</div>
                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono">
                              {error.message}
                            </div>
                          </div>

                          {/* Context */}
                          {error.context && Object.keys(error.context).length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Context:</div>
                              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono max-h-20 overflow-y-auto">
                                {JSON.stringify(error.context, null, 2)}
                              </div>
                            </div>
                          )}

                          {/* Recovery Actions */}
                          {error.recoveryActions && error.recoveryActions.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-2">Recovery Actions:</div>
                              <div className="flex flex-wrap gap-2">
                                {error.recoveryActions.map((action) => (
                                  <button
                                    key={action.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      executeRecoveryAction(error.id, action.id);
                                    }}
                                    className={`
                                      px-3 py-1 text-xs rounded-md transition-colors
                                      ${action.isPrimary
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }
                                    `}
                                    title={action.description}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <div className="flex space-x-2">
                              {error.canRetry && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    retryError(error.id);
                                  }}
                                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Retry</span>
                                </button>
                              )}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeError(error.id);
                              }}
                              className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              <X className="w-3 h-3" />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorPanel;