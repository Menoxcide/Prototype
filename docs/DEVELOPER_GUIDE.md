# Developer Guide

This guide helps new developers get started with the NEX://VOID codebase.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Coding Conventions](#coding-conventions)
- [Testing Guidelines](#testing-guidelines)
- [Debugging Tips](#debugging-tips)
- [Common Pitfalls](#common-pitfalls)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+ (optional, for caching)
- Firebase account (for authentication and hosting)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Prototype
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install shared package dependencies
cd ../shared
npm install
```

3. Set up environment variables:
```bash
# Create .env file in root
cp .env.example .env

# Create .env file in server
cd server
cp .env.example .env
```

4. Set up database:
```bash
# Run migrations
cd server
npm run migrate
```

5. Start development servers:
```bash
# Terminal 1: Start client dev server
npm run dev

# Terminal 2: Start server
cd server
npm run dev
```

## Project Structure

```
Prototype/
├── src/                    # Client-side code
│   ├── game/              # Game logic
│   │   ├── components/    # React Three Fiber components
│   │   ├── systems/       # Game systems (combat, crafting, etc.)
│   │   ├── store/         # Zustand state management
│   │   ├── network/       # Network communication
│   │   ├── data/          # Game data (items, spells, etc.)
│   │   └── ui/            # UI components
│   └── __tests__/         # Client tests
├── server/                 # Server-side code
│   ├── src/
│   │   ├── rooms/         # Colyseus rooms
│   │   ├── systems/       # Game systems
│   │   ├── services/      # Backend services
│   │   ├── routes/        # API routes
│   │   └── __tests__/     # Server tests
│   └── migrations/        # Database migrations
├── shared/                 # Shared code
│   └── src/
│       ├── types/         # TypeScript types
│       └── utils/         # Shared utilities
└── docs/                   # Documentation
```

## Coding Conventions

### TypeScript

- Use strict TypeScript settings
- Prefer interfaces over types for object shapes
- Use `const` for immutable values, `let` for mutable
- Avoid `any` type - use `unknown` if type is truly unknown

### Naming Conventions

- **Files**: `camelCase.ts` for utilities, `PascalCase.tsx` for components
- **Functions**: `camelCase` for regular functions, `PascalCase` for React components
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (often with `I` prefix for clarity)

### Code Organization

- One class/interface per file
- Group related functions in modules
- Use barrel exports (`index.ts`) for clean imports
- Keep functions small and focused (single responsibility)

### Comments

- Use JSDoc for public APIs
- Explain "why" not "what" in comments
- Keep comments up-to-date with code changes

### Example

```typescript
/**
 * Calculates damage for a spell cast
 * @param spell - The spell being cast
 * @param casterLevel - Level of the caster
 * @param comboMultiplier - Combo multiplier (default: 1.0)
 * @returns Damage calculation result
 */
export function calculateDamage(
  spell: Spell,
  casterLevel: number,
  comboMultiplier: number = 1.0
): DamageResult {
  // Implementation
}
```

## Testing Guidelines

### Test Structure

- Unit tests: Test individual functions/classes
- Integration tests: Test system interactions
- E2E tests: Test complete user flows

### Writing Tests

1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code being tested
3. **Assert**: Verify the expected outcome

### Example

```typescript
describe('calculateDamage', () => {
  test('should calculate base damage', () => {
    // Arrange
    const spell = { damage: 50, ... }
    const level = 10
    
    // Act
    const result = calculateDamage(spell, level)
    
    // Assert
    expect(result.damage).toBe(50)
  })
})
```

### Coverage Requirements

- **Core systems**: 80% coverage minimum
- **Overall**: 60% coverage minimum
- Focus on critical paths and edge cases

## Debugging Tips

### Client-Side Debugging

1. **React DevTools**: Inspect component state and props
2. **Redux DevTools**: Monitor Zustand store updates
3. **Browser Console**: Check for errors and warnings
4. **Network Tab**: Monitor WebSocket messages
5. **Performance Tab**: Profile frame times and memory

### Server-Side Debugging

1. **Console Logs**: Use structured logging
2. **Monitoring Service**: Check metrics and logs via API
3. **Database Queries**: Use PostgreSQL logs
4. **Redis**: Monitor cache hits/misses

### Common Debugging Scenarios

**Issue**: Player movement not syncing
- Check network connection status
- Verify message batching is working
- Check server-side validation logs

**Issue**: Spell not casting
- Verify spell cooldown has expired
- Check mana cost vs available mana
- Verify server-side spell validation

**Issue**: Quest not completing
- Check quest objective progress
- Verify event handlers are firing
- Check server-side quest system logs

## Common Pitfalls

### 1. State Mutations

**Problem**: Mutating state directly causes issues with React/Zustand

**Solution**: Always use immutable updates

```typescript
// ❌ Bad
player.health = 100

// ✅ Good
setPlayer({ ...player, health: 100 })
```

### 2. Memory Leaks

**Problem**: Not cleaning up timers, subscriptions, or event listeners

**Solution**: Always clean up in useEffect/unmount

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    // ...
  }, 1000)
  
  return () => clearInterval(timer)
}, [])
```

### 3. Network Race Conditions

**Problem**: Multiple rapid requests causing race conditions

**Solution**: Use debouncing, request cancellation, or request queuing

### 4. Type Safety

**Problem**: Using `any` type defeats TypeScript's purpose

**Solution**: Define proper types or use `unknown` with type guards

### 5. Performance Issues

**Problem**: Unnecessary re-renders or expensive calculations

**Solution**: 
- Use React.memo for expensive components
- Use useMemo/useCallback for expensive calculations
- Optimize state subscriptions in Zustand

## Contribution Workflow

1. Create a feature branch from `develop`
2. Make changes following coding conventions
3. Write tests for new features
4. Ensure all tests pass
5. Update documentation if needed
6. Create pull request to `develop`
7. Address review feedback
8. Merge after approval

## Resources

- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Colyseus Docs](https://docs.colyseus.io)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

