import SignInPage from '../signin/page';
import { mockClerk, mockNavigation, testAuthPageBehavior } from './auth-test-utils';

mockClerk();
mockNavigation();

describe('SignInPage Component', () => {
  testAuthPageBehavior({
    component: SignInPage,
    expectedTestId: 'clerk-signin-component',
    signInText: 'Sign in to your account',
  });
});
