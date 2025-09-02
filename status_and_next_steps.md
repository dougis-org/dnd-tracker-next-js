**Current Status:**

The rebase onto `main` was successful, and I've made several attempts to fix the Jest test failures.

**Resolved Issues (partially or fully):**
* `ModuleNotFoundError: Cannot find module '@/lib/auth'`: Resolved for `src/app/api/encounters/[id]/settings/__tests__/route.test.ts` and `src/__tests__/auth-real-world-test-issue-620.test.ts` by explicitly mocking `@/lib/auth` in those files. The global mock in `jest.setup.js` was removed.
* `TypeError: _svix.Webhook.mockImplementation is not a function`: Resolved by refining the `svix` mock in `src/app/api/webhooks/clerk/__tests__/webhook-test-utils.ts`.
* `SyntaxError: Unexpected token 'export'` for `@clerk/backend/dist/runtime/browser/crypto.mjs`: This error is gone from *some* files, indicating that the `transformIgnorePatterns` update in `jest.config.js` and clearing the Jest cache had a positive effect. However, it still persists in many other files.

**Persistent Issues:**

1. **`SyntaxError: Unexpected token 'export'` for `@clerk/backend/dist/runtime/browser/crypto.mjs`**: Still present in many files, despite `transformIgnorePatterns` and cache clearing. This is the most critical blocking issue.
    * Affected files: `src/app/api/webhooks/clerk/__tests__/registration-integration.test.ts`, `src/app/api/encounters/[id]/combat/__tests__/api-wrapper.test.ts`, `src/app/api/encounters/[id]/combat/__tests__/initiative-rolling-api.test.ts`, `src/app/api/monitoring/deployment/__tests__/route.test.ts`, `src/app/api/parties/[id]/__tests__/route.test.ts`, `src/app/api/parties/__tests__/route.test.ts`, `src/app/api/encounters/import/__tests__/route.security.basic.test.ts`, `src/app/api/users/[id]/profile/__tests__/route.delete.test.ts`, `src/app/api/characters/__tests__/route.test.ts`, `src/app/api/characters/[id]/__tests__/route.test.ts`, `src/app/parties/__tests__/page.auth.test.tsx`, `src/app/api/encounters/import/__tests__/route.test.ts`, `src/app/api/encounters/[id]/export/__tests__/route.test.ts`, `src/app/api/encounters/[id]/__tests__/route.test.ts`.

2. **`ReferenceError: NextRequest is not defined` and `ReferenceError: Webhook is not defined` in `src/app/api/webhooks/clerk/__tests__/route.test.ts`**: These errors persist, indicating a problem with the global mocks for `next/server` and `svix` in `webhook-test-utils.ts` or how they are being used.

3. **`TypeError: Cannot read properties of undefined (reading 'createClerkUser')` and similar for `User` model methods**: Still present in `src/app/api/webhooks/clerk/__tests__/registration-integration.test.ts`, `src/app/api/webhooks/clerk/__tests__/webhook-integration.test.ts`, `src/lib/models/__tests__/User.clerk.test.ts`, and `src/lib/models/__tests__/User.registration.test.ts`. The `User` model mock is likely incomplete or incorrectly applied.

4. **`Cannot find module 'next-auth/react'` and `'next-auth/jwt'`**: Many tests are still failing due to missing NextAuth.js modules. These tests need to be updated to use Clerk's authentication or be removed.
    * Affected files: `src/components/layout/__tests__/AppLayout.test.tsx`, `src/components/party/__tests__/PartyListView.test.tsx`, `src/components/layout/__tests__/MobileMenu.test.tsx`, `src/components/layout/__tests__/Sidebar.test.tsx`, `src/components/settings/hooks/__tests__/useSettingsForm.test.ts`, `src/components/layout/__tests__/AuthenticatedPage.test.tsx`, `src/components/layout/__tests__/UserMenu.test.tsx`, `src/components/settings/__tests__/Settings.accountDeletion.test.tsx`, `src/components/settings/__tests__/Settings.test.tsx`, `src/hooks/__tests__/useActiveCombatSessions.test.ts`, `src/app/characters/hooks/__tests__/useCharacterPageActions.test.ts`, `src/__tests__/middleware.test.ts`, `src/lib/__tests__/auth.test.ts`, `src/lib/__tests__/middleware.test.ts`, `src/app/characters/[id]/edit/page.test.tsx`, `src/lib/__tests__/auth.remember-me.test.ts`, `src/__tests__/credentials-jwt-login-issue-572.test.ts`, `src/app/(auth)/__tests__/ProfileSetupPage.test.tsx`, `src/lib/__tests__/session-context.test.tsx`, `src/app/characters/__tests__/page.test.tsx`, `src/app/combat/__tests__/functional-combat-page-issue-606.test.ts`, `src/app/(auth)/__tests__/SignInPage.test.ts`, `src/app/characters/[id]/page.test.tsx`, `src/__tests__/navigation-auth-issue-479.test.tsx`, `src/__tests__/middleware.parties.test.ts`, `src/__tests__/auth-middleware-integration.test.ts`, `src/app/dashboard/__tests__/page.test.tsx`.

5. **`TypeError: (0 , _sharedapitesthelpers.setupNextAuthMocks) is not a function`**: Still present in `src/app/api/characters/[id]/__tests__/route.test.ts` and `src/lib/test-utils/__tests__/shared-api-test-helpers.test.ts`. These NextAuth.js specific test helpers need to be replaced or removed.

6. **`expect(received).toBeUndefined()` and `expect(received).toMatch(expected)` failures in `auth-production-redirect-issue-494.test.ts` and `route-handler-types.test.ts`**: These tests need to be updated to reflect the current Clerk-based authentication and Next.js 15 API route parameter handling.

7. **`fetch is not defined`**: Still present in `src/components/character/__tests__/CharacterAutosave.test.tsx` and `src/components/character/CharacterStatsManager.test.tsx`.

8. **`_userregistrationmocks` before initialization**: Still present in `src/app/api/webhooks/clerk/__tests__/registration-integration.test.ts` and `src/lib/services/__tests__/UserServiceRegistration.test.ts`.

9. **`@auth/mongodb-adapter` not found**: Still present in `src/lib/__tests__/auth.test.ts`, `src/lib/__tests__/auth.remember-me.test.ts`, `src/lib/__tests__/auth.authorize-callback.test.ts`, `src/lib/__tests__/mongodb-adapter-config.test.ts`, `src/lib/__tests__/auth.mongodb-setup.test.ts`.

10. **Clerk Build Configuration Test Failure**: Still failing.

11. **`getSessionCookieName` and `NEXTAUTH_COLLECTION_NAMES` failures**: Still failing.

**Next Steps:**

1. **Prioritize `SyntaxError: Unexpected token 'export'`**: This is the most critical blocking issue. I will investigate why `transformIgnorePatterns` is not working for all Clerk modules. This might involve a more aggressive pattern or a different approach to handling ES modules in Jest.
2. **Re-evaluate `NextRequest` and `Webhook` mocks**: Since the previous attempt didn't fully resolve it, I need to re-examine the mocking strategy for these.
3. **Address `User` model mocks**: Ensure the `User` model mocks are complete and correctly applied.
4. **Systematically address NextAuth.js related test failures**: For each file, determine if the test is still relevant, and if so, update it to use Clerk or mock Clerk appropriately. If not relevant, remove the test.
5. **Fix `fetch is not defined`**: Ensure `fetch` is properly polyfilled for JSDOM environment.
6. **Update `auth-production-redirect-issue-494.test.ts` and `route-handler-types.test.ts`**: Adjust expectations to match current implementation.
7. **Update Clerk Build Configuration Test**: Adjust expectation.
8. **Update Session Constants Tests**: Adjust expectations.
