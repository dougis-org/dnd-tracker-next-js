/**
 * Shared test utilities for Party components
 * Eliminates duplication across test files
 */

// Test data factories
export const createMockPartyData = () => ({
  name: 'Test Party',
  description: 'Test description',
  tags: [],
  isPublic: false,
  sharedWith: [],
  settings: {
    allowJoining: false,
    requireApproval: true,
    maxMembers: 6,
  },
});

export const createMockPartyDataWithTags = () => ({
  ...createMockPartyData(),
  tags: ['fantasy'],
});

// Mock fetch factory
export const createMockFetch = () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  return mockFetch;
};

// Mock toast factory
export const createMockToast = () => {
  const mockToast = jest.fn();
  jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
  }));
  return mockToast;
};

// Mock react-hook-form factory
export const createMockUseForm = (overrides = {}) => ({
  control: {},
  handleSubmit: jest.fn((fn) => (e: any) => {
    e.preventDefault();
    fn(createMockPartyDataWithTags());
  }),
  watch: jest.fn((name) => {
    if (name === 'tags') return ['fantasy'];
    return '';
  }),
  setValue: jest.fn(),
  ...overrides,
});

// API response factories
export const createSuccessResponse = (data = {}) => ({
  ok: true,
  json: async () => ({
    success: true,
    party: { id: '123', ...createMockPartyData(), ...data },
  }),
});

export const createErrorResponse = (status = 400, message = 'Invalid party data') => ({
  ok: false,
  status,
  json: async () => ({ success: false, message: message === undefined ? undefined : message }),
});

// Common test props factories
export const createModalProps = (overrides = {}) => ({
  open: true,
  onOpenChange: jest.fn(),
  onPartyCreated: jest.fn(),
  ...overrides,
});

export const createFormProps = (overrides = {}) => ({
  onSubmit: jest.fn(),
  isSubmitting: false,
  ...overrides,
});