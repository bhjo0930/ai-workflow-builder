import React, { useRef, useState } from 'react';
import { Save, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';

interface WorkflowPersistenceProps {
  className?: string;
}

const WorkflowPersistence: React.FC<WorkflowPersistenceProps> = ({ className = '' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    workflow,
    isSaving,
    isLoading,
    hasUnsavedChanges,
    lastSaved,
    saveWorkflow,
    loadWorkflow,
    updateWorkflowName,
  } = useWorkflowStore();

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(null);
      await saveWorkflow();
      setSuccess('Workflow saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setSuccess(null);
      await loadWorkflow(file);
      setSuccess('Workflow loaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow');
      setTimeout(() => setError(null), 5000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleWorkflowNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateWorkflowName(event.target.value);
  };

  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Workflow</h3>
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <div className="flex items-center text-amber-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              Unsaved changes
            </div>
          )}
          {!hasUnsavedChanges && lastSaved && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              Saved
            </div>
          )}
        </div>
      </div>

      {/* Workflow Name */}
      <div className="mb-4">
        <label htmlFor="workflow-name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          id="workflow-name"
          type="text"
          value={workflow.name}
          onChange={handleWorkflowNameChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter workflow name"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </button>

        <button
          onClick={handleLoadClick}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Loading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Load
            </>
          )}
        </button>
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Status Information */}
      <div className="text-sm text-gray-500 space-y-1">
        <div className="flex justify-between">
          <span>Last saved:</span>
          <span>{formatLastSaved(lastSaved)}</span>
        </div>
        <div className="flex justify-between">
          <span>Nodes:</span>
          <span>{workflow.nodes.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Connections:</span>
          <span>{workflow.connections.length}</span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm text-green-800">{success}</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">Quick Actions</div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(
                JSON.stringify(workflow, null, 2)
              );
              link.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_raw.json`;
              link.click();
            }}
            className="flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            <Download className="w-3 h-3 mr-1" />
            Export Raw
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowPersistence;