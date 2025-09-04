import { render, screen } from '@testing-library/react';
import SignInSSOCallbackPage from '../page';

// Simple integration test to verify the page renders correctly
describe('SSO Callback Page (Sign In)', () => {
  it('should render with sign-in specific loading message', () => {
    render(<SignInSSOCallbackPage />);
    expect(screen.getByText('Signing You In')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we complete your sign in...')).toBeInTheDocument();
  });

  it('should have loading spinner', () => {
    render(<SignInSSOCallbackPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});