module.exports = {
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn(),
  })),
};
