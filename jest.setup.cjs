// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// In-memory store for mock Redis
const redisStore = new Map();

// Mock @upstash/redis to avoid ES module issues
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockImplementation(async (key) => {
      const entry = redisStore.get(key);
      if (!entry) return null;
      if (entry.expiry && entry.expiry < Date.now()) {
        redisStore.delete(key);
        return null;
      }
      return entry.value;
    }),
    set: jest.fn().mockImplementation(async (key, value, options) => {
      redisStore.set(key, {
        value,
        expiry: options?.ex ? Date.now() + options.ex * 1000 : undefined,
      });
      return 'OK';
    }),
    del: jest.fn().mockImplementation(async (key) => {
      redisStore.delete(key);
      return 1;
    }),
    incr: jest.fn().mockImplementation(async (key) => {
      const entry = redisStore.get(key);
      const current = (entry?.value) || 0;
      const newValue = current + 1;
      redisStore.set(key, { value: newValue, expiry: entry?.expiry });
      return newValue;
    }),
    expire: jest.fn().mockImplementation(async (key, seconds) => {
      const entry = redisStore.get(key);
      if (entry) {
        entry.expiry = Date.now() + seconds * 1000;
      }
      return 1;
    }),
    ttl: jest.fn().mockImplementation(async (key) => {
      const entry = redisStore.get(key);
      if (!entry) return -2;
      if (!entry.expiry) return -1;
      const remaining = Math.ceil((entry.expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }),
    exists: jest.fn().mockImplementation(async (key) => {
      return redisStore.has(key) ? 1 : 0;
    }),
    pipeline: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  })),
}));

// Clear the mock store before each test
beforeEach(() => {
  redisStore.clear();
});

// Mock NextResponse for Next.js API route testing
// This must be in setupFilesAfterEnv for jest.mock hoisting to work
jest.mock('next/server', () => {
  // Create a mock response class that properly implements json()
  class MockNextResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new Map(Object.entries(init.headers || {}));
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }

    static json(body, init = {}) {
      const response = new MockNextResponse(body, init);
      response.json = async () => body;
      return response;
    }

    static redirect(url, status = 307) {
      const response = new MockNextResponse(null, { status });
      response.headers.set('Location', url.toString());
      return response;
    }

    static next(init = {}) {
      return new MockNextResponse(null, { status: 200, headers: init.headers });
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: jest.fn().mockImplementation((url, init = {}) => ({
      url,
      method: init.method || 'GET',
      headers: new Map(Object.entries(init.headers || {})),
      nextUrl: { searchParams: new URLSearchParams() },
      json: jest.fn().mockResolvedValue(init.body || {}),
    })),
  };
});
