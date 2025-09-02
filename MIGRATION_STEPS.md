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
  - ✅ **Breadcrumbs pathname fix** (10/10 passing): Resolved `usePathname()` returning `undefined` causing breadcrumbs to crash
  - ✅ Fixed Next.js navigation hook mocking with proper `usePathname` return values
  - ✅ Updated URL expectations from `/signin` to `/sign-in` for consistency

- **API Route Authentication Standardization**
  - ✅ **Encounters API route** (`src/app/api/encounters/[id]/route.ts`) (21/21 passing): Fixed authentication response format
  - ✅ Replaced manual error responses with consistent `createErrorResponse()` helper
  - ✅ Standardized all authentication checks to return proper error structure

- **Jest Module Mapping Resolution**
  - ✅ **Created dedicated auth-test-utils** (`src/lib/test-utils/auth-test-utils.ts`): Resolved circular dependencies
  - ✅ **Combat API wrapper test** (7/7 passing): Fixed import issues causing `setupUnauthenticatedState is not a function`
  - ✅ **User Clerk integration test** (38/38 passing): Updated to use `AUTH_TEST_CONSTANTS`
  - ✅ Separated authentication utilities from shared Clerk helpers to avoid Jest moduleNameMapping conflicts

### 🔄 Next Focus Areas

#### Current Branch: `feature/fix-clerk-signup-tests`
- **Systematic Test Resolution Complete**: All major authentication test patterns have been migrated and fixed
  - ✅ **ClerkSignUpPage Tests** (5/5 passing): Fixed mock structure and DOM warnings
  - ✅ **auth-production-redirect-issue-494** (7/7 passing): Production hostname validation
  - ✅ **auth-function-duplication-issue-499** (9/9 passing): Private IP range detection  
  - ✅ **navigation-auth-issue-479** (5/5 passing): Migrated to Clerk useUser/useAuth hooks
  - ✅ **navigation-rsc-hydration-issue-586** (5/5 passing): Migrated to Clerk authentication mocking
  - ✅ **session-constants test** (13/13 passing): Added missing NEXTAUTH_COLLECTION_NAMES
  - ✅ **auth-issue-620-resolved** (11/11 passing): Migrated to Clerk auth utilities
  - ✅ **parties-page-auth-test** (3/3 passing): Fixed redirect function mocking pattern
  - ✅ **login-logout-flows test** (10/10 passing): Fixed breadcrumbs undefined pathname issue
  - ✅ **API authentication response format** (21/21 passing): Fixed encounters API route to use consistent error response format
  - ✅ **Jest module mapping resolution** (7/7 passing): Fixed circular dependencies by creating separate auth-test-utils
  
#### Infrastructure Improvements Completed
  - ✅ Updated centralized auth utilities in `src/lib/auth.ts`
  - ✅ Enhanced `isValidProductionHostname()` with environment-aware validation
  - ✅ Improved `isLocalHostname()` for comprehensive private network detection
  - ✅ Modified `validateNextAuthUrl()` with proper typing and error logging
  - ✅ Resolved all ESLint violations (unused variables/parameters)
  - ✅ Applied proper git workflow with feature branch
  - ✅ Established standard redirect mocking pattern for page authentication tests
  - ✅ Fixed Next.js navigation hook mocking in layout component tests

#### 🎯 Ready for Assessment: Remaining Test Categories
  - 🔍 **Webhook Integration Tests**: May have Svix mocking or signature validation issues
  - 🔍 **API Route Tests**: Additional routes that may need authentication format standardization  
  - 🔍 **Component Integration Tests**: Complex component interactions with authentication
  - 🔍 **End-to-End Authentication Flows**: Full user journey testing

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

**Navigation & Component Tests:**
- ✅ ~~`src/__tests__/navigation-auth-issue-479.test.tsx`~~ - **FIXED**
- ✅ ~~`src/__tests__/navigation-rsc-hydration-issue-586.test.tsx`~~ - **FIXED**

**Session & Context Tests:**
- ✅ ~~`src/lib/constants/__tests__/session-constants.test.ts`~~ - **FIXED**
- `src/lib/__tests__/session-context.test.tsx` - **Missing module, needs investigation**

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
3. ✅ Resolve major authentication test infrastructure issues (breadcrumbs, API routes, Jest module mapping)
4. 🔄 **Ready for final assessment**: Identify any remaining test categories that need attention
5. 🔄 Create PR and await merge approval

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

*Last Updated: 2025-09-02*
*Status: Phase 1 Near Completion - All major authentication test infrastructure issues resolved (breadcrumbs, API routes, Jest module mapping), ready for final test assessment and PR creation*
