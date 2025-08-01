let capturedConfig = null;

const mockNextAuth = jest.fn(config => {
  capturedConfig = config;
  return {
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  };
});

mockNextAuth.getCapturedConfig = function() { return capturedConfig };

module.exports = mockNextAuth;

// Export a default object to be destructured
module.exports.default = {
  handlers: { GET: jest.fn(), POST: jest.fn() },
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
};