import { PrismaClient, Prisma } from '@prisma/client';

// Allow Railway-style DATABASE_PUBLIC_URL fallback before client creation
if (!process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const logLevel: Prisma.LogLevel[] = process.env.NODE_ENV === 'development'
  ? ['query', 'error', 'warn']
  : ['error'];

export const prisma = globalThis.__prisma || new PrismaClient({
  log: logLevel,
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
