/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Exclude live integration tests from the default `npm test` run.
  // Run them explicitly: ZAI_API_KEY=<key> npx jest tests/zai.live.test.ts
  testPathIgnorePatterns: ['/node_modules/', '\\.live\\.test\\.ts$'],
};
