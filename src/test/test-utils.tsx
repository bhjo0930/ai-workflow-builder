import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'

// Mock workflow store for testing
const mockWorkflowStore = {
  nodes: [],
  edges: [],
  selectedNode: null,
  isExecuting: false,
  executionProgress: {},
  addNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  selectNode: vi.fn(),
  addEdge: vi.fn(),
  deleteEdge: vi.fn(),
  executeWorkflow: vi.fn(),
  executeNode: vi.fn(),
  saveWorkflow: vi.fn(),
  loadWorkflow: vi.fn(),
  clearWorkflow: vi.fn(),
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockNode = (overrides = {}) => ({
  id: 'test-node-1',
  type: 'userInput',
  position: { x: 100, y: 100 },
  data: {
    title: 'Test Node',
    description: 'Test Description',
    config: {},
    status: 'idle' as const,
    result: null,
  },
  ...overrides,
})

export const createMockEdge = (overrides = {}) => ({
  id: 'test-edge-1',
  source: 'node-1',
  target: 'node-2',
  sourceHandle: 'output',
  targetHandle: 'input',
  ...overrides,
})

export const createMockWorkflow = (overrides = {}) => ({
  id: 'test-workflow-1',
  name: 'Test Workflow',
  nodes: [createMockNode()],
  edges: [createMockEdge()],
  metadata: {
    created: new Date(),
    modified: new Date(),
    version: '1.0.0',
  },
  ...overrides,
})

// Mock API responses
export const mockApiResponse = (data: any, delay = 0) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ data }), delay)
  })
}

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now()
  renderFn()
  const end = performance.now()
  return end - start
}

// Accessibility testing utilities
export const getAccessibilityViolations = async (container: HTMLElement) => {
  const { axe } = await import('vitest-axe')
  return await axe(container)
}