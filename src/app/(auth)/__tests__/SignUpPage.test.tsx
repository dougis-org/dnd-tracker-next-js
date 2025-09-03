import SignUpPage from '../signup/page';
import { mockNavigation, testAuthPageBehavior, mockUseAuth } from './auth-test-utils';
import { render } from '@testing-library/react';
import { authStates } from './test-helpers';

jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  SignUp: jest.fn(() => <div data-testid="clerk-signup-component">Clerk SignUp Component</div>),
}));

mockNavigation();

describe('SignUpPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  testAuthPageBehavior({
    component: SignUpPage,
    expectedTestId: 'clerk-signup-component',
    signUpText: 'Create your account',
  });

  it('should configure SignUp component with correct redirectUrl', () => {
    mockUseAuth(authStates.notSignedIn);
    const { SignUp } = require('@clerk/nextjs');

    render(<SignUpPage />);

    expect(SignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: '/profile-setup',
      }),
      expect.any(Object)
    );
  });
});
