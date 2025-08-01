import type { Node, Connection, Workflow, WorkflowError } from '../types';
import { ExecutionService } from './executionService';
import { validateWorkflow, getTopologicalOrder } from '../utils/workflowUtils';

export interface WorkflowExecutionState {
  isRunning: boolean;
  currentNodeId: string | null;
  completedNodes: string[];
  failedNodes: string[];
  progress: number;
  errors: WorkflowError[];
  startTime?: Date;
  endTime?: Date;
}

export interface WorkflowExecutionResult {
  success: boolean;
  executionState: WorkflowExecutionState;
  finalOutputs: Record<string, unknown>;
  errors: WorkflowError[];
}

/**
 * Service for executing complete workflows with proper dependency resolution,
 * progress tracking, and error handling
 */
export class WorkflowExecutionService {
  private static executionState: WorkflowExecutionState = {
    isRunning: false,
    currentNodeId: null,
    completedNodes: [],
    failedNodes: [],
    progress: 0,
    errors: [],
  };

  private static listeners: Array<(state: WorkflowExecutionState) => void> = [];

  /**
   * Subscribe to execution state changes
   */
  static subscribe(listener: (state: WorkflowExecutionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current execution state
   */
  static getExecutionState(): WorkflowExecutionState {
    return { ...this.executionState };
  }

  /**
   * Update execution state and notify listeners
   */
  private static updateExecutionState(updates: Partial<WorkflowExecutionState>): void {
    this.executionState = { ...this.executionState, ...updates };
    this.listeners.forEach(listener => listener(this.executionState));
  }

  /**
   * Execute complete workflow with proper validation and dependency resolution
   */
  static async executeWorkflow(
    workflow: Workflow,
    onNodeUpdate?: (nodeId: string, updates: Partial<Node>) => void
  ): Promise<WorkflowExecutionResult> {
    // Reset execution state
    this.updateExecutionState({
      isRunning: true,
      currentNodeId: null,
      completedNodes: [],
      failedNodes: [],
      progress: 0,
      errors: [],
      startTime: new Date(),
      endTime: undefined,
    });

    try {
      // Step 1: Validate workflow for circular dependencies and structure
      const validation = validateWorkflow(workflow);
      if (!validation.isValid) {
        const errors: WorkflowError[] = validation.errors.map(error => ({
          nodeId: '',
          message: error,
          type: 'validation',
          timestamp: new Date(),
        }));

        this.updateExecutionState({
          isRunning: false,
          errors,
          endTime: new Date(),
        });

        return {
          success: false,
          executionState: this.executionState,
          finalOutputs: {},
          errors,
        };
      }

      // Step 2: Determine execution order using topological sorting
      const executionOrder = getTopologicalOrder(workflow.nodes, workflow.connections);
      
      if (executionOrder.length !== workflow.nodes.length) {
        const error: WorkflowError = {
          nodeId: '',
          message: 'Workflow contains circular dependencies that prevent execution',
          type: 'validation',
          timestamp: new Date(),
        };

        this.updateExecutionState({
          isRunning: false,
          errors: [error],
          endTime: new Date(),
        });

        return {
          success: false,
          executionState: this.executionState,
          finalOutputs: {},
          errors: [error],
        };
      }

      // Step 3: Execute nodes sequentially based on topological order
      const finalOutputs: Record<string, unknown> = {};
      const nodeMap = new Map(workflow.nodes.map(node => [node.id, node]));

      for (let i = 0; i < executionOrder.length; i++) {
        const nodeId = executionOrder[i];
        const node = nodeMap.get(nodeId);

        if (!node) {
          const error: WorkflowError = {
            nodeId,
            message: `Node ${nodeId} not found in workflow`,
            type: 'execution',
            timestamp: new Date(),
          };

          this.updateExecutionState({
            errors: [...this.executionState.errors, error],
          });
          continue;
        }

        // Update current execution state
        this.updateExecutionState({
          currentNodeId: nodeId,
          progress: (i / executionOrder.length) * 100,
        });

        // Update node status to running
        if (onNodeUpdate) {
          onNodeUpdate(nodeId, { status: 'running' });
        }

        try {
          // Execute the node
          const executionResult = await ExecutionService.executeNode(
            nodeId,
            workflow.nodes,
            workflow.connections
          );

          if (executionResult.success) {
            // Node executed successfully
            this.updateExecutionState({
              completedNodes: [...this.executionState.completedNodes, nodeId],
            });

            // Update node with result
            if (onNodeUpdate) {
              onNodeUpdate(nodeId, {
                status: 'completed',
                result: executionResult.result,
              });
            }

            // Store result for final outputs
            finalOutputs[nodeId] = executionResult.result;

            // If this is an output node, store its result prominently
            if (node.type === 'output') {
              finalOutputs[`${node.config.title || 'Output'}`] = executionResult.result;
            }

          } else {
            // Node execution failed
            const error: WorkflowError = {
              nodeId,
              message: executionResult.error || 'Unknown execution error',
              type: 'execution',
              timestamp: new Date(),
            };

            this.updateExecutionState({
              failedNodes: [...this.executionState.failedNodes, nodeId],
              errors: [...this.executionState.errors, error],
            });

            // Update node status to error
            if (onNodeUpdate) {
              onNodeUpdate(nodeId, { status: 'error' });
            }

            // Stop execution on error (requirement 8.5)
            this.updateExecutionState({
              isRunning: false,
              currentNodeId: null,
              endTime: new Date(),
            });

            return {
              success: false,
              executionState: this.executionState,
              finalOutputs,
              errors: this.executionState.errors,
            };
          }

        } catch (error) {
          // Unexpected error during node execution
          const workflowError: WorkflowError = {
            nodeId,
            message: error instanceof Error ? error.message : 'Unexpected execution error',
            type: 'execution',
            timestamp: new Date(),
          };

          this.updateExecutionState({
            failedNodes: [...this.executionState.failedNodes, nodeId],
            errors: [...this.executionState.errors, workflowError],
            isRunning: false,
            currentNodeId: null,
            endTime: new Date(),
          });

          // Update node status to error
          if (onNodeUpdate) {
            onNodeUpdate(nodeId, { status: 'error' });
          }

          return {
            success: false,
            executionState: this.executionState,
            finalOutputs,
            errors: this.executionState.errors,
          };
        }
      }

      // Step 4: Complete execution successfully
      this.updateExecutionState({
        isRunning: false,
        currentNodeId: null,
        progress: 100,
        endTime: new Date(),
      });

      return {
        success: true,
        executionState: this.executionState,
        finalOutputs,
        errors: this.executionState.errors,
      };

    } catch (error) {
      // Unexpected error during workflow execution
      const workflowError: WorkflowError = {
        nodeId: '',
        message: error instanceof Error ? error.message : 'Unexpected workflow execution error',
        type: 'execution',
        timestamp: new Date(),
      };

      this.updateExecutionState({
        isRunning: false,
        currentNodeId: null,
        errors: [...this.executionState.errors, workflowError],
        endTime: new Date(),
      });

      return {
        success: false,
        executionState: this.executionState,
        finalOutputs: {},
        errors: this.executionState.errors,
      };
    }
  }

  /**
   * Stop workflow execution
   */
  static stopExecution(): void {
    this.updateExecutionState({
      isRunning: false,
      currentNodeId: null,
      endTime: new Date(),
    });
  }

  /**
   * Reset execution state
   */
  static resetExecutionState(): void {
    this.updateExecutionState({
      isRunning: false,
      currentNodeId: null,
      completedNodes: [],
      failedNodes: [],
      progress: 0,
      errors: [],
      startTime: undefined,
      endTime: undefined,
    });
  }

  /**
   * Get execution summary
   */
  static getExecutionSummary(): {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    duration?: number;
    hasErrors: boolean;
  } {
    const state = this.executionState;
    const duration = state.startTime && state.endTime 
      ? state.endTime.getTime() - state.startTime.getTime()
      : undefined;

    return {
      totalNodes: state.completedNodes.length + state.failedNodes.length,
      completedNodes: state.completedNodes.length,
      failedNodes: state.failedNodes.length,
      duration,
      hasErrors: state.errors.length > 0,
    };
  }

  /**
   * Check if workflow can be executed
   */
  static canExecuteWorkflow(workflow: Workflow): { canExecute: boolean; reason?: string } {
    if (this.executionState.isRunning) {
      return { canExecute: false, reason: 'Another workflow is currently running' };
    }

    if (workflow.nodes.length === 0) {
      return { canExecute: false, reason: 'Workflow must contain at least one node' };
    }

    const validation = validateWorkflow(workflow);
    if (!validation.isValid) {
      return { canExecute: false, reason: validation.errors[0] };
    }

    return { canExecute: true };
  }
}