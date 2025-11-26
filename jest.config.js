/**
 * Jest configuration for unit and integration tests
 */

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/server/src', '<rootDir>/shared/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/src/$1',
    '^@server/(.*)$': '<rootDir>/server/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'server/src/**/*.ts',
    'shared/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    },
    // Core systems require 80% coverage
    'src/game/store/gameStore.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/game/systems/combatSystem.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'server/src/rooms/NexusRoom.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/game/network/colyseus.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000
}

