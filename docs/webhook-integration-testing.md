# Webhook Integration Testing (Clerk + MongoDB)

This document explains the standardized pattern for running Clerk webhook integration tests
against a real in-memory MongoDB instance using `mongodb-memory-server`, while avoiding the
global Jest mocks defined in `jest.setup.js`.

## Why This Is Needed

The global Jest setup purposefully mocks `mongoose`, `mongodb`, `bson`, and the application DB
module (`src/lib/db`) to eliminate side‑effects and speed up the majority of unit tests. For true
integration tests (especially the Clerk webhook handler) we need real model logic, schema
validation, indexes, and persistence. That requires:

1. Unmocking database-related modules BEFORE they are imported.
2. Spinning up an isolated MongoMemoryServer and pointing env vars at it.
3. Registering all Mongoose models exactly once to avoid duplicate compilation errors.
4. Using the real `User` model instead of a mocked shape.

## Core Pattern

Place this exact block at the very top of your integration test file (before any imports):

```ts
/** @jest-environment node */

// Unmock database modules for real MongoDB integration testing
// See docs/webhook-integration-testing.md and database-unmocking.ts for details
jest.unmock('mongoose');
jest.unmock('mongodb');
jest.unmock('bson');
jest.unmock('@/lib/db');
jest.unmock('@/lib/models/User');
jest.unmock('@/lib/models/index');
```

Then import your dependencies:

```ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { POST } from '../route';
import User from '@/lib/models/User';
import {
  setupWebhookTestEnvironment,
  setupMongoMemoryServer,
  cleanupMongoMemoryServer,
  clearMongoCollections,
  setupWebhookMocks,
  cleanupWebhookMocks,
  createMockWebhook,
  createWebhookRequest,
  expectSuccessfulWebhookResponse,
  expectFailedWebhookResponse,
  mockClerkUserData,
  mockClerkUserDataWithoutUsername,
  mockClerkUserDataWithoutEmail,
} from './webhook-test-utils';
```

## Mongo Memory Server Lifecycle

Use the helpers in `webhook-test-utils.ts`:

```ts
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await setupMongoMemoryServer();
  // Import model registry AFTER unmocking to ensure schemas are compiled once
  await import('@/lib/models/index');
});

afterAll(async () => {
  await cleanupMongoMemoryServer(mongoServer);
});

beforeEach(async () => {
  jest.clearAllMocks();
  await clearMongoCollections();
  setupWebhookMocks();
});

afterEach(() => {
  cleanupWebhookMocks();
});
```

## Required Test Data Adjustments

The real `User` model enforces `firstName` and `lastName`. Ensure any user creation or Clerk user
transformation in tests supplies those fields. Username collision handling is tested by
pre‑creating a user and asserting the suffix logic (`johndoe` -> `johndoe1`).

## Common Failure Modes & Fixes

| Symptom                                              | Cause                                                                   | Fix                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `Cannot find module './src/lib/db'`                  | Attempting to unmock with a relative path that is not how it was mocked | Use `jest.unmock('@/lib/db')` not `./src/lib/db`                               |
| `disconnectFromDatabase is not a function`           | Using the mocked DB module after unmocking attempt failed               | Ensure unmock lines are first and path matches the mock in `jest.setup.js`     |
| `OverwriteModelError` or duplicate model compilation | Importing models before unmocking or multiple times                     | Keep unmock lines first, import `@/lib/models/index` once in `beforeAll`       |
| Webhook tests still using mocks                      | Missed a module in unmock list                                          | Copy entire block from pattern above                                           |
| Username generation not matching expectation         | Email mismatch in mock data variant                                     | Ensure `primary_email_address_id` corresponds to an entry in `email_addresses` |

## Adding New Integration Tests

1. Copy the unmock block.
2. Use `@jest-environment node` to avoid JSDOM overhead.
3. Reuse helpers in `webhook-test-utils.ts`.
4. Import model registry in `beforeAll`.
5. Keep assertions focused on real persistence (e.g. `User.findByClerkId`).

## Reference Implementation

See `src/app/api/webhooks/clerk/__tests__/webhook-integration.test.ts` for the canonical example.

## Related Files

- `jest.setup.js` – defines the global mocks we override.
- `src/app/api/webhooks/clerk/__tests__/database-unmocking.ts` – constant list & documentation utilities.
- `src/app/api/webhooks/clerk/__tests__/webhook-integration.test.ts` – working test using this pattern.
- `src/app/api/webhooks/clerk/__tests__/webhook-test-utils.ts` – lifecycle and data helpers.

## Maintenance Notes

If additional models or DB utilities are mocked globally in the future, add them to:

- The unmock block in this doc.
- `DATABASE_MODULES_TO_UNMOCK` array in `database-unmocking.ts`.

Keep this document updated when:

- Validation requirements change on `User`.
- Webhook payload structure updates.
- Additional integration tests adopt the pattern.

---

Maintained as part of resolving issue 653 / PR 719. Update with any new learnings from future test refactors.
