// Export backend client for compatibility with existing code
// This replaces the Base44 SDK with our own backend API
import { backend } from './backendClient';

export const base44 = backend;
