import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils'
import AddAssetsNode from '../AddAssetsNode'
import type { Node, AddAssetsNodeConfig } from '../../../types'

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

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(({ onDrop }) => ({
    getRootProps: () => ({
      'data-testid': 'dropzone',
      onClick: () => {},
    }),
    getInputProps: () => ({
      'data-testid': 'file-input',
    }),
    isDragActive: false,
  })),
}))

// Mock FileReader
global.FileReader = class MockFileReader {
  onload: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  
  readAsText(file: File) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: `Content of ${file.name}` } })
      }
    }, 0)
  }
} as any

describe('AddAssetsNode', () => {
  const mockConfig: AddAssetsNodeConfig = {
    title: 'Add Assets Node',
    description: 'Upload files or add text content',
    allowedFileTypes: ['.txt', '.md', '.json'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    textInput: '',
  }

  const mockNode: Node = {
    id: 'add-assets-1',
    type: 'addAssets',
    position: { x: 100, y: 100 },
    config: mockConfig,
    status: 'idle',
    result: null,
  }

  const mockOnExecute = vi.fn()
  const mockOnUpdateConfig = vi.fn()
  const mockOnUpdateResult = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders description when provided', () => {
    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('Upload files or add text content')).toBeInTheDocument()
  })

  it('renders text input area', () => {
    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('Text Input')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter text content...')).toBeInTheDocument()
  })

  it('renders file upload dropzone', () => {
    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('File Upload')).toBeInTheDocument()
    expect(screen.getByText('Drag & drop files here, or click to select')).toBeInTheDocument()
    expect(screen.getByText('Allowed: .txt, .md, .json (max 5MB)')).toBeInTheDocument()
  })

  it('updates text input and calls callbacks when text changes', () => {
    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const textarea = screen.getByPlaceholderText('Enter text content...')
    fireEvent.change(textarea, { target: { value: 'New text content' } })

    expect(mockOnUpdateConfig).toHaveBeenCalledWith('add-assets-1', {
      ...mockConfig,
      textInput: 'New text content',
    })

    expect(mockOnUpdateResult).toHaveBeenCalledWith('add-assets-1', {
      textInput: 'New text content',
      files: [],
    })
  })

  it('initializes text input with existing config value', () => {
    const nodeWithText = {
      ...mockNode,
      config: { ...mockConfig, textInput: 'Existing text' },
    }

    render(
      <AddAssetsNode
        node={nodeWithText}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const textarea = screen.getByDisplayValue('Existing text')
    expect(textarea).toBeInTheDocument()
  })

  it('displays file size limits correctly', () => {
    const nodeWithLargeLimit = {
      ...mockNode,
      config: { ...mockConfig, maxFileSize: 10 * 1024 * 1024 }, // 10MB
    }

    render(
      <AddAssetsNode
        node={nodeWithLargeLimit}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('Allowed: .txt, .md, .json (max 10MB)')).toBeInTheDocument()
  })

  it('formats file sizes correctly', async () => {
    const { useDropzone } = require('react-dropzone')
    let onDropCallback: any

    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
      }
    })

    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    // Simulate file drop
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(mockFile, 'size', { value: 1536 }) // 1.5 KB

    await onDropCallback([mockFile])

    await waitFor(() => {
      expect(screen.getByText('1.5 KB')).toBeInTheDocument()
    })
  })

  it('shows error for files that are too large', async () => {
    const { useDropzone } = require('react-dropzone')
    let onDropCallback: any

    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
      }
    })

    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    // Create a file that's too large
    const mockFile = new File(['content'], 'large.txt', { type: 'text/plain' })
    Object.defineProperty(mockFile, 'size', { value: 10 * 1024 * 1024 }) // 10MB

    await onDropCallback([mockFile])

    await waitFor(() => {
      expect(screen.getByText('File "large.txt" is too large. Maximum size is 5MB')).toBeInTheDocument()
    })
  })

  it('shows error for disallowed file types', async () => {
    const { useDropzone } = require('react-dropzone')
    let onDropCallback: any

    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
      }
    })

    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    // Create a file with disallowed extension
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    Object.defineProperty(mockFile, 'size', { value: 1024 })

    await onDropCallback([mockFile])

    await waitFor(() => {
      expect(screen.getByText('File type ".pdf" is not allowed. Allowed types: .txt, .md, .json')).toBeInTheDocument()
    })
  })

  it('successfully processes valid files', async () => {
    const { useDropzone } = require('react-dropzone')
    let onDropCallback: any

    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
      }
    })

    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(mockFile, 'size', { value: 1024 })

    await onDropCallback([mockFile])

    await waitFor(() => {
      expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument()
      expect(screen.getByText('test.txt')).toBeInTheDocument()
      expect(screen.getByText('1 KB')).toBeInTheDocument()
    })

    expect(mockOnUpdateResult).toHaveBeenCalledWith('add-assets-1', {
      textInput: '',
      files: [{
        name: 'test.txt',
        size: 1024,
        type: 'text/plain',
        content: 'Content of test.txt',
      }],
    })
  })

  it('allows removing uploaded files', async () => {
    const { useDropzone } = require('react-dropzone')
    let onDropCallback: any

    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
      }
    })

    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(mockFile, 'size', { value: 1024 })

    await onDropCallback([mockFile])

    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })

    // Find and click the remove button
    const removeButton = screen.getByRole('button', { name: '' }) // X button has no text
    fireEvent.click(removeButton)

    expect(screen.queryByText('Uploaded Files (1)')).not.toBeInTheDocument()
    expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
  })

  it('displays result when node has result', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'Processed asset data',
    }

    render(
      <AddAssetsNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('Processed Assets:')).toBeInTheDocument()
    expect(screen.getByText('Processed asset data')).toBeInTheDocument()
  })

  it('handles file reading errors gracefully', async () => {
    // Mock FileReader to fail
    global.FileReader = class MockFileReader {
      onload: ((event: any) => void) | null = null
      onerror: ((event: any) => void) | null = null
      
      readAsText(file: File) {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Error('Read failed'))
          }
        }, 0)
      }
    } as any

    const { useDropzone } = require('react-dropzone')
    let onDropCallback: any

    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
      }
    })

    render(
      <AddAssetsNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateConfig={mockOnUpdateConfig}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    Object.defineProperty(mockFile, 'size', { value: 1024 })

    await onDropCallback([mockFile])

    await waitFor(() => {
      expect(screen.getByText('Failed to read file "test.txt"')).toBeInTheDocument()
    })
  })
})