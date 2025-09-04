import { getSafeRedirectUrl } from '../sso-redirect-handler';

// Mock console.warn to avoid test output noise
const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

beforeEach(() => {
  consoleSpy.mockClear();
});

afterAll(() => {
  consoleSpy.mockRestore();
});

describe('getSafeRedirectUrl', () => {
  const defaultRedirect = '/default';
  const originalLocation = window.location;

  beforeAll(() => {
    // Mock window.location.origin with minimal location object
    Object.defineProperty(global, 'window', {
      value: {
        location: { origin: 'https://example.com' },
      },
      writable: true,
    });
  });

  afterAll(() => {
    // Restore original location
    window.location = originalLocation;
  });

  it('should return default redirect when no redirectUrl provided', () => {
    const result = getSafeRedirectUrl({
      redirectUrl: null,
      defaultRedirect,
    });

    expect(result).toBe(defaultRedirect);
  });

  it('should return default redirect when redirectUrl is undefined', () => {
    const result = getSafeRedirectUrl({
      redirectUrl: undefined,
      defaultRedirect,
    });

    expect(result).toBe(defaultRedirect);
  });

  it('should return redirectUrl when it is same-origin', () => {
    const redirectUrl = 'https://example.com/dashboard';
    const result = getSafeRedirectUrl({
      redirectUrl,
      defaultRedirect,
    });

    expect(result).toBe(redirectUrl);
  });

  it('should return default redirect when redirectUrl is different origin', () => {
    const redirectUrl = 'https://malicious-site.com/steal-data';
    const result = getSafeRedirectUrl({
      redirectUrl,
      defaultRedirect,
    });

    expect(result).toBe(defaultRedirect);
    expect(consoleSpy).not.toHaveBeenCalled(); // Cross-origin doesn't log warning, just falls through
  });

  it('should return default redirect when redirectUrl is malformed', () => {
    const redirectUrl = 'not-a-valid-url';
    const result = getSafeRedirectUrl({
      redirectUrl,
      defaultRedirect,
    });

    expect(result).toBe(defaultRedirect);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Invalid redirect URL:',
      redirectUrl,
      expect.any(TypeError)
    );
  });
});