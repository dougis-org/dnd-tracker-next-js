import { NextRequest } from 'next/server';
import { POST } from '../reset-password-request/route';
import { UserService } from '@/lib/services/UserService';
import { createMockRequest } from './test-utils';

// Configure Jest to use our mocks
jest.mock('next/server');

// Mock the UserService
jest.mock('@/lib/services/UserService', () => ({
  UserService: {
    requestPasswordReset: jest.fn(),
  },
}));

describe('POST /api/auth/reset-password-request', () => {
  const mockResetRequestData = {
    email: 'john.doe@example.com',
  };

  // createMockRequest now imported from test-utils

  // Helper function to execute POST request and return response data
  const executeRequest = async (requestData: any) => {
    const request = createMockRequest(requestData);
    const response = await POST(request);
    const responseData = await response.json();
    return { response, responseData };
  };

  // Helper function to mock successful service response
  const mockSuccessfulReset = () => {
    UserService.requestPasswordReset = jest.fn().mockResolvedValue({
      success: true,
      data: { message: 'Reset email sent' },
    });
  };

  // Helper function to mock service error response
  const mockServiceError = (message: string, statusCode?: number) => {
    UserService.requestPasswordReset = jest.fn().mockResolvedValue({
      success: false,
      error: {
        message,
        ...(statusCode && { statusCode }),
      },
    });
  };

  // Helper function to verify success response
  const expectSuccessResponse = (response: Response, responseData: any, expectedServiceCall: any) => {
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      success: true,
      message: 'Password reset email sent successfully',
    });
    expect(UserService.requestPasswordReset).toHaveBeenCalledWith(expectedServiceCall);
  };

  // Helper function to verify validation error response
  const expectValidationError = (response: Response, responseData: any) => {
    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.message).toBe('Validation error');
    expect(responseData.errors).toBeDefined();
    expect(UserService.requestPasswordReset).not.toHaveBeenCalled();
  };

  // Helper function to verify service error response
  const expectServiceError = (response: Response, responseData: any, expectedStatus: number, expectedMessage: string, expectedServiceCall: any) => {
    expect(response.status).toBe(expectedStatus);
    expect(responseData).toEqual({
      success: false,
      message: expectedMessage,
    });
    expect(UserService.requestPasswordReset).toHaveBeenCalledWith(expectedServiceCall);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success scenarios', () => {
    it('successfully requests password reset for valid email', async () => {
      mockSuccessfulReset();
      const { response, responseData } = await executeRequest(mockResetRequestData);
      expectSuccessResponse(response, responseData, mockResetRequestData);
    });

    it('successfully handles request for non-existent email (security)', async () => {
      mockSuccessfulReset();
      const nonExistentEmail = { email: 'nonexistent@example.com' };
      const { response, responseData } = await executeRequest(nonExistentEmail);
      expectSuccessResponse(response, responseData, nonExistentEmail);
    });
  });

  describe('Validation errors', () => {
    const testValidationError = async (invalidData: any, expectedErrorCheck?: (_errors: any) => void) => {
      const { response, responseData } = await executeRequest(invalidData);
      expectValidationError(response, responseData);
      if (expectedErrorCheck) {
        expectedErrorCheck(responseData.errors);
      }
    };

    it('returns validation error for missing email', async () => {
      await testValidationError({}, (errors) => {
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: 'Required',
            }),
          ])
        );
      });
    });

    it('returns validation error for invalid email format', async () => {
      await testValidationError({ email: 'invalid-email-format' }, (errors) => {
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('email'),
            }),
          ])
        );
      });
    });

    it('returns validation error for empty email', async () => {
      await testValidationError({ email: '' });
    });

    it('returns validation error for non-string email', async () => {
      await testValidationError({ email: 123 });
    });

    it('returns validation error for email with invalid characters', async () => {
      await testValidationError({ email: 'test@' });
    });
  });

  describe('Service errors', () => {
    it('handles rate limiting error', async () => {
      mockServiceError('Too many password reset requests. Please try again later.', 429);
      const { response, responseData } = await executeRequest(mockResetRequestData);
      expectServiceError(response, responseData, 429, 'Too many password reset requests. Please try again later.', mockResetRequestData);
    });

    it('handles email service failure error', async () => {
      mockServiceError('Failed to send email', 503);
      const { response, responseData } = await executeRequest(mockResetRequestData);
      expectServiceError(response, responseData, 503, 'Failed to send email', mockResetRequestData);
    });

    it('handles database error', async () => {
      mockServiceError('Database connection failed', 500);
      const { response, responseData } = await executeRequest(mockResetRequestData);
      expectServiceError(response, responseData, 500, 'Database connection failed', mockResetRequestData);
    });

    it('handles service error without status code', async () => {
      mockServiceError('Service error');
      const { response, responseData } = await executeRequest(mockResetRequestData);
      expectServiceError(response, responseData, 400, 'Service error', mockResetRequestData);
    });

    it('handles service error without message', async () => {
      UserService.requestPasswordReset = jest.fn().mockResolvedValue({
        success: false,
        error: { statusCode: 500 },
      });
      const { response, responseData } = await executeRequest(mockResetRequestData);
      expectServiceError(response, responseData, 500, 'Unknown error', mockResetRequestData);
    });
  });

  describe('Unexpected errors', () => {
    const expectUnexpectedError = (response: Response, responseData: any) => {
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        success: false,
        message: 'An unexpected error occurred',
      });
    };

    it('handles service method throwing an error', async () => {
      UserService.requestPasswordReset = jest.fn().mockRejectedValue(new Error('Network error'));
      const { response, responseData } = await executeRequest(mockResetRequestData);
      expectUnexpectedError(response, responseData);
      expect(UserService.requestPasswordReset).toHaveBeenCalledWith(mockResetRequestData);
    });

    it('handles malformed JSON request', async () => {
      const req = new NextRequest('https://example.com');
      (req.json as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));
      const response = await POST(req);
      const responseData = await response.json();
      expectUnexpectedError(response, responseData);
      expect(UserService.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('handles service returning null', async () => {
      UserService.requestPasswordReset = jest.fn().mockResolvedValue(null);
      const { response, responseData } = await executeRequest(mockResetRequestData);
      expectServiceError(response, responseData, 400, 'Unknown error', mockResetRequestData);
    });
  });

  describe('Edge cases', () => {
    it('handles null request body', async () => {
      const { response, responseData } = await executeRequest(null);
      expectValidationError(response, responseData);
    });

    it('handles undefined request body', async () => {
      const { response, responseData } = await executeRequest(undefined);
      expectValidationError(response, responseData);
    });

    it('handles extra properties in request body', async () => {
      const dataWithExtra = {
        ...mockResetRequestData,
        extraField: 'should be ignored',
        anotherField: 123,
      };
      mockSuccessfulReset();
      const { response, responseData } = await executeRequest(dataWithExtra);
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(UserService.requestPasswordReset).toHaveBeenCalledWith(mockResetRequestData);
    });

    it('handles very long email address', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const dataWithLongEmail = { email: longEmail };
      mockSuccessfulReset();
      const { response, responseData } = await executeRequest(dataWithLongEmail);
      expectSuccessResponse(response, responseData, dataWithLongEmail);
    });
  });
});
