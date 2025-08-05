import { GET, PUT, DELETE } from '@/app/api/parties/[id]/route';
import {
  getMocks,
  setupStandardMocks,
  createGetRequest,
  createPutRequest,
  testSuccessScenario,
  testErrorScenario,
  mockValidationSuccess,
  mockValidationError,
  SAMPLE_PARTY_RESPONSE,
  TEST_USER_ID,
  TEST_PARTY_ID,
  createSuccessResult,
} from '@/app/api/parties/__tests__/api-test-utils';

describe('/api/parties/[id]', () => {
  let mocks: ReturnType<typeof getMocks>;
  const context = { params: { id: TEST_PARTY_ID } };

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = setupStandardMocks();
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
          mocks.PartyService.getPartyById,
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
        mocks.PartyService.getPartyById,
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
        mockValidationSuccess(mocks.partyUpdateSchema, requestBody);

        await testSuccessScenario(
          PUT,
          request,
          mocks.PartyService.updateParty,
          expectedArgs,
          mockResponse,
          context
        );
      });
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

      await testErrorScenario(
        PUT,
        request,
        mocks.PartyService.updateParty,
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
          mocks.PartyService.deleteParty,
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
        mocks.PartyService.deleteParty,
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

      mocks.PartyService.getPartyById.mockResolvedValue(
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
        setupValidation: () => mockValidationSuccess(mocks.partyUpdateSchema, { name: 'Updated' }),
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

        mocks.PartyService[service as keyof typeof mocks.PartyService].mockResolvedValue(
          createSuccessResult(method === 'DELETE' ? undefined : SAMPLE_PARTY_RESPONSE)
        );

        await handler(request, context);

        expect(mocks.PartyService[service as keyof typeof mocks.PartyService]).toHaveBeenCalled();
      });
    });
  });
});