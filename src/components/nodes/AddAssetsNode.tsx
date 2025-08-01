import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import BaseNode from './BaseNode';
import type { Node, AddAssetsNodeConfig, Connection } from '../../types';

interface AddAssetsNodeProps {
  node: Node;
  isSelected: boolean;
  onExecute?: (nodeId: string) => void;
  onUpdateConfig?: (nodeId: string, config: Partial<AddAssetsNodeConfig>) => void;
  onUpdateResult?: (nodeId: string, result: unknown) => void;
  allNodes?: Node[];
  connections?: Connection[];
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

const AddAssetsNode: React.FC<AddAssetsNodeProps> = ({
  node,
  isSelected,
  onExecute,
  onUpdateConfig,
  onUpdateResult,
  allNodes = [],
  connections = [],
}) => {
  const config = node.config as AddAssetsNodeConfig;
  const [textInput, setTextInput] = useState(config.textInput || '');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    
    for (const file of acceptedFiles) {
      // Check file size
      if (file.size > config.maxFileSize) {
        setError(`File "${file.name}" is too large. Maximum size is ${Math.round(config.maxFileSize / (1024 * 1024))}MB`);
        continue;
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!config.allowedFileTypes.includes(fileExtension)) {
        setError(`File type "${fileExtension}" is not allowed. Allowed types: ${config.allowedFileTypes.join(', ')}`);
        continue;
      }

      try {
        const content = await readFileContent(file);
        const uploadedFile: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          content,
        };
        
        setUploadedFiles(prev => {
          const newFiles = [...prev, uploadedFile];
          // Update node result with file data
          if (onUpdateResult) {
            onUpdateResult(node.id, {
              textInput,
              files: newFiles
            });
          }
          return newFiles;
        });
      } catch {
        setError(`Failed to read file "${file.name}"`);
      }
    }
  }, [config.maxFileSize, config.allowedFileTypes, textInput, onUpdateResult, node.id]);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: config.allowedFileTypes.reduce((acc, type) => {
      acc[`text/${type.slice(1)}`] = [type];
      return acc;
    }, {} as Record<string, string[]>),
    multiple: true,
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // Update node result
      if (onUpdateResult) {
        onUpdateResult(node.id, {
          textInput,
          files: newFiles
        });
      }
      return newFiles;
    });
  };

  const handleTextInputChange = (value: string) => {
    setTextInput(value);
    if (onUpdateConfig) {
      onUpdateConfig(node.id, { ...config, textInput: value });
    }
    // Also update the result
    if (onUpdateResult) {
      onUpdateResult(node.id, {
        textInput: value,
        files: uploadedFiles
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

        {/* Text Input */}
        <div className="space-y-2 mb-3">
          <label className="block text-xs font-semibold text-gray-700">
            Text Input
          </label>
          <textarea
            value={textInput}
            onChange={(e) => handleTextInputChange(e.target.value)}
            placeholder="Enter text content..."
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700">
            File Upload
          </label>
          
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <div className="text-xs text-gray-600">
              {isDragActive ? (
                <p>Drop files here...</p>
              ) : (
                <div>
                  <p>Drag & drop files here, or click to select</p>
                  <p className="text-gray-500 mt-1">
                    Allowed: {config.allowedFileTypes.join(', ')} 
                    (max {Math.round(config.maxFileSize / (1024 * 1024))}MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start space-x-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-700">
              Uploaded Files ({uploadedFiles.length})
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                  <div className="flex items-center space-x-2 min-w-0">
                    <File className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{file.name}</div>
                      <div className="text-gray-500">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result Display */}
        {node.result && (
          <div className="mt-3 p-2 bg-gray-50 rounded">
            <div className="text-xs font-semibold text-gray-700 mb-1">Processed Assets:</div>
            <div className="text-xs text-gray-600 break-words max-h-16 overflow-y-auto">
              {String(node.result)}
            </div>
          </div>
        )}
      </>
    </BaseNode>
  );
};

export default AddAssetsNode;