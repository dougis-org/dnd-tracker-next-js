import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { subscriptionTierSchema, userRoleSchema } from '@/lib/validations/user';
import { z } from 'zod';

/**
 * User document interface
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: z.infer<typeof userRoleSchema>;
  subscriptionTier: z.infer<typeof subscriptionTierSchema>;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  displayName?: string;
  timezone?: string;
  dndEdition?: string;
  experienceLevel?: 'new' | 'beginner' | 'intermediate' | 'experienced' | 'veteran';
  primaryRole?: 'dm' | 'player' | 'both';
  profileSetupCompleted: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    emailNotifications: boolean;
    browserNotifications: boolean;
    timezone: string;
    language: string;
    diceRollAnimations: boolean;
    autoSaveEncounters: boolean;
  };
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(_password: string): Promise<boolean>;
  generatePasswordResetToken(_options?: { session?: any }): Promise<string>;
  generateEmailVerificationToken(_options?: { session?: any }): Promise<string>;
  toPublicJSON(): PublicUser;
  updateLastLogin(_options?: { session?: any }): Promise<void>;
  isSubscriptionActive(): boolean;
  canAccessFeature(_feature: SubscriptionFeature, _quantity: number): boolean;
}

/**
 * User model interface
 */
export interface UserModel extends Model<IUser> {
  findByEmail(_email: string): Promise<IUser | null>;
  findByUsername(_username: string): Promise<IUser | null>;
  findByResetToken(_token: string): Promise<IUser | null>;
  findByVerificationToken(_token: string): Promise<IUser | null>;
  createUser(_userData: CreateUserInput): Promise<IUser>;
  validateUser(_email: string, _password: string): Promise<IUser>;
}

/**
 * Public user interface (safe to return to clients)
 */
export interface PublicUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  subscriptionTier: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  preferences: {
    theme: string;
    emailNotifications: boolean;
    browserNotifications: boolean;
    timezone: string;
    language: string;
    diceRollAnimations: boolean;
    autoSaveEncounters: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create user input interface
 */
export interface CreateUserInput {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: z.infer<typeof userRoleSchema>;
  subscriptionTier?: z.infer<typeof subscriptionTierSchema>;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    emailNotifications?: boolean;
    browserNotifications?: boolean;
    timezone?: string;
    language?: string;
    diceRollAnimations?: boolean;
    autoSaveEncounters?: boolean;
  };
}

/**
 * Subscription tier feature limits
 */
export type SubscriptionFeature = 'parties' | 'encounters' | 'characters';

export const SUBSCRIPTION_LIMITS: Record<
  z.infer<typeof subscriptionTierSchema>,
  Record<SubscriptionFeature, number>
> = {
  free: {
    parties: 1,
    encounters: 3,
    characters: 10,
  },
  seasoned: {
    parties: 3,
    encounters: 15,
    characters: 50,
  },
  expert: {
    parties: 10,
    encounters: 50,
    characters: 200,
  },
  master: {
    parties: 25,
    encounters: 100,
    characters: 500,
  },
  guild: {
    parties: Infinity,
    encounters: Infinity,
    characters: Infinity,
  },
};

/**
 * User schema
 */
const userSchema = new Schema<IUser, UserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens',
      ],
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [1, 'First name must be at least 1 character long'],
      maxlength: [100, 'First name cannot exceed 100 characters'],
      match: [
        /^[a-zA-Z\s'-]+$/,
        'First name can only contain letters, spaces, apostrophes, and hyphens',
      ],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [1, 'Last name must be at least 1 character long'],
      maxlength: [100, 'Last name cannot exceed 100 characters'],
      match: [
        /^[a-zA-Z\s'-]+$/,
        'Last name can only contain letters, spaces, apostrophes, and hyphens',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'seasoned', 'expert', 'master', 'guild'],
      default: 'free',
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerificationToken: {
      type: String,
      sparse: true,
      index: true,
    },
    passwordResetToken: {
      type: String,
      sparse: true,
      index: true,
    },
    passwordResetExpires: {
      type: Date,
      index: { expires: '10m' },
    },
    lastLoginAt: {
      type: Date,
      index: { background: true },
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    dndEdition: {
      type: String,
      trim: true,
      maxlength: [50, 'D&D edition cannot exceed 50 characters'],
      default: '5th Edition',
    },
    experienceLevel: {
      type: String,
      enum: ['new', 'beginner', 'intermediate', 'experienced', 'veteran'],
    },
    primaryRole: {
      type: String,
      enum: ['dm', 'player', 'both'],
    },
    profileSetupCompleted: {
      type: Boolean,
      default: false,
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      browserNotifications: {
        type: Boolean,
        default: false,
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
      language: {
        type: String,
        default: 'en',
      },
      diceRollAnimations: {
        type: Boolean,
        default: true,
      },
      autoSaveEncounters: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        // Convert _id to id and remove sensitive fields
        ret.id = ret._id;
        delete ret._id;
        delete ret.passwordHash;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (_, ret: any) => {
        // Convert _id to id and remove sensitive fields
        ret.id = ret._id;
        delete ret.passwordHash;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
    // Add indexes for common queries
    collation: { locale: 'en', strength: 2 }, // Case insensitive queries
  }
);

// Add additional indexes
userSchema.index({ createdAt: -1 }); // For sorting by newest users
userSchema.index({ lastLoginAt: -1 }); // For sorting by recent logins

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified or is new
  if (!this.isModified('passwordHash')) return next();

  try {
    // SECURITY CHECK: Ensure password is not already hashed
    const isAlreadyHashed = this.passwordHash.match(/^\$2[aby]\$\d+\$/);

    if (!isAlreadyHashed) {
      // SECURITY REQUIREMENT: Never store plaintext passwords
      if (this.passwordHash.length < 8) {
        return next(new Error('Password must be at least 8 characters long'));
      }

      // Generate a salt and hash the password
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);

      // SECURITY VALIDATION: Verify the password was actually hashed
      if (!this.passwordHash.match(/^\$2[aby]\$\d+\$/)) {
        return next(new Error('CRITICAL SECURITY ERROR: Password hashing failed'));
      }
    }

    return next();
  } catch (error) {
    return next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, this.passwordHash);
  } catch {
    throw new Error('Error comparing passwords');
  }
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken =
  async function (options?: { session?: any }): Promise<string> {
    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store the token and expiration
    this.passwordResetToken = resetToken;
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save the user with optional session for transactions
    if (options?.session) {
      await this.save({ session: options.session });
    } else {
      await this.save();
    }

    return resetToken;
  };

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken =
  async function (options?: { session?: any }): Promise<string> {
    // Generate a random token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store the token
    this.emailVerificationToken = verificationToken;

    // Save the user with optional session for transactions
    if (options?.session) {
      await this.save({ session: options.session });
    } else {
      await this.save();
    }

    return verificationToken;
  };

// Instance method to convert to public JSON
userSchema.methods.toPublicJSON = function (): PublicUser {
  const userObject = this.toObject();
  return {
    id: userObject._id.toString(),
    email: userObject.email,
    username: userObject.username,
    firstName: userObject.firstName,
    lastName: userObject.lastName,
    role: userObject.role,
    subscriptionTier: userObject.subscriptionTier,
    isEmailVerified: userObject.isEmailVerified,
    lastLoginAt: userObject.lastLoginAt,
    preferences: {
      theme: userObject.preferences.theme,
      emailNotifications: userObject.preferences.emailNotifications,
      browserNotifications: userObject.preferences.browserNotifications,
      timezone: userObject.preferences.timezone,
      language: userObject.preferences.language,
      diceRollAnimations: userObject.preferences.diceRollAnimations,
      autoSaveEncounters: userObject.preferences.autoSaveEncounters,
    },
    createdAt: userObject.createdAt,
    updatedAt: userObject.updatedAt,
  };
};

// Instance method to update last login time
userSchema.methods.updateLastLogin = async function (options?: { session?: any }): Promise<void> {
  this.lastLoginAt = new Date();
  if (options?.session) {
    await this.save({ session: options.session });
  } else {
    await this.save();
  }
};

// Instance method to check if subscription is active
userSchema.methods.isSubscriptionActive = function (): boolean {
  // For future implementation with paid subscriptions
  // Currently all subscriptions are considered active
  return true;
};

// Instance method to check if user can access a feature based on subscription tier
userSchema.methods.canAccessFeature = function (
  feature: SubscriptionFeature,
  quantity: number
): boolean {
  const tier = this.subscriptionTier as z.infer<typeof subscriptionTierSchema>;
  const limit = SUBSCRIPTION_LIMITS[tier][feature];
  return quantity <= limit;
};

// Static method to find user by email
userSchema.statics.findByEmail = async function (
  email: string
): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find user by username
userSchema.statics.findByUsername = async function (
  username: string
): Promise<IUser | null> {
  return this.findOne({ username: username.toLowerCase() });
};

// Static method to find user by reset token
userSchema.statics.findByResetToken = async function (
  token: string
): Promise<IUser | null> {
  return this.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  });
};

// Static method to find user by verification token
userSchema.statics.findByVerificationToken = async function (
  token: string
): Promise<IUser | null> {
  return this.findOne({ emailVerificationToken: token });
};

// Helper function to validate user data before creation
async function validateUserData(
  model: UserModel,
  userData: CreateUserInput
): Promise<void> {
  // Check if email already exists
  const existingEmail = await model.findOne({
    email: userData.email.toLowerCase(),
  });
  if (existingEmail) {
    throw new Error('Email already exists');
  }

  // Check if username already exists
  const existingUsername = await model.findOne({
    username: userData.username.toLowerCase(),
  });
  if (existingUsername) {
    throw new Error('Username already exists');
  }
}

// Helper function to get preference value with default
function getPreferenceWithDefault<T>(value: T | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

// Helper function to prepare user preferences
function prepareUserPreferences(userData: CreateUserInput) {
  const preferences = userData.preferences || {};
  return {
    theme: preferences.theme ?? 'system',
    emailNotifications: getPreferenceWithDefault(
      preferences.emailNotifications,
      true
    ),
    browserNotifications: getPreferenceWithDefault(
      preferences.browserNotifications,
      false
    ),
    timezone: preferences.timezone ?? 'UTC',
    language: preferences.language ?? 'en',
    diceRollAnimations: getPreferenceWithDefault(
      preferences.diceRollAnimations,
      true
    ),
    autoSaveEncounters: getPreferenceWithDefault(
      preferences.autoSaveEncounters,
      true
    ),
  };
}

// Static method to create a new user
userSchema.statics.createUser = async function (
  userData: CreateUserInput
): Promise<IUser> {
  // Validate user data
  await validateUserData(this, userData);

  // Create the user
  const user = new this({
    email: userData.email.toLowerCase(),
    username: userData.username.toLowerCase(),
    firstName: userData.firstName,
    lastName: userData.lastName,
    passwordHash: userData.password, // Will be hashed in pre-save hook
    role: userData.role ?? 'user',
    subscriptionTier: userData.subscriptionTier ?? 'free',
    preferences: prepareUserPreferences(userData),
  });

  await user.save();
  return user;
};

// Static method to validate user credentials
userSchema.statics.validateUser = async function (
  email: string,
  password: string
): Promise<IUser> {
  // Find user by email
  const user = await this.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Compare password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  // Update last login time
  await user.updateLastLogin();

  return user;
};

// Create and export model
const User =
  (mongoose.models.User as UserModel) ||
  mongoose.model<IUser, UserModel>('User', userSchema);

export default User;
