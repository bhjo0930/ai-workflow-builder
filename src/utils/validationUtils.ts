import type { Node, Connection, Workflow } from '../types';
import { errorHandler } from '../services/errorHandlingService';
import type { ValidationError } from '../types/errors';

/**
 * Comprehensive validation utilities for workflow components
 */
export class ValidationUtils {
  /**
   * Validate a single node configuration
   */
  static validateNode(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic node validation
    if (!node.id || node.id.trim() === '') {
      errors.push(errorHandler.createValidationError(
        'Node ID is required',
        'id',
        node.id,
        'non-empty string',
        'high',
        { nodeId: node.id, nodeType: node.type }
      ));
    }

    if (!node.config.title || node.config.title.trim() === '') {
      errors.push(errorHandler.createValidationError(
        'Node title is required',
        'title',
        node.config.title,
        'non-empty string',
        'medium',
        { nodeId: node.id, nodeType: node.type }
      ));
    }

    // Node-specific validation
    switch (node.type) {
      case 'userInput':
        errors.push(...this.validateUserInputNode(node));
        break;
      case 'generate':
        errors.push(...this.validateGenerateNode(node));
        break;
      case 'output':
        errors.push(...this.validateOutputNode(node));
        break;
      case 'addAssets':
        errors.push(...this.validateAddAssetsNode(node));
        break;
    }

    return errors;
  }

  /**
   * Validate User Input node
   */
  private static validateUserInputNode(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];
    const config = node.config as any;

    if (config.required && (!node.result || String(node.result).trim() === '')) {
      errors.push(errorHandler.createValidationError(
        'Required input field is empty',
        'userInput',
        node.result,
        'non-empty value when required',
        'medium',
        { nodeId: node.id, nodeTitle: node.config.title, required: config.required }
      ));
    }

    // Validate input type constraints
    if (node.result && config.inputType) {
      const value = String(node.result);
      
      switch (config.inputType) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(errorHandler.createValidationError(
              'Invalid email format',
              'userInput',
              value,
              'valid email address',
              'low',
              { nodeId: node.id, nodeTitle: node.config.title, inputType: config.inputType }
            ));
          }
          break;
        
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(errorHandler.createValidationError(
              'Value must be a valid number',
              'userInput',
              value,
              'numeric value',
              'low',
              { nodeId: node.id, nodeTitle: node.config.title, inputType: config.inputType }
            ));
          }
          break;
        
        case 'url':
          try {
            new URL(value);
          } catch {
            errors.push(errorHandler.createValidationError(
              'Invalid URL format',
              'userInput',
              value,
              'valid URL',
              'low',
              { nodeId: node.id, nodeTitle: node.config.title, inputType: config.inputType }
            ));
          }
          break;
      }
    }

    return errors;
  }

  /**
   * Validate Generate node
   */
  private static validateGenerateNode(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];
    const config = node.config as any;

    if (!config.promptTemplate || config.promptTemplate.trim() === '') {
      errors.push(errorHandler.createValidationError(
        'Prompt template is required for Generate nodes',
        'promptTemplate',
        config.promptTemplate,
        'non-empty prompt template',
        'high',
        { nodeId: node.id, nodeTitle: node.config.title }
      ));
    }

    if (!config.model || config.model.trim() === '') {
      errors.push(errorHandler.createValidationError(
        'Model selection is required',
        'model',
        config.model,
        'valid model name',
        'high',
        { nodeId: node.id, nodeTitle: node.config.title }
      ));
    }

    if (config.temperature < 0 || config.temperature > 2) {
      errors.push(errorHandler.createValidationError(
        'Temperature must be between 0 and 2',
        'temperature',
        config.temperature,
        'value between 0 and 2',
        'medium',
        { nodeId: node.id, nodeTitle: node.config.title, temperature: config.temperature }
      ));
    }

    if (config.maxTokens <= 0 || config.maxTokens > 8192) {
      errors.push(errorHandler.createValidationError(
        'Max tokens must be between 1 and 8192',
        'maxTokens',
        config.maxTokens,
        'value between 1 and 8192',
        'medium',
        { nodeId: node.id, nodeTitle: node.config.title, maxTokens: config.maxTokens }
      ));
    }

    return errors;
  }

  /**
   * Validate Output node
   */
  private static validateOutputNode(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];
    const config = node.config as any;

    const validFormats = ['text', 'json', 'list'];
    if (!validFormats.includes(config.format)) {
      errors.push(errorHandler.createValidationError(
        `Invalid output format: ${config.format}`,
        'format',
        config.format,
        `one of: ${validFormats.join(', ')}`,
        'medium',
        { nodeId: node.id, nodeTitle: node.config.title, validFormats }
      ));
    }

    return errors;
  }

  /**
   * Validate Add Assets node
   */
  private static validateAddAssetsNode(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];
    const config = node.config as any;

    if (config.maxFileSize <= 0) {
      errors.push(errorHandler.createValidationError(
        'Max file size must be greater than 0',
        'maxFileSize',
        config.maxFileSize,
        'positive number',
        'medium',
        { nodeId: node.id, nodeTitle: node.config.title, maxFileSize: config.maxFileSize }
      ));
    }

    if (!Array.isArray(config.allowedFileTypes) || config.allowedFileTypes.length === 0) {
      errors.push(errorHandler.createValidationError(
        'At least one allowed file type must be specified',
        'allowedFileTypes',
        config.allowedFileTypes,
        'non-empty array of file extensions',
        'medium',
        { nodeId: node.id, nodeTitle: node.config.title }
      ));
    }

    return errors;
  }

  /**
   * Validate connections for circular dependencies
   */
  static validateConnections(connections: Connection[], nodes: Node[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Build adjacency list
    const adjacencyList = new Map<string, string[]>();
    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
    });

    connections.forEach(connection => {
      const sourceConnections = adjacencyList.get(connection.sourceNodeId) || [];
      sourceConnections.push(connection.targetNodeId);
      adjacencyList.set(connection.sourceNodeId, sourceConnections);
    });

    // Check for circular dependencies using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cyclePath = path.slice(cycleStart).concat(nodeId);
        
        errors.push(errorHandler.createValidationError(
          `Circular dependency detected: ${cyclePath.join(' → ')}`,
          'connections',
          cyclePath,
          'acyclic graph',
          'high',
          { 
            cyclePath,
            affectedNodes: cyclePath.map(id => {
              const node = nodes.find(n => n.id === id);
              return { id, title: node?.config.title || 'Unknown' };
            })
          }
        ));
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor, [...path, nodeId])) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check each node for cycles
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        hasCycle(node.id, []);
      }
    });

    // Validate individual connections
    connections.forEach(connection => {
      const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
      const targetNode = nodes.find(n => n.id === connection.targetNodeId);

      if (!sourceNode) {
        errors.push(errorHandler.createValidationError(
          `Connection source node not found: ${connection.sourceNodeId}`,
          'sourceNodeId',
          connection.sourceNodeId,
          'existing node ID',
          'high',
          { connectionId: connection.id, sourceNodeId: connection.sourceNodeId }
        ));
      }

      if (!targetNode) {
        errors.push(errorHandler.createValidationError(
          `Connection target node not found: ${connection.targetNodeId}`,
          'targetNodeId',
          connection.targetNodeId,
          'existing node ID',
          'high',
          { connectionId: connection.id, targetNodeId: connection.targetNodeId }
        ));
      }

      // Check for self-connections
      if (connection.sourceNodeId === connection.targetNodeId) {
        errors.push(errorHandler.createValidationError(
          'Node cannot connect to itself',
          'connection',
          connection,
          'different source and target nodes',
          'medium',
          { connectionId: connection.id, nodeId: connection.sourceNodeId }
        ));
      }
    });

    return errors;
  }

  /**
   * Validate entire workflow
   */
  static validateWorkflow(workflow: Workflow): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate workflow metadata
    if (!workflow.name || workflow.name.trim() === '') {
      errors.push(errorHandler.createValidationError(
        'Workflow name is required',
        'name',
        workflow.name,
        'non-empty string',
        'medium',
        { workflowId: workflow.id }
      ));
    }

    if (!workflow.id || workflow.id.trim() === '') {
      errors.push(errorHandler.createValidationError(
        'Workflow ID is required',
        'id',
        workflow.id,
        'non-empty string',
        'high',
        { workflowName: workflow.name }
      ));
    }

    // Validate all nodes
    workflow.nodes.forEach(node => {
      errors.push(...this.validateNode(node));
    });

    // Validate connections
    errors.push(...this.validateConnections(workflow.connections, workflow.nodes));

    // Check for orphaned nodes (nodes with no connections)
    if (workflow.nodes.length > 1) {
      const connectedNodeIds = new Set<string>();
      workflow.connections.forEach(connection => {
        connectedNodeIds.add(connection.sourceNodeId);
        connectedNodeIds.add(connection.targetNodeId);
      });

      const orphanedNodes = workflow.nodes.filter(node => !connectedNodeIds.has(node.id));
      if (orphanedNodes.length > 0) {
        errors.push(errorHandler.createValidationError(
          `Found ${orphanedNodes.length} orphaned node(s) with no connections`,
          'connections',
          orphanedNodes.map(n => n.id),
          'connected nodes',
          'low',
          { 
            orphanedNodes: orphanedNodes.map(n => ({ id: n.id, title: n.config.title })),
            workflowId: workflow.id
          }
        ));
      }
    }

    return errors;
  }

  /**
   * Get validation summary for UI display
   */
  static getValidationSummary(errors: ValidationError[]): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byCategory: Record<string, number>;
    hasBlockingErrors: boolean;
  } {
    const summary = {
      total: errors.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCategory: {} as Record<string, number>,
      hasBlockingErrors: false,
    };

    errors.forEach(error => {
      // Count by severity
      summary[error.severity]++;
      
      // Count by category
      summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;
      
      // Check for blocking errors
      if (error.severity === 'critical' || error.severity === 'high') {
        summary.hasBlockingErrors = true;
      }
    });

    return summary;
  }
}

export default ValidationUtils;