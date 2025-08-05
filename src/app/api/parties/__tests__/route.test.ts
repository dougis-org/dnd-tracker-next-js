import { GET, POST } from '../route';
import {
  setupApiMocks,
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
} from './api-test-utils';

const mocks = setupApiMocks();
const {
  MockedPartyService,
  MockedPartyCreateSchema,
  MockedPartyQuerySchema,
} = mocks;

describe('/api/parties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStandardMocks(mocks);
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
        mockValidationSuccess(MockedPartyQuerySchema, {
          filters: { tags: [], memberCount: [] },
          sortBy: expectedArgs[2],
          sortOrder: expectedArgs[3],
          pagination: expectedArgs[4],
        });

        await testSuccessScenario(
          GET,
          request,
          MockedPartyService.getPartiesForUser,
          expectedArgs,
          mockResponse
        );
      });
    });

    it('should handle validation errors', async () => {
      mockValidationError(MockedPartyQuerySchema);
      const request = createGetRequest();

      const response = await GET(request);
      expect(response).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockValidationSuccess(MockedPartyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      await testErrorScenario(
        GET,
        createGetRequest(),
        MockedPartyService.getPartiesForUser,
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
        mockValidationSuccess(MockedPartyCreateSchema, requestBody);

        await testSuccessScenario(
          POST,
          request,
          MockedPartyService.createParty,
          expectedArgs,
          mockResponse
        );
      });
    });

    it('should handle validation errors in POST', async () => {
      mockValidationError(MockedPartyCreateSchema);
      const request = createPostRequest(SAMPLE_PARTY_DATA);

      const response = await POST(request);
      expect(response).toBeDefined();
    });

    it('should handle service errors in POST', async () => {
      const request = createPostRequest(SAMPLE_PARTY_DATA);
      mockValidationSuccess(MockedPartyCreateSchema, SAMPLE_PARTY_DATA);

      await testErrorScenario(
        POST,
        request,
        MockedPartyService.createParty,
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
      mockValidationSuccess(MockedPartyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      MockedPartyService.getPartiesForUser.mockResolvedValue(
        createSuccessResult({ parties: [], pagination: SAMPLE_PAGINATION })
      );

      const response = await GET(request);
      expect(response).toBeDefined();
      expect(MockedPartyService.getPartiesForUser).toHaveBeenCalled();
    });
  });
});