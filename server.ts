import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/api.js';
import { setupWebSocket } from './server/ws.js';

dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  setupWebSocket(server);

  app.use('/api', apiRouter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      system: 'NHAA 14566 Trauma Assessment & Helpline System',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`NHAA 14566 Backend Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
