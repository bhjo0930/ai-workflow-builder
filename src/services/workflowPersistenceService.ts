import { saveAs } from 'file-saver';
import type { Workflow } from '../types';

// Version for workflow file format
const WORKFLOW_FILE_VERSION = '1.0.0';

// Serialized workflow format for JSON export
export interface SerializedWorkflow {
  version: string;
  workflow: {
    id: string;
    name: string;
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      config: Record<string, unknown>;
      status: string;
      result?: unknown;
    }>;
    connections: Array<{
      id: string;
      sourceNodeId: string;
      targetNodeId: string;
      sourcePort: string;
      targetPort: string;
    }>;
    metadata: {
      created: string; // ISO string format
      modified: string; // ISO string format
      version: string;
    };
  };
  exportedAt: string; // ISO string format
}

export class WorkflowPersistenceService {
  /**
   * Serialize workflow to JSON format for export
   */
  static serializeWorkflow(workflow: Workflow): SerializedWorkflow {
    return {
      version: WORKFLOW_FILE_VERSION,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: { ...node.position },
          config: { ...node.config },
          status: node.status,
          result: node.result,
        })),
        connections: workflow.connections.map(conn => ({
          id: conn.id,
          sourceNodeId: conn.sourceNodeId,
          targetNodeId: conn.targetNodeId,
          sourcePort: conn.sourcePort,
          targetPort: conn.targetPort,
        })),
        metadata: {
          created: workflow.metadata.created.toISOString(),
          modified: workflow.metadata.modified.toISOString(),
          version: workflow.metadata.version,
        },
      },
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Deserialize JSON data back to workflow format
   */
  static deserializeWorkflow(data: SerializedWorkflow): Workflow {
    // Validate the data structure
    this.validateWorkflowData(data);

    return {
      id: data.workflow.id,
      name: data.workflow.name,
      nodes: data.workflow.nodes.map(node => ({
        id: node.id,
        type: node.type as any, // Type assertion needed due to serialization
        position: { ...node.position },
        config: { ...node.config } as any, // Type assertion needed
        status: node.status as any, // Type assertion needed
        result: node.result,
      })),
      connections: data.workflow.connections.map(conn => ({
        id: conn.id,
        sourceNodeId: conn.sourceNodeId,
        targetNodeId: conn.targetNodeId,
        sourcePort: conn.sourcePort,
        targetPort: conn.targetPort,
      })),
      metadata: {
        created: new Date(data.workflow.metadata.created),
        modified: new Date(data.workflow.metadata.modified),
        version: data.workflow.metadata.version,
      },
    };
  }

  /**
   * Save workflow to file
   */
  static saveWorkflowToFile(workflow: Workflow, filename?: string): void {
    try {
      const serializedWorkflow = this.serializeWorkflow(workflow);
      const jsonString = JSON.stringify(serializedWorkflow, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const finalFilename = filename || `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      saveAs(blob, finalFilename);
    } catch (error) {
      throw new Error(`Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load workflow from file
   */
  static async loadWorkflowFromFile(file: File): Promise<Workflow> {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        reject(new Error('Invalid file type. Please select a JSON file.'));
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        reject(new Error('File too large. Maximum size is 10MB.'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          if (!jsonString) {
            reject(new Error('Failed to read file content.'));
            return;
          }

          const data = JSON.parse(jsonString) as SerializedWorkflow;
          const workflow = this.deserializeWorkflow(data);
          resolve(workflow);
        } catch (error) {
          if (error instanceof SyntaxError) {
            reject(new Error('Invalid JSON format. Please check the file content.'));
          } else {
            reject(error);
          }
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate workflow data structure
   */
  private static validateWorkflowData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid workflow file: Not a valid JSON object.');
    }

    if (!data.version) {
      throw new Error('Invalid workflow file: Missing version information.');
    }

    if (!data.workflow) {
      throw new Error('Invalid workflow file: Missing workflow data.');
    }

    const workflow = data.workflow;

    // Validate required fields
    if (!workflow.id || typeof workflow.id !== 'string') {
      throw new Error('Invalid workflow file: Missing or invalid workflow ID.');
    }

    if (!workflow.name || typeof workflow.name !== 'string') {
      throw new Error('Invalid workflow file: Missing or invalid workflow name.');
    }

    if (!Array.isArray(workflow.nodes)) {
      throw new Error('Invalid workflow file: Nodes must be an array.');
    }

    if (!Array.isArray(workflow.connections)) {
      throw new Error('Invalid workflow file: Connections must be an array.');
    }

    if (!workflow.metadata || typeof workflow.metadata !== 'object') {
      throw new Error('Invalid workflow file: Missing or invalid metadata.');
    }

    // Validate nodes
    for (const node of workflow.nodes) {
      if (!node.id || typeof node.id !== 'string') {
        throw new Error('Invalid workflow file: Node missing valid ID.');
      }

      if (!node.type || typeof node.type !== 'string') {
        throw new Error('Invalid workflow file: Node missing valid type.');
      }

      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        throw new Error('Invalid workflow file: Node missing valid position.');
      }

      if (!node.config || typeof node.config !== 'object') {
        throw new Error('Invalid workflow file: Node missing valid configuration.');
      }

      // Validate node type
      const validTypes = ['userInput', 'generate', 'output', 'addAssets'];
      if (!validTypes.includes(node.type)) {
        throw new Error(`Invalid workflow file: Unknown node type "${node.type}".`);
      }
    }

    // Validate connections
    for (const connection of workflow.connections) {
      if (!connection.id || typeof connection.id !== 'string') {
        throw new Error('Invalid workflow file: Connection missing valid ID.');
      }

      if (!connection.sourceNodeId || typeof connection.sourceNodeId !== 'string') {
        throw new Error('Invalid workflow file: Connection missing valid source node ID.');
      }

      if (!connection.targetNodeId || typeof connection.targetNodeId !== 'string') {
        throw new Error('Invalid workflow file: Connection missing valid target node ID.');
      }

      // Validate that referenced nodes exist
      const sourceExists = workflow.nodes.some((node: any) => node.id === connection.sourceNodeId);
      const targetExists = workflow.nodes.some((node: any) => node.id === connection.targetNodeId);

      if (!sourceExists) {
        throw new Error(`Invalid workflow file: Connection references non-existent source node "${connection.sourceNodeId}".`);
      }

      if (!targetExists) {
        throw new Error(`Invalid workflow file: Connection references non-existent target node "${connection.targetNodeId}".`);
      }
    }

    // Validate metadata dates
    try {
      new Date(workflow.metadata.created);
      new Date(workflow.metadata.modified);
    } catch {
      throw new Error('Invalid workflow file: Invalid date format in metadata.');
    }
  }

  /**
   * Check if workflow data is compatible with current version
   */
  static isCompatibleVersion(version: string): boolean {
    // For now, we only support version 1.0.0
    // In the future, this could handle version migration
    return version === WORKFLOW_FILE_VERSION;
  }

  /**
   * Get workflow file extension
   */
  static getFileExtension(): string {
    return '.json';
  }

  /**
   * Generate default filename for workflow
   */
  static generateFilename(workflowName: string): string {
    const sanitizedName = workflowName
      .replace(/[^a-z0-9\s]/gi, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
    
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `${sanitizedName}_${timestamp}.json`;
  }
}