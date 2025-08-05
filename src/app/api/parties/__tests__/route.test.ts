import { GET, POST } from '@/app/api/parties/route';
import {
  getMocks,
  setupStandardMocks,
  createGetRequest,
  createPostRequest,
  testSuccessScenario,
  testErrorScenario,
  mockValidationSuccess,
  mockValidationError,
  SAMPLE_PARTY_DATA,
  SAMPLE_PARTY_RESPONSE,
  SAMPLE_PAGINATION,
  TEST_USER_ID,
  createSuccessResult,
} from '@/app/api/parties/__tests__/api-test-utils';

describe('/api/parties', () => {
  let mocks: ReturnType<typeof getMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = setupStandardMocks();
  });

  describe('GET /api/parties', () => {
    const testGetScenarios = [
      {
        name: 'should return parties with default parameters',
        request: createGetRequest(),
        mockResponse: { parties: [SAMPLE_PARTY_RESPONSE], pagination: SAMPLE_PAGINATION },
        expectedArgs: [TEST_USER_ID, { tags: [], memberCount: [] }, 'name', 'asc', { page: 1, limit: 20 }],
      },
      {
        name: 'should handle custom query parameters',
        request: createGetRequest({ page: '2', limit: '10', sortBy: 'createdAt', sortOrder: 'desc' }),
        mockResponse: { parties: [], pagination: { ...SAMPLE_PAGINATION, currentPage: 2, itemsPerPage: 10 } },
        expectedArgs: [TEST_USER_ID, { tags: [], memberCount: [] }, 'createdAt', 'desc', { page: 2, limit: 10 }],
      },
    ];

    testGetScenarios.forEach(({ name, request, mockResponse, expectedArgs }) => {
      it(name, async () => {
        mockValidationSuccess(mocks.partyQuerySchema, {
          filters: { tags: [], memberCount: [] },
          sortBy: expectedArgs[2],
          sortOrder: expectedArgs[3],
          pagination: expectedArgs[4],
        });

        await testSuccessScenario(
          GET,
          request,
          mocks.PartyService.getPartiesForUser,
          expectedArgs,
          mockResponse
        );
      });
    });

    it('should handle validation errors', async () => {
      mockValidationError(mocks.partyQuerySchema);
      const request = createGetRequest();

      const response = await GET(request);
      expect(response).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockValidationSuccess(mocks.partyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      await testErrorScenario(
        GET,
        createGetRequest(),
        mocks.PartyService.getPartiesForUser,
        [TEST_USER_ID, { tags: [], memberCount: [] }, 'name', 'asc', { page: 1, limit: 20 }]
      );
    });
  });

  describe('POST /api/parties', () => {
    const testPostScenarios = [
      {
        name: 'should create a new party successfully',
        requestBody: SAMPLE_PARTY_DATA,
        mockResponse: SAMPLE_PARTY_RESPONSE,
        expectedArgs: [TEST_USER_ID, SAMPLE_PARTY_DATA],
      },
    ];

    testPostScenarios.forEach(({ name, requestBody, mockResponse, expectedArgs }) => {
      it(name, async () => {
        const request = createPostRequest(requestBody);
        mockValidationSuccess(mocks.partyCreateSchema, requestBody);

        await testSuccessScenario(
          POST,
          request,
          mocks.PartyService.createParty,
          expectedArgs,
          mockResponse
        );
      });
    });

    it('should handle validation errors in POST', async () => {
      mockValidationError(mocks.partyCreateSchema);
      const request = createPostRequest(SAMPLE_PARTY_DATA);

      const response = await POST(request);
      expect(response).toBeDefined();
    });

    it('should handle service errors in POST', async () => {
      const request = createPostRequest(SAMPLE_PARTY_DATA);
      mockValidationSuccess(mocks.partyCreateSchema, SAMPLE_PARTY_DATA);

      await testErrorScenario(
        POST,
        request,
        mocks.PartyService.createParty,
        [TEST_USER_ID, SAMPLE_PARTY_DATA]
      );
    });
  });

  describe('Error Handling', () => {
    const errorTestCases = [
      { method: 'GET', handler: GET, requestBuilder: createGetRequest },
      { method: 'POST', handler: POST, requestBuilder: () => createPostRequest(SAMPLE_PARTY_DATA) },
    ];

    errorTestCases.forEach(({ method, handler, requestBuilder }) => {
      it(`should handle authentication errors in ${method}`, async () => {
        // Mock withAuth to throw an error
        mocks.MockedWithAuth.mockImplementation(async () => {
          throw new Error('Authentication failed');
        });

        const request = requestBuilder();
        const response = await handler(request);

        expect(response).toBeDefined();
      });
    });
  });

  describe('Request Parsing', () => {
    it('should handle malformed JSON in POST requests', async () => {
      const request = {
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as any;

      const response = await POST(request);
      expect(response).toBeDefined();
    });

    it('should handle missing query parameters gracefully', async () => {
      const request = createGetRequest({});
      mockValidationSuccess(mocks.partyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      mocks.PartyService.getPartiesForUser.mockResolvedValue(
        createSuccessResult({ parties: [], pagination: SAMPLE_PAGINATION })
      );

      const response = await GET(request);
      expect(response).toBeDefined();
      expect(mocks.PartyService.getPartiesForUser).toHaveBeenCalled();
    });
  });
});