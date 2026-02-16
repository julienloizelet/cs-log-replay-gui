import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { replayLogs, type ReplayResult } from './services/replay/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const isDev = process.env.NODE_ENV !== 'production';

const io = new Server(server, {
  cors: isDev
    ? {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
      }
    : undefined,
});

app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Per-socket session state
interface SessionState {
  result: ReplayResult | null;
}

const sessions = new Map<string, SessionState>();

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Client connected');
  sessions.set(socket.id, { result: null });

  socket.on('replay', async (data: { logContent: string; logType: string }) => {
    const { logContent, logType } = data;

    // Validate inputs
    if (!logContent || logContent.trim().length === 0) {
      socket.emit('output', { type: 'error', data: 'Log content is empty.' });
      socket.emit('output', { type: 'exit', data: 'Validation failed', code: 1 });
      return;
    }

    if (!logType || logType.trim().length === 0) {
      socket.emit('output', { type: 'error', data: 'Log type is required.' });
      socket.emit('output', { type: 'exit', data: 'Validation failed', code: 1 });
      return;
    }

    try {
      const result = await replayLogs(logContent, logType.trim(), (output) => {
        socket.emit('output', output);
      });
      const session = sessions.get(socket.id);
      if (session) {
        session.result = result;
      }
    } catch (error) {
      // Error already emitted via onOutput in replayLogs
      console.error('Replay error:', error instanceof Error ? error.message : error);
    }
  });

  socket.on('disconnect', () => {
    sessions.delete(socket.id);
    console.log('Client disconnected');
  });
});

// Serve static files in production
if (!isDev) {
  const clientPath = join(__dirname, '../client');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
