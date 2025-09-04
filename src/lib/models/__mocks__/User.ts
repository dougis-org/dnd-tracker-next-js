import { jest } from '@jest/globals';

// Manual Jest mock for the User model providing only the static methods
// required by the Clerk webhook route tests. Additional methods can be
// added here as other tests need them.

export const createClerkUser = jest.fn();
export const updateFromClerkData = jest.fn();
export const findByClerkId = jest.fn();

const mockedUser = {
  createClerkUser,
  updateFromClerkData,
  findByClerkId,
};

export default mockedUser;
