import ClerkSignInPage from '../signin/page';
import { mockClerk, mockNavigation, testAuthPageBehavior } from './auth-test-utils';

mockClerk();
mockNavigation();

describe('Clerk SignIn Page', () => {
  testAuthPageBehavior({
    component: ClerkSignInPage,
    expectedTestId: 'clerk-signin-component',
    signInText: 'Sign in to your account',
  });
});
