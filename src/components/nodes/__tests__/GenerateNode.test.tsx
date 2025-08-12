import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import GenerateNode from '../GenerateNode'
import type { Node, GenerateNodeConfig } from '../../../types'

// Mock BaseNode
vi.mock('../BaseNode', () => ({
  default: ({ children, onExecute, node }: any) => (
    <div data-testid="base-node">
      <button onClick={() => onExecute?.(node.id)} data-testid="execute-button">
        Execute
      </button>
      {children}
    </div>
  ),
}))

// Mock useNodeErrorHandling hook
vi.mock('../../hooks/useErrorHandling', () => ({
  useNodeErrorHandling: vi.fn(() => ({
    nodeErrors: [],
    hasErrors: false,
  })),
}))

describe('GenerateNode', () => {
  const mockConfig: GenerateNodeConfig = {
    title: 'Generate Node',
    roleDescription: 'You are a helpful AI assistant',
    promptTemplate: 'Generate content based on: {{input}}',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
  }

  const mockNode: Node = {
    id: 'generate-1',
    type: 'generate',
    position: { x: 100, y: 100 },
    config: mockConfig,
    status: 'idle',
    result: null,
  }

  const mockOnExecute = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders role description with sparkles icon', () => {
    render(
      <GenerateNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('You are a helpful AI assistant')).toBeInTheDocument()
    
    // Check for sparkles icon (Lucide icons render as SVG)
    const sparklesIcon = document.querySelector('svg')
    expect(sparklesIcon).toBeInTheDocument()
  })

  it('displays model configuration details', () => {
    render(
      <GenerateNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Model:')).toBeInTheDocument()
    expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument()
    expect(screen.getByText('Temperature:')).toBeInTheDocument()
    expect(screen.getByText('0.7')).toBeInTheDocument()
    expect(screen.getByText('Max Tokens:')).toBeInTheDocument()
    expect(screen.getByText('1000')).toBeInTheDocument()
  })

  it('shows loading state when node is running', () => {
    const runningNode = {
      ...mockNode,
      status: 'running' as const,
    }

    render(
      <GenerateNode
        node={runningNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Generating content...')).toBeInTheDocument()
    
    // Check for loading indicator
    const loadingDot = document.querySelector('.animate-pulse')
    expect(loadingDot).toBeInTheDocument()
  })

  it('displays generated result when available', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'This is the generated content from the AI model.',
    }

    render(
      <GenerateNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Generated:')).toBeInTheDocument()
    expect(screen.getByText('This is the generated content from the AI model.')).toBeInTheDocument()
  })

  it('shows error state when node status is error', () => {
    const errorNode = {
      ...mockNode,
      status: 'error' as const,
    }

    render(
      <GenerateNode
        node={errorNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Execution Error:')).toBeInTheDocument()
    expect(screen.getByText('Failed to generate content. Please check your configuration.')).toBeInTheDocument()
  })

  it('displays node errors from error handling hook', () => {
    const mockErrors = [
      { id: '1', message: 'API key is missing', type: 'validation' as const },
      { id: '2', message: 'Rate limit exceeded', type: 'api' as const },
    ]

    // Mock the hook to return errors
    const { useNodeErrorHandling } = require('../../hooks/useErrorHandling')
    useNodeErrorHandling.mockReturnValue({
      nodeErrors: mockErrors,
      hasErrors: true,
    })

    render(
      <GenerateNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('API key is missing')).toBeInTheDocument()
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
  })

  it('limits error display to 2 errors and shows count for additional errors', () => {
    const mockErrors = [
      { id: '1', message: 'Error 1', type: 'validation' as const },
      { id: '2', message: 'Error 2', type: 'api' as const },
      { id: '3', message: 'Error 3', type: 'network' as const },
      { id: '4', message: 'Error 4', type: 'timeout' as const },
    ]

    const { useNodeErrorHandling } = require('../../hooks/useErrorHandling')
    useNodeErrorHandling.mockReturnValue({
      nodeErrors: mockErrors,
      hasErrors: true,
    })

    render(
      <GenerateNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Error 1')).toBeInTheDocument()
    expect(screen.getByText('Error 2')).toBeInTheDocument()
    expect(screen.queryByText('Error 3')).not.toBeInTheDocument()
    expect(screen.queryByText('Error 4')).not.toBeInTheDocument()
    expect(screen.getByText('+2 more errors')).toBeInTheDocument()
  })

  it('shows singular form for additional error count when only one extra error', () => {
    const mockErrors = [
      { id: '1', message: 'Error 1', type: 'validation' as const },
      { id: '2', message: 'Error 2', type: 'api' as const },
      { id: '3', message: 'Error 3', type: 'network' as const },
    ]

    const { useNodeErrorHandling } = require('../../hooks/useErrorHandling')
    useNodeErrorHandling.mockReturnValue({
      nodeErrors: mockErrors,
      hasErrors: true,
    })

    render(
      <GenerateNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('+1 more error')).toBeInTheDocument()
  })

  it('calls useNodeErrorHandling with correct parameters', () => {
    const { useNodeErrorHandling } = require('../../hooks/useErrorHandling')

    render(
      <GenerateNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(useNodeErrorHandling).toHaveBeenCalledWith(
      'generate-1',
      'generate',
      'Generate Node'
    )
  })

  it('renders result with scrollable container for long content', () => {
    const nodeWithLongResult = {
      ...mockNode,
      result: 'This is a very long generated content that should be scrollable when it exceeds the maximum height of the container. '.repeat(10),
    }

    render(
      <GenerateNode
        node={nodeWithLongResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const resultContainer = screen.getByText(nodeWithLongResult.result).parentElement
    expect(resultContainer).toHaveClass('max-h-20', 'overflow-y-auto')
  })

  it('handles missing role description gracefully', () => {
    const nodeWithoutRole = {
      ...mockNode,
      config: { ...mockConfig, roleDescription: '' },
    }

    render(
      <GenerateNode
        node={nodeWithoutRole}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Role')).toBeInTheDocument()
    // Should render empty role description without crashing
  })
})