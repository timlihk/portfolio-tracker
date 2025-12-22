// Test setup file
// Note: For unit tests, we don't need database connection
// Database tests should be run separately with a test database

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
