import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../../test/test-utils'
import UserInputNode from '../UserInputNode'
import type { Node, UserInputNodeConfig } from '../../../types'

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

describe('UserInputNode', () => {
  const mockConfig: UserInputNodeConfig = {
    title: 'User Input Node',
    description: 'Enter your input here',
    inputType: 'text',
    placeholder: 'Type something...',
    required: false,
  }

  const mockNode: Node = {
    id: 'user-input-1',
    type: 'userInput',
    position: { x: 100, y: 100 },
    config: mockConfig,
    status: 'idle',
    result: null,
  }

  const mockOnExecute = vi.fn()
  const mockOnUpdateResult = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders input field with correct placeholder', () => {
    render(
      <UserInputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const input = screen.getByPlaceholderText('Type something...')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('renders textarea when inputType is textarea', () => {
    const textareaNode = {
      ...mockNode,
      config: { ...mockConfig, inputType: 'textarea' as const },
    }

    render(
      <UserInputNode
        node={textareaNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const textarea = screen.getByRole('textbox')
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea).toHaveAttribute('rows', '3')
  })

  it('displays description when provided', () => {
    render(
      <UserInputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('Enter your input here')).toBeInTheDocument()
  })

  it('shows required indicator when field is required', () => {
    const requiredNode = {
      ...mockNode,
      config: { ...mockConfig, required: true },
    }

    render(
      <UserInputNode
        node={requiredNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('*')).toHaveClass('text-red-500')
  })

  it('shows validation error for required empty field', () => {
    const requiredNode = {
      ...mockNode,
      config: { ...mockConfig, required: true },
    }

    render(
      <UserInputNode
        node={requiredNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('applies error styling to required empty field', () => {
    const requiredNode = {
      ...mockNode,
      config: { ...mockConfig, required: true },
    }

    render(
      <UserInputNode
        node={requiredNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-300', 'bg-red-50')
  })

  it('calls onUpdateResult when input value changes', () => {
    render(
      <UserInputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test input' } })

    expect(mockOnUpdateResult).toHaveBeenCalledWith('user-input-1', 'test input')
  })

  it('updates input value when typing', () => {
    render(
      <UserInputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'new value' } })

    expect(input.value).toBe('new value')
  })

  it('displays result when node has result', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'This is the output',
    }

    render(
      <UserInputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    expect(screen.getByText('Output:')).toBeInTheDocument()
    expect(screen.getByText('This is the output')).toBeInTheDocument()
  })

  it('initializes input with existing result value', () => {
    const nodeWithResult = {
      ...mockNode,
      result: 'existing value',
    }

    render(
      <UserInputNode
        node={nodeWithResult}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('existing value')
  })

  it('calls onExecute when execute button is clicked with valid input', () => {
    render(
      <UserInputNode
        node={mockNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'valid input' } })

    const executeButton = screen.getByTestId('execute-button')
    fireEvent.click(executeButton)

    expect(mockOnExecute).toHaveBeenCalledWith('user-input-1')
  })

  it('prevents execution when required field is empty', () => {
    const requiredNode = {
      ...mockNode,
      config: { ...mockConfig, required: true },
    }

    // Mock console.error to verify it's called
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <UserInputNode
        node={requiredNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const executeButton = screen.getByTestId('execute-button')
    fireEvent.click(executeButton)

    expect(consoleSpy).toHaveBeenCalledWith('Required input is missing')
    expect(mockOnExecute).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('allows execution when required field has whitespace-only value', () => {
    const requiredNode = {
      ...mockNode,
      config: { ...mockConfig, required: true },
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <UserInputNode
        node={requiredNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '   ' } })

    const executeButton = screen.getByTestId('execute-button')
    fireEvent.click(executeButton)

    expect(consoleSpy).toHaveBeenCalledWith('Required input is missing')
    expect(mockOnExecute).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('removes validation error when required field gets valid input', () => {
    const requiredNode = {
      ...mockNode,
      config: { ...mockConfig, required: true },
    }

    render(
      <UserInputNode
        node={requiredNode}
        isSelected={false}
        onExecute={mockOnExecute}
        onUpdateResult={mockOnUpdateResult}
      />
    )

    // Initially shows error
    expect(screen.getByText('This field is required')).toBeInTheDocument()

    // Add valid input
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'valid input' } })

    // Error should be gone
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument()
    expect(input).not.toHaveClass('border-red-300', 'bg-red-50')
  })
})