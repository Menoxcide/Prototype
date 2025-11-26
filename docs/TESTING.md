# Testing Documentation

This document describes the testing strategy, structure, and guidelines for NEX://VOID.

## Table of Contents

- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Coverage Requirements](#coverage-requirements)
- [Mocking Strategies](#mocking-strategies)
- [Integration Test Setup](#integration-test-setup)

## Test Structure

### Directory Layout

```
src/__tests__/
├── systems/           # Unit tests for game systems
├── network/          # Network integration tests
├── e2e/              # End-to-end tests
└── utils/            # Utility tests

server/src/__tests__/
├── systems/          # Unit tests for server systems
├── services/         # Service layer tests
└── integration/      # Integration tests

shared/src/__tests__/
└── utils/            # Shared utility tests
```

### Test Types

1. **Unit Tests**: Test individual functions/classes in isolation
2. **Integration Tests**: Test interactions between components
3. **E2E Tests**: Test complete user flows
4. **Performance Tests**: Benchmark critical paths

## Writing Tests

### Test File Naming

- Test files: `*.test.ts` or `*.spec.ts`
- Match source file name: `combatSystem.ts` → `combatSystem.test.ts`

### Test Structure

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  describe('methodName', () => {
    test('should do something', () => {
      // Arrange
      const input = ...
      
      // Act
      const result = method(input)
      
      // Assert
      expect(result).toBe(expected)
    })
  })
})
```

### Test Patterns

#### Testing Async Code

```typescript
test('should handle async operation', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

#### Testing Error Cases

```typescript
test('should throw error on invalid input', () => {
  expect(() => {
    functionWithValidation(null)
  }).toThrow('Invalid input')
})
```

#### Testing Side Effects

```typescript
test('should update state', () => {
  const initialState = { count: 0 }
  const newState = increment(initialState)
  
  expect(newState.count).toBe(1)
  expect(initialState.count).toBe(0) // Original unchanged
})
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Specific Test File

```bash
npm test -- combatSystem.test.ts
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Tests for Specific Package

```bash
# Client tests
npm test

# Server tests
cd server
npm test

# Shared tests
cd shared
npm test
```

## Coverage Requirements

### Coverage Targets

- **Core Systems**: 80% minimum
  - `gameStore.ts`
  - `combatSystem.ts`
  - `NexusRoom.ts`
  - `colyseus.ts`

- **Overall**: 60% minimum

### Coverage Metrics

- **Statements**: Percentage of statements executed
- **Branches**: Percentage of branches taken
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

### Viewing Coverage

Coverage reports are generated in `coverage/` directory:

```bash
# Open HTML report
open coverage/lcov-report/index.html
```

## Mocking Strategies

### Mocking Modules

```typescript
jest.mock('../path/to/module', () => ({
  functionName: jest.fn(() => mockReturnValue)
}))
```

### Mocking Functions

```typescript
const mockFunction = jest.fn()
mockFunction.mockReturnValue(value)
mockFunction.mockResolvedValue(promise)
```

### Mocking Classes

```typescript
const MockClass = jest.fn().mockImplementation(() => ({
  method: jest.fn()
}))
```

### Mocking Database

```typescript
jest.mock('../services/DatabaseService', () => ({
  createDatabaseService: () => ({
    query: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  })
}))
```

### Mocking Network

```typescript
jest.mock('../network/colyseus', () => ({
  getRoom: jest.fn(() => ({
    send: jest.fn(),
    connection: { isOpen: true }
  }))
}))
```

## Integration Test Setup

### Database Setup

Use in-memory database for tests:

```typescript
import { InMemoryDatabaseService } from '../services/DatabaseService'

let db: InMemoryDatabaseService

beforeEach(async () => {
  db = new InMemoryDatabaseService()
  await db.connect()
})

afterEach(async () => {
  await db.disconnect()
})
```

### Server Setup

Mock Colyseus server for integration tests:

```typescript
import { Server } from '@colyseus/core'

let server: Server

beforeAll(async () => {
  server = new Server()
  // Setup server
})

afterAll(async () => {
  await server.gracefullyShutdown()
})
```

### Client Setup

Mock Colyseus client for integration tests:

```typescript
import { Client } from 'colyseus.js'

let client: Client

beforeAll(() => {
  client = new Client('ws://localhost:2567')
})

afterAll(() => {
  client.close()
})
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Don't rely on test execution order
- Clean up after each test

### 2. Test Readability

- Use descriptive test names
- Keep tests focused on one thing
- Use helper functions for complex setup

### 3. Test Maintainability

- Don't test implementation details
- Test behavior, not implementation
- Refactor tests when code changes

### 4. Test Performance

- Keep tests fast
- Use mocks for slow operations
- Run tests in parallel when possible

### 5. Test Coverage

- Aim for high coverage but prioritize quality
- Test edge cases and error paths
- Don't sacrifice test quality for coverage numbers

## Common Test Patterns

### Testing State Updates

```typescript
test('should update player health', () => {
  const store = useGameStore.getState()
  store.setPlayerHealth(50)
  
  expect(store.player?.health).toBe(50)
})
```

### Testing Network Messages

```typescript
test('should send movement message', () => {
  const mockRoom = { send: jest.fn() }
  sendMovement(mockRoom, { x: 1, y: 0, z: 1 })
  
  expect(mockRoom.send).toHaveBeenCalledWith('move', {
    x: 1, y: 0, z: 1
  })
})
```

### Testing Async Operations

```typescript
test('should complete quest', async () => {
  await questSystem.acceptQuest('player1', 'quest1')
  await questSystem.completeQuest('player1', 'quest1')
  
  const quests = await questSystem.getActiveQuests('player1')
  expect(quests[0].status).toBe('completed')
})
```

## Continuous Integration

Tests run automatically on:

- Pull requests
- Pushes to `develop` and `main` branches
- Scheduled nightly runs

CI configuration: `.github/workflows/ci.yml`

