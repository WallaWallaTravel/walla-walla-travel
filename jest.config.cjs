const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFiles: ['<rootDir>/jest.globals.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Mock Redis for tests to avoid ES module issues with @upstash/redis
    // MUST come before generic @/ pattern
    '^@/lib/redis$': '<rootDir>/__mocks__/lib/redis.ts',
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Transform ES modules from these packages
  transformIgnorePatterns: [
    '/node_modules/(?!(uncrypto|@upstash)/)',
  ],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  // Exclude integration tests by default - they require a running database
  // Run with: npm run test:integration
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/integration/',
    '/e2e/',  // E2E tests run via Playwright, not Jest
    // Exclude utility files that aren't actual tests
    'test-utils\\.ts$',
    'factories\\.ts$',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
