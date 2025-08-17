/**
 * Shared test setup and mocks for UserService tests
 */

// Create the complete mock functions for User model
const findMock = jest.fn();
const findByIdMock = jest.fn();
const findOneMock = jest.fn();
const createMock = jest.fn();
const findByIdAndUpdateMock = jest.fn();
const findByEmailMock = jest.fn();
const findByUsernameMock = jest.fn();
const findByResetTokenMock = jest.fn();
const findByVerificationTokenMock = jest.fn();
const countDocumentsMock = jest.fn();
const aggregateMock = jest.fn();
const findByIdAndDeleteMock = jest.fn();
const deleteManyMock = jest.fn().mockResolvedValue({ deletedCount: 0 });

// Create a mock constructor
const UserMock = jest.fn().mockImplementation(data => {
  return {
    ...data,
    generateEmailVerificationToken: jest.fn().mockReturnValue('mock-token'),
    save: jest.fn().mockResolvedValue(true),
    toPublicJSON: jest.fn().mockReturnValue({
      id: data._id || '507f1f77bcf86cd799439011',
      email: data.email || 'test@example.com',
      username: data.username || 'testuser',
    }),
    comparePassword: jest.fn().mockResolvedValue(true),
    _id: { toString: () => data._id || '507f1f77bcf86cd799439011' },
  };
});

// Setup for findMock to work with chainable syntax
findMock.mockReturnValue({
  sort: jest.fn().mockReturnValue({
    skip: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
  }),
});

// Assign static methods to the constructor
(UserMock as any).findByEmail = findByEmailMock;
(UserMock as any).findByUsername = findByUsernameMock;
(UserMock as any).findById = findByIdMock;
(UserMock as any).findOne = findOneMock;
(UserMock as any).create = createMock;
(UserMock as any).findByIdAndUpdate = findByIdAndUpdateMock;
(UserMock as any).findByResetToken = findByResetTokenMock;
(UserMock as any).findByVerificationToken = findByVerificationTokenMock;
(UserMock as any).find = findMock;
(UserMock as any).countDocuments = countDocumentsMock;
(UserMock as any).aggregate = aggregateMock;
(UserMock as any).findByIdAndDelete = findByIdAndDeleteMock;
(UserMock as any).deleteMany = deleteManyMock;

// Mock the User model
jest.mock('../../models/User', () => ({
  default: UserMock,
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Export mocked user for tests
export const mockUser = UserMock;

// Export individual mock functions for direct access
export {
  findByIdMock,
  findByEmailMock,
  findByResetTokenMock,
  findByVerificationTokenMock,
  findMock,
  findOneMock,
  createMock,
  findByIdAndUpdateMock,
  findByUsernameMock,
  countDocumentsMock,
  aggregateMock,
  findByIdAndDeleteMock,
  deleteManyMock,
};

// Mock user data
export const mockUserData = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  passwordHash: '$2b$12$hashedPassword',
  role: 'user' as const,
  subscriptionTier: 'free' as const,
  preferences: {
    theme: 'system' as const,
    emailNotifications: true,
    browserNotifications: false,
    timezone: 'UTC',
    language: 'en',
    diceRollAnimations: true,
    autoSaveEncounters: true,
  },
  isEmailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  comparePassword: jest.fn(),
  generatePasswordResetToken: jest.fn(),
  generateEmailVerificationToken: jest.fn(),
  updateLastLogin: jest.fn(),
  save: jest.fn(),
  toPublicJSON: jest.fn(),
};
