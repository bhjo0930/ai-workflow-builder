import React, { useState, useEffect } from 'react';
import { Play, Square, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';
import { WorkflowExecutionService, type WorkflowExecutionState } from '../services/workflowExecutionService';
import type { WorkflowError } from '../types';

interface WorkflowExecutionProps {
  className?: string;
}

const WorkflowExecution: React.FC<WorkflowExecutionProps> = ({ className = '' }) => {
  const { workflow, updateNode } = useWorkflowStore();
  const [executionState, setExecutionState] = useState<WorkflowExecutionState>(
    WorkflowExecutionService.getExecutionState()
  );
  const [showErrors, setShowErrors] = useState(false);
  const [finalOutputs, setFinalOutputs] = useState<Record<string, unknown>>({});

  useEffect(() => {
    // Subscribe to execution state changes
    const unsubscribe = WorkflowExecutionService.subscribe(setExecutionState);
    return unsubscribe;
  }, []);

  const handleExecuteWorkflow = async () => {
    const canExecute = WorkflowExecutionService.canExecuteWorkflow(workflow);
    if (!canExecute.canExecute) {
      alert(canExecute.reason);
      return;
    }

    // Reset all node statuses before execution
    workflow.nodes.forEach(node => {
      updateNode(node.id, { status: 'idle', result: undefined });
    });

    // Execute workflow
    const result = await WorkflowExecutionService.executeWorkflow(
      workflow,
      (nodeId, updates) => {
        updateNode(nodeId, updates);
      }
    );

    // Store final outputs for display
    setFinalOutputs(result.finalOutputs);

    // Show errors if any
    if (result.errors.length > 0) {
      setShowErrors(true);
    }
  };

  const handleStopExecution = () => {
    WorkflowExecutionService.stopExecution();
  };

  const handleResetExecution = () => {
    WorkflowExecutionService.resetExecutionState();
    setFinalOutputs({});
    setShowErrors(false);
    
    // Reset all node statuses
    workflow.nodes.forEach(node => {
      updateNode(node.id, { status: 'idle', result: undefined });
    });
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getNodeTypeColor = (nodeType: string) => {
    switch (nodeType) {
      case 'userInput':
        return 'text-purple-600';
      case 'generate':
        return 'text-blue-600';
      case 'output':
        return 'text-green-600';
      case 'addAssets':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: 'idle' | 'running' | 'completed' | 'error', nodeType?: string) => {
    const typeColor = nodeType ? getNodeTypeColor(nodeType) : 'text-gray-500';
    
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className={`w-4 h-4 rounded-full bg-current opacity-30 ${typeColor}`} />;
    }
  };

  const summary = WorkflowExecutionService.getExecutionSummary();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-500" />
            Workflow Execution
          </h3>
          <div className="flex items-center space-x-2">
            {!executionState.isRunning ? (
              <button
                onClick={handleExecuteWorkflow}
                disabled={workflow.nodes.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Execute Workflow</span>
              </button>
            ) : (
              <button
                onClick={handleStopExecution}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            )}
            
            {(executionState.completedNodes.length > 0 || executionState.failedNodes.length > 0) && (
              <button
                onClick={handleResetExecution}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {(executionState.isRunning || executionState.progress > 0) && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {executionState.isRunning ? 'Executing...' : 'Execution Complete'}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(executionState.progress)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                executionState.failedNodes.length > 0
                  ? 'bg-red-500'
                  : executionState.isRunning
                  ? 'bg-blue-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${executionState.progress}%` }}
            />
          </div>

          {executionState.currentNodeId && (
            <div className="mt-2 text-sm text-gray-600">
              Currently executing: {
                workflow.nodes.find(n => n.id === executionState.currentNodeId)?.config.title || 'Unknown Node'
              }
            </div>
          )}
        </div>
      )}

      {/* Execution Summary */}
      {(summary.totalNodes > 0) && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Nodes:</span>
              <span className="font-medium">{workflow.nodes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completed:</span>
              <span className="font-medium text-green-600">{summary.completedNodes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Failed:</span>
              <span className="font-medium text-red-600">{summary.failedNodes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">
                {summary.duration ? formatDuration(summary.duration) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Node Status List */}
      {workflow.nodes.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Node Status</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {workflow.nodes.map((node) => {
              const getNodeStatusBadgeColor = (status: string, nodeType: string) => {
                if (status === 'completed') return 'bg-green-100 text-green-800';
                if (status === 'running') return 'bg-blue-100 text-blue-800';
                if (status === 'error') return 'bg-red-100 text-red-800';
                
                // Idle state with node type colors
                switch (nodeType) {
                  case 'userInput':
                    return 'bg-purple-100 text-purple-800';
                  case 'generate':
                    return 'bg-blue-100 text-blue-800';
                  case 'output':
                    return 'bg-green-100 text-green-800';
                  case 'addAssets':
                    return 'bg-orange-100 text-orange-800';
                  default:
                    return 'bg-gray-100 text-gray-800';
                }
              };

              return (
                <div key={node.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(node.status, node.type)}
                    <span className="text-gray-700">{node.config.title}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getNodeStatusBadgeColor(node.status, node.type)
                  }`}>
                    {node.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Outputs */}
      {Object.keys(finalOutputs).length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Final Outputs</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {Object.entries(finalOutputs).map(([key, value]) => (
              <div key={key} className="text-sm">
                <div className="font-medium text-gray-700">{key}:</div>
                <div className="text-gray-600 bg-gray-50 p-2 rounded mt-1 break-words">
                  {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors Section */}
      {executionState.errors.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-red-700 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Execution Errors ({executionState.errors.length})
            </h4>
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="text-xs text-red-600 hover:text-red-800"
            >
              {showErrors ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showErrors && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {executionState.errors.map((error, index) => (
                <div key={index} className="text-sm bg-red-50 border border-red-200 rounded p-2">
                  <div className="font-medium text-red-800">
                    {error.nodeId ? `Node: ${workflow.nodes.find(n => n.id === error.nodeId)?.config.title || error.nodeId}` : 'Workflow'}
                  </div>
                  <div className="text-red-700">{error.message}</div>
                  <div className="text-red-600 text-xs mt-1">
                    {error.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {workflow.nodes.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Add nodes to your workflow to enable execution</p>
        </div>
      )}
    </div>
  );
};

export default WorkflowExecution;