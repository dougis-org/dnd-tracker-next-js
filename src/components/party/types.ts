import { Types } from 'mongoose';

export interface PartyFilters {
  memberCount: number[];
  createdDateRange?: {
    start: Date;
    end: Date;
  };
  tags: string[];
  isPublic?: boolean;
}

export type PartySortBy =
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'memberCount'
  | 'lastActivity';

export type SortOrder = 'asc' | 'desc';

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface PartyMember {
  characterId: Types.ObjectId;
  name: string;
  level: number;
  race: string;
  classes: Array<{
    class: string;
    level: number;
    subclass?: string;
  }>;
  hitPoints: {
    maximum: number;
    current: number;
  };
  armorClass: number;
  isPlayerCharacter: boolean;
}

export interface PartyListItem {
  id: string;
  ownerId: Types.ObjectId;
  name: string;
  description: string;
  members: PartyMember[];
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
  memberCount: number;
  playerCharacterCount: number;
  averageLevel: number;
}

export interface PartyCardProps {
  party: PartyListItem;
  isSelected?: boolean;
  onSelect?: (_id: string) => void;
  onRefetch?: () => void;
}

export interface PartyActionButtonsProps {
  party: PartyListItem;
  onRefetch?: () => void;
}

export interface SortConfig {
  sortBy: PartySortBy;
  sortOrder: SortOrder;
}

export interface FilterCallbacks {
  onFiltersChange: (_filters: Partial<PartyFilters>) => void;
  onSearchChange: (_query: string) => void;
  onSortChange: (_sortBy: PartySortBy, _sortOrder: SortOrder) => void;
  onClearFilters: () => void;
}

export interface TableSortConfig extends SortConfig {
  onSort: (_sortBy: PartySortBy, _sortOrder: SortOrder) => void;
}

export interface TableSelectionConfig {
  selectedParties: string[];
  isAllSelected: boolean;
  onSelectAll: () => void;
  onSelectParty: (_id: string) => void;
}