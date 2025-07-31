
import { testCallback } from './auth-test-utils';

const mockNextAuth = jest.fn();
jest.mock('next-auth', () => mockNextAuth);

describe('Redirect Callback Coverage', () => {
  it('should handle various redirect scenarios', async () => {
    const testCases = [
      { params: { url: '/dashboard', baseUrl: 'https://example.com' }, expected: 'https://example.com/dashboard' },
      { params: { url: 'https://example.com/dashboard', baseUrl: 'https://example.com' }, expected: 'https://example.com/dashboard' },
      { params: { url: 'https://dnd-tracker.fly.dev/profile', baseUrl: 'https://example.com' }, expected: 'https://dnd-tracker.fly.dev/profile' },
      { params: { url: 'https://untrusted.com/malicious', baseUrl: 'https://example.com' }, expected: 'https://example.com' },
    ];

    for (const { params, expected } of testCases) {
      const result = await testCallback(mockNextAuth, 'redirect', params);
      expect(result).toBe(expected);
    }
  });
});
