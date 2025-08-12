import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X, Download } from 'lucide-react';
import { getAutoSavedWorkflow, clearAutoSave } from '../hooks/useAutoSave';
import { useWorkflowStore } from '../stores/workflowStore';

interface AutoSaveRecoveryProps {
  className?: string;
}

const AutoSaveRecovery: React.FC<AutoSaveRecoveryProps> = ({ className = '' }) => {
  const [autoSaveData, setAutoSaveData] = useState<{
    workflow: any;
    timestamp: Date;
    version: string;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { setWorkflow, hasUnsavedChanges } = useWorkflowStore();

  useEffect(() => {
    // Check for auto-saved data on component mount
    const savedData = getAutoSavedWorkflow();
    if (savedData) {
      setAutoSaveData(savedData);
      setIsVisible(true);
    }
  }, []);

  const handleRecover = () => {
    if (autoSaveData) {
      setWorkflow(autoSaveData.workflow);
      clearAutoSave();
      setIsVisible(false);
      setAutoSaveData(null);
    }
  };

  const handleDismiss = () => {
    clearAutoSave();
    setIsVisible(false);
    setAutoSaveData(null);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  };

  if (!isVisible || !autoSaveData) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-amber-800">
              Auto-saved workflow found
            </h3>
            
            <div className="mt-1 text-sm text-amber-700">
              <p>
                We found an auto-saved version of your workflow from{' '}
                <span className="font-medium">
                  {formatTimestamp(autoSaveData.timestamp)}
                </span>
                .
              </p>
              
              {hasUnsavedChanges && (
                <p className="mt-1 text-amber-600 font-medium">
                  ⚠️ You have unsaved changes that will be lost if you recover.
                </p>
              )}
            </div>
            
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={handleRecover}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              >
                <Download className="w-3 h-3 mr-1" />
                Recover
              </button>
              
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex text-amber-400 hover:text-amber-600 focus:outline-none focus:text-amber-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-amber-200">
          <div className="flex items-center text-xs text-amber-600">
            <Clock className="w-3 h-3 mr-1" />
            <span>
              Auto-saved: {autoSaveData.timestamp.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoSaveRecovery;