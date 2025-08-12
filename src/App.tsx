
import React from 'react';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import WorkflowExecution from './components/WorkflowExecution';
import WorkflowPersistence from './components/WorkflowPersistence';
import AutoSaveRecovery from './components/AutoSaveRecovery';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorNotificationContainer } from './components/ErrorNotification';
import ErrorPanel from './components/ErrorPanel';
import { useAutoSave } from './hooks/useAutoSave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useErrorHandling } from './hooks/useErrorHandling';
import { useWorkflowStore } from './stores/workflowStore';
import { useErrorPanel } from './stores/errorStore';
import { errorLogger } from './services/errorLoggingService';
import './App.css';

function App() {
  const { workflow } = useWorkflowStore();
  const { showErrorPanel } = useErrorPanel();
  const { notifications, dismissNotification, handleError } = useErrorHandling();
  
  // Initialize error logging
  React.useEffect(() => {
    errorLogger.configure({
      enableConsoleLogging: true,
      enableRemoteLogging: false,
      logLevel: 'low',
      maxLogEntries: 1000,
    });
  }, []);
  
  // Initialize auto-save functionality
  useAutoSave({
    enabled: true,
    interval: 30000, // 30 seconds
    onAutoSave: () => {
      console.log('Workflow auto-saved');
    },
    onError: async (error) => {
      console.error('Auto-save failed:', error);
      await handleError(error);
    },
  });

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
  });

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('React Error Boundary caught error:', error, errorInfo);
      }}
    >
      <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden">
        {/* Error Notifications */}
        <ErrorNotificationContainer
          errors={notifications.map(n => n.error)}
          onDismiss={dismissNotification}
          position="top-right"
        />

        {/* Auto-save Recovery Modal */}
        <AutoSaveRecovery />
        
        {/* Top Toolbar */}
        <div className="flex-shrink-0 z-10 flex items-center justify-between">
          <Toolbar className="flex-1" />
          <div className="flex items-center space-x-2 px-4 py-2">
            <KeyboardShortcutsHelp />
            {workflow.name && (
              <div className="text-sm text-gray-600">
                {workflow.name}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Canvas Area */}
          <div className={`flex-1 min-w-0 relative transition-all duration-300 ${showErrorPanel ? 'mr-96' : ''}`}>
            <Canvas />
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 lg:w-80 md:w-72 sm:w-64 flex flex-col">
            {/* Workflow Persistence Panel */}
            <div className="flex-shrink-0">
              <WorkflowPersistence className="m-2" />
            </div>
            
            {/* Workflow Execution Panel */}
            <div className="flex-shrink-0">
              <WorkflowExecution className="m-2" />
            </div>
            
            {/* Properties Panel */}
            <div className="flex-1 min-h-0">
              <PropertiesPanel className="h-full" />
            </div>
          </div>

          {/* Error Panel */}
          <ErrorPanel />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;