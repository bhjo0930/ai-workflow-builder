import React, { useState } from 'react';
import { Keyboard, X, HelpCircle } from 'lucide-react';
import { useAvailableShortcuts } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  className?: string;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const shortcuts = useAvailableShortcuts();



  const getKeyDisplay = (key: string) => {
    const keyMap: Record<string, string> = {
      'Delete': 'Del',
      'Backspace': '⌫',
      'Escape': 'Esc',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
    };
    
    return keyMap[key] || key.toUpperCase();
  };

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${className}`}
        title="Keyboard Shortcuts"
      >
        <Keyboard className="w-4 h-4 mr-2" />
        Shortcuts
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <HelpCircle className="w-6 h-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Keyboard Shortcuts
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm text-gray-700">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center space-x-1">
                      {shortcut.modifiers.map((modifier, modIndex) => (
                        <React.Fragment key={modIndex}>
                          <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono text-gray-600 bg-white border border-gray-300 rounded">
                            {modifier}
                          </kbd>
                          {modIndex < shortcut.modifiers.length - 1 && (
                            <span className="text-gray-400">+</span>
                          )}
                        </React.Fragment>
                      ))}
                      {shortcut.modifiers.length > 0 && (
                        <span className="text-gray-400">+</span>
                      )}
                      <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono text-gray-600 bg-white border border-gray-300 rounded">
                        {getKeyDisplay(shortcut.key)}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong>Note:</strong> Shortcuts are disabled when typing in input fields.
                  Use <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Cmd</kbd> on Mac 
                  or <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Ctrl</kbd> on Windows/Linux.
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcutsHelp;