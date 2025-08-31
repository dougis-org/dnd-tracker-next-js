import { renderHook, act } from '@testing-library/react';
import { useUser } from '@clerk/nextjs';
import { useSettingsForm } from '../useSettingsForm';
import { updateUser } from '@/lib/api/users';
import '@testing-library/jest-dom';
import {
  createMockUserReturn,
  expectValidationErrors,
  actAsync,
  setupUseSettingsFormTest,
  createProfileDataWith,
  createValidationErrors,
  expectNoApiCall,
  expectApiCallWith,
  testFormSubmission,
  testLoadingDuringSubmission,
  testValidationError,
} from './test-helpers';

// Mock Clerk
jest.mock('@clerk/nextjs');
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Mock user API
jest.mock('@/lib/api/users');
const mockUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>;

describe('useSettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue(createMockUserReturn());
  });

  describe('Initial State', () => {
    it('should initialize with user profile data', () => {
      const { result } = renderHook(() => useSettingsForm());

      expect(result.current.profileData).toEqual(createProfileDataWith());
    });

    it('should initialize with user notification preferences', () => {
      const { result } = renderHook(() => useSettingsForm());

      expect(result.current.notifications).toEqual({
        email: true,
        combat: false,
        encounters: true,
        weeklyDigest: false,
        productUpdates: true,
        securityAlerts: true,
      });
    });

    it('should initialize with empty states', () => {
      const { result } = renderHook(() => useSettingsForm());

      expect(result.current.formErrors).toEqual({});
      expect(result.current.message).toBeNull();
      expect(result.current.isLoadingProfile).toBe(false);
      expect(result.current.isLoadingNotifications).toBe(false);
    });
  });

  describe('Profile Data Management', () => {
    it('should update profile data', () => {
      const { result } = renderHook(() => useSettingsForm());
      const updatedData = createProfileDataWith({ name: 'Updated Name', email: 'updated@example.com' });

      act(() => {
        result.current.setProfileData(updatedData);
      });

      expect(result.current.profileData).toEqual(updatedData);
    });
  });

  describe('Notification Management', () => {
    it('should toggle notification preferences', () => {
      const { result } = renderHook(() => useSettingsForm());

      act(() => {
        result.current.handleNotificationChange('email');
      });

      expect(result.current.notifications.email).toBe(false);
    });

    it('should toggle multiple notification preferences', () => {
      const { result } = renderHook(() => useSettingsForm());

      act(() => {
        result.current.handleNotificationChange('combat');
        result.current.handleNotificationChange('weeklyDigest');
      });

      expect(result.current.notifications.combat).toBe(true);
      expect(result.current.notifications.weeklyDigest).toBe(true);
    });
  });

  describe('Profile Form Submission', () => {
    it('should handle successful profile submission', async () => {
      await testFormSubmission('profile', mockUpdateUser, true);
      expectApiCallWith(mockUpdateUser, '1', createProfileDataWith());
    });

    it('should handle profile submission with validation errors', async () => {
      const { result } = renderHook(() => useSettingsForm());
      const invalidData = createProfileDataWith({ name: '', email: 'invalid-email' });
      const expectedErrors = createValidationErrors({
        name: 'Name is required',
        email: 'Please enter a valid email address',
      });

      act(() => {
        result.current.setProfileData(invalidData);
      });

      const { mockEvent } = setupUseSettingsFormTest();

      await actAsync(async () => {
        await result.current.handleProfileSubmit(mockEvent);
      });

      expectValidationErrors(result, expectedErrors);
      expectNoApiCall(mockUpdateUser);
    });

    it('should handle profile submission API error', async () => {
      await testFormSubmission('profile', mockUpdateUser, false);
    });

    it('should show loading state during profile submission', async () => {
      await testLoadingDuringSubmission('profile', mockUpdateUser);
    });
  });

  describe('Notifications Form Submission', () => {
    it('should handle successful notifications submission', async () => {
      const { result } = await testFormSubmission('notifications', mockUpdateUser, true);
      expectApiCallWith(mockUpdateUser, '1', {
        notifications: result.current.notifications,
      });
    });

    it('should handle notifications submission API error', async () => {
      await testFormSubmission('notifications', mockUpdateUser, false);
    });

    it('should show loading state during notifications submission', async () => {
      await testLoadingDuringSubmission('notifications', mockUpdateUser);
    });
  });

  describe('Form Validation', () => {
    it('should validate required name field', async () => {
      await testValidationError(
        createProfileDataWith({ name: '', email: 'test@example.com' }),
        'name',
        'Name is required'
      );
    });

    it('should validate name minimum length', async () => {
      await testValidationError(
        createProfileDataWith({ name: 'A', email: 'test@example.com' }),
        'name',
        'Name must be at least 2 characters'
      );
    });

    it('should validate email format', async () => {
      await testValidationError(
        createProfileDataWith({ name: 'Test User', email: 'invalid-email' }),
        'email',
        'Please enter a valid email address'
      );
    });

    it('should clear form errors on new submission', async () => {
      const { result } = renderHook(() => useSettingsForm());
      const { mockEvent } = setupUseSettingsFormTest();

      // First submission with errors
      const invalidData = createProfileDataWith({ name: '', email: 'invalid' });
      act(() => {
        result.current.setProfileData(invalidData);
      });

      await actAsync(async () => {
        await result.current.handleProfileSubmit(mockEvent);
      });

      expect(Object.keys(result.current.formErrors)).toHaveLength(2);

      // Fix the data and submit again
      const validData = createProfileDataWith();
      act(() => {
        result.current.setProfileData(validData);
      });

      mockUpdateUser.mockResolvedValue({ success: true });

      await actAsync(async () => {
        await result.current.handleProfileSubmit(mockEvent);
      });

      expect(result.current.formErrors).toEqual({});
    });
  });
});