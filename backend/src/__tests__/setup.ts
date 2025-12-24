// Test setup file
// Note: For unit tests, we don't need database connection
// Database tests should be run separately with a test database

// Set required env vars BEFORE any imports that might use them
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.SHARED_SECRET = process.env.SHARED_SECRET || 'test-shared-secret';
process.env.VITEST_WORKER_ID = process.env.VITEST_WORKER_ID || '1';
// In sandboxed environments, binding to a local port often fails; force skip of supertest suites.
process.env.PORT_BINDING_BLOCKED = process.env.PORT_BINDING_BLOCKED || 'true';

import { vi } from 'vitest';

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
