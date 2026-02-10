/**
 * Jest configuration for integration tests.
 *
 * Uses ts-jest directly (no next/jest) because:
 * 1. Integration tests run in node environment, not jsdom
 * 2. next/jest overrides transformIgnorePatterns, blocking ESM packages like jose
 * 3. Integration tests don't need Next.js-specific transforms (CSS modules, images, etc.)
 *
 * Run with: npm run test:integration
 */

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.[jt]sx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        moduleResolution: 'node',
        strict: true,
        allowJs: true,
      },
    }],
  },
  // Transform ESM packages that Jest can't handle natively
  transformIgnorePatterns: [
    '/node_modules/(?!(jose|uncrypto|@upstash)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
