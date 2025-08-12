import type { Node, Connection, Workflow } from '../types';

/**
 * Check if adding a connection would create a circular dependency
 */
export function wouldCreateCircularDependency(
  connections: Connection[],
  newConnection: Omit<Connection, 'id'>
): boolean {
  // Quick check: if source and target are the same, it's a self-loop
  if (newConnection.sourceNodeId === newConnection.targetNodeId) {
    return true;
  }

  // Create adjacency list including the new connection
  const adjacencyList = new Map<string, string[]>();
  
  [...connections, newConnection].forEach((conn) => {
    if (!adjacencyList.has(conn.sourceNodeId)) {
      adjacencyList.set(conn.sourceNodeId, []);
    }
    adjacencyList.get(conn.sourceNodeId)!.push(conn.targetNodeId);
  });

  // DFS to detect cycles starting from the new connection's target
  // If we can reach the source from the target, we have a cycle
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true; // Back edge found, cycle detected
    }
    if (visited.has(nodeId)) {
      return false; // Already processed
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check if we can reach the source from the target (which would create a cycle)
  return hasCycle(newConnection.targetNodeId);
}

/**
 * Get topological order of nodes for execution
 */
export function getTopologicalOrder(
  nodes: Node[],
  connections: Connection[]
): string[] {
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build adjacency list and calculate in-degrees
  connections.forEach((conn) => {
    adjacencyList.get(conn.sourceNodeId)?.push(conn.targetNodeId);
    inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) || 0) + 1);
  });

  // Kahn's algorithm for topological sorting
  const queue: string[] = [];
  const result: string[] = [];

  // Add nodes with no incoming edges
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const currentNode = queue.shift()!;
    result.push(currentNode);

    // Process neighbors
    adjacencyList.get(currentNode)?.forEach((neighbor) => {
      const newInDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newInDegree);
      
      if (newInDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  return result;
}

/**
 * Check if workflow has circular dependencies
 */
export function hasCircularDependencies(
  nodes: Node[],
  connections: Connection[]
): { hasCircular: boolean; cyclePath?: string[] } {
  const adjacencyList = new Map<string, string[]>();
  
  // Build adjacency list
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
  });
  
  connections.forEach((conn) => {
    if (adjacencyList.has(conn.sourceNodeId)) {
      adjacencyList.get(conn.sourceNodeId)!.push(conn.targetNodeId);
    }
  });

  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      // Found a cycle, capture the path
      // const cycleStart = path.indexOf(nodeId);
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return false;
  }

  // Check all nodes for cycles
  for (const nodeId of adjacencyList.keys()) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) {
        return { hasCircular: true, cyclePath: [...path] };
      }
    }
  }

  return { hasCircular: false };
}

/**
 * Validate workflow for execution
 */
export function validateWorkflow(workflow: Workflow): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for empty workflow
  if (workflow.nodes.length === 0) {
    errors.push('Workflow must contain at least one node');
  }

  // Check for circular dependencies using improved detection
  const circularCheck = hasCircularDependencies(workflow.nodes, workflow.connections);
  if (circularCheck.hasCircular) {
    if (circularCheck.cyclePath && circularCheck.cyclePath.length > 0) {
      const nodeNames = circularCheck.cyclePath.map(nodeId => {
        const node = workflow.nodes.find(n => n.id === nodeId);
        return node?.config.title || nodeId.slice(0, 8);
      });
      errors.push(`Workflow contains circular dependencies: ${nodeNames.join(' → ')}`);
    } else {
      errors.push('Workflow contains circular dependencies');
    }
  }

  // Check for invalid connections
  workflow.connections.forEach((conn) => {
    const sourceNode = workflow.nodes.find((n) => n.id === conn.sourceNodeId);
    const targetNode = workflow.nodes.find((n) => n.id === conn.targetNodeId);

    if (!sourceNode) {
      errors.push(`Connection references non-existent source node: ${conn.sourceNodeId}`);
    }
    if (!targetNode) {
      errors.push(`Connection references non-existent target node: ${conn.targetNodeId}`);
    }
  });

  // Check for isolated nodes (nodes with no connections) - warning, not error
  const connectedNodeIds = new Set([
    ...workflow.connections.map(c => c.sourceNodeId),
    ...workflow.connections.map(c => c.targetNodeId)
  ]);
  
  const isolatedNodes = workflow.nodes.filter(node => !connectedNodeIds.has(node.id));
  if (isolatedNodes.length > 0 && workflow.nodes.length > 1) {
    const isolatedNames = isolatedNodes.map(node => node.config.title || node.id.slice(0, 8));
    errors.push(`Warning: Isolated nodes detected (not connected to workflow): ${isolatedNames.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get connected input nodes for a given node
 */
export function getInputNodes(
  nodeId: string,
  nodes: Node[],
  connections: Connection[]
): Node[] {
  const inputConnections = connections.filter((conn) => conn.targetNodeId === nodeId);
  return inputConnections
    .map((conn) => nodes.find((node) => node.id === conn.sourceNodeId))
    .filter((node): node is Node => node !== undefined);
}

/**
 * Get connected output nodes for a given node
 */
export function getOutputNodes(
  nodeId: string,
  nodes: Node[],
  connections: Connection[]
): Node[] {
  const outputConnections = connections.filter((conn) => conn.sourceNodeId === nodeId);
  return outputConnections
    .map((conn) => nodes.find((node) => node.id === conn.targetNodeId))
    .filter((node): node is Node => node !== undefined);
}

/**
 * Get variables available to a node from its connected inputs
 */
export function getConnectedVariables(
  nodeId: string,
  nodes: Node[],
  connections: Connection[]
): Array<{ name: string; source: string; value?: unknown }> {
  const inputNodes = getInputNodes(nodeId, nodes, connections);
  
  return inputNodes.map((inputNode) => ({
    name: inputNode.config.title || `Node ${inputNode.id.slice(0, 8)}`,
    source: inputNode.id,
    value: inputNode.result,
  }));
}

/**
 * Check if a node has any input connections
 */
export function hasInputConnections(
  nodeId: string,
  connections: Connection[]
): boolean {
  return connections.some((conn) => conn.targetNodeId === nodeId);
}

/**
 * Check if a node has any output connections
 */
export function hasOutputConnections(
  nodeId: string,
  connections: Connection[]
): boolean {
  return connections.some((conn) => conn.sourceNodeId === nodeId);
}

/**
 * Generate a unique position for a new node to avoid overlaps
 */
export function generateNodePosition(existingNodes: Node[]): { x: number; y: number } {
  const gridSize = 200;
  const startX = 100;
  const startY = 100;

  // Simple grid-based positioning
  let x = startX;
  let y = startY;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const isOccupied = existingNodes.some((node) => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - x, 2) + Math.pow(node.position.y - y, 2)
      );
      return distance < gridSize * 0.8; // Allow some overlap tolerance
    });

    if (!isOccupied) {
      return { x, y };
    }

    // Move to next position in grid
    x += gridSize;
    if (x > startX + gridSize * 4) {
      x = startX;
      y += gridSize;
    }

    attempts++;
  }

  // Fallback to random position if grid is full
  return {
    x: startX + Math.random() * 400,
    y: startY + Math.random() * 400,
  };
}