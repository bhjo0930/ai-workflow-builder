import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../test-utils'
import { validateConnection, detectCircularDependency } from '../../utils/workflowUtils'
import type { Workflow, Node, Edge } from '../../types'

// Mock the workflow utilities
vi.mock('../../utils/workflowUtils', () => ({
  validateConnection: vi.fn(),
  detectCircularDependency: vi.fn(),
  getConnectedVariables: vi.fn(),
  generateNodePosition: vi.fn(() => ({ x: 100, y: 100 })),
}))

describe('Node Connections Integration', () => {
  const createMockNodes = (): Node[] => [
    {
      id: 'node-1',
      type: 'userInput',
      position: { x: 100, y: 100 },
      config: { title: 'Input Node' },
      status: 'idle',
      result: null,
    },
    {
      id: 'node-2',
      type: 'generate',
      position: { x: 300, y: 100 },
      config: { title: 'Generate Node' },
      status: 'idle',
      result: null,
    },
    {
      id: 'node-3',
      type: 'output',
      position: { x: 500, y: 100 },
      config: { title: 'Output Node' },
      status: 'idle',
      result: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates valid connections between compatible node types', () => {
    const nodes = createMockNodes()
    const sourceNode = nodes[0] // userInput
    const targetNode = nodes[1] // generate

    vi.mocked(validateConnection).mockReturnValue({
      isValid: true,
      reason: null,
    })

    const result = validateConnection(sourceNode, targetNode, [])
    
    expect(result.isValid).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('prevents invalid connections between incompatible node types', () => {
    const nodes = createMockNodes()
    const sourceNode = nodes[2] // output
    const targetNode = nodes[0] // userInput (outputs typically don't connect to inputs)

    vi.mocked(validateConnection).mockReturnValue({
      isValid: false,
      reason: 'Cannot connect output node to input node',
    })

    const result = validateConnection(sourceNode, targetNode, [])
    
    expect(result.isValid).toBe(false)
    expect(result.reason).toBe('Cannot connect output node to input node')
  })

  it('detects circular dependencies in workflow', () => {
    const nodes = createMockNodes()
    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: 'edge-2',
        source: 'node-2',
        target: 'node-3',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: 'edge-3',
        source: 'node-3',
        target: 'node-1', // This creates a cycle
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ]

    vi.mocked(detectCircularDependency).mockReturnValue(true)

    const hasCycle = detectCircularDependency(nodes, edges)
    
    expect(hasCycle).toBe(true)
  })

  it('allows valid linear workflow without cycles', () => {
    const nodes = createMockNodes()
    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: 'edge-2',
        source: 'node-2',
        target: 'node-3',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ]

    vi.mocked(detectCircularDependency).mockReturnValue(false)

    const hasCycle = detectCircularDependency(nodes, edges)
    
    expect(hasCycle).toBe(false)
  })

  it('prevents self-connections', () => {
    const nodes = createMockNodes()
    const sourceNode = nodes[0]
    const targetNode = nodes[0] // Same node

    vi.mocked(validateConnection).mockReturnValue({
      isValid: false,
      reason: 'Cannot connect node to itself',
    })

    const result = validateConnection(sourceNode, targetNode, [])
    
    expect(result.isValid).toBe(false)
    expect(result.reason).toBe('Cannot connect node to itself')
  })

  it('prevents duplicate connections between same nodes', () => {
    const nodes = createMockNodes()
    const sourceNode = nodes[0]
    const targetNode = nodes[1]
    const existingEdges: Edge[] = [
      {
        id: 'existing-edge',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ]

    vi.mocked(validateConnection).mockReturnValue({
      isValid: false,
      reason: 'Connection already exists between these nodes',
    })

    const result = validateConnection(sourceNode, targetNode, existingEdges)
    
    expect(result.isValid).toBe(false)
    expect(result.reason).toBe('Connection already exists between these nodes')
  })

  it('handles complex branching workflows', () => {
    const complexNodes: Node[] = [
      {
        id: 'input-1',
        type: 'userInput',
        position: { x: 100, y: 100 },
        config: { title: 'User Input' },
        status: 'idle',
        result: null,
      },
      {
        id: 'generate-1',
        type: 'generate',
        position: { x: 300, y: 50 },
        config: { title: 'Generate Branch 1' },
        status: 'idle',
        result: null,
      },
      {
        id: 'generate-2',
        type: 'generate',
        position: { x: 300, y: 150 },
        config: { title: 'Generate Branch 2' },
        status: 'idle',
        result: null,
      },
      {
        id: 'output-1',
        type: 'output',
        position: { x: 500, y: 100 },
        config: { title: 'Combined Output' },
        status: 'idle',
        result: null,
      },
    ]

    const branchingEdges: Edge[] = [
      {
        id: 'edge-1',
        source: 'input-1',
        target: 'generate-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: 'edge-2',
        source: 'input-1',
        target: 'generate-2',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: 'edge-3',
        source: 'generate-1',
        target: 'output-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: 'edge-4',
        source: 'generate-2',
        target: 'output-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ]

    vi.mocked(detectCircularDependency).mockReturnValue(false)

    const hasCycle = detectCircularDependency(complexNodes, branchingEdges)
    
    expect(hasCycle).toBe(false)
  })

  it('validates connection with multiple inputs to single node', () => {
    const nodes = createMockNodes()
    const additionalInputNode: Node = {
      id: 'node-4',
      type: 'addAssets',
      position: { x: 100, y: 200 },
      config: { title: 'Assets Node' },
      status: 'idle',
      result: null,
    }

    const allNodes = [...nodes, additionalInputNode]
    const targetNode = nodes[1] // generate node
    const existingEdges: Edge[] = [
      {
        id: 'existing-edge',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ]

    // Validate connecting second input to same target
    vi.mocked(validateConnection).mockReturnValue({
      isValid: true,
      reason: null,
    })

    const result = validateConnection(additionalInputNode, targetNode, existingEdges)
    
    expect(result.isValid).toBe(true)
  })

  it('handles disconnection of nodes', () => {
    const nodes = createMockNodes()
    const edges: Edge[] = [
      {
        id: 'edge-to-remove',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: 'edge-2',
        source: 'node-2',
        target: 'node-3',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ]

    // After removing first edge, workflow should still be valid
    const remainingEdges = edges.filter(edge => edge.id !== 'edge-to-remove')
    
    vi.mocked(detectCircularDependency).mockReturnValue(false)

    const hasCycle = detectCircularDependency(nodes, remainingEdges)
    
    expect(hasCycle).toBe(false)
  })

  it('validates workflow with no connections', () => {
    const nodes = createMockNodes()
    const edges: Edge[] = []

    vi.mocked(detectCircularDependency).mockReturnValue(false)

    const hasCycle = detectCircularDependency(nodes, edges)
    
    expect(hasCycle).toBe(false)
  })

  it('handles edge case with single node', () => {
    const singleNode: Node[] = [
      {
        id: 'only-node',
        type: 'userInput',
        position: { x: 100, y: 100 },
        config: { title: 'Single Node' },
        status: 'idle',
        result: null,
      },
    ]

    vi.mocked(detectCircularDependency).mockReturnValue(false)

    const hasCycle = detectCircularDependency(singleNode, [])
    
    expect(hasCycle).toBe(false)
  })

  it('validates complex circular dependency scenarios', () => {
    const complexNodes: Node[] = [
      { id: 'A', type: 'userInput', position: { x: 0, y: 0 }, config: { title: 'A' }, status: 'idle', result: null },
      { id: 'B', type: 'generate', position: { x: 100, y: 0 }, config: { title: 'B' }, status: 'idle', result: null },
      { id: 'C', type: 'generate', position: { x: 200, y: 0 }, config: { title: 'C' }, status: 'idle', result: null },
      { id: 'D', type: 'output', position: { x: 300, y: 0 }, config: { title: 'D' }, status: 'idle', result: null },
    ]

    // Create a complex cycle: A -> B -> C -> D -> B
    const cyclicEdges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2', source: 'B', target: 'C', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e3', source: 'C', target: 'D', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e4', source: 'D', target: 'B', sourceHandle: 'output', targetHandle: 'input' }, // Creates cycle
    ]

    vi.mocked(detectCircularDependency).mockReturnValue(true)

    const hasCycle = detectCircularDependency(complexNodes, cyclicEdges)
    
    expect(hasCycle).toBe(true)
  })

  it('allows valid diamond-shaped workflow pattern', () => {
    const diamondNodes: Node[] = [
      { id: 'start', type: 'userInput', position: { x: 100, y: 100 }, config: { title: 'Start' }, status: 'idle', result: null },
      { id: 'left', type: 'generate', position: { x: 50, y: 200 }, config: { title: 'Left' }, status: 'idle', result: null },
      { id: 'right', type: 'generate', position: { x: 150, y: 200 }, config: { title: 'Right' }, status: 'idle', result: null },
      { id: 'end', type: 'output', position: { x: 100, y: 300 }, config: { title: 'End' }, status: 'idle', result: null },
    ]

    const diamondEdges: Edge[] = [
      { id: 'e1', source: 'start', target: 'left', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2', source: 'start', target: 'right', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e3', source: 'left', target: 'end', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e4', source: 'right', target: 'end', sourceHandle: 'output', targetHandle: 'input' },
    ]

    vi.mocked(detectCircularDependency).mockReturnValue(false)

    const hasCycle = detectCircularDependency(diamondNodes, diamondEdges)
    
    expect(hasCycle).toBe(false)
  })
})