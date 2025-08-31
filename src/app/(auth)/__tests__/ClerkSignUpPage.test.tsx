import ClerkSignUpPage from '../signup/page';
import { mockClerk, mockNavigation, mockUseAuth } from './auth-test-utils';
import { render, screen } from '@testing-library/react';
import { authStates } from './test-helpers';

mockClerk();
mockNavigation();

describe('Clerk SignUp Page', () => {
  it('should render the sign-up form and be configured correctly when not signed in', () => {
    const { SignUp } = require('@clerk/nextjs');
    mockUseAuth(authStates.notSignedIn);

    render(<ClerkSignUpPage />);

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(SignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: '/profile-setup',
      }),
      expect.any(Object)
    );
  });
});