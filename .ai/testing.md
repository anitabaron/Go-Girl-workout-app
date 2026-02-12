# Testing Guide

This project uses Vitest for unit/integration tests and Playwright for E2E tests.

## Quick Start

### Unit Tests (Vitest)

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (recommended during development)
pnpm test:watch

# Run tests with UI mode (for complex test suites)
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage

# Run specific test file
pnpm test src/__tests__/example.test.ts

# Run tests matching a pattern
pnpm test:watch -t "component"
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests with UI mode
pnpm test:e2e:ui

# Generate tests using codegen (record interactions)
pnpm test:e2e:codegen

# Run specific test file
pnpm test:e2e e2e/workout-plans/workout-plan.spec.ts

# Dostępne plany testów E2E (pojedyncze pliki)
# Auth
pnpm test:e2e e2e/auth/login.spec.ts
# Exercises
pnpm test:e2e e2e/exercises/add-exercise.spec.ts
# Workout plans
pnpm test:e2e e2e/workout-plans/workout-plan.spec.ts
pnpm test:e2e e2e/workout-plans/create-workout-plan.spec.ts
# Workout sessions
pnpm test:e2e e2e/workout-sessions/workout-session-flow.spec.ts

# Run single complex assistant scenario (skip/back/timer/manual override)
pnpm test:e2e e2e/workout-sessions/workout-session-flow.spec.ts -g "should preserve manually entered actual values across skip/back/timer-driven flow"

# Run all tests from a directory (wszystkie specy w katalogu)
# Auth – logowanie
pnpm test:e2e e2e/auth
# Exercises – ćwiczenia
pnpm test:e2e e2e/exercises
# Workout plans – plany treningowe
pnpm test:e2e e2e/workout-plans
# Workout sessions – sesje treningowe
pnpm test:e2e e2e/workout-sessions

# Run multiple test files/directories (kilka katalogów lub plików naraz)
pnpm test:e2e e2e/workout-plans e2e/exercises
pnpm test:e2e e2e/auth e2e/workout-sessions
pnpm test:e2e e2e/workout-plans e2e/workout-sessions e2e/exercises
```

## Test Structure

### Unit Tests

- **Location**: `src/__tests__/` or co-located with source files (`.test.ts`, `.spec.ts`)
- **Component Tests**: `src/components/__tests__/` or co-located (`.test.tsx`, `.spec.tsx`)
- **Framework**: Vitest + React Testing Library

### E2E Tests

- **Location**: `e2e/` directory
- **Page Objects**: `e2e/pages/` directory (Page Object Model pattern)
- **Framework**: Playwright (Chromium only)

## Guidelines

### Vitest Guidelines

- Use `vi` object for test doubles (`vi.fn()`, `vi.spyOn()`, `vi.stubGlobal()`)
- Use `vi.mock()` factory patterns at the top level
- Create setup files for reusable configuration
- Use inline snapshots for readable assertions
- Configure jsdom for DOM testing (already configured)
- Structure tests with descriptive `describe` blocks
- Follow Arrange-Act-Assert pattern

### Playwright Guidelines

- Use Page Object Model for maintainable tests
- Use locators for resilient element selection
- Leverage auto-waiting features
- Use browser contexts for isolating test environments
- Implement visual comparison with `expect(page).toHaveScreenshot()`
- Use the codegen tool for test recording
- Leverage trace viewer for debugging test failures

### Database Teardown

The E2E test suite includes automatic database teardown that runs after all tests complete. This ensures a clean state for each test run.

**Automatic Teardown:**
- Runs automatically after all E2E tests complete (via `global-teardown.ts`)
- Cleans up all test data from the E2E database
- Can be disabled by setting `E2E_SKIP_TEARDOWN=true` in `.env.test`

**Manual Teardown:**

You can run teardown manually using the CLI script:

```bash
# Clean up all test data
pnpm e2e:teardown

# Clean up data for a specific user
pnpm e2e:teardown --user=USER_ID
```

You can also use the teardown utilities in your tests:

```typescript
import { teardownUserData, teardownAllData } from '../fixtures';

// Clean up data for a specific user
await teardownUserData(userId, true); // verbose = true

// Clean up all test data (use with caution)
await teardownAllData(true); // verbose = true
```

**Required Environment Variables in `.env.test`:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (test environment)
- `SUPABASE_SERVICE_ROLE_KEY` (recommended) - Service role key for teardown (bypasses RLS)
  - OR `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key (may be blocked by RLS)
- `E2E_TEST_ENV=true` - Required for remote test databases (not localhost)

**Note:** Service role key is recommended for teardown because it bypasses RLS. Anon key may not work if RLS policies block DELETE operations.

**Setting up teardown for remote E2E database:**

1. Add to `.env.test`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   E2E_TEST_ENV=true
   ```

2. Run teardown:
   ```bash
   pnpm e2e:teardown
   ```

## Configuration Files

- `vitest.config.ts` - Vitest configuration
- `vitest.setup.ts` - Global test setup and mocks
- `playwright.config.ts` - Playwright configuration (Chromium only)
- `e2e/global-teardown.ts` - Global teardown for E2E tests (database cleanup)
- `e2e/fixtures/db-teardown.ts` - Database teardown utilities

## Example Tests

See example test files:
- `src/__tests__/example.test.ts` - Unit test example
- `src/components/__tests__/example.test.tsx` - Component test example
