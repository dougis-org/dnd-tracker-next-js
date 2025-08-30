// Test file for export route
import { GET } from '../route';
import { EncounterServiceImportExport } from '@/lib/services/EncounterServiceImportExport';
// Auth utilities available from shared-test-utilities
import {
  setupEncounterApiTest,
  createMockRequest,
  mockExportSuccess,
  mockExportFailure,
  mockServiceException,
  expectExportSuccess,
  expectErrorResponse,
  expectServerError,
} from '../../../__tests__/shared-test-utilities';

// Mock the service and auth
jest.mock('@/lib/services/EncounterServiceImportExport');
jest.mock('@clerk/nextjs/server');

const mockService = EncounterServiceImportExport as jest.Mocked<typeof EncounterServiceImportExport>;
// Auth mocking handled by shared utilities

describe('/api/encounters/[id]/export', () => {
  beforeEach(() => {
    setupEncounterApiTest();
  });

  // Helper function to reduce test duplication
  const createExportTest = (url: string = 'http://localhost:3000/api/encounters/123/export', encounterId: string = '123') => {
    const request = createMockRequest({ method: 'GET', url });
    const params = Promise.resolve({ id: encounterId });
    return { request, params };
  };

  describe('GET', () => {
    it('should export encounter to JSON successfully', async () => {
      const mockExportData = '{"metadata":{"format":"json"},"encounter":{"name":"Test"}}';
      mockExportSuccess(mockService, mockExportData);

      const { request, params } = createExportTest('http://localhost:3000/api/encounters/123/export?format=json');
      const response = await GET(request, { params });

      const responseData = await expectExportSuccess(response, 'json');
      expect(responseData).toBe(mockExportData);
    });

    it('should export encounter to XML successfully', async () => {
      const mockExportData = '<?xml version="1.0"?><encounter><name>Test</name></encounter>';
      mockExportSuccess(mockService, '{}'); // JSON export will be overridden below
      mockService.exportToXml.mockResolvedValue({
        success: true,
        data: mockExportData,
      });

      const { request, params } = createExportTest('http://localhost:3000/api/encounters/123/export?format=xml');
      const response = await GET(request, { params });

      const responseData = await expectExportSuccess(response, 'xml');
      expect(responseData).toBe(mockExportData);
    });

    it('should handle export options correctly', async () => {
      mockExportSuccess(mockService, '{}');

      const { request, params } = createExportTest('http://localhost:3000/api/encounters/123/export?format=json&includeCharacterSheets=true&includePrivateNotes=true&stripPersonalData=true');
      await GET(request, { params });

      expect(mockService.exportToJson).toHaveBeenCalledWith(
        '123',
        'test-user-123',
        {
          includeCharacterSheets: true,
          includePrivateNotes: true,
          includeIds: false,
          stripPersonalData: true,
        }
      );
    });

    it('should use default options when not provided', async () => {
      mockExportSuccess(mockService, '{}');

      const { request, params } = createExportTest();
      await GET(request, { params });

      expect(mockService.exportToJson).toHaveBeenCalledWith(
        '123',
        'test-user-123',
        {
          includeCharacterSheets: false,
          includePrivateNotes: false,
          includeIds: false,
          stripPersonalData: false,
        }
      );
    });

    it('should return error when export fails', async () => {
      mockExportFailure(mockService, { message: 'Export failed', code: 'EXPORT_ERROR' });

      const { request, params } = createExportTest();
      const response = await GET(request, { params });

      await expectErrorResponse(response, 400, 'Export failed');
    });

    it('should handle service exceptions', async () => {
      mockServiceException(mockService, 'Service error');

      const { request, params } = createExportTest();
      const response = await GET(request, { params });

      await expectServerError(response);
    });

    it('should handle invalid query parameters', async () => {
      const { request, params } = createExportTest('http://localhost:3000/api/encounters/123/export?format=invalid');
      const response = await GET(request, { params });

      expect(response.status).toBe(400);
    });
  });
});