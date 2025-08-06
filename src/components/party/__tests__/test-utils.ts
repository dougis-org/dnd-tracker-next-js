// Test data
const mockPartyData = {
  name: 'Test Party',
  description: 'Test description',
  tags: [],
  isPublic: false,
  sharedWith: [],
  settings: { allowJoining: false, requireApproval: true, maxMembers: 6 }
};

export const createMockPartyData = () => mockPartyData;
export const createMockPartyDataWithTags = () => ({ ...mockPartyData, tags: ['fantasy'] });

// Mock factories
export const createMockFetch = () => {
  const mock = jest.fn();
  global.fetch = mock;
  return mock;
};

export const createMockUseForm = (overrides = {}) => ({
  control: {},
  handleSubmit: jest.fn(fn => (e: any) => { e.preventDefault(); fn(createMockPartyDataWithTags()); }),
  watch: jest.fn(name => name === 'tags' ? ['fantasy'] : ''),
  setValue: jest.fn(),
  ...overrides
});

// Response factories
export const createSuccessResponse = (data = {}) => ({
  ok: true,
  json: async () => ({ success: true, party: { id: '123', ...mockPartyData, ...data } })
});

export const createErrorResponse = (status = 400, message = 'Invalid party data') => ({
  ok: false,
  status,
  json: async () => ({ success: false, message })
});

// Props factories
export const createModalProps = (overrides = {}) => ({
  open: true,
  onOpenChange: jest.fn(),
  onPartyCreated: jest.fn(),
  ...overrides
});

export const createFormProps = (overrides = {}) => ({
  onSubmit: jest.fn(),
  isSubmitting: false,
  ...overrides
});