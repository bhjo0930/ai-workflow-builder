import React, { useState, useEffect } from 'react';
import { Plus, User, Zap, FileOutput, FolderPlus, Check, Play, Square } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';
import { NODE_TYPES } from '../utils/constants';
import { generateNodePosition } from '../utils/workflowUtils';
import { WorkflowExecutionService, type WorkflowExecutionState } from '../services/workflowExecutionService';

interface ToolbarProps {
  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({ className = '' }) => {
  const { workflow, addNode, updateNode } = useWorkflowStore();
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState<WorkflowExecutionState>(
    WorkflowExecutionService.getExecutionState()
  );

  useEffect(() => {
    // Subscribe to execution state changes
    const unsubscribe = WorkflowExecutionService.subscribe(setExecutionState);
    return unsubscribe;
  }, []);

  const handleAddNode = (type: keyof typeof NODE_TYPES) => {
    // Use automatic positioning logic to prevent node overlap
    const position = generateNodePosition(workflow.nodes);
    addNode(type, position);
    
    // Show visual feedback for node creation
    setRecentlyAdded(type);
    setTimeout(() => {
      setRecentlyAdded(null);
    }, 1000); // Clear feedback after 1 second
  };

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
    await WorkflowExecutionService.executeWorkflow(
      workflow,
      (nodeId, updates) => {
        updateNode(nodeId, updates);
      }
    );
  };

  const handleStopExecution = () => {
    WorkflowExecutionService.stopExecution();
  };

  const nodeTypeButtons = [
    {
      type: 'userInput' as const,
      icon: User,
      label: 'User Input',
      description: 'Collect input from user',
      colors: {
        base: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700',
        icon: 'text-purple-600 group-hover:text-purple-800',
        added: 'bg-purple-100 border-purple-300 text-purple-800'
      }
    },
    {
      type: 'generate' as const,
      icon: Zap,
      label: 'Generate',
      description: 'Generate content with LLM',
      colors: {
        base: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700',
        icon: 'text-blue-600 group-hover:text-blue-800',
        added: 'bg-blue-100 border-blue-300 text-blue-800'
      }
    },
    {
      type: 'output' as const,
      icon: FileOutput,
      label: 'Output',
      description: 'Display final results',
      colors: {
        base: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700',
        icon: 'text-green-600 group-hover:text-green-800',
        added: 'bg-green-100 border-green-300 text-green-800'
      }
    },
    {
      type: 'addAssets' as const,
      icon: FolderPlus,
      label: 'Add Assets',
      description: 'Add files or text assets',
      colors: {
        base: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700',
        icon: 'text-orange-600 group-hover:text-orange-800',
        added: 'bg-orange-100 border-orange-300 text-orange-800'
      }
    },
  ];

  return (
    <div className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
              AI Workflow Builder
            </h1>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Workflow Execution Button */}
            {!executionState.isRunning ? (
              <button
                onClick={handleExecuteWorkflow}
                disabled={workflow.nodes.length === 0}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mr-2"
                title="Execute entire workflow"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Execute</span>
              </button>
            ) : (
              <button
                onClick={handleStopExecution}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mr-2"
                title="Stop workflow execution"
              >
                <Square className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Stop</span>
              </button>
            )}

            {/* Node Type Buttons */}
            {nodeTypeButtons.map(({ type, icon: Icon, label, description, colors }) => {
              const isRecentlyAdded = recentlyAdded === type;
              
              return (
                <button
                  key={type}
                  onClick={() => handleAddNode(type)}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 border rounded-lg transition-all duration-200 group ${
                    isRecentlyAdded
                      ? colors.added
                      : colors.base
                  }`}
                  title={description}
                  disabled={isRecentlyAdded}
                >
                  <Icon className={`w-4 h-4 transition-colors duration-200 ${
                    isRecentlyAdded
                      ? colors.icon.replace('group-hover:', '')
                      : colors.icon
                  }`} />
                  <span className={`hidden sm:inline text-sm font-medium transition-colors duration-200`}>
                    {label}
                  </span>
                  {isRecentlyAdded ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;