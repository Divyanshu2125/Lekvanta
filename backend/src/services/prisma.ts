import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Masks sensitive credentials (password, user token) from a database URL
 * so that connection strings are never leaked into logs or diagnostics.
 */
export function sanitizeDbUrl(rawUrl?: string): string {
  if (!rawUrl) return '[EMPTY DATABASE_URL]';
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  }
}

/**
 * Extracts host information for safe diagnostics
 */
export function getDbHost(rawUrl?: string): string {
  if (!rawUrl) return 'unknown';
  try {
    const parsed = new URL(rawUrl);
    return parsed.host || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Singleton PrismaClient pattern — prevents connection pool exhaustion in development and serverless environments.
// Neon PostgreSQL connection pooling is handled via the pooled connection string (-pooler endpoint / ?sslmode=require).
const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

// Safe logging for Prisma errors without exposing sensitive query parameters or connection credentials
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  prisma.$on('error', (e: any) => {
    console.error('⚠️ [Prisma DB Error]:', e.message || e);
  });
  // @ts-ignore
  prisma.$on('warn', (e: any) => {
    console.warn('⚠️ [Prisma DB Warning]:', e.message || e);
  });
}

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export interface DatabaseHealthResult {
  connected: boolean;
  databaseType: string;
  host: string;
  latencyMs: number;
  ssl: boolean;
  timestamp: string;
  error?: string;
}

/**
 * Verifies live PostgreSQL database connectivity.
 * Executes a simple query to measure response latency and confirm health.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const dbUrl = process.env.DATABASE_URL || '';
  const host = getDbHost(dbUrl);
  const isSsl = dbUrl.includes('sslmode=require') || dbUrl.includes('ssl=true');
  const startTime = Date.now();

  try {
    // Ping the Neon PostgreSQL database with a lightweight query
    await prisma.$queryRaw`SELECT 1 as ping`;
    const latencyMs = Date.now() - startTime;

    return {
      connected: true,
      databaseType: 'PostgreSQL',
      host,
      latencyMs,
      ssl: isSsl,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      connected: false,
      databaseType: 'PostgreSQL',
      host,
      latencyMs,
      ssl: isSsl,
      timestamp: new Date().toISOString(),
      error: err?.message || 'Database connection timeout or error',
    };
  }
}

export default prisma;
