import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { UserInputNode, GenerateNode, OutputNode, AddAssetsNode } from './index';
import { ExecutionService } from '../../services/executionService';
import type { Node as WorkflowNode, NodeType } from '../../types';

interface NodeData {
  nodeType: NodeType;
  config: WorkflowNode['config'];
  status: WorkflowNode['status'];
}

const NodeRenderer: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { workflow, selectedNodeId, updateNode } = useWorkflowStore();
  
  // Find the actual workflow node
  const workflowNode = workflow.nodes.find(node => node.id === id);
  
  if (!workflowNode) {
    return null;
  }

  const isSelected = selectedNodeId === id || selected;

  const handleExecute = async (nodeId: string) => {
    // Check if node is ready for execution
    const readinessCheck = ExecutionService.isNodeReadyForExecution(
      nodeId, 
      workflow.nodes, 
      workflow.connections
    );

    if (!readinessCheck.ready) {
      // Update node to error state with reason
      updateNode(nodeId, { 
        status: 'error',
        result: `Execution failed: ${readinessCheck.reason}`
      });
      return;
    }

    // Update node status to running
    updateNode(nodeId, { status: 'running' });
    
    try {
      // Execute the node using the execution service
      const executionResult = await ExecutionService.executeNode(
        nodeId,
        workflow.nodes,
        workflow.connections
      );

      if (executionResult.success) {
        updateNode(nodeId, { 
          status: 'completed',
          result: executionResult.result
        });
      } else {
        updateNode(nodeId, { 
          status: 'error',
          result: `Execution failed: ${executionResult.error}`
        });
      }
    } catch (error) {
      updateNode(nodeId, { 
        status: 'error',
        result: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleUpdateConfig = (nodeId: string, configUpdates: Partial<WorkflowNode['config']>) => {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (node) {
      updateNode(nodeId, {
        config: { ...node.config, ...configUpdates }
      });
    }
  };

  const handleUpdateResult = (nodeId: string, result: unknown) => {
    updateNode(nodeId, { result });
  };

  // Get workflow data for connections
  const allNodes = workflow.nodes;
  const connections = workflow.connections;

  const nodeData = data as unknown as NodeData;
  
  switch (nodeData.nodeType) {
    case 'userInput':
      return (
        <UserInputNode
          node={workflowNode}
          isSelected={Boolean(isSelected)}
          onExecute={handleExecute}
          onUpdateConfig={handleUpdateConfig}
          onUpdateResult={handleUpdateResult}
          allNodes={allNodes}
          connections={connections}
        />
      );
    
    case 'generate':
      return (
        <GenerateNode
          node={workflowNode}
          isSelected={Boolean(isSelected)}
          onExecute={handleExecute}
          allNodes={allNodes}
          connections={connections}
        />
      );
    
    case 'output':
      return (
        <OutputNode
          node={workflowNode}
          isSelected={Boolean(isSelected)}
          onExecute={handleExecute}
          allNodes={allNodes}
          connections={connections}
        />
      );
    
    case 'addAssets':
      return (
        <AddAssetsNode
          node={workflowNode}
          isSelected={Boolean(isSelected)}
          onExecute={handleExecute}
          onUpdateConfig={handleUpdateConfig}
          onUpdateResult={handleUpdateResult}
          allNodes={allNodes}
          connections={connections}
        />
      );
    
    default:
      return (
        <div className="p-4 border border-gray-300 rounded bg-white">
          <div className="text-sm text-gray-600">
            Unknown node type: {nodeData.nodeType}
          </div>
        </div>
      );
  }
};

export default NodeRenderer;