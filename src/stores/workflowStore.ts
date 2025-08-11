import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Node, Connection, Workflow, NodeType, Position } from '../types';
import { WorkflowPersistenceService } from '../services/workflowPersistenceService';

interface WorkflowState {
  // Current workflow data
  workflow: Workflow;
  selectedNodeId: string | null;
  
  // Persistence state
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  
  // Actions
  addNode: (type: NodeType, position: Position) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  selectNode: (nodeId: string | null) => void;
  
  addConnection: (connection: Omit<Connection, 'id'>) => void;
  removeConnection: (connectionId: string) => void;
  
  setWorkflow: (workflow: Workflow) => void;
  setGeneratedWorkflow: (nodes: Node[], connections: Connection[]) => void;
  resetWorkflow: () => void;
  
  // Persistence actions
  saveWorkflow: (filename?: string) => Promise<void>;
  loadWorkflow: (file: File) => Promise<void>;
  markSaved: () => void;
  updateWorkflowName: (name: string) => void;
}

const createEmptyWorkflow = (): Workflow => ({
  id: crypto.randomUUID(),
  name: 'Untitled Workflow',
  nodes: [],
  connections: [],
  metadata: {
    created: new Date(),
    modified: new Date(),
    version: '1.0.0',
  },
});

export const useWorkflowStore = create<WorkflowState>()(
  immer((set, get) => ({
    workflow: createEmptyWorkflow(),
    selectedNodeId: null,
    
    // Persistence state
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    hasUnsavedChanges: false,

    addNode: (type: NodeType, position: Position) => {
      set((state) => {
        const nodeId = crypto.randomUUID();
        
        // Create default config based on node type
        let config;
        switch (type) {
          case 'userInput':
            config = {
              title: 'User Input',
              description: 'Enter your input here',
              inputType: 'text',
              required: true,
            };
            break;
          case 'generate':
            config = {
              title: 'Generate',
              description: 'Generate content using AI',
              promptTemplate: 'Generate content based on: {{input}}',
              model: 'gemini-2.0-flash-001',
              temperature: 0.7,
              maxTokens: 1000,
              roleDescription: 'You are a helpful assistant',
            };
            break;
          case 'output':
            config = {
              title: 'Output',
              description: 'Display the final result',
              format: 'text',
              showCopyButton: true,
              showDownloadButton: true,
            };
            break;
          case 'addAssets':
            config = {
              title: 'Add Assets',
              description: 'Add files or text assets',
              allowedFileTypes: ['.txt', '.pdf', '.docx'],
              maxFileSize: 10 * 1024 * 1024, // 10MB
              textInput: '',
            };
            break;
        }

        const newNode: Node = {
          id: nodeId,
          type,
          position,
          config,
          status: 'idle',
        };

        state.workflow.nodes.push(newNode);
        state.workflow.metadata.modified = new Date();
        state.hasUnsavedChanges = true;
      });
    },

    removeNode: (nodeId: string) => {
      set((state) => {
        // Remove node
        state.workflow.nodes = state.workflow.nodes.filter(
          (node) => node.id !== nodeId
        );
        
        // Remove connections involving this node
        state.workflow.connections = state.workflow.connections.filter(
          (conn) => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
        );
        
        // Clear selection if this node was selected
        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null;
        }
        
        state.workflow.metadata.modified = new Date();
        state.hasUnsavedChanges = true;
      });
    },

    updateNode: (nodeId: string, updates: Partial<Node>) => {
      set((state) => {
        const nodeIndex = state.workflow.nodes.findIndex(
          (node) => node.id === nodeId
        );
        if (nodeIndex !== -1) {
          Object.assign(state.workflow.nodes[nodeIndex], updates);
          state.workflow.metadata.modified = new Date();
          state.hasUnsavedChanges = true;
        }
      });
    },

    selectNode: (nodeId: string | null) => {
      set((state) => {
        state.selectedNodeId = nodeId;
      });
    },

    addConnection: (connection: Omit<Connection, 'id'>) => {
      set((state) => {
        const newConnection: Connection = {
          ...connection,
          id: crypto.randomUUID(),
        };
        state.workflow.connections.push(newConnection);
        state.workflow.metadata.modified = new Date();
        state.hasUnsavedChanges = true;
      });
    },

    removeConnection: (connectionId: string) => {
      set((state) => {
        state.workflow.connections = state.workflow.connections.filter(
          (conn) => conn.id !== connectionId
        );
        state.workflow.metadata.modified = new Date();
        state.hasUnsavedChanges = true;
      });
    },

    setWorkflow: (workflow: Workflow) => {
      set((state) => {
        state.workflow = workflow;
        state.selectedNodeId = null;
        state.hasUnsavedChanges = false;
        state.lastSaved = null;
      });
    },

    setGeneratedWorkflow: (nodes: Node[], connections: Connection[]) => {
      set((state) => {
        // Replace the current workflow with the AI-generated one.
        // A more advanced implementation could merge or use auto-layout.
        state.workflow.nodes = nodes;
        state.workflow.connections = connections;

        // Reset selection and mark changes
        state.selectedNodeId = null;
        state.workflow.metadata.modified = new Date();
        state.hasUnsavedChanges = true;
      });
    },

    resetWorkflow: () => {
      set((state) => {
        state.workflow = createEmptyWorkflow();
        state.selectedNodeId = null;
        state.hasUnsavedChanges = false;
        state.lastSaved = null;
      });
    },

    // Persistence actions
    saveWorkflow: async (filename?: string) => {
      const { workflow } = get();
      
      set((state) => {
        state.isSaving = true;
      });

      try {
        WorkflowPersistenceService.saveWorkflowToFile(workflow, filename);
        
        set((state) => {
          state.isSaving = false;
          state.hasUnsavedChanges = false;
          state.lastSaved = new Date();
        });
      } catch (error) {
        set((state) => {
          state.isSaving = false;
        });
        throw error;
      }
    },

    loadWorkflow: async (file: File) => {
      set((state) => {
        state.isLoading = true;
      });

      try {
        const workflow = await WorkflowPersistenceService.loadWorkflowFromFile(file);
        
        set((state) => {
          state.workflow = workflow;
          state.selectedNodeId = null;
          state.isLoading = false;
          state.hasUnsavedChanges = false;
          state.lastSaved = new Date();
        });
      } catch (error) {
        set((state) => {
          state.isLoading = false;
        });
        throw error;
      }
    },

    markSaved: () => {
      set((state) => {
        state.hasUnsavedChanges = false;
        state.lastSaved = new Date();
      });
    },

    updateWorkflowName: (name: string) => {
      set((state) => {
        state.workflow.name = name;
        state.workflow.metadata.modified = new Date();
        state.hasUnsavedChanges = true;
      });
    },
  }))
);