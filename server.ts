import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  handleGetAdminStatus,
  handlePublicSiteStatus,
  handleSyncAdminFirebase,
  handleUpdateAdminSiteStatus,
  pullFromFirebase,
} from './server/siteStatusService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  void pullFromFirebase(true);

  app.get('/api/site-status', async (_req: Request, res: Response) => {
    const payload = await handlePublicSiteStatus();
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  });

  app.get('/api/admin/status', async (req: Request, res: Response) => {
    const result = await handleGetAdminStatus(req.headers.authorization);
    res.status(result.statusCode).json(result.body);
  });

  app.put('/api/admin/site-status', async (req: Request, res: Response) => {
    const result = await handleUpdateAdminSiteStatus(
      req.headers.authorization,
      req.body,
    );
    res.status(result.statusCode).json(result.body);
  });

  app.post('/api/admin/sync-firebase', async (req: Request, res: Response) => {
    const result = await handleSyncAdminFirebase(
      req.headers.authorization,
      req.body,
    );
    res.status(result.statusCode).json(result.body);
  });

  if (IS_PRODUCTION) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get('*', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        const rawHtml = fs.readFileSync(templatePath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(transformed);
      } catch (err) {
        next(err);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DENZZ CLIENT server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
