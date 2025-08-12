import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Workflow } from '../types';

interface UndoRedoState {
  history: Workflow[];
  currentIndex: number;
  maxHistorySize: number;
  
  // Actions
  pushState: (workflow: Workflow) => void;
  undo: () => Workflow | null;
  redo: () => Workflow | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  setMaxHistorySize: (size: number) => void;
}

const DEFAULT_MAX_HISTORY_SIZE = 50;

export const useUndoRedoStore = create<UndoRedoState>()(
  immer((set, get) => ({
    history: [],
    currentIndex: -1,
    maxHistorySize: DEFAULT_MAX_HISTORY_SIZE,

    pushState: (workflow: Workflow) => {
      set((state) => {
        // Create a deep copy of the workflow to avoid reference issues
        const workflowCopy = JSON.parse(JSON.stringify(workflow));
        
        // Remove any states after current index (when undoing and then making new changes)
        if (state.currentIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.currentIndex + 1);
        }
        
        // Add new state
        state.history.push(workflowCopy);
        state.currentIndex = state.history.length - 1;
        
        // Trim history if it exceeds max size
        if (state.history.length > state.maxHistorySize) {
          const excess = state.history.length - state.maxHistorySize;
          state.history = state.history.slice(excess);
          state.currentIndex = state.history.length - 1;
        }
      });
    },

    undo: () => {
      const state = get();
      
      if (!state.canUndo()) {
        return null;
      }
      
      set((draft) => {
        draft.currentIndex = Math.max(0, draft.currentIndex - 1);
      });
      
      const newState = get();
      return newState.history[newState.currentIndex] || null;
    },

    redo: () => {
      const state = get();
      
      if (!state.canRedo()) {
        return null;
      }
      
      set((draft) => {
        draft.currentIndex = Math.min(draft.history.length - 1, draft.currentIndex + 1);
      });
      
      const newState = get();
      return newState.history[newState.currentIndex] || null;
    },

    canUndo: () => {
      const state = get();
      return state.currentIndex > 0;
    },

    canRedo: () => {
      const state = get();
      return state.currentIndex < state.history.length - 1;
    },

    clearHistory: () => {
      set((state) => {
        state.history = [];
        state.currentIndex = -1;
      });
    },

    setMaxHistorySize: (size: number) => {
      set((state) => {
        state.maxHistorySize = Math.max(1, size);
        
        // Trim history if current size exceeds new max
        if (state.history.length > state.maxHistorySize) {
          const excess = state.history.length - state.maxHistorySize;
          state.history = state.history.slice(excess);
          state.currentIndex = Math.min(state.currentIndex, state.history.length - 1);
        }
      });
    },
  }))
);