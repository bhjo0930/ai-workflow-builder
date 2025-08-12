import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Node, Connection, Workflow, NodeType, Position } from '../types';
import { WorkflowPersistenceService } from '../services/workflowPersistenceService';
import { useUndoRedoStore } from './undoRedoStore';
import { generateUUID } from '../utils/uuid';

interface WorkflowState {
  // Current workflow data
  workflow: Workflow;
  selectedNodeId: string | null;
  
  // Persistence state
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  
  // Undo/Redo state
  isUndoRedoOperation: boolean;
  
  // Actions
  addNode: (type: NodeType, position: Position) => string;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  selectNode: (nodeId: string | null) => void;
  
  addConnection: (connection: Omit<Connection, 'id'>) => void;
  removeConnection: (connectionId: string) => void;
  
  setWorkflow: (workflow: Workflow) => void;
  resetWorkflow: () => void;
  
  // Persistence actions
  saveWorkflow: (filename?: string) => Promise<void>;
  loadWorkflow: (file: File) => Promise<void>;
  markSaved: () => void;
  updateWorkflowName: (name: string) => void;
  
  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushToHistory: () => void;
}

const createEmptyWorkflow = (): Workflow => ({
  id: generateUUID(),
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
  immer((set, get) => {
    const initialWorkflow = createEmptyWorkflow();
    
    // Initialize undo/redo history with the initial workflow
    setTimeout(() => {
      const undoRedoStore = useUndoRedoStore.getState();
      undoRedoStore.pushState(initialWorkflow);
    }, 0);
    
    return {
      workflow: initialWorkflow,
      selectedNodeId: null,
      
      // Persistence state
      isSaving: false,
      isLoading: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      
      // Undo/Redo state
      isUndoRedoOperation: false,

      addNode: (type: NodeType, position: Position) => {
        const nodeId = generateUUID();
        
        set((state) => {
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
        
        // Push to history after the change
        get().pushToHistory();
        
        return nodeId;
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
        
        // Push to history after the change
        get().pushToHistory();
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
        
        // Push to history after the change (only if node was actually updated)
        const nodeIndex = get().workflow.nodes.findIndex(node => node.id === nodeId);
        if (nodeIndex !== -1) {
          get().pushToHistory();
        }
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
            id: generateUUID(),
          };
          state.workflow.connections.push(newConnection);
          state.workflow.metadata.modified = new Date();
          state.hasUnsavedChanges = true;
        });
        
        // Push to history after the change
        get().pushToHistory();
      },

      removeConnection: (connectionId: string) => {
        set((state) => {
          state.workflow.connections = state.workflow.connections.filter(
            (conn) => conn.id !== connectionId
          );
          state.workflow.metadata.modified = new Date();
          state.hasUnsavedChanges = true;
        });
        
        // Push to history after the change
        get().pushToHistory();
      },

      setWorkflow: (workflow: Workflow) => {
        set((state) => {
          state.workflow = workflow;
          state.selectedNodeId = null;
          state.hasUnsavedChanges = false;
          state.lastSaved = null;
        });
        
        // Initialize history with the new workflow
        const undoRedoStore = useUndoRedoStore.getState();
        undoRedoStore.clearHistory();
        undoRedoStore.pushState(workflow);
      },

      resetWorkflow: () => {
        const newWorkflow = createEmptyWorkflow();
        set((state) => {
          state.workflow = newWorkflow;
          state.selectedNodeId = null;
          state.hasUnsavedChanges = false;
          state.lastSaved = null;
        });
        
        // Initialize history with the new empty workflow
        const undoRedoStore = useUndoRedoStore.getState();
        undoRedoStore.clearHistory();
        undoRedoStore.pushState(newWorkflow);
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
        
        // Push to history after the change
        get().pushToHistory();
      },

      // Undo/Redo actions
      undo: () => {
        const undoRedoStore = useUndoRedoStore.getState();
        const previousWorkflow = undoRedoStore.undo();
        
        if (previousWorkflow) {
          set((state) => {
            state.isUndoRedoOperation = true;
            state.workflow = previousWorkflow;
            state.selectedNodeId = null;
            state.hasUnsavedChanges = true;
          });
          
          // Reset the flag after a brief delay
          setTimeout(() => {
            set((state) => {
              state.isUndoRedoOperation = false;
            });
          }, 100);
        }
      },

      redo: () => {
        const undoRedoStore = useUndoRedoStore.getState();
        const nextWorkflow = undoRedoStore.redo();
        
        if (nextWorkflow) {
          set((state) => {
            state.isUndoRedoOperation = true;
            state.workflow = nextWorkflow;
            state.selectedNodeId = null;
            state.hasUnsavedChanges = true;
          });
          
          // Reset the flag after a brief delay
          setTimeout(() => {
            set((state) => {
              state.isUndoRedoOperation = false;
            });
          }, 100);
        }
      },

      canUndo: () => {
        const undoRedoStore = useUndoRedoStore.getState();
        return undoRedoStore.canUndo();
      },

      canRedo: () => {
        const undoRedoStore = useUndoRedoStore.getState();
        return undoRedoStore.canRedo();
      },

      pushToHistory: () => {
        const { workflow, isUndoRedoOperation } = get();
        
        // Don't push to history if this is an undo/redo operation
        if (isUndoRedoOperation) return;
        
        const undoRedoStore = useUndoRedoStore.getState();
        undoRedoStore.pushState(workflow);
      },
    };
  })
);