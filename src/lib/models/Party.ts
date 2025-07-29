import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import {
  getStandardSchemaOptions,
  mongooseObjectIdField,
  commonFields,
  commonIndexes,
} from './shared/schema-utils';
import type { CharacterModel } from './Character';

// Party document interface
export interface IParty extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  sharedWith: Types.ObjectId[];
  settings: {
    allowJoining: boolean;
    requireApproval: boolean;
    maxMembers: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;

  // Virtual properties
  readonly memberCount: number;
  readonly playerCharacterCount: number;
  readonly averageLevel: number;

  // Instance methods
  addMember(_characterId: Types.ObjectId): Promise<void>;
  removeMember(_characterId: Types.ObjectId): Promise<void>;
  getMembers(): Promise<any[]>;
  updateActivity(): void;
}

// Party model interface with static methods
export interface PartyModel extends Model<IParty> {
  findByOwnerId(_ownerId: Types.ObjectId): Promise<IParty[]>;
  findPublic(): Promise<IParty[]>;
  searchByName(_searchTerm: string): Promise<IParty[]>;
  findSharedWith(_userId: Types.ObjectId): Promise<IParty[]>;
}

// Mongoose schema definition
const partySchema = new Schema<IParty, PartyModel>(
  {
    ownerId: mongooseObjectIdField('User'),
    name: {
      ...commonFields.name,
      index: 'text',
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 10;
        },
        message: 'Party cannot have more than 10 tags',
      },
    },
    isPublic: commonFields.isPublic,
    sharedWith: {
      type: [mongooseObjectIdField('User', false).type],
      default: [],
      validate: {
        validator: function (userIds: Types.ObjectId[]) {
          return userIds.length <= 50;
        },
        message: 'Party cannot be shared with more than 50 users',
      },
    },
    settings: {
      allowJoining: {
        type: Boolean,
        default: false,
      },
      requireApproval: {
        type: Boolean,
        default: true,
      },
      maxMembers: {
        type: Number,
        default: 6,
        min: [1, 'Party must allow at least 1 member'],
        max: [100, 'Party cannot have more than 100 members'],
      },
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  getStandardSchemaOptions()
);

// Virtual for member count
partySchema.virtual('memberCount', {
  ref: 'Character',
  localField: '_id',
  foreignField: 'partyId',
  count: true,
});

// Virtual for player character count
partySchema.virtual('playerCharacterCount').get(async function () {
  const Character = getCharacterModel();
  const count = await Character.countDocuments({
    partyId: this._id,
    type: 'pc',
    isDeleted: { $ne: true },
  });
  return count;
});

// Helper function to calculate character total level
function calculateCharacterLevel(character: any): number {
  return character.classes.reduce((sum: number, charClass: any) => sum + charClass.level, 0);
}

// Helper function to calculate average level from members
function calculateAverageLevel(members: any[]): number {
  if (members.length === 0) return 0;
  const totalLevel = members.reduce((sum, character) => sum + calculateCharacterLevel(character), 0);
  return Math.round(totalLevel / members.length);
}

// Virtual for average level
partySchema.virtual('averageLevel').get(async function () {
  const Character = getCharacterModel();
  const members = await Character.find({
    partyId: this._id,
    isDeleted: { $ne: true },
  });
  return calculateAverageLevel(members);
});

// Helper function to safely get Character model
function getCharacterModel(): CharacterModel {
  return mongoose.models.Character as CharacterModel ||
         (() => { throw new Error('Character model not registered'); })();
}

// Helper function to get current member count
async function getCurrentMemberCount(partyId: Types.ObjectId): Promise<number> {
  const Character = getCharacterModel();
  return await Character.countDocuments({
    partyId,
    isDeleted: { $ne: true },
  });
}

// Helper function to update character party membership
async function updateCharacterParty(characterId: Types.ObjectId, partyId: Types.ObjectId): Promise<void> {
  const Character = getCharacterModel();
  await Character.findByIdAndUpdate(characterId, { partyId });
}

// Helper function to validate party capacity
function validatePartyCapacity(currentCount: number, maxMembers: number): void {
  if (currentCount >= maxMembers) {
    throw new Error('Party is at maximum capacity');
  }
}

// Instance method: Add member to party
partySchema.methods.addMember = async function (characterId: Types.ObjectId): Promise<void> {
  const currentMemberCount = await getCurrentMemberCount(this._id);
  validatePartyCapacity(currentMemberCount, this.settings.maxMembers);
  await updateCharacterParty(characterId, this._id);
  this.updateActivity();
};

// Helper function to remove character from party
async function removeCharacterFromParty(characterId: Types.ObjectId): Promise<void> {
  const Character = getCharacterModel();
  await Character.findByIdAndUpdate(characterId, {
    $unset: { partyId: 1 },
  });
}

// Instance method: Remove member from party
partySchema.methods.removeMember = async function (characterId: Types.ObjectId): Promise<void> {
  await removeCharacterFromParty(characterId);
  this.updateActivity();
};

// Helper function to find party members
async function findPartyMembers(partyId: Types.ObjectId): Promise<any[]> {
  const Character = getCharacterModel();
  return await Character.find({
    partyId,
    isDeleted: { $ne: true },
  }).sort({ name: 1 });
}

// Instance method: Get all party members
partySchema.methods.getMembers = async function (): Promise<any[]> {
  return await findPartyMembers(this._id);
};

// Instance method: Update last activity
partySchema.methods.updateActivity = function (): void {
  this.lastActivity = new Date();
  this.save();
};

// Helper function to apply party indexes
function applyPartyIndexes(schema: Schema<any>): void {
  // Apply common indexes
  commonIndexes.ownerBased(schema);
  commonIndexes.publicContent(schema);
  commonIndexes.temporal(schema);

  // Party-specific indexes
  schema.index({ name: 'text', description: 'text' });
  schema.index({ tags: 1 });
  schema.index({ 'settings.allowJoining': 1 });
  schema.index({ lastActivity: -1 });
}

// Static method: Find parties by owner ID
partySchema.statics.findByOwnerId = function (ownerId: Types.ObjectId) {
  return this.find({ ownerId }).sort({ name: 1 });
};

// Static method: Find public parties
partySchema.statics.findPublic = function () {
  return this.find({ isPublic: true }).sort({ name: 1 });
};

// Static method: Search parties by name
partySchema.statics.searchByName = function (searchTerm: string) {
  return this.find({
    $text: { $search: searchTerm },
  }).sort({ score: { $meta: 'textScore' } });
};

// Static method: Find parties shared with user
partySchema.statics.findSharedWith = function (userId: Types.ObjectId) {
  return this.find({
    sharedWith: userId,
  }).sort({ name: 1 });
};

// Helper function to validate party name
function validatePartyName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Party name is required');
  }
}

// Helper function to ensure last activity is set
function ensureLastActivity(party: any): void {
  if (!party.lastActivity) {
    party.lastActivity = new Date();
  }
}

// Pre-save middleware for validation
partySchema.pre('save', function (next) {
  try {
    validatePartyName(this.name);
    ensureLastActivity(this);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Post-save middleware for logging
partySchema.post('save', function (doc, next) {
  console.log(`Party saved: ${doc.name} (ID: ${doc._id})`);
  next();
});

// Apply all party indexes
applyPartyIndexes(partySchema as Schema<any>);

// Create and export the model
export const Party =
  (mongoose.models.Party as PartyModel) ||
  mongoose.model<IParty, PartyModel>('Party', partySchema);