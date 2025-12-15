/**
 * Jest global setup
 * Defines globals needed for Next.js API route testing
 *
 * Note: This file is loaded via setupFiles (before Jest is initialized).
 * jest.mock() calls should go in jest.setup.cjs (setupFilesAfterEnv) instead.
 */

import { Request, Response, Headers } from 'node-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Define Web API globals for Jest
global.Request = Request as any;
global.Response = Response as any;
global.Headers = Headers as any;
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock FormData
global.FormData = class FormData {
  private data = new Map();
  append(key: string, value: any) {
    this.data.set(key, value);
  }
  get(key: string) {
    return this.data.get(key);
  }
} as any;

// Mock Blob
global.Blob = class Blob {
  constructor(
    public parts: any[],
    public options?: any
  ) {}
} as any;
