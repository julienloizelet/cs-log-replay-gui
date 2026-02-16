import type { CommandOutput as CommandOutputType } from '../types';

interface CommandOutputProps {
  output: CommandOutputType[];
  isRunning: boolean;
  onBack?: () => void;
}

export function CommandOutput({ output, isRunning, onBack }: CommandOutputProps) {
  const filteredOutput = output.filter(
    (o) => !o.data.includes('---RESULTS_JSON---') && !o.data.includes('---END_RESULTS---')
  );

  const scrollToBottom = (el: HTMLDivElement | null) => {
    el?.scrollIntoView({ block: 'end' });
  };

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        {isRunning && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isRunning ? 'Executing...' : 'Output'}
        </h2>
      </div>

      <div className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 font-mono text-sm h-64 overflow-y-auto">
        {filteredOutput.map((line, index) => (
          <div
            key={index}
            ref={index === filteredOutput.length - 1 ? scrollToBottom : undefined}
            className={`whitespace-pre-wrap ${
              line.type === 'stderr'
                ? 'text-yellow-600 dark:text-yellow-400'
                : line.type === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : line.type === 'exit'
                    ? line.code === 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {line.data}
          </div>
        ))}
      </div>

      {!isRunning && onBack && (
        <div className="mt-4">
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
