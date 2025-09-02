import { render, screen } from '@testing-library/react';
import AuthenticatedServerPage from '@/components/layout/AuthenticatedServerPage';

// Mock next/navigation for redirect testing
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock Clerk server auth for server component testing
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

describe('Authentication Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthenticatedServerPage', () => {
    it('renders children when session exists', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: '123' });

      const Component = await AuthenticatedServerPage({
        children: <div>Server Content</div>,
      });

      render(Component);
      expect(screen.getByText('Server Content')).toBeInTheDocument();
    });

    it('redirects when no session exists', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      try {
        await AuthenticatedServerPage({
          children: <div>Content</div>,
        });
      } catch {
        // redirect() throws in tests, which is expected behavior
      }

      expect(redirect).toHaveBeenCalledWith('/signin');
    });

    it('redirects when session has no userId', async () => {
      (auth as jest.Mock).mockResolvedValue({});

      try {
        await AuthenticatedServerPage({
          children: <div>Content</div>,
        });
      } catch {
        // redirect() throws in tests, which is expected behavior
      }

      expect(redirect).toHaveBeenCalledWith('/signin');
    });

    it('uses correct fallback URL', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      try {
        await AuthenticatedServerPage({
          children: <div>Content</div>,
          fallbackUrl: '/custom-signin',
        });
      } catch {
        // redirect() throws in tests, which is expected behavior
      }

      expect(redirect).toHaveBeenCalledWith('/custom-signin');
    });
  });
});