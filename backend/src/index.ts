import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';
import prisma, { getDbHost, sanitizeDbUrl } from './services/prisma';

const app = express();

// Middlewares - Allow requests from localhost, frontend dev server, electron, and deployed Vercel domains
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all valid origins while supporting credentials
      callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, '127.0.0.1', async () => {
    const host = getDbHost(process.env.DATABASE_URL);
    console.log(`🚀 Lekvanta Backend running on http://127.0.0.1:${env.PORT}`);
    console.log(`🗄️  Database Target: PostgreSQL (${host})`);
    console.log(`🩺 Health check available at http://127.0.0.1:${env.PORT}/api/health`);

    try {
      await prisma.$connect();
      console.log(`✅ Successfully connected to Neon PostgreSQL database via Prisma`);
    } catch (error: any) {
      console.warn(`⚠️  Database connection pending or not yet reachable at ${host}.`);
      console.warn(`   Configure your valid Neon DATABASE_URL with ?sslmode=require in backend/.env to connect.`);
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
}

export default app;
