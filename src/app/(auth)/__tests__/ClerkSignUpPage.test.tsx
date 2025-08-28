import ClerkSignUpPage from '../signup/page';
import { mockClerk, mockNavigation, mockUseAuth, testAuthPageBehavior } from './auth-test-utils';
import { render } from '@testing-library/react';
import { authStates } from './test-helpers';

mockClerk();
mockNavigation();

describe('Clerk SignUp Page', () => {
  testAuthPageBehavior({
    component: ClerkSignUpPage,
    expectedTestId: 'clerk-signup-component',
    signUpText: 'Create your account',
  });

  it('should configure Clerk SignUp component with correct appearance', () => {
    const { SignUp } = require('@clerk/nextjs');
    mockUseAuth(authStates.notSignedIn);

    render(<ClerkSignUpPage />);

    // Verify that SignUp component was called with appearance configuration
    expect(SignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance: expect.objectContaining({
          elements: expect.any(Object),
        }),
        redirectUrl: '/profile-setup',
      }),
      expect.any(Object)
    );
  });

  it('should set redirectUrl to /profile-setup', () => {
    const { SignUp } = require('@clerk/nextjs');
    mockUseAuth(authStates.notSignedIn);

    render(<ClerkSignUpPage />);

    expect(SignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: '/profile-setup',
      }),
      expect.any(Object)
    );
  });
});
