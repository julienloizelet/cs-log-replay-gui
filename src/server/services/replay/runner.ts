import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { MAX_EXPLAIN_LINES, type ReplayResult, type OutputCallback } from './types.js';

const IS_DEV = process.env.IS_DEV === 'true';
const CONTAINER_NAME = 'crowdsec-dev';
// Host-side dir (user-writable, inside the project)
const HOST_LOG_DIR = join(process.cwd(), 'dev', 'tmp');
// Container-side mount point (must match docker-compose volume)
const CONTAINER_LOG_DIR = '/tmp/crowdsec-replay';

function buildCommand(command: string, args: string[]): [string, string[]] {
  if (IS_DEV) {
    return ['docker', ['exec', CONTAINER_NAME, command, ...args]];
  }
  return ['sudo', [command, ...args]];
}

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
  // In dev mode, write to dev/tmp/ (user-owned) which is mounted into the container
  const fileName = `replay-${randomUUID()}.log`;
  const hostTempFile = IS_DEV ? join(HOST_LOG_DIR, fileName) : join(tmpdir(), fileName);
  // Path used in CrowdSec commands (container path in dev, same as host in prod)
  const cmdTempFile = IS_DEV ? join(CONTAINER_LOG_DIR, fileName) : hostTempFile;
  if (IS_DEV) {
    await mkdir(HOST_LOG_DIR, { recursive: true });
  }

  try {
    // Write log content to temp file on host
    await writeFile(hostTempFile, logContent, 'utf-8');
    onOutput({ type: 'stdout', data: `Wrote log to ${hostTempFile}\n` });

    if (IS_DEV) {
      onOutput({ type: 'stdout', data: `(dev mode: using Docker container "${CONTAINER_NAME}")\n` });
    }

    // Step 0: Clear previous alerts
    const [deleteCmd, deleteArgs] = buildCommand('cscli', ['alerts', 'delete', '--all']);
    onOutput({ type: 'stdout', data: `\nClearing previous alerts...\n` });
    onOutput({ type: 'stdout', data: `Running: ${deleteCmd} ${deleteArgs.join(' ')}\n` });
    await runCommand(deleteCmd, deleteArgs, onOutput);

    // Step 1: Replay logs through CrowdSec
    const [replayCmd, replayArgs] = buildCommand('crowdsec', [
      '--dsn', `file://${cmdTempFile}`,
      '--type', logType,
      '--no-api',
    ]);
    onOutput({ type: 'stdout', data: `\nRunning: ${replayCmd} ${replayArgs.join(' ')}\n` });
    const replayResult = await runCommand(replayCmd, replayArgs, onOutput);

    if (replayResult.exitCode !== 0) {
      onOutput({ type: 'error', data: `CrowdSec replay exited with code ${replayResult.exitCode}\n` });
    } else {
      onOutput({ type: 'stdout', data: 'Replay completed successfully.\n' });
    }

    // Step 2: Fetch alerts
    const [alertsCmd, alertsArgs] = buildCommand('cscli', ['alerts', 'list', '-o', 'json']);
    onOutput({ type: 'stdout', data: `\nRunning: ${alertsCmd} ${alertsArgs.join(' ')}\n` });
    const alertsResult = await runCommand(alertsCmd, alertsArgs, onOutput);

    let alerts: ReplayResult['alerts'] = [];
    if (alertsResult.stdout.trim()) {
      try {
        const parsed = JSON.parse(alertsResult.stdout.trim());
        alerts = Array.isArray(parsed) ? parsed : [];
      } catch {
        onOutput({ type: 'stderr', data: 'Warning: Could not parse alerts JSON.\n' });
      }
    }

    // Step 3: Run cscli explain (limited to first N lines)
    const allLines = logContent.split('\n');
    const explainLines = allLines.slice(0, MAX_EXPLAIN_LINES);
    const truncated = allLines.length > MAX_EXPLAIN_LINES;

    // Write truncated file for explain
    const explainFileName = `explain-${randomUUID()}.log`;
    const hostExplainFile = IS_DEV ? join(HOST_LOG_DIR, explainFileName) : join(tmpdir(), explainFileName);
    const cmdExplainFile = IS_DEV ? join(CONTAINER_LOG_DIR, explainFileName) : hostExplainFile;
    await writeFile(hostExplainFile, explainLines.join('\n'), 'utf-8');

    if (truncated) {
      onOutput({ type: 'stdout', data: `\nExplain limited to first ${MAX_EXPLAIN_LINES} lines (${allLines.length} total).\n` });
    }

    const [explainCmd, explainArgs] = buildCommand('cscli', ['explain', '-f', cmdExplainFile, '-t', logType]);
    onOutput({ type: 'stdout', data: `\nRunning: ${explainCmd} ${explainArgs.join(' ')}\n` });
    const explainResult = await runCommand(explainCmd, explainArgs, onOutput);

    // Clean up explain temp file
    try { await unlink(hostExplainFile); } catch { /* ignore */ }

    const result: ReplayResult = {
      alerts,
      replayCommand: `${replayCmd} ${replayArgs.join(' ')}`,
      alertsCommand: `${alertsCmd} ${alertsArgs.join(' ')}`,
      explainOutput: explainResult.stdout,
      explainCommand: `${explainCmd} ${explainArgs.join(' ')}`,
      totalLines: allLines.filter((l) => l.trim().length > 0).length,
      explainedLines: explainLines.filter((l) => l.trim().length > 0).length,
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
      await unlink(hostTempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}
