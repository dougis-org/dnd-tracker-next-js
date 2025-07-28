import { UserService } from '@/lib/services/UserService';
import { userProfileUpdateSchema } from '@/lib/validations/user';
import {
  withUserOwnership,
  createSuccessResponse,
  handleApiError
} from '@/lib/api/auth-middleware';

export const PATCH = withUserOwnership(async (authResult, request, _context) => {
  try {
    const { userId } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = userProfileUpdateSchema.parse(body);

    const result = await UserService.updateUserProfile(userId, validatedBody);

    if (!result.success) throw new Error(result.error?.message || 'Profile update failed');

    return createSuccessResponse(result.data, 'Profile updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
});

export const GET = withUserOwnership(async (authResult) => {
  try {
    const { userId } = authResult;
    const result = await UserService.getUserById(userId);

    if (!result.success) throw new Error(result.error?.message || 'User not found');

    return createSuccessResponse(result.data);
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withUserOwnership(async (authResult) => {
  try {
    const { userId } = authResult;
    const result = await UserService.deleteUser(userId);

    if (!result.success) throw new Error(result.error?.message || 'Account deletion failed');

    return createSuccessResponse(result.data, 'Account deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
});