# Authentication Migration: NextAuth to Clerk

## Overview

This document tracks the systematic migration from NextAuth to Clerk authentication patterns across the D&D Tracker codebase.

## Migration Progress

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
  - ✅ `page.auth.test.tsx` - Authentication-specific tests
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

### 🔄 In Progress

#### Current Branch: `feature/fix-clerk-signup-tests`
- **ClerkSignUpPage Test Migration**: Authentication test standardization
  - ✅ Fixed ClerkSignUpPage.test.tsx test failures (5/5 tests passing)
  - ✅ Resolved React DOM prop warnings in auth component mocks
  - ✅ Updated Jest mock structure to properly track Clerk component calls
  - ✅ Removed ESLint violations (unused variables/parameters)
  - ✅ Applied proper git workflow with feature branch
  - ✅ Migrated from NextAuth patterns to centralized Clerk utilities
  - 🔄 Continuing systematic test failure resolution

### ❓ Assessment Needed

#### Legacy Test Files
The following test files may still contain NextAuth patterns and need assessment:

**Core Auth Tests:**
- `src/__tests__/nextauth-cleanup-verification.test.ts`
- `src/__tests__/auth-jwt-improvements-issue-620.test.ts`
- `src/__tests__/verify-production-user.test.ts`
- `src/__tests__/auth-function-duplication-issue-499.test.ts`
- `src/__tests__/auth-issue-620-resolved.test.ts`
- `src/__tests__/auth-production-redirect-issue-494.test.ts`

**Navigation & Component Tests:**
- `src/__tests__/navigation-auth-issue-479.test.tsx`
- `src/__tests__/navigation-rsc-hydration-issue-586.test.tsx`

**Session & Context Tests:**
- `src/lib/constants/__tests__/session-constants.test.ts`
- `src/lib/__tests__/session-context.test.tsx`

## Migration Patterns

### Server-Side Authentication
```typescript
// OLD: NextAuth
import { getServerSession } from 'next-auth'
const session = await getServerSession(authOptions)

// NEW: Clerk Centralized
import { getAuthenticatedUserId } from '@/lib/auth'
const userId = await getAuthenticatedUserId('/current-page')
```

### Client-Side Authentication
```typescript
// OLD: NextAuth
import { useSession } from 'next-auth/react'
const { data: session } = useSession()

// NEW: Clerk
import { useUser } from '@clerk/nextjs'
const { user } = useUser()
```

### Test Authentication Mocking
```typescript
// OLD: NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn()
}))

// NEW: Clerk with Centralized Helpers
import { setupAuthenticatedState } from '@/lib/test-utils/shared-clerk-test-helpers'
setupAuthenticatedState(mockAuth, 'test-user-123')
```

## Next Steps

### Phase 1: Complete Current Feature Branch
1. ✅ Fix ClerkSignUpPage test failures and DOM warnings
2. ✅ Address code quality issues (ESLint, markdownlint) 
3. 🔄 Continue resolving remaining authentication test failures
4. 🔄 Create PR and await merge approval

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

*Last Updated: 2025-09-01*
*Status: Phase 1 In Progress - ClerkSignUpPage tests fixed, continuing authentication test resolution*
