import { NextRequest } from 'next/server';
import { POST } from '../resend-verification/route';
import { UserService } from '@/lib/services/UserService';
import { createMockRequest } from './test-utils';

// Configure Jest to use our mocks
jest.mock('next/server');

// Mock the UserService
jest.mock('@/lib/services/UserService', () => ({
  UserService: {
    resendVerificationEmail: jest.fn(),
  },
}));

describe('POST /api/auth/resend-verification', () => {
  const mockResendVerificationData = {
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
  const mockSuccessfulResend = () => {
    UserService.resendVerificationEmail = jest.fn().mockResolvedValue({
      success: true,
      data: { message: 'Verification email resent' },
    });
  };

  // Helper function to mock service error response
  const mockServiceError = (message: string, statusCode?: number) => {
    UserService.resendVerificationEmail = jest.fn().mockResolvedValue({
      success: false,
      error: {
        message,
        ...(statusCode && { statusCode }),
      },
    });
  };

  // Helper function to verify success response
  const expectSuccessResponse = (response: Response, responseData: any, expectedEmail: string) => {
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      success: true,
      message: 'Verification email resent successfully',
    });
    expect(UserService.resendVerificationEmail).toHaveBeenCalledWith(expectedEmail);
  };

  // Helper function to verify validation error response
  const expectValidationError = (response: Response, responseData: any) => {
    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.message).toBe('Validation error');
    expect(responseData.errors).toBeDefined();
    expect(UserService.resendVerificationEmail).not.toHaveBeenCalled();
  };

  // Helper function to verify service error response
  const expectServiceError = (response: Response, responseData: any, expectedStatus: number, expectedMessage: string, expectedEmail: string) => {
    expect(response.status).toBe(expectedStatus);
    expect(responseData).toEqual({
      success: false,
      message: expectedMessage,
    });
    expect(UserService.resendVerificationEmail).toHaveBeenCalledWith(expectedEmail);
  };

  // Helper function to verify unexpected error response
  const expectUnexpectedError = (response: Response, responseData: any) => {
    expect(response.status).toBe(500);
    expect(responseData).toEqual({
      success: false,
      message: 'An unexpected error occurred',
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success scenarios', () => {
    it('successfully resends verification email for valid email', async () => {
      mockSuccessfulResend();
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectSuccessResponse(response, responseData, mockResendVerificationData.email);
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

    it('returns validation error for email with invalid domain', async () => {
      await testValidationError({ email: 'test@invalid' });
    });
  });

  describe('Service errors', () => {
    it('handles user not found error', async () => {
      mockServiceError('User not found', 404);
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 404, 'User not found', mockResendVerificationData.email);
    });

    it('handles already verified email error', async () => {
      mockServiceError('Email is already verified', 409);
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 409, 'Email is already verified', mockResendVerificationData.email);
    });

    it('handles rate limiting error', async () => {
      mockServiceError('Too many verification emails sent. Please try again later.', 429);
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 429, 'Too many verification emails sent. Please try again later.', mockResendVerificationData.email);
    });

    it('handles email service failure error', async () => {
      mockServiceError('Failed to send verification email', 503);
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 503, 'Failed to send verification email', mockResendVerificationData.email);
    });

    it('handles database error', async () => {
      mockServiceError('Database connection failed', 500);
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 500, 'Database connection failed', mockResendVerificationData.email);
    });

    it('handles service error without status code', async () => {
      mockServiceError('Service error');
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 400, 'Service error', mockResendVerificationData.email);
    });

    it('handles service error without message', async () => {
      UserService.resendVerificationEmail = jest.fn().mockResolvedValue({
        success: false,
        error: { statusCode: 500 },
      });
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 500, 'Unknown error', mockResendVerificationData.email);
    });
  });

  describe('Unexpected errors', () => {
    it('handles service method throwing an error', async () => {
      UserService.resendVerificationEmail = jest.fn().mockRejectedValue(new Error('Network error'));
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectUnexpectedError(response, responseData);
      expect(UserService.resendVerificationEmail).toHaveBeenCalledWith(mockResendVerificationData.email);
    });

    it('handles malformed JSON request', async () => {
      const req = new NextRequest('https://example.com');
      (req.json as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));
      const response = await POST(req);
      const responseData = await response.json();
      expectUnexpectedError(response, responseData);
      expect(UserService.resendVerificationEmail).not.toHaveBeenCalled();
    });

    it('handles service returning null', async () => {
      UserService.resendVerificationEmail = jest.fn().mockResolvedValue(null);
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 400, 'Unknown error', mockResendVerificationData.email);
    });

    it('handles service returning undefined', async () => {
      UserService.resendVerificationEmail = jest.fn().mockResolvedValue(undefined);
      const { response, responseData } = await executeRequest(mockResendVerificationData);
      expectServiceError(response, responseData, 400, 'Unknown error', mockResendVerificationData.email);
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
        ...mockResendVerificationData,
        extraField: 'should be ignored',
        anotherField: 123,
      };
      mockSuccessfulResend();
      const { response, responseData } = await executeRequest(dataWithExtra);
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(UserService.resendVerificationEmail).toHaveBeenCalledWith(mockResendVerificationData.email);
    });

    it('handles very long email address', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const dataWithLongEmail = { email: longEmail };
      mockSuccessfulResend();
      const { response, responseData } = await executeRequest(dataWithLongEmail);
      expectSuccessResponse(response, responseData, longEmail);
    });

    it('handles email with unicode characters as validation error', async () => {
      const unicodeEmail = 'tëst@ëxämplë.com';
      const { response, responseData } = await executeRequest({ email: unicodeEmail });
      expectValidationError(response, responseData);
    });

    it('handles email with plus addressing', async () => {
      const plusEmail = 'test+tag@example.com';
      const dataWithPlusEmail = { email: plusEmail };
      mockSuccessfulResend();
      const { response, responseData } = await executeRequest(dataWithPlusEmail);
      expectSuccessResponse(response, responseData, plusEmail);
    });
  });
});
