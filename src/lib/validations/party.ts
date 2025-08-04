import { z } from 'zod';
import { objectIdSchema } from './base';

/**
 * Validation schemas for party operations
 */

// Party settings validation
export const partySettingsSchema = z.object({
  allowJoining: z.boolean().default(false),
  requireApproval: z.boolean().default(true),
  maxMembers: z
    .number()
    .int('Max members must be a whole number')
    .min(1, 'Party must allow at least 1 member')
    .max(100, 'Party cannot have more than 100 members')
    .default(6),
});

// Party tags validation
export const partyTagsSchema = z
  .array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag cannot exceed 50 characters'))
  .max(10, 'Party cannot have more than 10 tags')
  .default([]);

// Shared users validation
export const sharedWithSchema = z
  .array(objectIdSchema)
  .max(50, 'Party cannot be shared with more than 50 users')
  .default([]);

// Core party creation schema
export const partyCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Party name is required')
    .max(100, 'Party name cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .default(''),
  tags: partyTagsSchema,
  isPublic: z.boolean().default(false),
  sharedWith: sharedWithSchema,
  settings: partySettingsSchema,
});

// Party update schema (all fields optional except validation)
export const partyUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Party name is required')
    .max(100, 'Party name cannot exceed 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
  tags: partyTagsSchema.optional(),
  isPublic: z.boolean().optional(),
  sharedWith: sharedWithSchema.optional(),
  settings: partySettingsSchema.optional(),
});

// Party filter schema for queries
export const partyFiltersSchema = z.object({
  search: z.string().optional(),
  tags: z.array(z.string()).default([]),
  memberCount: z.array(z.number().int().min(0)).default([]),
  isPublic: z.boolean().optional(),
  ownerId: objectIdSchema.optional(),
  sharedWith: objectIdSchema.optional(),
});

// Sort options
export const partySortBySchema = z.enum([
  'name',
  'createdAt',
  'updatedAt',
  'lastActivity',
  'memberCount',
  'playerCharacterCount',
  'averageLevel',
]);

export const sortOrderSchema = z.enum(['asc', 'desc']).default('asc');

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Party query schema (for GET requests)
export const partyQuerySchema = z.object({
  filters: partyFiltersSchema.default({}),
  sortBy: partySortBySchema.default('name'),
  sortOrder: sortOrderSchema,
  pagination: paginationSchema.default({}),
});

// Member management schemas
export const addMemberSchema = z.object({
  characterId: objectIdSchema,
});

export const removeMemberSchema = z.object({
  characterId: objectIdSchema,
});

// Share party schema
export const sharePartySchema = z.object({
  userIds: z
    .array(objectIdSchema)
    .min(1, 'At least one user ID is required')
    .max(50, 'Cannot share with more than 50 users'),
  shareType: z.enum(['add', 'remove', 'replace']).default('add'),
});

// Type exports for use in services and API routes
export type PartyCreate = z.infer<typeof partyCreateSchema>;
export type PartyUpdate = z.infer<typeof partyUpdateSchema>;
export type PartyFilters = z.infer<typeof partyFiltersSchema>;
export type PartySortBy = z.infer<typeof partySortBySchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type PartyQuery = z.infer<typeof partyQuerySchema>;
export type AddMember = z.infer<typeof addMemberSchema>;
export type RemoveMember = z.infer<typeof removeMemberSchema>;
export type ShareParty = z.infer<typeof sharePartySchema>;
export type PartySettings = z.infer<typeof partySettingsSchema>;

// Response type for party list items (matches frontend expectations)
export interface PartyListItem {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  members: any[];
  tags: string[];
  isPublic: boolean;
  sharedWith: string[];
  settings: PartySettings;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  memberCount: number;
  playerCharacterCount: number;
  averageLevel: number;
}

// Pagination info for responses
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}