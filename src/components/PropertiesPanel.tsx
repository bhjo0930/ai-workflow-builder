import React from 'react';
import { Settings, HelpCircle, Link2, User, Sparkles, FileText, Plus } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';
import { NODE_TYPES } from '../utils/constants';
import { getConnectedVariables } from '../utils/workflowUtils';
import type { 
  UserInputNodeConfig, 
  GenerateNodeConfig, 
  OutputNodeConfig, 
  AddAssetsNodeConfig 
} from '../types';

interface PropertiesPanelProps {
  className?: string;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ className = '' }) => {
  const { workflow, selectedNodeId, updateNode } = useWorkflowStore();
  
  const selectedNode = selectedNodeId 
    ? workflow.nodes.find(node => node.id === selectedNodeId)
    : null;

  const connectedVariables = selectedNode 
    ? getConnectedVariables(selectedNode.id, workflow.nodes, workflow.connections)
    : [];

  const handleConfigUpdate = (updates: Partial<any>) => {
    if (!selectedNode) return;
    
    updateNode(selectedNode.id, {
      config: { ...selectedNode.config, ...updates }
    });
  };

  const renderDefaultContent = () => (
    <div className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <HelpCircle className="w-5 h-5 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Welcome</h3>
      </div>
      <div className="space-y-4 text-xs text-gray-600">
        <p>
          Select a node from the canvas to view and edit its properties.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">Quick Start:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Click a node type in the toolbar to add it to the canvas</li>
            <li>• Select nodes to configure their properties</li>
            <li>• Connect nodes by dragging from output to input ports</li>
            <li>• Execute individual nodes or the entire workflow</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-xs font-semibold text-blue-900 mb-2">Node Types:</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <User className="w-3 h-3 text-purple-600" />
              <span className="font-semibold">User Input:</span>
              <span>Collect input from users</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span className="font-semibold">Generate:</span>
              <span>Generate content using AI</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-3 h-3 text-green-600" />
              <span className="font-semibold">Output:</span>
              <span>Display final results</span>
            </div>
            <div className="flex items-center space-x-2">
              <Plus className="w-3 h-3 text-orange-600" />
              <span className="font-semibold">Add Assets:</span>
              <span>Add files or text assets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsedInThisStep = () => {
    if (connectedVariables.length === 0) {
      return (
        <div className="text-xs text-gray-500 italic">
          No connected variables. Connect other nodes to this node to see their outputs here.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {connectedVariables.map((variable, index) => (
          <div
            key={`${variable.source}-${index}`}
            className="flex items-start justify-between p-2 bg-blue-50 rounded text-xs border border-blue-100"
          >
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-700 truncate">
                {variable.name}
              </span>
            </div>
            {variable.value !== undefined && variable.value !== null && (
              <div className="ml-2 max-w-24 text-xs text-blue-600 truncate" title={String(variable.value)}>
                {String(variable.value).slice(0, 20)}
                {String(variable.value).length > 20 ? '...' : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderUserInputConfig = () => {
    const config = selectedNode!.config as UserInputNodeConfig;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={config.title || ''}
            onChange={(e) => handleConfigUpdate({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter node title"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => handleConfigUpdate({ description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Enter node description"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Input Type
          </label>
          <select
            value={config.inputType || 'text'}
            onChange={(e) => handleConfigUpdate({ inputType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="text">Text</option>
            <option value="textarea">Textarea</option>
            <option value="number">Number</option>
            <option value="email">Email</option>
            <option value="url">URL</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            value={config.placeholder || ''}
            onChange={(e) => handleConfigUpdate({ placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter placeholder text"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="required"
            checked={config.required || false}
            onChange={(e) => handleConfigUpdate({ required: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="required" className="text-xs font-semibold text-gray-700">
            Required field
          </label>
        </div>
      </div>
    );
  };

  const renderGenerateConfig = () => {
    const config = selectedNode!.config as GenerateNodeConfig;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={config.title || ''}
            onChange={(e) => handleConfigUpdate({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter node title"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Role Description
          </label>
          <textarea
            value={config.roleDescription || ''}
            onChange={(e) => handleConfigUpdate({ roleDescription: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Describe the AI's role and behavior"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Prompt Template
          </label>
          <textarea
            value={config.promptTemplate || ''}
            onChange={(e) => handleConfigUpdate({ promptTemplate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="Enter prompt template (use {{variableName}} for connected inputs)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Model
            </label>
            <select
              value={config.model || 'gemini-2.0-flash-001'}
              onChange={(e) => handleConfigUpdate({ model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="gemini-2.0-flash-001">Gemini 2.0 Flash</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature || 0.7}
              onChange={(e) => handleConfigUpdate({ temperature: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Max Tokens
          </label>
          <input
            type="number"
            min="1"
            max="4000"
            value={config.maxTokens || 1000}
            onChange={(e) => handleConfigUpdate({ maxTokens: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    );
  };

  const renderOutputConfig = () => {
    const config = selectedNode!.config as OutputNodeConfig;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={config.title || ''}
            onChange={(e) => handleConfigUpdate({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter node title"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => handleConfigUpdate({ description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Enter node description"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Output Format
          </label>
          <select
            value={config.format || 'text'}
            onChange={(e) => handleConfigUpdate({ format: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="text">Plain Text</option>
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="html">HTML</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showCopyButton"
              checked={config.showCopyButton !== false}
              onChange={(e) => handleConfigUpdate({ showCopyButton: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="showCopyButton" className="text-xs font-semibold text-gray-700">
              Show copy button
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showDownloadButton"
              checked={config.showDownloadButton !== false}
              onChange={(e) => handleConfigUpdate({ showDownloadButton: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="showDownloadButton" className="text-xs font-semibold text-gray-700">
              Show download button
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderAddAssetsConfig = () => {
    const config = selectedNode!.config as AddAssetsNodeConfig;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={config.title || ''}
            onChange={(e) => handleConfigUpdate({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter node title"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => handleConfigUpdate({ description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Enter node description"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Text Input
          </label>
          <textarea
            value={config.textInput || ''}
            onChange={(e) => handleConfigUpdate({ textInput: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="Enter text content or leave empty to use file upload only"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Allowed File Types
          </label>
          <input
            type="text"
            value={config.allowedFileTypes?.join(', ') || ''}
            onChange={(e) => handleConfigUpdate({ 
              allowedFileTypes: e.target.value.split(',').map(type => type.trim()).filter(Boolean)
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., .txt, .pdf, .docx, .md"
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate file extensions with commas
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Max File Size (MB)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={Math.round((config.maxFileSize || 10485760) / 1024 / 1024)}
            onChange={(e) => handleConfigUpdate({ maxFileSize: parseInt(e.target.value) * 1024 * 1024 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    );
  };

  const renderNodeConfiguration = () => {
    if (!selectedNode) return null;

    switch (selectedNode.type) {
      case 'userInput':
        return renderUserInputConfig();
      case 'generate':
        return renderGenerateConfig();
      case 'output':
        return renderOutputConfig();
      case 'addAssets':
        return renderAddAssetsConfig();
      default:
        return <div className="text-sm text-gray-500">Unknown node type</div>;
    }
  };

  const renderNodeProperties = () => {
    if (!selectedNode) return null;

    const nodeTypeInfo = NODE_TYPES[selectedNode.type];

    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            {nodeTypeInfo.label} Properties
          </h3>
        </div>
        
        <div className="space-y-6">
          {/* Node basic info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${nodeTypeInfo.color}`} />
              <span className="text-sm font-medium text-gray-900">
                {selectedNode.config.title || 'Untitled Node'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {nodeTypeInfo.description}
            </p>
          </div>

          {/* Node configuration form */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Configuration
            </h4>
            {renderNodeConfiguration()}
          </div>

          {/* Used in this step section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Link2 className="w-4 h-4 text-gray-500" />
              <h4 className="text-xs font-semibold text-gray-900">
                Used in this step
              </h4>
            </div>
            {renderUsedInThisStep()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border-l border-gray-200 properties-panel overflow-y-auto ${className}`}>
      {selectedNode ? renderNodeProperties() : renderDefaultContent()}
    </div>
  );
};

export default PropertiesPanel;