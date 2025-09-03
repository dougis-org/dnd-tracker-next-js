# Authentication Migration: NextAuth to Clerk

## Overview

This document tracks the systematic migration from NextAuth to Clerk authentication patterns across the D&D Tracker codebase.

## Migration Progress

### 🚀 Current Development

#### Branch: `feature/clerk-svix-integration`

- **Svix Mocking and Configuration**:
  - ✅ Added mock for `svix` to support webhook testing in a Clerk environment.
  - ✅ Updated Jest `transformIgnorePatterns` to process the `svix` module correctly.
- **Test Infrastructure Update**:
  - ✅ Migrated character API test helpers from `setupNextAuthMocks` to `setupClerkMocks`.

### ✅ Completed

#### Core Infrastructure

- **Centralized Auth Utilities** (`src/lib/auth.ts`)
  - Implemented `getAuthenticatedUserId()`, `requireAuth()`, `isAuthenticated()`
  - Standardized sign-in URL pattern: `/sign-in?redirect_url=<callback>`
  - Provider-agnostic authentication layer

#### Test Helpers & Patterns

- **Shared Test Helpers** (`src/lib/test-utils/shared-clerk-test-helpers.tsx`)
  - Centralized authentication mocking utilities
  - Standardized test constants (`SHARED_API_TEST_CONSTANTS`)
  - Helper functions: `setupAuthenticatedState()`, `setupUnauthenticatedState()`, `setupIncompleteAuthState()`
  - Sign-in redirect testing utilities

#### Page Tests Migrated

- **Parties Page Tests** (`src/app/parties/__tests__/`)
  - ✅ `page.test.tsx` - Main functionality tests using centralized auth
  - ✅ `page.auth.test.tsx` - Authentication-specific tests (3/3 passing)
  - ✅ Fixed redirect function mocking pattern issue
  - Uses `getAuthenticatedUserId()` from centralized auth utilities

#### Component Tests Migrated

- **Settings Page Test** (`src/app/settings/__tests__/page.test.tsx`)
  - Migrated from `useSession` to `useUser`
  - Updated authentication state mocking

- **Characters Page Tests**
  - Migrated from NextAuth patterns to Clerk `useUser`
  - Updated component authentication testing

- **Combat Page Test**
  - Replaced `useSession` with `useAuth`
  - Updated authentication flow testing

#### User Model Integration

- **User Model Clerk Tests** (`src/lib/models/__tests__/User.clerk.test.ts`)
  - Comprehensive Clerk integration testing
  - Username generation and conflict resolution
  - Email-based username handling
  - User data synchronization from Clerk

### ✅ Recent Completions (Current Sprint)

#### Authentication Test Infrastructure Fixes

- **Layout Component Tests** (`src/components/layout/__tests__/login-logout-flows.test.tsx`)
  - ✅ **Breadcrumbs pathname fix** (10/10 passing): Resolved `usePathname()` returning `undefined`
    causing breadcrumbs to crash
  - ✅ Fixed Next.js navigation hook mocking with proper `usePathname` return values
  - ✅ Updated URL expectations from `/signin` to `/sign-in` for consistency

- **API Route Authentication Standardization**
  - ✅ **Encounters API route** (`src/app/api/encounters/[id]/route.ts`) (21/21 passing): Fixed
    authentication response format
  - ✅ Replaced manual error responses with consistent `createErrorResponse()` helper
  - ✅ Standardized all authentication checks to return proper error structure

- **Jest Module Mapping Resolution**
  - ✅ **Created dedicated auth-test-utils** (`src/lib/test-utils/auth-test-utils.ts`): Resolved
    circular dependencies
  - ✅ **Combat API wrapper test** (7/7 passing): Fixed import issues causing
    `setupUnauthenticatedState is not a function`
  - ✅ **User Clerk integration test** (38/38 passing): Updated to use `AUTH_TEST_CONSTANTS`
  - ✅ Separated authentication utilities from shared Clerk helpers to avoid Jest
    moduleNameMapping conflicts

#### Final Test Failures Resolution (Latest Sprint)

- **ProfileSetupPage Test Migration** (`src/app/(auth)/__tests__/ProfileSetupPage.test.tsx`)
  - ✅ **Complete Clerk migration**: Removed all NextAuth patterns (`useSession`) and replaced
    with Clerk `useAuth`
  - ✅ **Simplified test approach**: Removed complex form mocking, focused on actual redirect
    behavior testing
  - ✅ **Real component testing**: Tests actual component logic instead of mocked interactions

- **AppLayout Navigation Test Update** (`src/components/layout/__tests__/AppLayout.test.tsx`)
  - ✅ **URL expectation fix**: Updated test to expect `/user-profile` instead of `/settings` to
    match actual component behavior
  - ✅ **Clerk integration**: Component now uses Clerk's user profile management system

- **API Route Authentication Test Infrastructure** (`src/lib/test-utils/shared-api-test-helpers.ts`)
  - ✅ **Clerk session structure**: Updated `createMockSession()` to use Clerk's session format
    with `userId` property
  - ✅ **Authentication flow fix**: Resolved all API route tests returning 401 instead of expected
    status codes
  - ✅ **Mock consolidation**: Centralized Clerk authentication mocking patterns

- **Next.js 15 TypeScript Compatibility** (`src/lib/auth.ts`, `src/components/layout/AuthenticatedServerPage.tsx`)
  - ✅ **Route type fix**: Resolved `RouteImpl<string>` type errors by importing and using `Route`
    type from Next.js
  - ✅ **Typed routes support**: Fixed redirect function calls to work with Next.js 15's
    `typedRoutes: true` configuration
  - ✅ **Build success**: All TypeScript compilation errors resolved

### ✅ PR #704 - Test Failure Resolution

After addressing review comments on PR #704 (migrating from NextAuth to Clerk), several tests started
failing. The root cause was a combination of issues related to Jest's module transformation and
incomplete mocks. The following fixes were implemented:

- **Jest Configuration for `svix`:** The `svix` library, used for Clerk webhook verification, was not
  being transformed by Jest. This was resolved by removing `svix` from the `transformIgnorePatterns`
  in `jest.config.js`.

- **`svix` Mocking:** Even with the transform, Jest had issues with the `svix` library in its JSDOM
  environment. A manual mock was created at `src/__mocks__/svix.js` to provide a stable interface
  for the tests.

- **Webhook Test Utility:** The mock request created in `src/app/api/webhooks/clerk/__tests__/webhook-test-utils.ts`
  was missing a `.text()` method, which the webhook handler expects. This method was added to the
  mock request object.

- **API Test Utilities:** The `setupNextAuthMocks` function was still being used in
  `src/app/api/characters/__tests__/shared-test-utils.ts`. This was replaced with the correct
  `setupClerkMocks` function.

### ✅ Migration Complete - Ready for Production

#### Latest Branch: `feature/nextauth-cleanup-verification-test` (MERGED - PR #708)

- **NextAuth Cleanup Verification Complete**: Completed final NextAuth cleanup to pass all verification tests
  - ✅ **Removed obsolete auth files**: Deleted `src/lib/auth.ts` and `src/lib/session-config.ts`
    (no longer needed after Clerk migration)
  - ✅ **Updated direct Clerk usage**: Converted `src/app/parties/page.tsx` from centralized auth utilities
    to direct Clerk auth with destructuring pattern
  - ✅ **Cleaned test utilities**: Removed NextAuth compatibility exports from `shared-clerk-test-helpers.tsx`
  - ✅ **Removed legacy references**: Cleaned NextAuth constants from `session-constants.ts` and environment
    variables from `advanced-session-mocks.ts`
  - ✅ **All verification tests pass**: `nextauth-cleanup-verification.test.ts` now passes completely (Issue #655 resolved)
  - ✅ **Code review addressed**: Implemented more concise Clerk authentication pattern suggested in PR review

#### Previous Branch: `feature/fix-session-context-jest-test` (MERGED - PR #707)

- **Session Context Test Resolution Complete**: Fixed failing test by removing obsolete session-context functionality
  - ✅ **Removed obsolete test file** (`src/lib/__tests__/session-context.test.tsx`): Test was importing
    non-existent module after NextAuth to Clerk migration
  - ✅ **Functionality replaced by Clerk**: SessionContextProvider and useSessionContext replaced by
    Clerk's built-in hooks (useAuth, useUser)
  - ✅ **Markdown linting fixes**: Resolved line length violations and trailing spaces in
    MIGRATION_STEPS.md and status_and_next_steps.md
  - ✅ **Quality checks passing**: All ESLint and markdownlint checks now pass
  - ✅ **Git workflow compliance**: Proper feature branch naming and commit structure per AGENTS.md

#### Previous Branch: `feature/fix-signin-page-jest-test` (MERGED)

- **SignInPage Test Migration Complete**: Fixed final failing test from NextAuth to Clerk patterns
  - ✅ **SignInPage.test.tsx** (4/4 passing): Complete migration from NextAuth patterns to Clerk
    test utilities
  - ✅ **Established Pattern Reuse**: Applied existing `auth-test-utils.tsx` and `testAuthPageBehavior`
    helper functions
  - ✅ **Code Reduction**: Simplified test from 293 lines to 13 lines while maintaining full coverage
  - ✅ **Authentication State Coverage**: Tests loading, authenticated, and unauthenticated states
  - ✅ **Architectural Consistency**: Follows same pattern as working `ClerkSignInPage.test.tsx`
  - ✅ **Jest Library Naming**: Feature branch named appropriately for test library per AGENTS.md guidelines

#### Previous Branch: `feature/fix-remaining-test-failures` (MERGED - PR #702)

- **Test Constants Infrastructure Fixed**: Resolved remaining test import issues and centralized constants
  - ✅ **Shared Test Constants** (`src/lib/test-utils/shared-test-constants.ts`): Created centralized
    constants file
  - ✅ **Parties Page Test** (13/13 passing): Fixed `SHARED_API_TEST_CONSTANTS` undefined error
  - ✅ **Import Standardization**: Updated all imports to use `@` notation for robustness
  - ✅ **Duplicate Removal**: Eliminated duplicate constants from clerk and API test helpers
  - ✅ **Consistent Testing Infrastructure**: All test files now use single source of truth for constants
  - ✅ **Follow-up Issues Created**: Issue #703 tracks remaining test format updates

#### Previous Branch: `feature/resolve-remaining-test-failures` (MERGED)

- **All Critical Test Failures Resolved**: Complete systematic resolution of remaining authentication
  and TypeScript issues
  - ✅ **ProfileSetupPage Test** (3/3 passing): Complete migration from NextAuth to Clerk patterns
  - ✅ **AppLayout Navigation Test** (passing): Fixed URL expectations to match actual behavior
  - ✅ **API Route Authentication Tests** (passing): Fixed Clerk session mocking structure
  - ✅ **TypeScript Build Errors** (0 errors): Resolved Next.js 15 typed routes compatibility
  - ✅ **All Previous Fixes Maintained**: All previously passing tests continue to work

#### Previous Sprint Completions

- **Systematic Test Resolution Complete**: All major authentication test patterns have been migrated
  and fixed
  - ✅ **ClerkSignUpPage Tests** (5/5 passing): Fixed mock structure and DOM warnings
  - ✅ **auth-production-redirect-issue-494** (7/7 passing): Production hostname validation
  - ✅ **auth-function-duplication-issue-499** (9/9 passing): Private IP range detection
  - ✅ **navigation-auth-issue-479** (5/5 passing): Migrated to Clerk useUser/useAuth hooks
  - ✅ **navigation-rsc-hydration-issue-586** (5/5 passing): Migrated to Clerk authentication mocking
  - ✅ **session-constants test** (13/13 passing): Added missing NEXTAUTH_COLLECTION_NAMES
  - ✅ **auth-issue-620-resolved** (11/11 passing): Migrated to Clerk auth utilities
  - ✅ **parties-page-auth-test** (3/3 passing): Fixed redirect function mocking pattern
  - ✅ **login-logout-flows test** (10/10 passing): Fixed breadcrumbs undefined pathname issue
  - ✅ **API authentication response format** (21/21 passing): Fixed encounters API route to use
    consistent error response format
  - ✅ **Jest module mapping resolution** (7/7 passing): Fixed circular dependencies by creating
    separate auth-test-utils

#### Infrastructure Improvements Completed

- ✅ Updated centralized auth utilities in `src/lib/auth.ts`
- ✅ Enhanced `isValidProductionHostname()` with environment-aware validation
- ✅ Improved `isLocalHostname()` for comprehensive private network detection
- ✅ Modified `validateNextAuthUrl()` with proper typing and error logging
- ✅ Resolved all ESLint violations (unused variables/parameters)
- ✅ Applied proper git workflow with feature branch
- ✅ Established standard redirect mocking pattern for page authentication tests
- ✅ Fixed Next.js navigation hook mocking in layout component tests

#### 🎯 All Critical Issues Resolved

- ✅ **Authentication Test Infrastructure**: All test helpers migrated to Clerk patterns
- ✅ **API Route Authentication**: All authentication mocking and session structures fixed
- ✅ **TypeScript Compatibility**: Next.js 15 typed routes fully supported
- ✅ **Build Pipeline**: Project builds successfully without errors
- ✅ **Quality Checks**: ESLint, markdown lint, and Codacy scans passing

### ✅ Final Test Resolution Complete

#### Latest Branch: `feature/fix-webhook-mongodb-integration-test` (MERGED - PR #719)

- **Webhook Integration Test Fix Complete**: Fixed failing webhook integration tests by implementing real MongoDB
  connections instead of Jest mocks for authentic database integration testing
  - ✅ **Real Database Testing**: Converted webhook tests from mocked behavior to actual MongoDB operations using MongoMemoryServer
  - ✅ **Jest Environment Fix**: Added `@jest-environment node` directive and proper database module unmocking pattern
  - ✅ **Database Unmocking Utility**: Created reusable `database-unmocking.ts` pattern for future integration tests
  - ✅ **Model Registration**: Fixed Mongoose model registration timing issues in Jest test environment
  - ✅ **Build Fix**: Resolved duplicate mongoose import causing webpack compilation failure
  - ✅ **Code Quality**: Removed unused imports and fixed ESLint violations, addressed all PR review comments
  - ✅ **Integration Testing**: All 8 webhook tests now pass with real Clerk webhook processing and MongoDB operations
  - ✅ **Pattern Documentation**: Established reusable pattern for database integration testing across the codebase

#### Previous Branch: `feature/jest-mock-initialization` (MERGED - PR #718)

- **UserServiceRegistration Test Fix Complete**: Fixed failing UserServiceRegistration test by removing Jest mocks and
  using real User model with in-memory MongoDB for authentic integration testing
  - ✅ **Mock Removal**: Removed all Jest mocks that were causing temporal dead zone and ReferenceError issues
  - ✅ **Real Model Integration**: Switched from mocked User model to actual User model with MongoMemoryServer
  - ✅ **Database Setup**: Implemented proper in-memory MongoDB setup with model registration and cleanup
  - ✅ **Import Resolution**: Fixed module import issues and Jest mock interference with real model usage
  - ✅ **Test Environment**: Added `@jest-environment node` directive for proper model loading
  - ✅ **Code Quality**: Addressed PR review comments including property name fixes and backup file removal
  - ✅ **Integration Testing**: Tests now perform authentic database operations instead of mocked behavior
  - ✅ **Jest library naming**: Feature branch named appropriately per AGENTS.md guidelines

#### Previous Branch: `feature/fix-testing-library-clerk-signup-test` (MERGED - PR #717)

- **SignUpPage Test Migration Complete**: Fixed failing SignUpPage test by migrating from legacy custom signup form
  tests to Clerk-compatible patterns
  - ✅ **Test Migration**: Replaced 315+ lines of custom form testing with 37 lines of Clerk-focused tests
  - ✅ **Pattern Consistency**: Used existing `testAuthPageBehavior` helper for consistent authentication testing
  - ✅ **Clerk Integration**: Tests now verify proper Clerk SignUp component configuration and redirectUrl
  - ✅ **Authentication States**: Covers loading, authenticated, and unauthenticated states
  - ✅ **Code Quality**: Addressed PR review comment about ES6 import standards (removed require() usage)
  - ✅ **Test Results**: All 5 SignUpPage tests now pass with proper Clerk authentication patterns
  - ✅ **ESLint compliance**: No ESLint errors, follows modern import patterns
  - ✅ **Testing library naming**: Feature branch named appropriately per AGENTS.md guidelines

#### Previous Branch: `feature/fix-jest-auth-import-tests` (MERGED - PR #712)

- **Jest Authentication Import Fix Complete**: Resolved remaining failing tests importing from removed auth module
  - ✅ **3 test files updated**: Fixed `src/lib/__tests__/auth-mongodb-integration.test.ts`,
    `src/app/parties/__tests__/page.test.tsx`, and `src/lib/__tests__/auth.test.ts`
  - ✅ **Import pattern fix**: Replaced all `../auth` imports with `@clerk/nextjs/server` and `@clerk/nextjs`
  - ✅ **Authentication test updates**: Updated tests to verify Clerk auth utilities instead of removed auth module
  - ✅ **Test coverage maintained**: All tests maintain functionality while adapting to Clerk migration patterns
  - ✅ **Code quality follow-up**: Created Issue #713 to track refactoring duplicate helper functions to shared utilities
  - ✅ **CI checks passing**: All quality checks pass, automated reviews addressed via follow-up issue
  - ✅ **Jest library naming**: Feature branch named appropriately per AGENTS.md guidelines

#### Previous Branch: `feature/fix-settings-account-deletion-clerk-test` (MERGED - PR #711)

- **Settings Component Test Migration Complete**: Completed migration of Settings account deletion test from NextAuth
  to Clerk
  - ✅ **Settings.accountDeletion.test.tsx migration**: Updated all 12 test cases to use Clerk authentication patterns
  - ✅ **Mock pattern update**: Migrated from `next-auth/react` to `@clerk/nextjs` with proper `useUser` and `useClerk`
    mocks
  - ✅ **Clerk signOut behavior**: Fixed test assertions to match Clerk's `signOut` method with `redirectUrl`
    parameter
  - ✅ **Technical debt cleanup**: Removed 5 obsolete NextAuth-specific test files (1,235 lines deleted)
  - ✅ **Jest mock implementation**: Addressed PR review feedback about `require()` calls being necessary for mock
    module assignment
  - ✅ **All tests passing**: 12/12 Settings account deletion tests now pass with proper Clerk authentication
    patterns
  - ✅ **Quality assurance**: No ESLint errors, all CI checks passing, PR successfully merged

#### Previous Branch: `feature/fix-auth-architecture-jest-test` (MERGED - PR #709)

- **Auth Architecture Test Fix Complete**: Resolved failing test due to missing auth module import
  - ✅ **Fixed import issue**: Updated `auth-architecture.test.tsx` to use `@clerk/nextjs/server` instead of
    removed `../lib/auth` module
  - ✅ **Simplified test approach**: Removed complex mocking, focused on actual component behavior testing
  - ✅ **Added comprehensive coverage**: Tests server component authentication with multiple scenarios
  - ✅ **TypeScript compatibility**: Fixed Route type annotation in parties page redirect
  - ✅ **All quality checks pass**: ESLint, TypeScript, markdownlint, and tests all passing
  - ✅ **Jest library naming**: Feature branch named appropriately per AGENTS.md guidelines

### ❓ Assessment Needed

#### Legacy Test Files

The following test files may still contain NextAuth patterns and need assessment:

**Core Auth Tests:**

- `src/__tests__/nextauth-cleanup-verification.test.ts`
- ✅ ~~`src/__tests__/auth-jwt-improvements-issue-620.test.ts`~~ - **PASSING**
- ✅ ~~`src/__tests__/verify-production-user.test.ts`~~ - **PASSING**
- ✅ ~~`src/__tests__/auth-function-duplication-issue-499.test.ts`~~ - **FIXED**
- ✅ ~~`src/__tests__/auth-issue-620-resolved.test.ts`~~ - **FIXED**
- ✅ ~~`src/__tests__/auth-production-redirect-issue-494.test.ts`~~ - **FIXED**
- ✅ ~~`src/__tests__/auth-architecture.test.tsx`~~ - **FIXED** (PR #709)

**Navigation & Component Tests:**

- ✅ ~~`src/__tests__/navigation-auth-issue-479.test.tsx`~~ - **FIXED**
- ✅ ~~`src/__tests__/navigation-rsc-hydration-issue-586.test.tsx`~~ - **FIXED**

**Session & Context Tests:**

- ✅ ~~`src/lib/constants/__tests__/session-constants.test.ts`~~ - **FIXED**
- ✅ ~~`src/lib/__tests__/session-context.test.tsx`~~ - **REMOVED** (obsolete after Clerk migration)

## Migration Patterns

### Server-Side Authentication

```typescript
// OLD: NextAuth
import { getServerSession } from 'next-auth';
const session = await getServerSession(authOptions);

// NEW: Clerk Centralized
import { getAuthenticatedUserId } from '@/lib/auth';
const userId = await getAuthenticatedUserId('/current-page');
```

### Client-Side Authentication

```typescript
// OLD: NextAuth
import { useSession } from 'next-auth/react';
const { data: session } = useSession();

// NEW: Clerk
import { useUser } from '@clerk/nextjs';
const { user } = useUser();
```

### Test Authentication Mocking

```typescript
// OLD: NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// NEW: Clerk with Centralized Helpers
import { setupAuthenticatedState } from '@/lib/test-utils/shared-clerk-test-helpers';
setupAuthenticatedState(mockAuth, 'test-user-123');
```

## Next Steps

### Phase 1: Complete Current Feature Branch ✅ COMPLETED

1. ✅ Fix ClerkSignUpPage test failures and DOM warnings
2. ✅ Address code quality issues (ESLint, markdownlint)
3. ✅ Resolve major authentication test infrastructure issues (breadcrumbs, API routes, Jest module mapping)
4. ✅ **Final test failures resolved**: ProfileSetupPage, AppLayout, API route authentication, TypeScript errors
5. ✅ **Build pipeline verified**: Project builds successfully with all quality checks passing
6. 🔄 Create PR and await merge approval

### Phase 2: Legacy Test Assessment

1. **Audit remaining test files** for NextAuth patterns
2. **Categorize files** by migration complexity:
   - Simple: Direct pattern replacement
   - Complex: Requires refactoring
   - Archive: Legacy tests that can be removed
3. **Create migration plan** for each category

### Phase 3: Production Code Migration

1. **Server components** using NextAuth patterns
2. **Client components** using NextAuth hooks
3. **API routes** with NextAuth authentication
4. **Middleware** authentication checks

### Phase 4: Cleanup

1. **Remove NextAuth dependencies** from package.json
2. **Remove legacy configuration** files
3. **Update documentation** and README
4. **Final verification** tests

## Standards & Guidelines

### Test Quality Requirements

- Use centralized test helpers from `shared-clerk-test-helpers.tsx`
- Follow consistent authentication state mocking patterns
- Include both positive and negative authentication test cases
- All tests must pass ESLint and markdownlint checks

### Code Quality Workflow

1. Run `npm run lint:fix` after every file edit
2. Run `npm run lint:markdown:fix` for documentation changes
3. Commit only after all quality checks pass
4. Use descriptive commit messages following convention

### Authentication Patterns

- Use centralized auth utilities from `src/lib/auth.ts`
- Follow consistent sign-in URL patterns
- Implement proper error handling and redirects
- Maintain provider-agnostic approach for future flexibility

## Issues & Blockers

### Resolved

- ✅ **Export/Import Issues**: Fixed `SHARED_API_TEST_CONSTANTS` import problems in test files
- ✅ **Code Quality**: Resolved ESLint unused variable warnings
- ✅ **Mock Structure**: Improved incomplete auth state mock robustness

### Current

- None identified

---

---

**Last Updated: 2025-09-03**  
**Status:** NextAuth to Clerk Migration COMPLETE - All verification tests passing.  
**Summary:** NextAuth cleanup verification completed. All obsolete NextAuth files removed and direct
Clerk authentication implemented.  
**Latest updates:**  
- PR #719 (MERGED): Fixed webhook integration tests by implementing real MongoDB connections;
  introduced reusable database integration testing pattern (`database-unmocking.ts` & documented
  in `docs/webhook-integration-testing.md`).  
- PR #718 (MERGED): Fixed `UserServiceRegistration.test.ts` by removing Jest mocks and using real
  `User` model with in-memory MongoDB.  
- PR #717 (MERGED): Migrated `SignUpPage.test.tsx` from legacy custom form tests to Clerk-focused
  pattern.  
All authentication test migrations and database integration testing patterns are now complete.
