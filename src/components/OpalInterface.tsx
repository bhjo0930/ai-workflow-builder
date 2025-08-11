import React, { useState } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { generateWorkflowFromDescription } from '../services/aiWorkflowService';
import { LoaderCircle } from 'lucide-react';

const OpalInterface: React.FC = () => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setGeneratedWorkflow } = useWorkflowStore();

  const handleGenerate = async () => {
    if (!description.trim()) {
      alert('Please enter a description for the workflow.');
      return;
    }
    setIsLoading(true);
    try {
      const { nodes, connections } = await generateWorkflowFromDescription(description);
      setGeneratedWorkflow(nodes, connections);
    } catch (error) {
      console.error('Failed to generate workflow:', error);
      alert('An error occurred while generating the workflow. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <h3 className="text-base font-semibold mb-2 text-gray-800">Generate with AI</h3>
      <p className="text-xs text-gray-500 mb-3">
        Describe the workflow you want to create.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full h-24 p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        placeholder="e.g., Ask for a topic, generate a blog post, and show the result."
        disabled={isLoading}
      />
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
            Generating...
          </>
        ) : (
          'Generate Workflow'
        )}
      </button>
    </div>
  );
};

export default OpalInterface;
