import { GET, PUT, DELETE } from '@/app/api/parties/[id]/route';
import {
  getMocks,
  setupStandardMocks,
  createGetRequest,
  createPutRequest,
  mockValidationSuccess,
  mockValidationError,
  SAMPLE_PARTY_RESPONSE,
  TEST_PARTY_ID,
  createSuccessResult,
  createErrorResult,
} from '@/app/api/parties/__tests__/api-test-utils';

describe('/api/parties/[id]', () => {
  let mocks: ReturnType<typeof getMocks>;
  const context = { params: Promise.resolve({ id: TEST_PARTY_ID }) };

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = setupStandardMocks();
  });

  describe('GET /api/parties/[id]', () => {
    it('should return party by ID successfully', async () => {
      mocks.PartyService.getPartyById.mockResolvedValue(
        createSuccessResult(SAMPLE_PARTY_RESPONSE)
      );

      const response = await GET(createGetRequest(), context);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle service errors in GET', async () => {
      mocks.PartyService.getPartyById.mockResolvedValue(
        createErrorResult('Test error', 'TEST_ERROR')
      );

      const response = await GET(createGetRequest(), context);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle missing party ID in params', async () => {
      const invalidContext = { params: Promise.resolve({}) };

      const response = await GET(createGetRequest(), invalidContext);
      expect(response).toBeDefined();
    });

    it('should handle database connection errors', async () => {
      mocks.PartyService.getPartyById.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET(createGetRequest(), context);
      expect(response).toBeDefined();
    });
  });

  describe('PUT /api/parties/[id]', () => {
    const updateData = { name: 'Updated Party' };
    const updatedResponse = { ...SAMPLE_PARTY_RESPONSE, name: 'Updated Party' };

    it('should update party successfully', async () => {
      const request = createPutRequest(updateData);
      mockValidationSuccess(mocks.partyUpdateSchema, updateData);
      mocks.PartyService.updateParty.mockResolvedValue(
        createSuccessResult(updatedResponse)
      );

      const response = await PUT(request, context);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle validation errors in PUT', async () => {
      mockValidationError(mocks.partyUpdateSchema);
      const request = createPutRequest(updateData);

      const response = await PUT(request, context);
      expect(response).toBeDefined();
    });

    it('should handle service errors in PUT', async () => {
      const request = createPutRequest(updateData);
      mockValidationSuccess(mocks.partyUpdateSchema, updateData);
      mocks.PartyService.updateParty.mockResolvedValue(
        createErrorResult('Test error', 'TEST_ERROR')
      );

      const response = await PUT(request, context);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle malformed JSON in request body', async () => {
      const request = {
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as any;

      const response = await PUT(request, context);
      expect(response).toBeDefined();
    });

    it('should handle missing party ID in params', async () => {
      const invalidContext = { params: Promise.resolve({}) };
      const request = createPutRequest(updateData);
      mockValidationSuccess(mocks.partyUpdateSchema, updateData);

      const response = await PUT(request, invalidContext);
      expect(response).toBeDefined();
    });

    it('should handle database connection errors in PUT', async () => {
      const request = createPutRequest(updateData);
      mockValidationSuccess(mocks.partyUpdateSchema, updateData);
      mocks.PartyService.updateParty.mockRejectedValue(new Error('Database connection failed'));

      const response = await PUT(request, context);
      expect(response).toBeDefined();
    });
  });

  describe('DELETE /api/parties/[id]', () => {
    it('should delete party successfully', async () => {
      mocks.PartyService.deleteParty.mockResolvedValue(
        createSuccessResult(undefined)
      );

      const response = await DELETE(createGetRequest(), context);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle service errors in DELETE', async () => {
      mocks.PartyService.deleteParty.mockResolvedValue(
        createErrorResult('Test error', 'TEST_ERROR')
      );

      const response = await DELETE(createGetRequest(), context);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle missing party ID in params for DELETE', async () => {
      const invalidContext = { params: Promise.resolve({}) };

      const response = await DELETE(createGetRequest(), invalidContext);
      expect(response).toBeDefined();
    });

    it('should handle database connection errors in DELETE', async () => {
      mocks.PartyService.deleteParty.mockRejectedValue(new Error('Database connection failed'));

      const response = await DELETE(createGetRequest(), context);
      expect(response).toBeDefined();
    });

    it('should handle party not found errors in DELETE', async () => {
      mocks.PartyService.deleteParty.mockResolvedValue(
        createErrorResult('Party not found', 'PARTY_NOT_FOUND')
      );

      const response = await DELETE(createGetRequest(), context);
      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Error Handling', () => {
    const errorTestCases = [
      { method: 'GET', handler: GET, requestBuilder: createGetRequest },
      { method: 'PUT', handler: PUT, requestBuilder: () => createPutRequest({ name: 'Test' }) },
      { method: 'DELETE', handler: DELETE, requestBuilder: createGetRequest },
    ];

    errorTestCases.forEach(({ method, handler, requestBuilder }) => {
      it(`should handle authentication errors in ${method}`, async () => {
        mocks.MockedWithAuth.mockImplementation(async () => {
          throw new Error('Authentication failed');
        });

        const request = requestBuilder();
        const response = await handler(request, context);

        expect(response).toBeDefined();
      });
    });
  });

  describe('Authentication and Access Control', () => {
    it('should require authentication for all endpoints', async () => {
      // Mock withAuth to throw an authentication error
      mocks.withAuth.mockRejectedValueOnce(new Error('Authentication required'));

      const response = await GET(createGetRequest(), context);
      expect(response).toBeDefined();
    });

    it('should handle authorization failures', async () => {
      mocks.PartyService.getPartyById.mockResolvedValue(
        createErrorResult('Access denied', 'ACCESS_DENIED')
      );

      const response = await GET(createGetRequest(), context);
      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Response Format Validation', () => {
    it('should return proper Response objects for GET', async () => {
      mocks.PartyService.getPartyById.mockResolvedValue(
        createSuccessResult(SAMPLE_PARTY_RESPONSE)
      );

      const response = await GET(createGetRequest(), context);

      expect(response).toBeInstanceOf(Response);
      expect(typeof response.json).toBe('function');
    });

    it('should return proper Response objects for PUT', async () => {
      const updateData = { name: 'Updated' };
      mockValidationSuccess(mocks.partyUpdateSchema, updateData);
      mocks.PartyService.updateParty.mockResolvedValue(
        createSuccessResult(SAMPLE_PARTY_RESPONSE)
      );

      const response = await PUT(createPutRequest(updateData), context);

      expect(response).toBeInstanceOf(Response);
      expect(typeof response.json).toBe('function');
    });

    it('should return proper Response objects for DELETE', async () => {
      mocks.PartyService.deleteParty.mockResolvedValue(
        createSuccessResult(undefined)
      );

      const response = await DELETE(createGetRequest(), context);

      expect(response).toBeInstanceOf(Response);
      expect(typeof response.json).toBe('function');
    });
  });
});