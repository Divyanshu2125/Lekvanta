import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';
import prisma from './services/prisma';

const app = express();

// Middlewares - Allow requests from localhost, frontend dev server, and electron
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost, null origin (file:// in electron), and dev frontend
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('app://') || origin === 'null') {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local desktop mode
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Serve frontend static build if available
const frontendDistPath = fs.existsSync(path.resolve(__dirname, '../../frontend/dist'))
  ? path.resolve(__dirname, '../../frontend/dist')
  : path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// API Routes
app.use('/api', routes);

// SPA Fallback for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
  }
  const indexHtml = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(200).send('Lekvanta Server Running. Frontend dist not found.');
  }
});

// Centralized Error Handler
app.use(errorHandler);

const server = app.listen(env.PORT, '127.0.0.1', async () => {
  try {
    await prisma.$connect();
    console.log(`🚀 Lekvanta Backend running on http://127.0.0.1:${env.PORT}`);
    console.log(`🗄️  Connected to SQLite database via Prisma`);
    console.log(`🩺 Health check available at http://127.0.0.1:${env.PORT}/api/health`);
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server closed & Prisma disconnected');
  });
});

export default app;
