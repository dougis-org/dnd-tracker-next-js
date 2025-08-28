const NextAuth = jest.fn(() => ({
  handlers: { GET: jest.fn(), POST: jest.fn() },
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

export default NextAuth;