// Core data models for the workflow builder

export type NodeType = 'userInput' | 'generate' | 'output' | 'addAssets';

export type NodeStatus = 'idle' | 'running' | 'completed' | 'error';

export interface Position {
  x: number;
  y: number;
}

// Base node configuration interface
export interface BaseNodeConfig {
  title: string;
  description?: string;
}

// Specific node configurations
export interface UserInputNodeConfig extends BaseNodeConfig {
  inputType: string;
  required: boolean;
  placeholder?: string;
}

export interface GenerateNodeConfig extends BaseNodeConfig {
  promptTemplate: string;
  model: string;
  temperature: number;
  maxTokens: number;
  roleDescription: string;
}

export interface OutputNodeConfig extends BaseNodeConfig {
  format: string;
  showCopyButton: boolean;
  showDownloadButton: boolean;
}

export interface AddAssetsNodeConfig extends BaseNodeConfig {
  allowedFileTypes: string[];
  maxFileSize: number;
  textInput: string;
}

// Union type for all node configurations
export type NodeConfig =
  | UserInputNodeConfig
  | GenerateNodeConfig
  | OutputNodeConfig
  | AddAssetsNodeConfig;

// Main Node interface
export interface Node {
  id: string;
  type: NodeType;
  position: Position;
  config: NodeConfig;
  status: NodeStatus;
  result?: unknown;
}

// Connection interface
export interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: string;
  targetPort: string;
}

// Workflow metadata
export interface WorkflowMetadata {
  created: Date;
  modified: Date;
  version: string;
}

// Main Workflow interface
export interface Workflow {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  metadata: WorkflowMetadata;
}

// Port interface for node connections
export interface Port {
  id: string;
  type: 'input' | 'output';
  dataType: string;
  label: string;
}

// Execution context for nodes
export interface ExecutionContext {
  nodeId: string;
  inputs: Record<string, unknown>;
  variables: Record<string, unknown>;
}

// Error interface for workflow execution
export interface WorkflowError {
  nodeId: string;
  message: string;
  type: 'validation' | 'execution' | 'connection';
  timestamp: Date;
}