import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { LogInputForm } from './components/LogInputForm';
import { CommandOutput } from './components/CommandOutput';
import { ResultsView } from './components/ResultsView';
import type { WizardStep, ReplayResult } from './types';

function App() {
  const [step, setStep] = useState<WizardStep>('log-input');
  const [result, setResult] = useState<ReplayResult | null>(null);
  const { theme, toggleTheme } = useTheme();

  const { output, isRunning, replay, clearOutput } = useSocket({
    onReplayComplete: (exitCode, replayResult) => {
      if (exitCode === 0 && replayResult) {
        setResult(replayResult);
        setStep('results');
      }
    },
  });

  const handleLogSubmit = (logContent: string, logType: string) => {
    setStep('executing');
    replay(logContent, logType);
  };

  const handleBackToLogInput = () => {
    clearOutput();
    setStep('log-input');
  };

  const handleNewReplay = () => {
    clearOutput();
    setResult(null);
    setStep('log-input');
  };

  const renderStep = () => {
    switch (step) {
      case 'log-input':
        return <LogInputForm onSubmit={handleLogSubmit} />;
      case 'executing':
        return <CommandOutput output={output} isRunning={isRunning} onBack={handleBackToLogInput} />;
      case 'results':
        return result ? (
          <ResultsView
            result={result}
            onBack={handleBackToLogInput}
            onNewReplay={handleNewReplay}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="py-8 px-4">{renderStep()}</main>
    </div>
  );
}

export default App;
