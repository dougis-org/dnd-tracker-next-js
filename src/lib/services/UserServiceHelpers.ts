import { connectToDatabase } from '../db';
import { UserAlreadyExistsError } from './UserServiceErrors';
import User from '../models/User';
import type { PublicUser } from '../validations/user';

/**
 * Ensure User model is properly initialized
 * Fix for Issue #620: Handle model initialization issues
 */
async function ensureUserModel() {
  await connectToDatabase();

  if (!User) {
    throw new Error('User model is not properly initialized. Database connection may have failed.');
  }

  if (typeof User.findByEmail !== 'function') {
    throw new Error('User model methods are not available. Model registration may have failed.');
  }

  return User;
}

/**
 * Helper functions for UserService to reduce complexity
 */

/**
 * Check for existing users to prevent duplicates
 */
export async function checkUserExists(
  email: string,
  username: string
): Promise<void> {
  // Fix for Issue #620: Ensure User model is properly initialized
  const UserModel = await ensureUserModel();

  const existingUserByEmail = await UserModel.findByEmail(email);
  if (existingUserByEmail) {
    throw new UserAlreadyExistsError('email', email);
  }

  const existingUserByUsername = await UserModel.findByUsername(username);
  if (existingUserByUsername) {
    throw new UserAlreadyExistsError('username', username);
  }
}

/**
 * Check for conflicts when updating user profile
 */
export async function checkProfileUpdateConflicts(
  userId: string,
  email?: string,
  username?: string
): Promise<void> {
  // Fix for Issue #620: Ensure User model is properly initialized
  const UserModel = await ensureUserModel();

  if (email) {
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new UserAlreadyExistsError('email', email);
    }
  }

  if (username) {
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new UserAlreadyExistsError('username', username);
    }
  }
}

/**
 * Convert lean users to public format (for pagination results)
 */
export function convertLeansUsersToPublic(users: any[]): PublicUser[] {
  if (!users || !Array.isArray(users)) {
    return [];
  }

  return users
    .map(user => {
      if (!user) return null;

      // Convert to public format manually since we're using lean()
      const {
        passwordHash: _passwordHash,
        emailVerificationToken: _emailVerificationToken,
        passwordResetToken: _passwordResetToken,
        passwordResetExpires: _passwordResetExpires,
        ...publicUser
      } = user;

      // Transform _id to id for public format
      if (publicUser._id) {
        publicUser.id = publicUser._id.toString
          ? publicUser._id.toString()
          : String(publicUser._id);
        delete publicUser._id;
      }
      return publicUser as PublicUser;
    })
    .filter(Boolean) as PublicUser[]; // Remove any null entries
}
