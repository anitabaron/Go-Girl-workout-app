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
pnpm test:e2e e2e/example.spec.ts
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

## Configuration Files

- `vitest.config.ts` - Vitest configuration
- `vitest.setup.ts` - Global test setup and mocks
- `playwright.config.ts` - Playwright configuration (Chromium only)

## Example Tests

See example test files:
- `src/__tests__/example.test.ts` - Unit test example
- `src/components/__tests__/example.test.tsx` - Component test example
- `e2e/example.spec.ts` - E2E test example
- `e2e/pages/example-page.ts` - Page Object Model example
