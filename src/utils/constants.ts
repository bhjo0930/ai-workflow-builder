import type { NodeType } from '../types';

// Node type definitions with display information
export const NODE_TYPES: Record<NodeType, { label: string; description: string; color: string }> = {
  userInput: {
    label: 'User Input',
    description: 'Collect input from the user',
    color: 'bg-blue-500',
  },
  generate: {
    label: 'Generate',
    description: 'Generate content using AI',
    color: 'bg-green-500',
  },
  output: {
    label: 'Output',
    description: 'Display the final result',
    color: 'bg-purple-500',
  },
  addAssets: {
    label: 'Add Assets',
    description: 'Add files or text assets',
    color: 'bg-orange-500',
  },
};

// Default node dimensions
export const NODE_DIMENSIONS = {
  width: 200,
  height: 120,
  minWidth: 150,
  minHeight: 80,
};

// Canvas settings
export const CANVAS_SETTINGS = {
  defaultZoom: 1,
  minZoom: 0.1,
  maxZoom: 2,
  snapToGrid: true,
  gridSize: 20,
};

// File upload constraints
export const FILE_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['.txt', '.pdf', '.docx', '.md', '.json'],
};

// API settings
export const API_SETTINGS = {
  defaultModel: 'gemini-2.0-flash-001',
  defaultTemperature: 0.7,
  defaultMaxTokens: 1000,
  timeout: 30000, // 30 seconds
};