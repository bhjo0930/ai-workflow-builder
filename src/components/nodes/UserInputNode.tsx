import React, { useState } from 'react';
import BaseNode from './BaseNode';
import type { Node, UserInputNodeConfig, Connection } from '../../types';

interface UserInputNodeProps {
  node: Node;
  isSelected: boolean;
  onExecute?: (nodeId: string) => void;
  onUpdateConfig?: (nodeId: string, config: Partial<UserInputNodeConfig>) => void;
  onUpdateResult?: (nodeId: string, result: unknown) => void;
  allNodes?: Node[];
  connections?: Connection[];
}

const UserInputNode: React.FC<UserInputNodeProps> = ({
  node,
  isSelected,
  onExecute,
  onUpdateResult,
  allNodes = [],
  connections = [],
}) => {
  const config = node.config as UserInputNodeConfig;
  const [inputValue, setInputValue] = useState(node.result as string || '');

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Update the node result in real-time
    if (onUpdateResult) {
      onUpdateResult(node.id, value);
    }
  };

  const handleExecute = (nodeId: string) => {
    // Validate required input
    if (config.required && !inputValue.trim()) {
      // This would trigger an error state
      console.error('Required input is missing');
      return;
    }
    
    // Execute the node with the current input value
    if (onExecute) {
      onExecute(nodeId);
    }
  };

  return (
    <BaseNode
      node={node}
      isSelected={isSelected}
      onExecute={handleExecute}
      allNodes={allNodes}
      connections={connections}
    >
      <>
        {/* Description */}
        {config.description && (
          <p className="text-xs text-gray-600 mb-3">
            {config.description}
          </p>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700">
            Input {config.required && <span className="text-red-500">*</span>}
          </label>
          
          {config.inputType === 'textarea' ? (
            <textarea
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={config.placeholder || 'Enter your input...'}
              className={`
                w-full px-2 py-1 text-xs border rounded resize-none
                focus:outline-none focus:ring-1 focus:ring-blue-500
                ${config.required && !inputValue.trim() 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
                }
              `}
              rows={3}
            />
          ) : (
            <input
              type={config.inputType || 'text'}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={config.placeholder || 'Enter your input...'}
              className={`
                w-full px-2 py-1 text-xs border rounded
                focus:outline-none focus:ring-1 focus:ring-blue-500
                ${config.required && !inputValue.trim() 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
                }
              `}
            />
          )}
          
          {config.required && !inputValue.trim() && (
            <p className="text-xs text-red-500">This field is required</p>
          )}
        </div>

        {/* Result Display */}
        {node.result && (
          <div className="mt-3 p-2 bg-gray-50 rounded">
            <div className="text-xs font-semibold text-gray-700 mb-1">Output:</div>
            <div className="text-xs text-gray-600 break-words">
              {String(node.result)}
            </div>
          </div>
        )}
      </>
    </BaseNode>
  );
};

export default UserInputNode;