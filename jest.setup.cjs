// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

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
