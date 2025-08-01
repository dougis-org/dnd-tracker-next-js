
import {
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import {
  testAuthWithEnvAndSpy,
  getAuthConfigAsync,
  setupEnvironment,
  testEnvWithConditionalImport,
} from './auth-test-utils';

const mockNextAuth = jest.fn();

jest.mock('next-auth', () => mockNextAuth);

describe('Auth Helper Functions Coverage', () => {
  it('should test isLocalHostname function with all local addresses', async () => {
    const localUrls = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.100:3000',
      'http://10.0.0.1:3000',
      'http://172.16.0.1:3000'
    ];

    localUrls.forEach(url => {
      testAuthWithEnvAndSpy({ NEXTAUTH_URL: url, NODE_ENV: 'production' });
    });
  });

  it('should test isValidProductionHostname in different environments', async () => {
    setupEnvironment({ NODE_ENV: 'development', NEXTAUTH_URL: 'http://localhost:3000' });
    const authModule = await getAuthConfigAsync(mockNextAuth);
    expect(authModule).toBeDefined();

    testAuthWithEnvAndSpy({ NODE_ENV: 'production', NEXTAUTH_URL: 'http://0.0.0.0:3000' });
  });

  it('should test validateNextAuthUrl with various URL formats', async () => {
    const testCases = [
      { env: { NEXTAUTH_URL: undefined }, shouldWarn: false },
      { env: { NEXTAUTH_URL: 'https://dnd-tracker-next-js.fly.dev', NODE_ENV: 'production' }, shouldWarn: false },
      { env: { NEXTAUTH_URL: 'invalid-url-format' }, shouldWarn: true },
      { env: { NEXTAUTH_URL: 'http://[invalid' }, shouldWarn: true }
    ];

    testCases.forEach(({ env, shouldWarn }) => {
      testEnvWithConditionalImport(env, shouldWarn);
    });
  });
});
