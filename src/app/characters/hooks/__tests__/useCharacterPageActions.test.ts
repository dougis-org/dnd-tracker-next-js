import { renderHook, act, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCharacterPageActions } from '../useCharacterPageActions';
import { CharacterService } from '@/lib/services/CharacterService';
import type { Character } from '@/lib/validations/character';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('next-auth/react');
jest.mock('@/lib/services/CharacterService');
jest.mock('@/components/modals/ConfirmationDialog', () => ({
  useConfirmationDialog: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    ConfirmationDialog: () => null,
  }),
}));

const mockPush = jest.fn();
const mockRouter = { push: mockPush };

const mockSession = {
  user: { id: 'user123' },
};

const mockCharacter: Character = {
  _id: 'char123',
  name: 'Test Character',
  userId: 'user123',
  level: 1,
  race: 'Human',
  characterClass: 'Fighter',
  hitPoints: { current: 10, maximum: 10 },
  armorClass: 15,
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 12,
    wisdom: 13,
    charisma: 10,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
} as Character;

// Test helpers
const setupAuthenticatedUser = () => {
  (useSession as jest.Mock).mockReturnValue({
    data: mockSession,
    status: 'authenticated',
  });
};

const setupUnauthenticatedUser = () => {
  (useSession as jest.Mock).mockReturnValue({
    data: null,
    status: 'unauthenticated',
  });
};

const renderHookWithDefaults = () => renderHook(() => useCharacterPageActions());

const testServiceCall = async (
  serviceMethod: jest.Mock,
  hookMethod: string,
  character: Character,
  expectedArgs: any[]
) => {
  const { SecureHookMethodCaller } = require('../../../../test-utils/secure-method-calls');
  const { result } = renderHookWithDefaults();
  await act(async () => {
    await SecureHookMethodCaller.callHookMethod(result.current, hookMethod, character);
  });
  expect(serviceMethod).toHaveBeenCalledWith(...expectedArgs);
};

const testUnauthenticatedAction = async (
  serviceMethod: jest.Mock,
  hookMethod: string,
  character: Character
) => {
  setupUnauthenticatedUser();
  const { result } = renderHookWithDefaults();
  await act(async () => {
    await result.current[hookMethod](character);
  });
  expect(serviceMethod).not.toHaveBeenCalled();
};

describe('useCharacterPageActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    setupAuthenticatedUser();
  });

  describe('navigation actions', () => {
    it('should navigate to character detail page when selectCharacter is called', () => {
      const { result } = renderHookWithDefaults();

      act(() => {
        result.current.selectCharacter(mockCharacter);
      });

      expect(mockPush).toHaveBeenCalledWith('/characters/char123');
    });

    it('should navigate to character edit page when editCharacter is called', () => {
      const { result } = renderHookWithDefaults();

      act(() => {
        result.current.editCharacter(mockCharacter);
      });

      expect(mockPush).toHaveBeenCalledWith('/characters/char123');
    });
  });

  describe('form actions', () => {
    it('should manage creation form open state', () => {
      const { result } = renderHookWithDefaults();

      expect(result.current.isCreationFormOpen).toBe(false);

      act(() => {
        result.current.openCreationForm();
      });

      expect(result.current.isCreationFormOpen).toBe(true);

      act(() => {
        result.current.closeCreationForm();
      });

      expect(result.current.isCreationFormOpen).toBe(false);
    });

    it('should handle creation success and navigate to new character', () => {
      const { result } = renderHookWithDefaults();

      act(() => {
        result.current.openCreationForm();
      });

      expect(result.current.isCreationFormOpen).toBe(true);

      act(() => {
        result.current.handleCreationSuccess({ _id: 'newchar123' });
      });

      expect(result.current.isCreationFormOpen).toBe(false);
      expect(mockPush).toHaveBeenCalledWith('/characters/newchar123');
    });

    it('should close form when creation success has no character ID', () => {
      const { result } = renderHookWithDefaults();

      act(() => {
        result.current.openCreationForm();
      });

      expect(result.current.isCreationFormOpen).toBe(true);

      act(() => {
        result.current.handleCreationSuccess({});
      });

      expect(result.current.isCreationFormOpen).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('character actions', () => {
    describe('deleteCharacter', () => {
      it('should show confirmation dialog and delete character on confirm', async () => {
        (CharacterService.deleteCharacter as jest.Mock).mockResolvedValue({
          success: true,
        });

        await testServiceCall(
          CharacterService.deleteCharacter as jest.Mock,
          'deleteCharacter',
          mockCharacter,
          ['char123', 'user123']
        );
      });

      it('should handle deletion failure', async () => {
        const mockError = {
          success: false,
          error: { code: 'CHARACTER_NOT_FOUND', message: 'Character not found' },
        };
        (CharacterService.deleteCharacter as jest.Mock).mockResolvedValue(mockError);

        await testServiceCall(
          CharacterService.deleteCharacter as jest.Mock,
          'deleteCharacter',
          mockCharacter,
          ['char123', 'user123']
        );
      });

      it('should not delete if user is not authenticated', async () => {
        await testUnauthenticatedAction(
          CharacterService.deleteCharacter as jest.Mock,
          'deleteCharacter',
          mockCharacter
        );
      });
    });

    describe('duplicateCharacter', () => {
      beforeEach(() => {
        // Mock window.prompt
        global.prompt = jest.fn().mockReturnValue('Test Character (Copy)');
      });

      it('should prompt for name and duplicate character', async () => {
        const mockClonedCharacter = {
          ...mockCharacter,
          _id: 'cloned123',
          name: 'Test Character (Copy)',
        };

        (CharacterService.cloneCharacter as jest.Mock).mockResolvedValue({
          success: true,
          data: mockClonedCharacter,
        });

        await testServiceCall(
          CharacterService.cloneCharacter as jest.Mock,
          'duplicateCharacter',
          mockCharacter,
          ['char123', 'user123', 'Test Character (Copy)']
        );

        expect(global.prompt).toHaveBeenCalledWith(
          'Enter name for the duplicate character:',
          'Test Character (Copy)'
        );
      });

      it('should handle duplication failure', async () => {
        const mockError = {
          success: false,
          error: { code: 'CHARACTER_LIMIT_EXCEEDED', message: 'Character limit exceeded' },
        };
        (CharacterService.cloneCharacter as jest.Mock).mockResolvedValue(mockError);

        const { result } = renderHookWithDefaults();

        await act(async () => {
          await result.current.duplicateCharacter(mockCharacter);
        });

        expect(CharacterService.cloneCharacter).toHaveBeenCalled();
      });

      it('should cancel duplication if user cancels prompt', async () => {
        global.prompt = jest.fn().mockReturnValue(null);

        const { result } = renderHookWithDefaults();

        await act(async () => {
          await result.current.duplicateCharacter(mockCharacter);
        });

        expect(CharacterService.cloneCharacter).not.toHaveBeenCalled();
      });

      it('should not duplicate if user is not authenticated', async () => {
        await testUnauthenticatedAction(
          CharacterService.cloneCharacter as jest.Mock,
          'duplicateCharacter',
          mockCharacter
        );
      });
    });
  });

  describe('loading states', () => {
    it('should have isDeleting state available', () => {
      const { result } = renderHook(() => useCharacterPageActions());
      expect(typeof result.current.isDeleting).toBe('boolean');
      expect(result.current.isDeleting).toBe(false);
    });

    it('should track loading state for duplicate operations', async () => {
      (CharacterService.cloneCharacter as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockCharacter }), 100))
      );

      const { result } = renderHook(() => useCharacterPageActions());

      expect(result.current.isDuplicating).toBe(false);

      act(() => {
        result.current.duplicateCharacter(mockCharacter);
      });

      expect(result.current.isDuplicating).toBe(true);

      await waitFor(() => {
        expect(result.current.isDuplicating).toBe(false);
      });
    });
  });
});