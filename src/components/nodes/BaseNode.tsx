import React from 'react';
import { Handle, Position, useConnection } from '@xyflow/react';
import { Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { Node, NodeStatus, Connection } from '../../types';
import { getConnectedVariables } from '../../utils/workflowUtils';
import UsedInThisStep from './UsedInThisStep';

interface BaseNodeProps {
  node: Node;
  isSelected: boolean;
  onExecute?: (nodeId: string) => void;
  children: React.ReactNode;
  allNodes?: Node[];
  connections?: Connection[];
}

const BaseNode: React.FC<BaseNodeProps> = ({
  node,
  isSelected,
  onExecute,
  children,
  allNodes = [],
  connections = [],
}) => {
  const connection = useConnection();
  
  // Get connected variables for this node
  const connectedVariables = getConnectedVariables(node.id, allNodes, connections);
  const getStatusIcon = (status: NodeStatus) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Play className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNodeTypeColor = (nodeType: string) => {
    switch (nodeType) {
      case 'userInput':
        return {
          base: 'border-purple-200 bg-purple-50',
          running: 'border-purple-400 bg-purple-100',
          completed: 'border-purple-500 bg-purple-100',
          error: 'border-red-400 bg-red-50',
          header: 'bg-purple-100 border-purple-200'
        };
      case 'generate':
        return {
          base: 'border-blue-200 bg-blue-50',
          running: 'border-blue-400 bg-blue-100',
          completed: 'border-blue-500 bg-blue-100',
          error: 'border-red-400 bg-red-50',
          header: 'bg-blue-100 border-blue-200'
        };
      case 'output':
        return {
          base: 'border-green-200 bg-green-50',
          running: 'border-green-400 bg-green-100',
          completed: 'border-green-500 bg-green-100',
          error: 'border-red-400 bg-red-50',
          header: 'bg-green-100 border-green-200'
        };
      case 'addAssets':
        return {
          base: 'border-orange-200 bg-orange-50',
          running: 'border-orange-400 bg-orange-100',
          completed: 'border-orange-500 bg-orange-100',
          error: 'border-red-400 bg-red-50',
          header: 'bg-orange-100 border-orange-200'
        };
      default:
        return {
          base: 'border-gray-300 bg-white',
          running: 'border-blue-400 bg-blue-50',
          completed: 'border-green-400 bg-green-50',
          error: 'border-red-400 bg-red-50',
          header: 'bg-gray-100 border-gray-200'
        };
    }
  };

  const getStatusColor = (status: NodeStatus, nodeType: string) => {
    const colors = getNodeTypeColor(nodeType);
    switch (status) {
      case 'running':
        return colors.running;
      case 'completed':
        return colors.completed;
      case 'error':
        return colors.error;
      default:
        return colors.base;
    }
  };

  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExecute && node.status !== 'running') {
      onExecute(node.id);
    }
  };

  // Check if this node is being targeted for connection
  const isConnectionTarget = connection.inProgress && 
    connection.fromNode?.id !== node.id;

  // Check if connection would be valid
  const wouldBeValidConnection = connection.inProgress && 
    connection.fromNode?.id !== node.id && 
    connection.fromNode?.id !== undefined;

  return (
    <div
      className={`
        relative w-80 rounded-lg border-2 shadow-sm
        ${getStatusColor(node.status, node.type)}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        transition-all duration-200 hover:shadow-md
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={`
          w-3 h-3 border-2 border-white transition-all duration-200
          ${isConnectionTarget 
            ? wouldBeValidConnection 
              ? 'bg-green-500 scale-125' 
              : 'bg-red-500 scale-125'
            : 'bg-blue-500 hover:bg-blue-600'
          }
        `}
        style={{ left: -6 }}
      />

      {/* Node Header */}
      <div className={`flex items-center justify-between p-3 border-b ${getNodeTypeColor(node.type).header}`}>
        <div className="flex items-center space-x-2">
          {getStatusIcon(node.status)}
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {node.config.title}
          </h3>
        </div>
        
        {/* Execute Button */}
        <button
          onClick={handleExecute}
          disabled={node.status === 'running'}
          className={`
            p-1 rounded transition-colors
            ${node.status === 'running' 
              ? 'cursor-not-allowed opacity-50' 
              : 'hover:bg-gray-100 active:bg-gray-200'
            }
          `}
          title="Execute node"
        >
          <Play className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      {/* Node Content */}
      <div className="p-3">
        {children}
        
        {/* Used in this step section */}
        <UsedInThisStep variables={connectedVariables} />
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={`
          w-3 h-3 border-2 border-white transition-all duration-200
          ${connection.inProgress && connection.fromNode?.id === node.id
            ? 'bg-yellow-500 scale-125'
            : 'bg-blue-500 hover:bg-blue-600'
          }
        `}
        style={{ right: -6 }}
      />
    </div>
  );
};

export default BaseNode;