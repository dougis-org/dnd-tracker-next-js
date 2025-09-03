# Test Suite Fix: Unit to Integration Refactor

## Goal

Fix the failing test suite, specifically the tests for the parties API routes.

## Root Cause

The test failures originated from a mock in `src/app/api/parties/__tests__/api-test-utils.ts` that pointed to a non-existent module, `@/lib/session-config`. This module was likely removed during a previous authorization migration.

## Solution

The failing unit tests were refactored into integration tests. This involved:

1. **Removing Mocks:** All mocks related to the session and database were removed from `src/app/api/parties/[id]/__tests__/route.test.ts` and `src/app/api/parties/__tests__/route.test.ts`.
2. **Database Integration:** The tests were updated to connect to a live test database, including setup and teardown logic to ensure a clean testing environment.
3. **Dependency Installation:** The `node-mocks-http` package was added as a dev dependency to facilitate the creation of mock request and response objects for the API routes.
4. **Model Import Correction:** The `User` and `Party` model imports were corrected in the new integration tests.
5. **File Deletion:** The now-unused mock utility file, `src/app/api/parties/__tests__/api-test-utils.ts`, was deleted.

## Current Status

All tests in the suite are now passing.

## Plan Summary

1. **[DONE]** Identify the root cause of the test failures.
2. **[DONE]** Refactor the failing unit tests into integration tests.
3. **[DONE]** Install necessary dev dependencies (`node-mocks-http`).
4. **[DONE]** Correct model imports in the new integration tests.
5. **[DONE]** Run all tests to ensure the entire suite is passing.
6. **[DONE]** Remove the now-unused `src/app/api/parties/__tests__/api-test-utils.ts` file.

## Next Steps

- Commit the changes to the codebase.
