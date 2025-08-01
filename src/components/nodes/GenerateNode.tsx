import React from 'react';
import { Sparkles } from 'lucide-react';
import BaseNode from './BaseNode';
import type { Node, GenerateNodeConfig, Connection } from '../../types';

interface GenerateNodeProps {
  node: Node;
  isSelected: boolean;
  onExecute?: (nodeId: string) => void;
  allNodes?: Node[];
  connections?: Connection[];
}

const GenerateNode: React.FC<GenerateNodeProps> = ({
  node,
  isSelected,
  onExecute,
  allNodes = [],
  connections = [],
}) => {
  const config = node.config as GenerateNodeConfig;

  return (
    <BaseNode
      node={node}
      isSelected={isSelected}
      onExecute={onExecute}
      allNodes={allNodes}
      connections={connections}
    >
      <>
        {/* Role Description */}
        <div className="flex items-start space-x-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-700 mb-1">Role</div>
            <p className="text-xs text-gray-600 break-words">
              {config.roleDescription}
            </p>
          </div>
        </div>



        <div className="text-xs text-gray-500 space-y-1 mb-3">
          <div><span className="font-semibold">Model:</span> {config.model}</div>
          <div><span className="font-semibold">Temperature:</span> {config.temperature}</div>
          <div><span className="font-semibold">Max Tokens:</span> {config.maxTokens}</div>
        </div>

        {/* Loading State */}
        {node.status === 'running' && (
          <div className="flex items-center space-x-2 text-xs text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Generating content...</span>
          </div>
        )}

        {/* Result Display */}
        {node.result && (
          <div className="mt-3 p-2 bg-gray-50 rounded">
            <div className="text-xs font-semibold text-gray-700 mb-1">Generated:</div>
            <div className="text-xs text-gray-600 break-words max-h-20 overflow-y-auto">
              {String(node.result)}
            </div>
          </div>
        )}

        {/* Error Display */}
        {node.status === 'error' && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <div className="text-xs font-semibold text-red-700 mb-1">Error:</div>
            <div className="text-xs text-red-600">
              Failed to generate content. Please check your configuration.
            </div>
          </div>
        )}
      </>
    </BaseNode>
  );
};

export default GenerateNode;