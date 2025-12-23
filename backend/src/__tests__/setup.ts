// Test setup file
// Note: For unit tests, we don't need database connection
// Database tests should be run separately with a test database

// Set required env vars BEFORE any imports that might use them
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.SHARED_SECRET = process.env.SHARED_SECRET || 'test-shared-secret';
process.env.VITEST_WORKER_ID = process.env.VITEST_WORKER_ID || '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

import { vi } from 'vitest';
import http from 'http';

// Detect whether this environment allows binding to a local port
try {
  const server = http.createServer((_req, res) => res.end()).listen(0, '127.0.0.1', () => {
    server.close();
  });
} catch (_err) {
  process.env.PORT_BINDING_BLOCKED = 'true';
}

// Mock logger to prevent console output during tests
vi.mock('../services/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    request: vi.fn(),
    dbQuery: vi.fn(),
    apiCall: vi.fn()
  }
}));
