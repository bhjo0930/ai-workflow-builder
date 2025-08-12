import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../../test/test-utils'
import BaseNode from '../BaseNode'
import type { Node } from '../../../types'

// Mock the useConnection hook
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    useConnection: vi.fn(() => ({
      inProgress: false,
      fromNode: null,
    })),
    Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
    Position: {
      Left: 'left',
      Right: 'right',
      Top: 'top',
      Bottom: 'bottom',
    },
  }
})

// Mock the workflowUtils
vi.mock('../../../utils/workflowUtils', () => ({
  getConnectedVariables: vi.fn(() => []),
}))

// Mock UsedInThisStep component
vi.mock('../UsedInThisStep', () => ({
  default: ({ variables }: { variables: any[] }) => (
    <div data-testid="used-in-this-step">
      {variables.length > 0 && <span>Variables: {variables.length}</span>}
    </div>
  ),
}))

describe('BaseNode', () => {
  const mockNode: Node = {
    id: 'test-node-1',
    type: 'userInput',
    position: { x: 100, y: 100 },
    config: {
      title: 'Test Node',
      description: 'Test Description',
    },
    status: 'idle',
    result: null,
  }

  const mockOnExecute = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders node with correct title', () => {
    render(
      <BaseNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      >
        <div>Test Content</div>
      </BaseNode>
    )

    expect(screen.getByText('Test Node')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <BaseNode
        node={mockNode}
        isSelected={true}
        onExecute={mockOnExecute}
      >
        <div>Test Content</div>
      </BaseNode>
    )

    const nodeElement = container.firstChild as HTMLElement
    expect(nodeElement).toHaveClass('ring-2', 'ring-blue-500', 'ring-offset-2')
  })

  it('displays correct status icon for different statuses', () => {
    const statuses: Array<{ status: Node['status'], expectedClass: string }> = [
      { status: 'idle', expectedClass: 'text-gray-400' },
      { status: 'running', expectedClass: 'text-blue-500' },
      { status: 'completed', expectedClass: 'text-green-500' },
      { status: 'error', expectedClass: 'text-red-500' },
    ]

    statuses.forEach(({ status, expectedClass }) => {
      const { container, unmount } = render(
        <BaseNode
          node={{ ...mockNode, status }}
          isSelected={false}
          onExecute={mockOnExecute}
        >
          <div>Test Content</div>
        </BaseNode>
      )

      const statusIcon = container.querySelector('svg')
      expect(statusIcon).toHaveClass(expectedClass)
      unmount()
    })
  })

  it('applies correct color scheme for different node types', () => {
    const nodeTypes: Array<{ type: Node['type'], expectedClass: string }> = [
      { type: 'userInput', expectedClass: 'border-purple-200' },
      { type: 'generate', expectedClass: 'border-blue-200' },
      { type: 'output', expectedClass: 'border-green-200' },
      { type: 'addAssets', expectedClass: 'border-orange-200' },
    ]

    nodeTypes.forEach(({ type, expectedClass }) => {
      const { container, unmount } = render(
        <BaseNode
          node={{ ...mockNode, type }}
          isSelected={false}
          onExecute={mockOnExecute}
        >
          <div>Test Content</div>
        </BaseNode>
      )

      const nodeElement = container.firstChild as HTMLElement
      expect(nodeElement).toHaveClass(expectedClass)
      unmount()
    })
  })

  it('calls onExecute when execute button is clicked', () => {
    render(
      <BaseNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      >
        <div>Test Content</div>
      </BaseNode>
    )

    const executeButton = screen.getByTitle('Execute node')
    fireEvent.click(executeButton)

    expect(mockOnExecute).toHaveBeenCalledWith('test-node-1')
  })

  it('disables execute button when node is running', () => {
    render(
      <BaseNode
        node={{ ...mockNode, status: 'running' }}
        isSelected={false}
        onExecute={mockOnExecute}
      >
        <div>Test Content</div>
      </BaseNode>
    )

    const executeButton = screen.getByTitle('Execute node')
    expect(executeButton).toBeDisabled()
    
    fireEvent.click(executeButton)
    expect(mockOnExecute).not.toHaveBeenCalled()
  })

  it('renders input and output handles', () => {
    render(
      <BaseNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      >
        <div>Test Content</div>
      </BaseNode>
    )

    const handles = screen.getAllByTestId('handle')
    expect(handles).toHaveLength(2)
    
    // Check for input handle
    expect(handles[0]).toHaveAttribute('type', 'target')
    expect(handles[0]).toHaveAttribute('id', 'input')
    
    // Check for output handle
    expect(handles[1]).toHaveAttribute('type', 'source')
    expect(handles[1]).toHaveAttribute('id', 'output')
  })

  it('renders UsedInThisStep component', () => {
    render(
      <BaseNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      >
        <div>Test Content</div>
      </BaseNode>
    )

    expect(screen.getByTestId('used-in-this-step')).toBeInTheDocument()
  })

  it('prevents event propagation when execute button is clicked', () => {
    const mockParentClick = vi.fn()
    
    render(
      <div onClick={mockParentClick}>
        <BaseNode
          node={mockNode}
          isSelected={false}
          onExecute={mockOnExecute}
        >
          <div>Test Content</div>
        </BaseNode>
      </div>
    )

    const executeButton = screen.getByTitle('Execute node')
    fireEvent.click(executeButton)

    expect(mockOnExecute).toHaveBeenCalledWith('test-node-1')
    expect(mockParentClick).not.toHaveBeenCalled()
  })
})