import { useState } from 'react';
import type { ReplayResult, Alert } from '../types';

interface ResultsViewProps {
  result: ReplayResult;
  onBack: () => void;
  onNewReplay: () => void;
}

function AlertCard({ alert }: { alert: Alert }) {
  const decisions = alert.decisions ?? [];

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white break-all">
          {alert.scenario}
        </h4>
        <span className="ml-2 shrink-0 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded">
          {alert.events_count} event{alert.events_count !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Source IP: </span>
          <span className="text-gray-900 dark:text-white font-mono">{alert.source?.ip ?? 'N/A'}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Scope: </span>
          <span className="text-gray-900 dark:text-white">{alert.source?.scope ?? 'N/A'}</span>
        </div>
      </div>

      {decisions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Decisions:</p>
          <div className="flex flex-wrap gap-1">
            {decisions.map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded"
              >
                {d.type} {d.duration} ({d.scope}:{d.value})
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 break-all">
        {alert.message}
      </p>
    </div>
  );
}

export function ResultsView({ result, onBack, onNewReplay }: ResultsViewProps) {
  const { alerts, replayCommand, alertsCommand, explainOutput, explainCommand, totalLines, explainedLines } = result;
  const wasTruncated = totalLines > explainedLines;
  const [showExplain, setShowExplain] = useState(false);
  const [showAlertCmds, setShowAlertCmds] = useState(false);
  const [showExplainCmd, setShowExplainCmd] = useState(false);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Replay Results
        </h2>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button className="btn btn-primary" onClick={onNewReplay}>
            New Replay
          </button>
        </div>
      </div>

      {/* Alerts section */}
      <div className="card mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Alerts ({alerts.length})
        </h3>

        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400">
              No alerts were generated from these log lines.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              This means the log lines did not trigger any installed CrowdSec scenarios.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <AlertCard key={idx} alert={alert} />
            ))}
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => setShowAlertCmds(!showAlertCmds)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAlertCmds ? 'Hide executed commands' : 'Show executed commands'}
          </button>
          {showAlertCmds && (
            <div className="mt-2 space-y-1">
              <code className="block bg-gray-100 dark:bg-gray-900 rounded-md px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                {replayCommand}
              </code>
              <code className="block bg-gray-100 dark:bg-gray-900 rounded-md px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                {alertsCommand}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Explain output section */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Explain Output
          </h3>
          <button
            onClick={() => setShowExplain(!showExplain)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showExplain ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {showExplain && (
          <div className="mt-4">
            {wasTruncated && (
              <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
                Only the first {explainedLines} of {totalLines} lines were explained.
              </p>
            )}
            {explainOutput.trim() ? (
              <pre className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 font-mono text-sm overflow-x-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {explainOutput}
              </pre>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No explain output available.
              </p>
            )}

            <div className="mt-3">
              <button
                onClick={() => setShowExplainCmd(!showExplainCmd)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showExplainCmd ? 'Hide executed command' : 'Show executed command'}
              </button>
              {showExplainCmd && (
                <div className="mt-2">
                  <code className="block bg-gray-100 dark:bg-gray-900 rounded-md px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                    {explainCommand}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Debug notice */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          This tool is for <strong>line-by-line debugging only</strong>. For production log analysis, use CrowdSec directly with your full log files and appropriate acquisition configuration.
        </p>
      </div>
    </div>
  );
}
