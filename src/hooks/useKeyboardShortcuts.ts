import { useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts?: KeyboardShortcut[];
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'z',
    ctrlKey: true,
    metaKey: true, // For Mac
    action: () => useWorkflowStore.getState().undo(),
    description: 'Undo',
    preventDefault: true,
  },
  {
    key: 'y',
    ctrlKey: true,
    metaKey: true, // For Mac
    action: () => useWorkflowStore.getState().redo(),
    description: 'Redo',
    preventDefault: true,
  },
  {
    key: 'z',
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    action: () => useWorkflowStore.getState().redo(),
    description: 'Redo (Shift+Ctrl+Z)',
    preventDefault: true,
  },
  {
    key: 's',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      const store = useWorkflowStore.getState();
      store.saveWorkflow().catch(console.error);
    },
    description: 'Save workflow',
    preventDefault: true,
  },
  {
    key: 'a',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      // Select all nodes (if implemented in the future)
      console.log('Select all nodes (not implemented yet)');
    },
    description: 'Select all',
    preventDefault: true,
  },
  {
    key: 'Delete',
    action: () => {
      const store = useWorkflowStore.getState();
      if (store.selectedNodeId) {
        store.removeNode(store.selectedNodeId);
      }
    },
    description: 'Delete selected node',
    preventDefault: true,
  },
  {
    key: 'Backspace',
    action: () => {
      const store = useWorkflowStore.getState();
      if (store.selectedNodeId) {
        store.removeNode(store.selectedNodeId);
      }
    },
    description: 'Delete selected node',
    preventDefault: true,
  },
  {
    key: 'Escape',
    action: () => {
      const store = useWorkflowStore.getState();
      store.selectNode(null);
    },
    description: 'Deselect all',
    preventDefault: true,
  },
];

export const useKeyboardShortcuts = ({
  enabled = true,
  shortcuts = DEFAULT_SHORTCUTS,
}: UseKeyboardShortcutsOptions = {}) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const shiftMatches = !shortcut.shiftKey || event.shiftKey;
        const altMatches = !shortcut.altKey || event.altKey;

        // For cross-platform compatibility, check both Ctrl and Meta keys
        const modifierMatches = 
          (shortcut.ctrlKey || shortcut.metaKey) 
            ? (event.ctrlKey || event.metaKey)
            : (!shortcut.ctrlKey && !shortcut.metaKey);

        if (
          keyMatches &&
          modifierMatches &&
          shiftMatches &&
          altMatches
        ) {
          if (shortcut.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }
          
          shortcut.action();
          break; // Only execute the first matching shortcut
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts,
    isEnabled: enabled,
  };
};

// Hook to get available shortcuts for display in help/documentation
export const useAvailableShortcuts = () => {
  return DEFAULT_SHORTCUTS.map(shortcut => ({
    key: shortcut.key,
    modifiers: [
      shortcut.ctrlKey && 'Ctrl',
      shortcut.metaKey && 'Cmd',
      shortcut.shiftKey && 'Shift',
      shortcut.altKey && 'Alt',
    ].filter(Boolean),
    description: shortcut.description,
  }));
};