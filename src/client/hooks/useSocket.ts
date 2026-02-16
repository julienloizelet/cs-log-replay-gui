import { useEffect, useState, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { CommandOutput, ReplayResult } from '../types';

interface UseSocketOptions {
  onReplayComplete?: (exitCode: number, result: ReplayResult | null) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [output, setOutput] = useState<CommandOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const outputBufferRef = useRef<string>('');
  const resultRef = useRef<ReplayResult | null>(null);
  const activeRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const newSocket = io();

    newSocket.on('output', (data: CommandOutput) => {
      if (!activeRef.current) {return;}

      setOutput((prev) => [...prev, data]);

      // Parse results from output
      if (data.type === 'stdout') {
        outputBufferRef.current += data.data;

        const startMarker = '---RESULTS_JSON---';
        const endMarker = '---END_RESULTS---';

        if (
          outputBufferRef.current.includes(startMarker) &&
          outputBufferRef.current.includes(endMarker)
        ) {
          const startIdx =
            outputBufferRef.current.indexOf(startMarker) + startMarker.length;
          const endIdx = outputBufferRef.current.indexOf(endMarker);
          const jsonStr = outputBufferRef.current.slice(startIdx, endIdx).trim();

          try {
            resultRef.current = JSON.parse(jsonStr);
          } catch {
            console.error('Failed to parse replay result JSON');
          }
        }
      }

      if (data.type === 'exit') {
        const exitCode = data.code ?? 0;
        setIsRunning(false);
        activeRef.current = false;
        optionsRef.current.onReplayComplete?.(exitCode, resultRef.current);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
    outputBufferRef.current = '';
    resultRef.current = null;
    activeRef.current = false;
    setIsRunning(false);
  }, []);

  const replay = useCallback(
    (logContent: string, logType: string) => {
      if (socket) {
        clearOutput();
        activeRef.current = true;
        setIsRunning(true);
        socket.emit('replay', { logContent, logType });
      }
    },
    [socket, clearOutput]
  );

  return {
    output,
    isRunning,
    replay,
    clearOutput,
  };
}
