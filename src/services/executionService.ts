import type { Node, Connection, ExecutionContext } from '../types';
import { getInputNodes, getConnectedVariables } from '../utils/workflowUtils';
import { errorHandler } from './errorHandlingService';
import { useErrorStore } from '../stores/errorStore';


export interface ExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Service for executing individual nodes and managing execution state
 */
export class ExecutionService {
  /**
   * Execute a single node with proper input validation and dependency resolution
   */
  static async executeNode(
    nodeId: string,
    nodes: Node[],
    connections: Connection[]
  ): Promise<ExecutionResult> {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      const error = errorHandler.createNodeError(
        nodeId,
        'unknown',
        'Unknown Node',
        'Node not found in workflow',
        'high',
        { nodeId, availableNodes: nodes.map(n => n.id) }
      );
      
      const errorWithRecovery = await errorHandler.handleError(error, [
        {
          id: 'refresh-workflow',
          label: 'Refresh Workflow',
          description: 'Reload the workflow to fix missing nodes',
          action: () => window.location.reload(),
          isPrimary: true,
        }
      ]);
      
      useErrorStore.getState().addError(errorWithRecovery);
      
      return {
        success: false,
        error: 'Node not found'
      };
    }

    try {
      // Validate dependencies
      const validationResult = this.validateNodeExecution(node, nodes, connections);
      if (!validationResult.isValid) {
        const error = errorHandler.createNodeError(
          node.id,
          node.type,
          node.config.title,
          validationResult.error || 'Validation failed',
          'medium',
          { 
            validationResult,
            dependencies: getInputNodes(node.id, nodes, connections).map(n => ({
              id: n.id,
              title: n.config.title,
              status: n.status
            }))
          }
        );
        
        const recoveryActions = errorHandler.createRecoveryActions(error);
        const errorWithRecovery = await errorHandler.handleError(error, recoveryActions);
        useErrorStore.getState().addError(errorWithRecovery);
        
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Gather inputs from connected nodes
      const executionContext = this.buildExecutionContext(node, nodes, connections);

      // Execute based on node type
      const result = await this.executeNodeByType(node, executionContext);

      // Clear any previous errors for this node on successful execution
      useErrorStore.getState().clearErrorsByNodeId(node.id);

      return {
        success: true,
        result
      };
    } catch (error) {
      const nodeError = errorHandler.createNodeError(
        node.id,
        node.type,
        node.config.title,
        error instanceof Error ? error.message : 'Unknown execution error',
        'high',
        { 
          originalError: error,
          executionContext: this.buildExecutionContext(node, nodes, connections),
          stack: error instanceof Error ? error.stack : undefined
        }
      );
      
      const recoveryActions = errorHandler.createRecoveryActions(nodeError);
      const errorWithRecovery = await errorHandler.handleError(nodeError, recoveryActions);
      useErrorStore.getState().addError(errorWithRecovery);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };
    }
  }

  /**
   * Validate that a node can be executed
   */
  private static validateNodeExecution(
    node: Node,
    nodes: Node[],
    connections: Connection[]
  ): { isValid: boolean; error?: string } {
    // Get input nodes
    const inputNodes = getInputNodes(node.id, nodes, connections);

    // Check if all required inputs are available
    for (const inputNode of inputNodes) {
      if (inputNode.status !== 'completed' && inputNode.result === undefined) {
        return {
          isValid: false,
          error: `Input node "${inputNode.config.title}" has not been executed yet`
        };
      }
    }

    // Node-specific validation
    switch (node.type) {
      case 'userInput':
        // User input nodes don't need external dependencies
        break;
      
      case 'generate':
        // Generate nodes need at least some input or configuration
        if (inputNodes.length === 0 && !(node.config as any).promptTemplate) {
          return {
            isValid: false,
            error: 'Generate node needs either connected inputs or a prompt template'
          };
        }
        break;
      
      case 'output':
        // Output nodes need at least one input
        if (inputNodes.length === 0) {
          return {
            isValid: false,
            error: 'Output node needs at least one connected input'
          };
        }
        break;
      
      case 'addAssets':
        // Add assets nodes can work independently
        break;
    }

    return { isValid: true };
  }

  /**
   * Build execution context with all available inputs and variables
   */
  private static buildExecutionContext(
    node: Node,
    nodes: Node[],
    connections: Connection[]
  ): ExecutionContext {
    const inputNodes = getInputNodes(node.id, nodes, connections);
    const connectedVariables = getConnectedVariables(node.id, nodes, connections);

    const inputs: Record<string, unknown> = {};
    const variables: Record<string, unknown> = {};

    // Build inputs from connected nodes
    inputNodes.forEach((inputNode, index) => {
      const key = inputNode.config.title || `input_${index}`;
      inputs[key] = inputNode.result;
    });

    // Build variables for template substitution
    connectedVariables.forEach((variable) => {
      variables[variable.name] = variable.value;
    });

    return {
      nodeId: node.id,
      inputs,
      variables
    };
  }

  /**
   * Execute node based on its type
   */
  private static async executeNodeByType(
    node: Node,
    context: ExecutionContext
  ): Promise<unknown> {
    switch (node.type) {
      case 'userInput':
        return this.executeUserInputNode(node, context);
      
      case 'generate':
        return this.executeGenerateNode(node, context);
      
      case 'output':
        return this.executeOutputNode(node, context);
      
      case 'addAssets':
        return this.executeAddAssetsNode(node, context);
      
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Execute User Input node
   */
  private static async executeUserInputNode(
    node: Node,
    _context: ExecutionContext
  ): Promise<string> {
    const config = node.config as any;
    
    try {
      // Validate required input
      if (config.required && (!node.result || String(node.result).trim() === '')) {
        const error = errorHandler.createValidationError(
          'Required input is missing',
          'userInput',
          node.result,
          'required field',
          'medium',
          { nodeId: node.id, nodeTitle: node.config.title, required: config.required }
        );
        
        const errorWithRecovery = await errorHandler.handleError(error, [
          {
            id: 'focus-input',
            label: 'Focus Input Field',
            description: 'Navigate to the input field to enter required data',
            action: () => {
              // Emit event to focus the input field
              window.dispatchEvent(new CustomEvent('focus-node-input', {
                detail: { nodeId: node.id }
              }));
            },
            isPrimary: true,
          }
        ]);
        
        useErrorStore.getState().addError(errorWithRecovery);
        throw new Error('Required input is missing');
      }

      // Validate input type if specified
      const inputValue = String(node.result || '');
      if (config.inputType === 'email' && inputValue) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inputValue)) {
          const error = errorHandler.createValidationError(
            'Invalid email format',
            'userInput',
            inputValue,
            'email format',
            'low',
            { nodeId: node.id, nodeTitle: node.config.title, inputType: config.inputType }
          );
          
          const errorWithRecovery = await errorHandler.handleError(error);
          useErrorStore.getState().addError(errorWithRecovery);
          throw new Error('Invalid email format');
        }
      }

      if (config.inputType === 'number' && inputValue) {
        if (isNaN(Number(inputValue))) {
          const error = errorHandler.createValidationError(
            'Input must be a valid number',
            'userInput',
            inputValue,
            'numeric value',
            'low',
            { nodeId: node.id, nodeTitle: node.config.title, inputType: config.inputType }
          );
          
          const errorWithRecovery = await errorHandler.handleError(error);
          useErrorStore.getState().addError(errorWithRecovery);
          throw new Error('Input must be a valid number');
        }
      }

      return inputValue;
    } catch (error) {
      // Re-throw validation errors, handle unexpected errors
      if (error instanceof Error && error.message.includes('Required input') || error instanceof Error && error.message.includes('Invalid')) {
        throw error;
      }
      
      const nodeError = errorHandler.createNodeError(
        node.id,
        node.type,
        node.config.title,
        `User input processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'medium',
        { originalError: error, config }
      );
      
      const errorWithRecovery = await errorHandler.handleError(nodeError);
      useErrorStore.getState().addError(errorWithRecovery);
      throw error;
    }
  }

  /**
   * Execute Generate node (LLM generation)
   */
  private static async executeGenerateNode(
    node: Node,
    context: ExecutionContext
  ): Promise<string> {
    const config = node.config as any;
    
    // Build the prompt by substituting variables
    let prompt = config.promptTemplate || 'Generate content based on the following inputs:';
    
    // Replace variables in the prompt template
    Object.entries(context.variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value || ''));
    });

    // Add input context if no template variables were used
    if (Object.keys(context.inputs).length > 0 && !prompt.includes('{{')) {
      const inputContext = Object.entries(context.inputs)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      prompt += `\n\nInputs:\n${inputContext}`;
    }

    // Check if model is Gemini
    if (config.model?.startsWith('gemini')) {
      return this.callGeminiAPI(prompt, config);
    }

    // Fallback to simulation for other models
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = [
          `Generated response based on: "${prompt.slice(0, 50)}..."`,
          `AI-generated content using ${config.model} model`,
          `Processed input and generated: "${Object.values(context.inputs).join(', ')}"`,
          `Creative output based on the provided context and role: ${config.roleDescription}`
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        resolve(randomResponse);
      }, 1000 + Math.random() * 2000); // Simulate API delay
    });
  }

  /**
   * Call Gemini API
   */
  private static async callGeminiAPI(prompt: string, config: any): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      const error = errorHandler.createAPIError(
        'Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.',
        'gemini-api',
        undefined,
        undefined,
        'high',
        { model: config.model, hasApiKey: false }
      );
      
      const errorWithRecovery = await errorHandler.handleError(error, [
        {
          id: 'check-env',
          label: 'Check Environment',
          description: 'Verify that VITE_GEMINI_API_KEY is set in your .env file',
          action: () => {
            alert('Please check your .env file and ensure VITE_GEMINI_API_KEY is set with a valid Gemini API key.');
          },
          isPrimary: true,
        }
      ]);
      
      useErrorStore.getState().addError(errorWithRecovery);
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    try {
      // Import GoogleGenerativeAI dynamically to avoid build issues
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: config.model });

      // Build the full prompt with role description
      const fullPrompt = config.roleDescription 
        ? `${config.roleDescription}\n\n${prompt}`
        : prompt;

      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      return text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      
      // Create specific API error
      const apiError = errorHandler.createAPIError(
        `Gemini API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gemini-api',
        undefined,
        error,
        'high',
        { 
          model: config.model,
          promptLength: prompt.length,
          hasApiKey: true,
          originalError: error
        }
      );
      
      const recoveryActions = [
        {
          id: 'retry-api',
          label: 'Retry API Call',
          description: 'Try calling the Gemini API again',
          action: async () => {
            // This will be handled by the retry mechanism
            await this.callGeminiAPI(prompt, config);
          },
          isPrimary: true,
        },
        {
          id: 'check-quota',
          label: 'Check API Quota',
          description: 'Verify your Gemini API quota and billing',
          action: () => {
            window.open('https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas', '_blank');
          },
        }
      ];
      
      const errorWithRecovery = await errorHandler.handleError(apiError, recoveryActions);
      useErrorStore.getState().addError(errorWithRecovery);
      
      throw new Error(`Gemini API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute Output node
   */
  private static async executeOutputNode(
    node: Node,
    context: ExecutionContext
  ): Promise<string> {
    // Combine all inputs into a formatted output
    const inputValues = Object.values(context.inputs);
    
    if (inputValues.length === 0) {
      throw new Error('No inputs available for output');
    }

    // Format the output based on configuration
    const config = node.config as any;
    let output: string;

    switch (config.format) {
      case 'json':
        output = JSON.stringify(context.inputs, null, 2);
        break;
      case 'list':
        output = inputValues.map((value, index) => `${index + 1}. ${value}`).join('\n');
        break;
      default: // 'text'
        output = inputValues.join('\n\n');
    }

    return output;
  }

  /**
   * Execute Add Assets node
   */
  private static async executeAddAssetsNode(
    node: Node,
    _context: ExecutionContext
  ): Promise<string> {
    const config = node.config as any;
    const assets: string[] = [];
    
    // Get data from node result (set by UI component)
    const nodeData = node.result as any;
    
    // Add text input if available
    if (nodeData?.textInput && nodeData.textInput.trim()) {
      assets.push(`Text Input: ${nodeData.textInput}`);
    } else if (config.textInput && config.textInput.trim()) {
      assets.push(`Text Input: ${config.textInput}`);
    }

    // Add uploaded files if available
    if (nodeData?.files && Array.isArray(nodeData.files)) {
      nodeData.files.forEach((file: any) => {
        assets.push(`File: ${file.name} (${Math.round(file.size / 1024)}KB) - ${file.content.slice(0, 100)}...`);
      });
    }

    if (assets.length === 0) {
      throw new Error('No assets provided. Please add text input or upload files.');
    }

    return `Successfully processed ${assets.length} asset(s):\n\n${assets.join('\n\n')}`;
  }

  /**
   * Get execution dependencies for a node
   */
  static getExecutionDependencies(
    nodeId: string,
    nodes: Node[],
    connections: Connection[]
  ): Node[] {
    return getInputNodes(nodeId, nodes, connections);
  }

  /**
   * Check if a node is ready for execution
   */
  static isNodeReadyForExecution(
    nodeId: string,
    nodes: Node[],
    connections: Connection[]
  ): { ready: boolean; reason?: string } {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      return { ready: false, reason: 'Node not found' };
    }

    if (node.status === 'running') {
      return { ready: false, reason: 'Node is already running' };
    }

    const validation = this.validateNodeExecution(node, nodes, connections);
    return {
      ready: validation.isValid,
      reason: validation.error
    };
  }
}