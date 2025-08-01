
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import WorkflowExecution from './components/WorkflowExecution';
import WorkflowPersistence from './components/WorkflowPersistence';
import './App.css';

function App() {
  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Top Toolbar */}
      <Toolbar className="flex-shrink-0 z-10" />

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Canvas Area */}
        <div className="flex-1 min-w-0 relative">
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
      </div>
    </div>
  );
}

export default App;