import { render, screen } from '@testing-library/react';
import SignUpSSOCallbackPage from '../page';

// Simple integration test to verify the page renders correctly
describe('SSO Callback Page (Sign Up)', () => {
  it('should render with sign-up specific loading message', () => {
    render(<SignUpSSOCallbackPage />);
    expect(screen.getByText('Completing Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we finish setting up your account...')).toBeInTheDocument();
  });

  it('should have loading spinner', () => {
    render(<SignUpSSOCallbackPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});