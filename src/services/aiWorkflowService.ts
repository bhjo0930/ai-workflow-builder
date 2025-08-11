import { type Node, type Connection } from '../types';
import { NODE_TYPES } from '../utils/constants';

// A mock function that simulates calling an AI to generate a workflow.
// In the future, this will be replaced with a real API call.
export const generateWorkflowFromDescription = async (
  description: string
): Promise<{ nodes: Node[]; connections: Connection[] }> => {
  console.log('Generating workflow for description:', description);

  // Hardcoded dummy data for a simple workflow: User Input -> Generate
  // This simulates the AI's structured output.
  const nodes: Node[] = [
    {
      id: 'ai-user-input-1',
      type: 'userInput',
      position: { x: 100, y: 100 },
      status: 'idle',
      config: {
        title: 'User Input',
        description: 'Provide a topic',
        inputType: 'text',
        required: true,
        placeholder: 'Enter a topic for the blog post',
      },
    },
    {
      id: 'ai-generate-1',
      type: 'generate',
      position: { x: 400, y: 100 },
      status: 'idle',
      config: {
        title: 'Generate Blog Post',
        model: 'gemini-2.0-flash-001',
        temperature: 0.7,
        maxTokens: 1000,
        roleDescription: 'You are a helpful assistant that writes blog posts.',
        promptTemplate: 'Write a blog post about the following topic: {{topic}}',
      },
    },
  ];

  const connections: Connection[] = [
    {
      id: 'ai-conn-1',
      sourceNodeId: 'ai-user-input-1',
      targetNodeId: 'ai-generate-1',
      sourcePort: 'output', // Assuming a default output port
      targetPort: 'input',  // Assuming a default input port
    },
  ];

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { nodes, connections };
};
