import ClerkSignUpPage from '../signup/page';
import { mockClerk, mockNavigation, mockUseAuth } from './auth-test-utils';
import { render, screen } from '@testing-library/react';
import { authStates } from './test-helpers';

mockClerk();
mockNavigation();

describe('Clerk SignUp Page', () => {
  it('should render without crashing', () => {
    mockUseAuth(authStates.notSignedIn);
    render(<ClerkSignUpPage />);
  });

  it('should render the sign-up form when not signed in', () => {
    mockUseAuth(authStates.notSignedIn);
    render(<ClerkSignUpPage />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });
});