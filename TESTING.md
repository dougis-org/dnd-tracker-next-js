# Testing Guide

This project uses Jest for unit testing and Playwright for end-to-end (e2e) testing.

## Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage (CI)
npm run test:ci
```

### End-to-End Tests (Playwright)

```bash
# Run all e2e tests
npm run test:e2e

# Run e2e tests with UI mode (interactive)
npm run test:e2e:ui

# Run e2e tests in headed mode (browser visible)
npm run test:e2e:headed
```

## Test Structure

### Unit Tests

Unit tests are located in `__tests__` directories alongside the code they test:

- `src/components/__tests__/` - Component tests
- `src/hooks/__tests__/` - Custom hook tests
- `src/lib/__tests__/` - Utility function tests
- `src/models/__tests__/` - Model and schema tests

### E2E Tests

End-to-end tests are located in the `e2e/` directory and use the `.spec.ts` extension.

## Writing Tests

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('user can navigate to page', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Navigation Link')
  await expect(page).toHaveURL('/expected-path')
})
```

## Test Configuration

### Jest Configuration

Jest is configured in `jest.config.js` with:

- Next.js integration
- jsdom test environment
- Path aliases (`@/` maps to `src/`)
- Testing Library setup
- E2E directory exclusion

### Playwright Configuration

Playwright is configured in `playwright.config.ts` with:

- Multiple browser support (Chromium, Firefox, WebKit)
- Automatic dev server startup
- Test parallelization
- HTML reporter

## Best Practices

1. **Unit Tests**: Test individual components and functions in isolation
2. **Integration Tests**: Test how multiple components work together
3. **E2E Tests**: Test complete user workflows and critical paths
4. **Mocking**: Mock external dependencies in unit tests
5. **Coverage**: Aim for good test coverage, especially on critical paths
6. **Performance**: Keep tests fast and reliable

## Continuous Integration

Tests run automatically in CI with:

- `npm run test:ci` for unit tests with coverage
- `npm run test:e2e` for e2e tests
- ESLint for code quality
- Build verification

## Debugging Tests

### Jest Debug

- Use `console.log()` or `debug()` from Testing Library
- Run `npm run test:watch` for interactive debugging

### Playwright Debug

- Use `npm run test:e2e:headed` to see browser actions
- Use `npm run test:e2e:ui` for interactive debugging
- Add `await page.pause()` in tests for step-through debugging
