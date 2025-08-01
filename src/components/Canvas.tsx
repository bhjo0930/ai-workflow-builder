import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnConnect,
  type OnEdgesChange,
  type OnConnectStart,
  type OnConnectEnd,
  ConnectionMode,
} from '@xyflow/react';
import { AlertCircle } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';
import { wouldCreateCircularDependency } from '../utils/workflowUtils';
import NodeRenderer from './nodes/NodeRenderer';
import ConnectionLine from './ConnectionLine';

interface CanvasProps {
  className?: string;
}

const Canvas: React.FC<CanvasProps> = ({ className = '' }) => {
  const { workflow, selectNode, updateNode, addConnection, removeConnection } = useWorkflowStore();
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  
  // Define custom node types
  const nodeTypes = useMemo(() => ({
    workflowNode: NodeRenderer,
  }), []);
  
  // Convert workflow nodes to React Flow nodes
  const reactFlowNodes: Node[] = workflow.nodes.map((node) => ({
    id: node.id,
    type: 'workflowNode',
    position: node.position,
    data: {
      nodeType: node.type,
      config: node.config,
      status: node.status,
    },
  }));

  // Convert workflow connections to React Flow edges
  const reactFlowEdges: Edge[] = workflow.connections.map((connection) => ({
    id: connection.id,
    source: connection.sourceNodeId,
    target: connection.targetNodeId,
    sourceHandle: connection.sourcePort,
    targetHandle: connection.targetPort,
    type: 'default',
    animated: false,
    style: {
      stroke: '#6b7280',
      strokeWidth: 2,
    },
    markerEnd: 'arrowclosed',
    deletable: true,
  }));

  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;

    // Create the new connection object
    const newConnection = {
      sourceNodeId: params.source,
      targetNodeId: params.target,
      sourcePort: params.sourceHandle || 'output',
      targetPort: params.targetHandle || 'input',
    };

    // Check for circular dependencies
    if (wouldCreateCircularDependency(workflow.connections, newConnection)) {
      setConnectionError('Connection would create circular dependency');
      setTimeout(() => setConnectionError(null), 3000);
      return;
    }

    // Check if connection already exists
    const connectionExists = workflow.connections.some(
      (conn) =>
        conn.sourceNodeId === newConnection.sourceNodeId &&
        conn.targetNodeId === newConnection.targetNodeId &&
        conn.sourcePort === newConnection.sourcePort &&
        conn.targetPort === newConnection.targetPort
    );

    if (connectionExists) {
      setConnectionError('Connection already exists');
      setTimeout(() => setConnectionError(null), 3000);
      return;
    }

    // Add the connection
    addConnection(newConnection);
    setConnectionError(null);
  }, [workflow.connections, addConnection]);

  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    // Update node positions in the store when nodes are moved
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        updateNode(change.id, { position: change.position });
      }
    });
  }, [updateNode]);

  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    // Handle edge deletion
    changes.forEach((change) => {
      if (change.type === 'remove') {
        removeConnection(change.id);
      }
    });
  }, [removeConnection]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onConnectStart: OnConnectStart = useCallback(() => {
    // Connection start logic can be added here if needed
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(() => {
    // Connection end logic can be added here if needed
  }, []);



  return (
    <div className={`w-full h-full relative ${className}`}>
      {/* Connection Error Message */}
      {connectionError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{connectionError}</span>
            </div>
          </div>
        </div>
      )}
      
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}

        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        className="bg-gray-50"
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Ctrl']}
        connectionLineComponent={ConnectionLine}
      >
        <Background 
          color="#e5e7eb" 
          gap={20} 
          size={1}
        />
        <Controls 
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <MiniMap
          nodeColor="#6b7280"
          maskColor="rgba(0, 0, 0, 0.1)"
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          pannable
          zoomable
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
};

export default Canvas;