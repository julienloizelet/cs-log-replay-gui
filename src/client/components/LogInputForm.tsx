import { useState, useRef, useMemo } from 'react';

const LOG_TYPES: Record<string, string> = {
  "NGINX": "nginx",
  "Syslog (SSH/Linux)": "syslog",
};

const MAX_EXPLAIN_LINES = 10;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

// Binary file magic bytes signatures
const BINARY_SIGNATURES = [
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0xff, 0xd8, 0xff], // JPEG
  [0x47, 0x49, 0x46, 0x38], // GIF
  [0x25, 0x50, 0x44, 0x46], // PDF
  [0x50, 0x4b, 0x03, 0x04], // ZIP
  [0x52, 0x61, 0x72, 0x21], // RAR
  [0x7f, 0x45, 0x4c, 0x46], // ELF
  [0x4d, 0x5a], // EXE/DLL
];

function isBinaryContent(bytes: Uint8Array): boolean {
  for (const sig of BINARY_SIGNATURES) {
    if (sig.every((byte, i) => bytes[i] === byte)) {
      return true;
    }
  }
  const checkLength = Math.min(bytes.length, 1024);
  for (let i = 0; i < checkLength; i++) {
    if (bytes[i] === 0) {
      return true;
    }
  }
  return false;
}

interface LogInputFormProps {
  onSubmit: (logContent: string, logType: string) => void;
}

export function LogInputForm({ onSubmit }: LogInputFormProps) {
  const [logText, setLogText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [customType, setCustomType] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearErrors = () => {
    setFileError(null);
    setInputError(null);
  };

  const lineCount = useMemo(() => {
    if (logText.trim().length === 0) {return 0;}
    return logText.split('\n').filter((l) => l.trim().length > 0).length;
  }, [logText]);

  const resolvedType = selectedType === '__custom__' ? customType.trim() : selectedType;
  const isValid = logText.trim().length > 0 && resolvedType.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!isValid) {
      return;
    }

    onSubmit(logText, resolvedType);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearErrors();
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('File size must be less than 1MB');
      clearFileInput();
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);

      if (isBinaryContent(bytes)) {
        setFileError('File appears to be binary, not a text file');
        clearFileInput();
        return;
      }

      const decoder = new TextDecoder('utf-8');
      const content = decoder.decode(bytes);

      setLogText(content);
    };
    reader.onerror = () => {
      setFileError('Failed to read file');
      clearFileInput();
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Replay Log File
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Paste or upload a small log file to replay through CrowdSec and see generated alerts.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Installed collections:</strong> NGINX and LINUX. This tool detects behaviors on nginx and ssh log lines.
          You can <a href="https://docs.crowdsec.net/docs/next/cscli/cscli_collections/" target="_blank" rel="noopener noreferrer" className="underline font-medium">install other collections</a> to support custom log types (e.g. apache2).
        </p>
      </div>

      {/* Warning banners */}
      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md space-y-1">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          All existing alerts will be <strong>deleted</strong> before each replay.
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          The <strong>explain</strong> output is limited to the first {MAX_EXPLAIN_LINES} lines. All lines are replayed for alert generation.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* File upload */}
        <div className="mb-4">
          <label className="label mb-2 block">Upload file (optional)</label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900/30 dark:file:text-blue-400
                dark:hover:file:bg-blue-900/50
                cursor-pointer"
            />
          </div>
          {fileError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fileError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Text file only, max 1MB
          </p>
        </div>

        {/* Textarea */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="logs" className="label">
              Log Content
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {lineCount} line{lineCount !== 1 ? 's' : ''}
            </span>
          </div>
          <textarea
            id="logs"
            className="textarea h-48"
            placeholder={'192.168.1.1 - - [01/Jan/2024:00:00:00 +0000] "GET /admin HTTP/1.1" 200 512\n...'}
            value={logText}
            onChange={(e) => {
              setLogText(e.target.value);
              clearErrors();
            }}
          />
          {inputError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{inputError}</p>
          )}
        </div>

        {/* Log type selection */}
        <div className="mb-6">
          <label className="label mb-3 block">Log Type</label>
          <div className="space-y-2">
            {Object.entries(LOG_TYPES).map(([label, value]) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="logType"
                  value={value}
                  checked={selectedType === value}
                  onChange={() => setSelectedType(value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="logType"
                value="__custom__"
                checked={selectedType === '__custom__'}
                onChange={() => setSelectedType('__custom__')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Custom</span>
            </label>
            {selectedType === '__custom__' && (
              <div className="ml-7">
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. apache2"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!isValid}
        >
          Replay Logs
        </button>
      </form>
    </div>
  );
}
