import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../../test/test-utils'
import OutputNode from '../OutputNode'
import type { Node, OutputNodeConfig } from '../../../types'

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

// Mock workflowUtils
vi.mock('../../../utils/workflowUtils', () => ({
  getConnectedVariables: vi.fn(() => []),
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

// Mock URL.createObjectURL and related APIs
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('OutputNode', () => {
  const mockConfig: OutputNodeConfig = {
    title: 'Output Node',
    description: 'Display the final output',
    format: 'text',
    showCopyButton: true,
    showDownloadButton: true,
  }

  const mockNode: Node = {
    id: 'output-1',
    type: 'output',
    position: { x: 100, y: 100 },
    config: mockConfig,
    status: 'idle',
    result: null,
  }

  const mockOnExecute = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders description when provided', () => {
    render(
      <OutputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Display the final output')).toBeInTheDocument()
  })

  it('displays format information', () => {
    render(
      <OutputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Format:')).toBeInTheDocument()
    expect(screen.getByText('text')).toBeInTheDocument()
  })

  it('shows empty state when no result is available', () => {
    render(
      <OutputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Execute to see output')).toBeInTheDocument()
    
    // Check for eye icon
    const eyeIcon = document.querySelector('svg')
    expect(eyeIcon).toBeInTheDocument()
  })

  it('shows "No input connected" when no variables are connected', () => {
    const { getConnectedVariables } = require('../../../utils/workflowUtils')
    getConnectedVariables.mockReturnValue([])

    render(
      <OutputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('No input connected')).toBeInTheDocument()
  })

  it('shows "Execute to see output" when variables are connected', () => {
    const { getConnectedVariables } = require('../../../utils/workflowUtils')
    getConnectedVariables.mockReturnValue([{ name: 'input1', value: 'test' }])

    render(
      <OutputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Execute to see output')).toBeInTheDocument()
  })

  it('displays result when available', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'This is the final output result',
    }

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.getByText('Output:')).toBeInTheDocument()
    expect(screen.getByText('This is the final output result')).toBeInTheDocument()
  })

  it('renders copy button when showCopyButton is true', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Test output',
    }

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const copyButton = screen.getByTitle('Copy to clipboard')
    expect(copyButton).toBeInTheDocument()
  })

  it('renders download button when showDownloadButton is true', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Test output',
    }

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const downloadButton = screen.getByTitle('Download as file')
    expect(downloadButton).toBeInTheDocument()
  })

  it('hides copy button when showCopyButton is false', () => {
    const nodeWithResult = {
      ...mockNode,
      config: { ...mockConfig, showCopyButton: false },
      result: 'Test output',
    }

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.queryByTitle('Copy to clipboard')).not.toBeInTheDocument()
  })

  it('hides download button when showDownloadButton is false', () => {
    const nodeWithResult = {
      ...mockNode,
      config: { ...mockConfig, showDownloadButton: false },
      result: 'Test output',
    }

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    expect(screen.queryByTitle('Download as file')).not.toBeInTheDocument()
  })

  it('copies result to clipboard when copy button is clicked', async () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Test output to copy',
    }

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const copyButton = screen.getByTitle('Copy to clipboard')
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test output to copy')
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(consoleSpy).toHaveBeenCalledWith('Copied to clipboard')

    consoleSpy.mockRestore()
  })

  it('handles clipboard copy error gracefully', async () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Test output',
    }

    // Mock clipboard to reject
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const copyButton = screen.getByTitle('Copy to clipboard')
    fireEvent.click(copyButton)

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(consoleSpy).toHaveBeenCalledWith('Failed to copy:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('downloads result as file when download button is clicked', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Test output to download',
    }

    // Mock document methods
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const downloadButton = screen.getByTitle('Download as file')
    fireEvent.click(downloadButton)

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(mockAnchor.href).toBe('mock-url')
    expect(mockAnchor.download).toBe('Output_Node_output.txt')
    expect(mockAnchor.click).toHaveBeenCalled()
    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor)
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor)
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url')

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  it('creates blob with correct content for download', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Test content for blob',
    }

    // Mock Blob constructor
    const mockBlob = new Blob(['Test content for blob'], { type: 'text/plain' })
    const blobSpy = vi.spyOn(global, 'Blob').mockImplementation(() => mockBlob)

    const mockAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const downloadButton = screen.getByTitle('Download as file')
    fireEvent.click(downloadButton)

    expect(blobSpy).toHaveBeenCalledWith(['Test content for blob'], { type: 'text/plain' })

    blobSpy.mockRestore()
  })

  it('preserves whitespace and line breaks in result display', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Line 1\nLine 2\n  Indented line',
    }

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const resultContainer = screen.getByText('Line 1\nLine 2\n  Indented line')
    expect(resultContainer).toHaveClass('whitespace-pre-wrap')
  })

  it('makes result container scrollable for long content', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Very long content that should be scrollable',
    }

    render(
      <OutputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
      />
    )

    const resultContainer = screen.getByText('Very long content that should be scrollable').parentElement
    expect(resultContainer).toHaveClass('max-h-32', 'overflow-y-auto')
  })
})