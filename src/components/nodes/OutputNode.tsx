import React from 'react';
import { Copy, Download, Eye } from 'lucide-react';
import BaseNode from './BaseNode';
import type { Node, OutputNodeConfig, Connection } from '../../types';
import { getConnectedVariables } from '../../utils/workflowUtils';

interface OutputNodeProps {
  node: Node;
  isSelected: boolean;
  onExecute?: (nodeId: string) => void;
  allNodes?: Node[];
  connections?: Connection[];
}

const OutputNode: React.FC<OutputNodeProps> = ({
  node,
  isSelected,
  onExecute,
  allNodes = [],
  connections = [],
}) => {
  const config = node.config as OutputNodeConfig;
  const connectedVariables = getConnectedVariables(node.id, allNodes, connections);

  const handleCopy = async () => {
    if (node.result) {
      try {
        await navigator.clipboard.writeText(String(node.result));
        // Could show a toast notification here
        console.log('Copied to clipboard');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleDownload = () => {
    if (node.result) {
      const blob = new Blob([String(node.result)], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.title.replace(/\s+/g, '_')}_output.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <BaseNode
      node={node}
      isSelected={isSelected}
      onExecute={onExecute}
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



        {/* Result Display */}
        {node.result ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-700">Output:</div>
              <div className="flex space-x-1">
                {config.showCopyButton && (
                  <button
                    onClick={handleCopy}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                {config.showDownloadButton && (
                  <button
                    onClick={handleDownload}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Download as file"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-2 bg-gray-50 rounded text-xs max-h-32 overflow-y-auto">
              <div className="text-gray-700 whitespace-pre-wrap break-words">
                {String(node.result)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded">
            <div className="text-center">
              <Eye className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <div className="text-xs text-gray-500">
                {connectedVariables.length > 0 
                  ? 'Execute to see output'
                  : 'No input connected'
                }
              </div>
            </div>
          </div>
        )}

        {/* Format Info */}
        <div className="text-xs text-gray-500 mt-2">
          <span className="font-semibold">Format:</span> {config.format}
        </div>
      </>
    </BaseNode>
  );
};

export default OutputNode;