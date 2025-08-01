import React from 'react';
import { Link2 } from 'lucide-react';

interface Variable {
  name: string;
  source: string;
  value?: unknown;
}

interface UsedInThisStepProps {
  variables: Variable[];
  className?: string;
}

const UsedInThisStep: React.FC<UsedInThisStepProps> = ({ 
  variables, 
  className = '' 
}) => {
  if (variables.length === 0) {
    return null;
  }

  return (
    <div className={`mt-3 ${className}`}>
      <div className="flex items-center space-x-1 mb-2">
        <Link2 className="w-3 h-3 text-gray-500" />
        <span className="text-xs font-semibold text-gray-600">
          Used in this step
        </span>
      </div>
      
      <div className="space-y-1">
        {variables.map((variable, index) => (
          <div
            key={`${variable.source}-${index}`}
            className="flex items-center justify-between p-1.5 bg-blue-50 rounded text-xs"
          >
            <span className="text-xs font-semibold text-blue-700 truncate">
              {variable.name}
            </span>
            {variable.value !== undefined && variable.value !== null && (
              <span className="text-xs text-blue-600 ml-2 truncate max-w-20">
                {String(variable.value).slice(0, 20)}
                {String(variable.value).length > 20 ? '...' : ''}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsedInThisStep;