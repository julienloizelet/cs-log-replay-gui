import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ReplayResult, OutputCallback } from './types.js';

function runCommand(
  command: string,
  args: string[],
  onOutput: OutputCallback,
): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      onOutput({ type: 'stdout', data: text });
    });

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      onOutput({ type: 'stderr', data: text });
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      const exitCode = code ?? 1;
      if (exitCode !== 0 && stderr) {
        console.error(`Command "${command} ${args.join(' ')}" exited with code ${exitCode}: ${stderr}`);
      }
      resolve({ stdout, exitCode });
    });
  });
}

export async function replayLogs(
  logContent: string,
  logType: string,
  onOutput: OutputCallback,
): Promise<ReplayResult> {
  const tempFile = join(tmpdir(), `replay-${randomUUID()}.log`);

  try {
    // Write log content to temp file
    await writeFile(tempFile, logContent, 'utf-8');
    onOutput({ type: 'stdout', data: `Wrote log to ${tempFile}\n` });

    // Step 1: Replay logs through CrowdSec
    onOutput({ type: 'stdout', data: `\nRunning: sudo crowdsec --dsn file://${tempFile} --type ${logType} --no-api\n` });
    const replayResult = await runCommand('sudo', [
      'crowdsec',
      '--dsn', `file://${tempFile}`,
      '--type', logType,
      '--no-api',
    ], onOutput);

    if (replayResult.exitCode !== 0) {
      onOutput({ type: 'error', data: `CrowdSec replay exited with code ${replayResult.exitCode}\n` });
    } else {
      onOutput({ type: 'stdout', data: 'Replay completed successfully.\n' });
    }

    // Step 2: Fetch alerts
    onOutput({ type: 'stdout', data: '\nRunning: sudo cscli alerts list -o json\n' });
    const alertsResult = await runCommand('sudo', [
      'cscli', 'alerts', 'list', '-o', 'json',
    ], onOutput);

    let alerts: ReplayResult['alerts'] = [];
    if (alertsResult.stdout.trim()) {
      try {
        const parsed = JSON.parse(alertsResult.stdout.trim());
        alerts = Array.isArray(parsed) ? parsed : [];
      } catch {
        onOutput({ type: 'stderr', data: 'Warning: Could not parse alerts JSON.\n' });
      }
    }

    // Step 3: Run cscli explain
    onOutput({ type: 'stdout', data: `\nRunning: sudo cscli explain -f ${tempFile} -t ${logType}\n` });
    const explainResult = await runCommand('sudo', [
      'cscli', 'explain', '-f', tempFile, '-t', logType,
    ], onOutput);

    const result: ReplayResult = {
      alerts,
      explainOutput: explainResult.stdout,
    };

    // Send results as JSON between markers
    const resultsJson = JSON.stringify(result);
    onOutput({ type: 'stdout', data: `---RESULTS_JSON---${resultsJson}---END_RESULTS---` });
    onOutput({ type: 'exit', data: 'Replay complete', code: 0 });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    onOutput({ type: 'error', data: `Error: ${message}\n` });
    onOutput({ type: 'exit', data: 'Replay failed', code: 1 });
    throw error;
  } finally {
    // Clean up temp file
    try {
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}
