import { GET, PUT, DELETE } from '../route';
import {
  setupApiMocks,
  setupStandardMocks,
  createGetRequest,
  createPutRequest,
  testSuccessScenario,
  testErrorScenario,
  mockValidationSuccess,
  mockValidationError,
  SAMPLE_PARTY_DATA,
  SAMPLE_PARTY_RESPONSE,
  TEST_USER_ID,
  TEST_PARTY_ID,
  createSuccessResult,
} from '../../../__tests__/api-test-utils';

const mocks = setupApiMocks();
const {
  MockedPartyService,
  MockedPartyUpdateSchema,
} = mocks;

describe('/api/parties/[id]', () => {
  const context = { params: { id: TEST_PARTY_ID } };

  beforeEach(() => {
    jest.clearAllMocks();
    setupStandardMocks(mocks);
  });

  describe('GET /api/parties/[id]', () => {
    const testGetScenarios = [
      {
        name: 'should return party by ID successfully',
        mockResponse: SAMPLE_PARTY_RESPONSE,
        expectedArgs: [TEST_PARTY_ID, TEST_USER_ID],
      },
    ];

    testGetScenarios.forEach(({ name, mockResponse, expectedArgs }) => {
      it(name, async () => {
        await testSuccessScenario(
          GET,
          createGetRequest(),
          MockedPartyService.getPartyById,
          expectedArgs,
          mockResponse,
          context
        );
      });
    });

    it('should handle service errors in GET', async () => {
      await testErrorScenario(
        GET,
        createGetRequest(),
        MockedPartyService.getPartyById,
        [TEST_PARTY_ID, TEST_USER_ID],
        context
      );
    });
  });

  describe('PUT /api/parties/[id]', () => {
    const updateData = { name: 'Updated Party' };
    const updatedResponse = { ...SAMPLE_PARTY_RESPONSE, name: 'Updated Party' };

    const testPutScenarios = [
      {
        name: 'should update party successfully',
        requestBody: updateData,
        mockResponse: updatedResponse,
        expectedArgs: [TEST_PARTY_ID, TEST_USER_ID, updateData],
      },
    ];

    testPutScenarios.forEach(({ name, requestBody, mockResponse, expectedArgs }) => {
      it(name, async () => {
        const request = createPutRequest(requestBody);
        mockValidationSuccess(MockedPartyUpdateSchema, requestBody);

        await testSuccessScenario(
          PUT,
          request,
          MockedPartyService.updateParty,
          expectedArgs,
          mockResponse,
          context
        );
      });
    });

    it('should handle validation errors in PUT', async () => {
      mockValidationError(MockedPartyUpdateSchema);
      const request = createPutRequest(updateData);
      
      const response = await PUT(request, context);
      expect(response).toBeDefined();
    });

    it('should handle service errors in PUT', async () => {
      const request = createPutRequest(updateData);
      mockValidationSuccess(MockedPartyUpdateSchema, updateData);

      await testErrorScenario(
        PUT,
        request,
        MockedPartyService.updateParty,
        [TEST_PARTY_ID, TEST_USER_ID, updateData],
        context
      );
    });
  });

  describe('DELETE /api/parties/[id]', () => {
    const testDeleteScenarios = [
      {
        name: 'should delete party successfully',
        mockResponse: undefined,
        expectedArgs: [TEST_PARTY_ID, TEST_USER_ID],
      },
    ];

    testDeleteScenarios.forEach(({ name, mockResponse, expectedArgs }) => {
      it(name, async () => {
        await testSuccessScenario(
          DELETE,
          createGetRequest(), // DELETE uses same request format as GET
          MockedPartyService.deleteParty,
          expectedArgs,
          mockResponse,
          context
        );
      });
    });

    it('should handle service errors in DELETE', async () => {
      await testErrorScenario(
        DELETE,
        createGetRequest(),
        MockedPartyService.deleteParty,
        [TEST_PARTY_ID, TEST_USER_ID],
        context
      );
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

  describe('Request Parsing', () => {
    it('should handle malformed JSON in PUT requests', async () => {
      const request = {
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as any;

      const response = await PUT(request, context);
      expect(response).toBeDefined();
    });

    it('should handle missing party ID in context', async () => {
      const invalidContext = { params: {} };
      
      MockedPartyService.getPartyById.mockResolvedValue(
        createSuccessResult(SAMPLE_PARTY_RESPONSE)
      );

      const response = await GET(createGetRequest(), invalidContext);
      expect(response).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    const integrationTestCases = [
      {
        method: 'GET',
        handler: GET,
        service: 'getPartyById',
        request: createGetRequest(),
      },
      {
        method: 'PUT', 
        handler: PUT,
        service: 'updateParty',
        request: createPutRequest({ name: 'Updated' }),
        setupValidation: () => mockValidationSuccess(MockedPartyUpdateSchema, { name: 'Updated' }),
      },
      {
        method: 'DELETE',
        handler: DELETE,
        service: 'deleteParty', 
        request: createGetRequest(),
      },
    ];

    integrationTestCases.forEach(({ method, handler, service, request, setupValidation }) => {
      it(`should call ${service} service method for ${method}`, async () => {
        setupValidation?.();
        
        MockedPartyService[service as keyof typeof MockedPartyService].mockResolvedValue(
          createSuccessResult(method === 'DELETE' ? undefined : SAMPLE_PARTY_RESPONSE)
        );

        await handler(request, context);

        expect(MockedPartyService[service as keyof typeof MockedPartyService]).toHaveBeenCalled();
      });
    });
  });
});