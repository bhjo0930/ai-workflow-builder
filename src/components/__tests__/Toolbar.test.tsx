import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/test-utils'
import Toolbar from '../Toolbar'

// Mock the stores
vi.mock('../../stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(() => ({
    workflow: { nodes: [], edges: [] },
    addNode: vi.fn(),
    updateNode: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
  })),
}))

vi.mock('../../stores/errorStore', () => ({
  useErrorStore: vi.fn(() => ({
    errors: [],
    criticalErrors: 0,
    toggleErrorPanel: vi.fn(),
  })),
}))

// Mock the workflow execution service
vi.mock('../../services/workflowExecutionService', () => ({
  WorkflowExecutionService: {
    getExecutionState: vi.fn(() => ({ isRunning: false, currentNode: null })),
    subscribe: vi.fn(() => vi.fn()),
    canExecuteWorkflow: vi.fn(() => ({ canExecute: true })),
    executeWorkflow: vi.fn(),
    stopExecution: vi.fn(),
  },
}))

// Mock utils
vi.mock('../../utils/workflowUtils', () => ({
  generateNodePosition: vi.fn(() => ({ x: 100, y: 100 })),
}))

vi.mock('../../utils/constants', () => ({
  NODE_TYPES: {
    userInput: 'userInput',
    generate: 'generate',
    output: 'output',
    addAssets: 'addAssets',
  },
}))

describe('Toolbar', () => {
  const mockWorkflowStore = {
    workflow: { nodes: [], edges: [] },
    addNode: vi.fn(),
    updateNode: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
  }

  const mockErrorStore = {
    errors: [],
    criticalErrors: 0,
    toggleErrorPanel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    const { useWorkflowStore } = require('../../stores/workflowStore')
    const { useErrorStore } = require('../../stores/errorStore')
    useWorkflowStore.mockReturnValue(mockWorkflowStore)
    useErrorStore.mockReturnValue(mockErrorStore)
  })

  it('renders the toolbar with title', () => {
    render(<Toolbar />)
    
    expect(screen.getByText('AI Workflow Builder')).toBeInTheDocument()
  })

  it('renders all node type buttons', () => {
    render(<Toolbar />)
    
    expect(screen.getByTitle('Collect input from user')).toBeInTheDocument()
    expect(screen.getByTitle('Generate content with LLM')).toBeInTheDocument()
    expect(screen.getByTitle('Display final results')).toBeInTheDocument()
    expect(screen.getByTitle('Add files or text assets')).toBeInTheDocument()
  })

  it('renders node type labels on larger screens', () => {
    render(<Toolbar />)
    
    // These are hidden on small screens but visible on sm and up
    expect(screen.getByText('User Input')).toBeInTheDocument()
    expect(screen.getByText('Generate')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByText('Add Assets')).toBeInTheDocument()
  })

  it('calls addNode when node type button is clicked', () => {
    render(<Toolbar />)
    
    const userInputButton = screen.getByTitle('Collect input from user')
    fireEvent.click(userInputButton)
    
    expect(mockWorkflowStore.addNode).toHaveBeenCalledWith('userInput', { x: 100, y: 100 })
  })

  it('shows visual feedback when node is added', async () => {
    render(<Toolbar />)
    
    const generateButton = screen.getByTitle('Generate content with LLM')
    fireEvent.click(generateButton)
    
    // Button should be disabled and show check icon
    expect(generateButton).toBeDisabled()
    
    // Wait for feedback to clear
    await waitFor(() => {
      expect(generateButton).not.toBeDisabled()
    }, { timeout: 1100 })
  })

  it('renders undo/redo buttons', () => {
    render(<Toolbar />)
    
    expect(screen.getByTitle('Undo (Ctrl+Z / Cmd+Z)')).toBeInTheDocument()
    expect(screen.getByTitle('Redo (Ctrl+Y / Cmd+Y)')).toBeInTheDocument()
  })

  it('disables undo button when canUndo returns false', () => {
    render(<Toolbar />)
    
    const undoButton = screen.getByTitle('Undo (Ctrl+Z / Cmd+Z)')
    expect(undoButton).toBeDisabled()
  })

  it('enables undo button when canUndo returns true', () => {
    mockWorkflowStore.canUndo.mockReturnValue(true)
    
    render(<Toolbar />)
    
    const undoButton = screen.getByTitle('Undo (Ctrl+Z / Cmd+Z)')
    expect(undoButton).not.toBeDisabled()
  })

  it('calls undo when undo button is clicked', () => {
    mockWorkflowStore.canUndo.mockReturnValue(true)
    
    render(<Toolbar />)
    
    const undoButton = screen.getByTitle('Undo (Ctrl+Z / Cmd+Z)')
    fireEvent.click(undoButton)
    
    expect(mockWorkflowStore.undo).toHaveBeenCalled()
  })

  it('calls redo when redo button is clicked', () => {
    mockWorkflowStore.canRedo.mockReturnValue(true)
    
    render(<Toolbar />)
    
    const redoButton = screen.getByTitle('Redo (Ctrl+Y / Cmd+Y)')
    fireEvent.click(redoButton)
    
    expect(mockWorkflowStore.redo).toHaveBeenCalled()
  })

  it('renders execute button when not running', () => {
    mockWorkflowStore.workflow.nodes = [{ id: '1', type: 'userInput' }] // Add a node
    
    render(<Toolbar />)
    
    expect(screen.getByTitle('Execute entire workflow')).toBeInTheDocument()
    expect(screen.getByText('Execute')).toBeInTheDocument()
  })

  it('disables execute button when no nodes exist', () => {
    render(<Toolbar />)
    
    const executeButton = screen.getByTitle('Execute entire workflow')
    expect(executeButton).toBeDisabled()
  })

  it('calls executeWorkflow when execute button is clicked', async () => {
    const { WorkflowExecutionService } = require('../../services/workflowExecutionService')
    mockWorkflowStore.workflow.nodes = [{ id: '1', type: 'userInput' }]
    
    render(<Toolbar />)
    
    const executeButton = screen.getByTitle('Execute entire workflow')
    fireEvent.click(executeButton)
    
    expect(WorkflowExecutionService.canExecuteWorkflow).toHaveBeenCalled()
    expect(WorkflowExecutionService.executeWorkflow).toHaveBeenCalled()
  })

  it('shows stop button when execution is running', () => {
    const { WorkflowExecutionService } = require('../../services/workflowExecutionService')
    WorkflowExecutionService.getExecutionState.mockReturnValue({ isRunning: true, currentNode: 'node-1' })
    
    render(<Toolbar />)
    
    expect(screen.getByTitle('Stop workflow execution')).toBeInTheDocument()
    expect(screen.getByText('Stop')).toBeInTheDocument()
  })

  it('calls stopExecution when stop button is clicked', () => {
    const { WorkflowExecutionService } = require('../../services/workflowExecutionService')
    WorkflowExecutionService.getExecutionState.mockReturnValue({ isRunning: true, currentNode: 'node-1' })
    
    render(<Toolbar />)
    
    const stopButton = screen.getByTitle('Stop workflow execution')
    fireEvent.click(stopButton)
    
    expect(WorkflowExecutionService.stopExecution).toHaveBeenCalled()
  })

  it('shows error indicator when errors exist', () => {
    mockErrorStore.errors = [{ id: '1', message: 'Test error' }]
    mockErrorStore.criticalErrors = 0
    
    render(<Toolbar />)
    
    expect(screen.getByTitle('1 error detected. Click to view details.')).toBeInTheDocument()
  })

  it('shows critical error styling for critical errors', () => {
    mockErrorStore.errors = [{ id: '1', message: 'Critical error' }]
    mockErrorStore.criticalErrors = 1
    
    render(<Toolbar />)
    
    const errorButton = screen.getByTitle('1 error detected. Click to view details.')
    expect(errorButton).toHaveClass('bg-red-100', 'text-red-700')
  })

  it('shows warning styling for non-critical errors', () => {
    mockErrorStore.errors = [{ id: '1', message: 'Warning error' }]
    mockErrorStore.criticalErrors = 0
    
    render(<Toolbar />)
    
    const errorButton = screen.getByTitle('1 error detected. Click to view details.')
    expect(errorButton).toHaveClass('bg-yellow-100', 'text-yellow-700')
  })

  it('calls toggleErrorPanel when error indicator is clicked', () => {
    mockErrorStore.errors = [{ id: '1', message: 'Test error' }]
    
    render(<Toolbar />)
    
    const errorButton = screen.getByTitle('1 error detected. Click to view details.')
    fireEvent.click(errorButton)
    
    expect(mockErrorStore.toggleErrorPanel).toHaveBeenCalled()
  })

  it('shows plural form for multiple errors', () => {
    mockErrorStore.errors = [
      { id: '1', message: 'Error 1' },
      { id: '2', message: 'Error 2' },
    ]
    
    render(<Toolbar />)
    
    expect(screen.getByTitle('2 errors detected. Click to view details.')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(<Toolbar className="custom-class" />)
    
    const toolbar = container.firstChild as HTMLElement
    expect(toolbar).toHaveClass('custom-class')
  })

  it('shows alert when workflow cannot be executed', async () => {
    const { WorkflowExecutionService } = require('../../services/workflowExecutionService')
    WorkflowExecutionService.canExecuteWorkflow.mockReturnValue({
      canExecute: false,
      reason: 'No nodes to execute',
    })
    
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    mockWorkflowStore.workflow.nodes = [{ id: '1', type: 'userInput' }]
    
    render(<Toolbar />)
    
    const executeButton = screen.getByTitle('Execute entire workflow')
    fireEvent.click(executeButton)
    
    expect(alertSpy).toHaveBeenCalledWith('No nodes to execute')
    expect(WorkflowExecutionService.executeWorkflow).not.toHaveBeenCalled()
    
    alertSpy.mockRestore()
  })
})