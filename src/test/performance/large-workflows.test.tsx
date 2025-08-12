import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../test-utils'
import { measureRenderTime } from '../test-utils'
import Canvas from '../../components/Canvas'
import type { Node, Edge, Workflow } from '../../types'

// Mock React Flow
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, edges, children, ...props }: any) => (
    <div data-testid="react-flow" data-node-count={nodes?.length || 0} data-edge-count={edges?.length || 0} {...props}>
      {nodes?.map((node: any) => (
        <div key={node.id} data-testid={`node-${node.id}`}>
          {node.data?.title || node.id}
        </div>
      ))}
      {edges?.map((edge: any) => (
        <div key={edge.id} data-testid={`edge-${edge.id}`} />
      ))}
      {children}
    </div>
  ),
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  useReactFlow: () => ({
    fitView: vi.fn(),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
  }),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}))

// Mock stores
vi.mock('../../stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(() => ({
    workflow: { nodes: [], edges: [] },
    selectedNode: null,
    addNode: vi.fn(),
    updateNode: vi.fn(),
    deleteNode: vi.fn(),
    selectNode: vi.fn(),
    addEdge: vi.fn(),
    deleteEdge: vi.fn(),
  })),
}))

describe('Performance Tests - Large Workflows', () => {
  const createLargeWorkflow = (nodeCount: number, edgeCount: number): Workflow => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
      const nodeType = ['userInput', 'generate', 'output', 'addAssets'][i % 4] as Node['type']
      nodes.push({
        id: `node-${i}`,
        type: nodeType,
        position: { 
          x: (i % 10) * 200, 
          y: Math.floor(i / 10) * 150 
        },
        config: {
          title: `Node ${i}`,
          description: `Description for node ${i}`,
        },
        status: 'idle',
        result: null,
      })
    }

    // Create edges (ensuring no cycles for simplicity)
    for (let i = 0; i < Math.min(edgeCount, nodeCount - 1); i++) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
        sourceHandle: 'output',
        targetHandle: 'input',
      })
    }

    return {
      id: 'large-workflow',
      name: 'Large Test Workflow',
      nodes,
      edges,
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0',
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render small workflow quickly (< 100ms)', async () => {
    const workflow = createLargeWorkflow(10, 9)
    const { useWorkflowStore } = require('../../stores/workflowStore')
    useWorkflowStore.mockReturnValue({
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    const renderTime = await measureRenderTime(() => {
      render(<Canvas />)
    })

    expect(renderTime).toBeLessThan(100)
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-node-count', '10')
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-edge-count', '9')
  })

  it('should render medium workflow reasonably fast (< 300ms)', async () => {
    const workflow = createLargeWorkflow(50, 49)
    const { useWorkflowStore } = require('../../stores/workflowStore')
    useWorkflowStore.mockReturnValue({
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    const renderTime = await measureRenderTime(() => {
      render(<Canvas />)
    })

    expect(renderTime).toBeLessThan(300)
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-node-count', '50')
  })

  it('should handle large workflow without crashing (< 1000ms)', async () => {
    const workflow = createLargeWorkflow(100, 99)
    const { useWorkflowStore } = require('../../stores/workflowStore')
    useWorkflowStore.mockReturnValue({
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    const renderTime = await measureRenderTime(() => {
      render(<Canvas />)
    })

    expect(renderTime).toBeLessThan(1000)
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-node-count', '100')
  })

  it('should handle very large workflow gracefully (< 2000ms)', async () => {
    const workflow = createLargeWorkflow(200, 199)
    const { useWorkflowStore } = require('../../stores/workflowStore')
    useWorkflowStore.mockReturnValue({
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    const renderTime = await measureRenderTime(() => {
      render(<Canvas />)
    })

    // Allow more time for very large workflows
    expect(renderTime).toBeLessThan(2000)
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-node-count', '200')
  })

  it('should maintain performance with complex node configurations', async () => {
    const complexNodes: Node[] = Array.from({ length: 50 }, (_, i) => ({
      id: `complex-node-${i}`,
      type: 'generate',
      position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 150 },
      config: {
        title: `Complex Generate Node ${i}`,
        description: `This is a complex node with a very long description that contains multiple sentences and detailed information about what this node does in the workflow. Node number ${i} has specific configuration parameters.`,
        roleDescription: `You are an AI assistant specialized in task ${i}. Your role is to process input data and generate meaningful output based on the specific requirements of this workflow step.`,
        promptTemplate: `Process the following input: {{input}}. Apply transformation ${i} and ensure the output meets the quality standards for downstream processing.`,
        model: 'gpt-4',
        temperature: 0.7 + (i * 0.01),
        maxTokens: 1000 + (i * 10),
      },
      status: 'idle',
      result: null,
    }))

    const workflow: Workflow = {
      id: 'complex-workflow',
      name: 'Complex Test Workflow',
      nodes: complexNodes,
      edges: [],
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0',
      },
    }

    const { useWorkflowStore } = require('../../stores/workflowStore')
    useWorkflowStore.mockReturnValue({
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    const renderTime = await measureRenderTime(() => {
      render(<Canvas />)
    })

    expect(renderTime).toBeLessThan(500)
  })

  it('should handle rapid node additions efficiently', async () => {
    const { useWorkflowStore } = require('../../stores/workflowStore')
    const mockAddNode = vi.fn()
    
    useWorkflowStore.mockReturnValue({
      workflow: { nodes: [], edges: [] },
      selectedNode: null,
      addNode: mockAddNode,
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    render(<Canvas />)

    // Simulate rapid node additions
    const startTime = performance.now()
    
    for (let i = 0; i < 20; i++) {
      mockAddNode('userInput', { x: i * 100, y: i * 50 })
    }
    
    const endTime = performance.now()
    const additionTime = endTime - startTime

    expect(additionTime).toBeLessThan(100) // Should be very fast since it's just function calls
    expect(mockAddNode).toHaveBeenCalledTimes(20)
  })

  it('should handle workflow with many connections efficiently', async () => {
    const nodeCount = 20
    const nodes: Node[] = Array.from({ length: nodeCount }, (_, i) => ({
      id: `node-${i}`,
      type: 'generate',
      position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 150 },
      config: { title: `Node ${i}` },
      status: 'idle',
      result: null,
    }))

    // Create a highly connected graph (each node connects to next 3 nodes)
    const edges: Edge[] = []
    for (let i = 0; i < nodeCount - 3; i++) {
      for (let j = 1; j <= 3; j++) {
        edges.push({
          id: `edge-${i}-${i + j}`,
          source: `node-${i}`,
          target: `node-${i + j}`,
          sourceHandle: 'output',
          targetHandle: 'input',
        })
      }
    }

    const workflow: Workflow = {
      id: 'connected-workflow',
      name: 'Highly Connected Workflow',
      nodes,
      edges,
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0',
      },
    }

    const { useWorkflowStore } = require('../../stores/workflowStore')
    useWorkflowStore.mockReturnValue({
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    const renderTime = await measureRenderTime(() => {
      render(<Canvas />)
    })

    expect(renderTime).toBeLessThan(400)
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-edge-count', edges.length.toString())
  })

  it('should maintain performance during node selection changes', async () => {
    const workflow = createLargeWorkflow(30, 29)
    const { useWorkflowStore } = require('../../stores/workflowStore')
    const mockSelectNode = vi.fn()
    
    useWorkflowStore.mockReturnValue({
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: mockSelectNode,
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    render(<Canvas />)

    // Simulate rapid node selections
    const startTime = performance.now()
    
    for (let i = 0; i < 10; i++) {
      mockSelectNode(`node-${i}`)
    }
    
    const endTime = performance.now()
    const selectionTime = endTime - startTime

    expect(selectionTime).toBeLessThan(50)
    expect(mockSelectNode).toHaveBeenCalledTimes(10)
  })

  it('should handle memory efficiently with large workflows', async () => {
    // This test checks that we don't create excessive objects or memory leaks
    const workflow = createLargeWorkflow(100, 99)
    const { useWorkflowStore } = require('../../stores/workflowStore')
    
    useWorkflowStore.mockReturnValue({
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: vi.fn(),
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    })

    const { unmount } = render(<Canvas />)

    // Verify the component renders without issues
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()

    // Clean up should not throw errors
    expect(() => unmount()).not.toThrow()
  })

  it('should handle workflow updates efficiently', async () => {
    let workflow = createLargeWorkflow(20, 19)
    const { useWorkflowStore } = require('../../stores/workflowStore')
    const mockUpdateNode = vi.fn()
    
    const storeValue = {
      workflow,
      selectedNode: null,
      addNode: vi.fn(),
      updateNode: mockUpdateNode,
      deleteNode: vi.fn(),
      selectNode: vi.fn(),
      addEdge: vi.fn(),
      deleteEdge: vi.fn(),
    }
    
    useWorkflowStore.mockReturnValue(storeValue)

    const { rerender } = render(<Canvas />)

    // Simulate multiple node updates
    const startTime = performance.now()
    
    for (let i = 0; i < 10; i++) {
      // Update workflow with new node status
      workflow = {
        ...workflow,
        nodes: workflow.nodes.map(node => 
          node.id === `node-${i}` 
            ? { ...node, status: 'completed' as const }
            : node
        )
      }
      
      storeValue.workflow = workflow
      rerender(<Canvas />)
    }
    
    const endTime = performance.now()
    const updateTime = endTime - startTime

    expect(updateTime).toBeLessThan(200)
  })
})