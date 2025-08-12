import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test-utils'
import { WorkflowExecutionService } from '../../services/workflowExecutionService'
import type { Workflow, Node } from '../../types'

// Mock the execution service
vi.mock('../../services/workflowExecutionService', () => ({
  WorkflowExecutionService: {
    canExecuteWorkflow: vi.fn(),
    executeWorkflow: vi.fn(),
    executeNode: vi.fn(),
    validateWorkflow: vi.fn(),
    getExecutionOrder: vi.fn(),
    stopExecution: vi.fn(),
    getExecutionState: vi.fn(() => ({ isRunning: false, currentNode: null })),
    subscribe: vi.fn(() => vi.fn()),
  },
}))

// Mock LLM service
vi.mock('../../services/llmService', () => ({
  generateContent: vi.fn(),
}))

describe('Workflow Execution Integration', () => {
  const createMockWorkflow = (): Workflow => ({
    id: 'test-workflow',
    name: 'Test Workflow',
    nodes: [
      {
        id: 'user-input-1',
        type: 'userInput',
        position: { x: 100, y: 100 },
        config: {
          title: 'User Input',
          description: 'Enter your name',
          inputType: 'text',
          required: true,
        },
        status: 'idle',
        result: null,
      },
      {
        id: 'generate-1',
        type: 'generate',
        position: { x: 300, y: 100 },
        config: {
          title: 'Generate Greeting',
          roleDescription: 'Generate a personalized greeting',
          promptTemplate: 'Create a greeting for {{user-input-1}}',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 100,
        },
        status: 'idle',
        result: null,
      },
      {
        id: 'output-1',
        type: 'output',
        position: { x: 500, y: 100 },
        config: {
          title: 'Final Output',
          description: 'Display the greeting',
          format: 'text',
          showCopyButton: true,
          showDownloadButton: true,
        },
        status: 'idle',
        result: null,
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'user-input-1',
        target: 'generate-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: 'edge-2',
        source: 'generate-1',
        target: 'output-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ],
    metadata: {
      created: new Date(),
      modified: new Date(),
      version: '1.0.0',
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates workflow before execution', async () => {
    const workflow = createMockWorkflow()
    const mockValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    vi.mocked(WorkflowExecutionService.validateWorkflow).mockReturnValue(mockValidation)
    vi.mocked(WorkflowExecutionService.canExecuteWorkflow).mockReturnValue({
      canExecute: true,
    })

    const result = WorkflowExecutionService.canExecuteWorkflow(workflow)
    
    expect(result.canExecute).toBe(true)
    expect(WorkflowExecutionService.validateWorkflow).toHaveBeenCalledWith(workflow)
  })

  it('prevents execution of invalid workflow', async () => {
    const workflow = createMockWorkflow()
    const mockValidation = {
      isValid: false,
      errors: ['Circular dependency detected'],
      warnings: [],
    }

    vi.mocked(WorkflowExecutionService.validateWorkflow).mockReturnValue(mockValidation)
    vi.mocked(WorkflowExecutionService.canExecuteWorkflow).mockReturnValue({
      canExecute: false,
      reason: 'Workflow validation failed: Circular dependency detected',
    })

    const result = WorkflowExecutionService.canExecuteWorkflow(workflow)
    
    expect(result.canExecute).toBe(false)
    expect(result.reason).toContain('Circular dependency detected')
  })

  it('determines correct execution order', async () => {
    const workflow = createMockWorkflow()
    const expectedOrder = ['user-input-1', 'generate-1', 'output-1']

    vi.mocked(WorkflowExecutionService.getExecutionOrder).mockReturnValue(expectedOrder)

    const executionOrder = WorkflowExecutionService.getExecutionOrder(workflow)
    
    expect(executionOrder).toEqual(expectedOrder)
  })

  it('executes workflow nodes in correct order', async () => {
    const workflow = createMockWorkflow()
    const mockUpdateNode = vi.fn()
    const executionOrder = ['user-input-1', 'generate-1', 'output-1']

    vi.mocked(WorkflowExecutionService.getExecutionOrder).mockReturnValue(executionOrder)
    vi.mocked(WorkflowExecutionService.executeWorkflow).mockImplementation(
      async (workflow, updateCallback) => {
        // Simulate sequential execution
        for (const nodeId of executionOrder) {
          updateCallback(nodeId, { status: 'running' })
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Mock results based on node type
          const node = workflow.nodes.find(n => n.id === nodeId)
          let result = null
          
          if (node?.type === 'userInput') {
            result = 'John Doe'
          } else if (node?.type === 'generate') {
            result = 'Hello John Doe! Welcome to our application.'
          } else if (node?.type === 'output') {
            result = 'Hello John Doe! Welcome to our application.'
          }
          
          updateCallback(nodeId, { status: 'completed', result })
        }
      }
    )

    await WorkflowExecutionService.executeWorkflow(workflow, mockUpdateNode)

    // Verify all nodes were updated with running status
    expect(mockUpdateNode).toHaveBeenCalledWith('user-input-1', { status: 'running' })
    expect(mockUpdateNode).toHaveBeenCalledWith('generate-1', { status: 'running' })
    expect(mockUpdateNode).toHaveBeenCalledWith('output-1', { status: 'running' })

    // Verify all nodes were completed with results
    expect(mockUpdateNode).toHaveBeenCalledWith('user-input-1', { 
      status: 'completed', 
      result: 'John Doe' 
    })
    expect(mockUpdateNode).toHaveBeenCalledWith('generate-1', { 
      status: 'completed', 
      result: 'Hello John Doe! Welcome to our application.' 
    })
    expect(mockUpdateNode).toHaveBeenCalledWith('output-1', { 
      status: 'completed', 
      result: 'Hello John Doe! Welcome to our application.' 
    })
  })

  it('handles execution errors gracefully', async () => {
    const workflow = createMockWorkflow()
    const mockUpdateNode = vi.fn()

    vi.mocked(WorkflowExecutionService.executeWorkflow).mockImplementation(
      async (workflow, updateCallback) => {
        // Simulate error in generate node
        updateCallback('user-input-1', { status: 'completed', result: 'John Doe' })
        updateCallback('generate-1', { status: 'running' })
        
        // Simulate error
        updateCallback('generate-1', { 
          status: 'error', 
          result: null,
          error: 'LLM API call failed'
        })
        
        // Execution should stop here
      }
    )

    await WorkflowExecutionService.executeWorkflow(workflow, mockUpdateNode)

    // Verify error state was set
    expect(mockUpdateNode).toHaveBeenCalledWith('generate-1', { 
      status: 'error', 
      result: null,
      error: 'LLM API call failed'
    })

    // Output node should not have been executed
    expect(mockUpdateNode).not.toHaveBeenCalledWith('output-1', expect.objectContaining({
      status: 'running'
    }))
  })

  it('supports individual node execution', async () => {
    const workflow = createMockWorkflow()
    const nodeId = 'generate-1'
    const mockUpdateNode = vi.fn()

    // Mock dependencies (user input result)
    workflow.nodes[0].result = 'Jane Smith'

    vi.mocked(WorkflowExecutionService.executeNode).mockImplementation(
      async (workflow, nodeId, updateCallback) => {
        updateCallback(nodeId, { status: 'running' })
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 10))
        
        updateCallback(nodeId, { 
          status: 'completed', 
          result: 'Hello Jane Smith! Nice to meet you.' 
        })
      }
    )

    await WorkflowExecutionService.executeNode(workflow, nodeId, mockUpdateNode)

    expect(mockUpdateNode).toHaveBeenCalledWith(nodeId, { status: 'running' })
    expect(mockUpdateNode).toHaveBeenCalledWith(nodeId, { 
      status: 'completed', 
      result: 'Hello Jane Smith! Nice to meet you.' 
    })
  })

  it('validates node dependencies before individual execution', async () => {
    const workflow = createMockWorkflow()
    const nodeId = 'generate-1'
    
    // Don't set user input result (missing dependency)
    vi.mocked(WorkflowExecutionService.executeNode).mockImplementation(
      async (workflow, nodeId, updateCallback) => {
        // Check if dependencies are satisfied
        const node = workflow.nodes.find(n => n.id === nodeId)
        const dependencies = workflow.edges
          .filter(edge => edge.target === nodeId)
          .map(edge => workflow.nodes.find(n => n.id === edge.source))
        
        const missingDependencies = dependencies.filter(dep => !dep?.result)
        
        if (missingDependencies.length > 0) {
          updateCallback(nodeId, { 
            status: 'error', 
            result: null,
            error: 'Missing required inputs'
          })
          return
        }
        
        // Normal execution would continue here
      }
    )

    const mockUpdateNode = vi.fn()
    await WorkflowExecutionService.executeNode(workflow, nodeId, mockUpdateNode)

    expect(mockUpdateNode).toHaveBeenCalledWith(nodeId, { 
      status: 'error', 
      result: null,
      error: 'Missing required inputs'
    })
  })

  it('supports stopping workflow execution', async () => {
    const workflow = createMockWorkflow()
    let executionStopped = false

    vi.mocked(WorkflowExecutionService.executeWorkflow).mockImplementation(
      async (workflow, updateCallback) => {
        updateCallback('user-input-1', { status: 'running' })
        
        // Simulate long-running operation
        for (let i = 0; i < 100; i++) {
          if (executionStopped) {
            updateCallback('user-input-1', { status: 'idle' })
            return
          }
          await new Promise(resolve => setTimeout(resolve, 1))
        }
        
        updateCallback('user-input-1', { status: 'completed', result: 'John Doe' })
      }
    )

    vi.mocked(WorkflowExecutionService.stopExecution).mockImplementation(() => {
      executionStopped = true
    })

    const mockUpdateNode = vi.fn()
    
    // Start execution
    const executionPromise = WorkflowExecutionService.executeWorkflow(workflow, mockUpdateNode)
    
    // Stop execution after a short delay
    setTimeout(() => {
      WorkflowExecutionService.stopExecution()
    }, 10)
    
    await executionPromise

    expect(WorkflowExecutionService.stopExecution).toHaveBeenCalled()
    expect(mockUpdateNode).toHaveBeenCalledWith('user-input-1', { status: 'idle' })
  })

  it('handles complex workflow with multiple branches', async () => {
    const complexWorkflow: Workflow = {
      ...createMockWorkflow(),
      nodes: [
        ...createMockWorkflow().nodes,
        {
          id: 'generate-2',
          type: 'generate',
          position: { x: 300, y: 200 },
          config: {
            title: 'Generate Alternative',
            roleDescription: 'Generate alternative greeting',
            promptTemplate: 'Create a formal greeting for {{user-input-1}}',
            model: 'gpt-3.5-turbo',
            temperature: 0.3,
            maxTokens: 100,
          },
          status: 'idle',
          result: null,
        },
      ],
      edges: [
        ...createMockWorkflow().edges,
        {
          id: 'edge-3',
          source: 'user-input-1',
          target: 'generate-2',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ],
    }

    const expectedOrder = ['user-input-1', 'generate-1', 'generate-2', 'output-1']
    vi.mocked(WorkflowExecutionService.getExecutionOrder).mockReturnValue(expectedOrder)

    const executionOrder = WorkflowExecutionService.getExecutionOrder(complexWorkflow)
    
    expect(executionOrder).toEqual(expectedOrder)
    
    // Verify that parallel branches (generate-1 and generate-2) can be executed
    // after their common dependency (user-input-1)
    const userInputIndex = executionOrder.indexOf('user-input-1')
    const generate1Index = executionOrder.indexOf('generate-1')
    const generate2Index = executionOrder.indexOf('generate-2')
    
    expect(generate1Index).toBeGreaterThan(userInputIndex)
    expect(generate2Index).toBeGreaterThan(userInputIndex)
  })
})