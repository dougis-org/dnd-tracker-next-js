import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterStatsManager } from '../CharacterStatsManager';
import { CharacterService } from '@/lib/services/CharacterService';
import { CharacterServiceClient } from '@/lib/services/CharacterServiceClient';
import { renderWithProviders } from '@/lib/test-utils';
import { createMockCharacter, createMockStats } from '../__tests__/CharacterStatsManager.test-helpers';

// Mock the CharacterService
jest.mock('@/lib/services/CharacterService', () => ({
  CharacterService: {
    getCharacterById: jest.fn(),
    calculateCharacterStats: jest.fn(),
    updateCharacter: jest.fn(),
    saveDraftChanges: jest.fn(),
    getDraftChanges: jest.fn(),
    clearDraftChanges: jest.fn(),
  }
}));

// Mock the CharacterServiceClient
jest.mock('@/lib/services/CharacterServiceClient', () => ({
  CharacterServiceClient: {
    getCharacterById: jest.fn(),
    updateCharacter: jest.fn(),
  }
}));

const mockCharacter = createMockCharacter();
const mockStats = createMockStats();

// Helper function to reduce test duplication
const renderCharacterStatsManager = () => {
  return renderWithProviders(
    <CharacterStatsManager characterId="char-123" userId="user-123" />
  );
};

describe('CharacterAutosave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (CharacterServiceClient.getCharacterById as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCharacter
    });
    (CharacterService.calculateCharacterStats as jest.Mock).mockResolvedValue({
      success: true,
      data: mockStats
    });
    (CharacterService.saveDraftChanges as jest.Mock).mockResolvedValue({
      success: true
    });
    (CharacterService.getDraftChanges as jest.Mock).mockResolvedValue({
      success: true,
      data: null
    });
    (CharacterService.clearDraftChanges as jest.Mock).mockResolvedValue({
      success: true
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should automatically save draft changes after 2 seconds of inactivity', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderCharacterStatsManager();

    // Wait for component to load
    await screen.findByTestId('character-stats-manager');

    // Enter edit mode
    const editButton = screen.getByTestId('edit-stats-button');
    await user.click(editButton);

    // Change strength score
    const strengthInput = screen.getByTestId('ability-strength-input');
    fireEvent.change(strengthInput, { target: { value: '18' } });

    // Fast forward 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should have called autosave
    expect(CharacterService.saveDraftChanges).toHaveBeenCalledWith(
      'char-123',
      'user-123',
      expect.objectContaining({
        abilityScores: expect.objectContaining({
          strength: 18
        })
      })
    );
  });

  it('should display autosave indicator when saving', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderCharacterStatsManager();

    await screen.findByTestId('character-stats-manager');

    const editButton = screen.getByTestId('edit-stats-button');
    await user.click(editButton);

    const strengthInput = screen.getByTestId('ability-strength-input');
    await user.clear(strengthInput);
    await user.type(strengthInput, '18');

    // Fast forward to trigger autosave
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('autosave-indicator')).toBeInTheDocument();
    expect(screen.getByText('Saving draft...')).toBeInTheDocument();
  });

  it('should show autosave success message', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderCharacterStatsManager();

    await screen.findByTestId('character-stats-manager');

    const editButton = screen.getByTestId('edit-stats-button');
    await user.click(editButton);

    const strengthInput = screen.getByTestId('ability-strength-input');
    await user.clear(strengthInput);
    await user.type(strengthInput, '18');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Wait for autosave to complete
    await screen.findByTestId('autosave-success');
    expect(screen.getByText('Draft saved')).toBeInTheDocument();
  });

  it('should reset autosave timer on new changes', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderCharacterStatsManager();

    await screen.findByTestId('character-stats-manager');

    const editButton = screen.getByTestId('edit-stats-button');
    await user.click(editButton);

    const strengthInput = screen.getByTestId('ability-strength-input');

    // First change
    await user.clear(strengthInput);
    await user.type(strengthInput, '17');

    // Advance 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Second change before autosave triggers
    await user.clear(strengthInput);
    await user.type(strengthInput, '18');

    // Advance another 1.5 seconds (total 2.5, but timer should have reset)
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    // Should not have autosaved yet
    expect(CharacterService.saveDraftChanges).not.toHaveBeenCalled();

    // Advance another 0.5 seconds to complete 2 seconds since last change
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now should have autosaved
    expect(CharacterService.saveDraftChanges).toHaveBeenCalledTimes(1);
  });

  it('should not autosave when no changes are made', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderCharacterStatsManager();

    await screen.findByTestId('character-stats-manager');

    const editButton = screen.getByTestId('edit-stats-button');
    await user.click(editButton);

    // No changes made, advance time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(CharacterService.saveDraftChanges).not.toHaveBeenCalled();
  });

  it('should load and restore draft changes on component mount', async () => {
    const draftChanges = {
      abilityScores: { strength: 20 },
      backstory: 'Draft backstory changes'
    };

    (CharacterService.getDraftChanges as jest.Mock).mockResolvedValue({
      success: true,
      data: draftChanges
    });

    renderCharacterStatsManager();

    await screen.findByTestId('character-stats-manager');

    // Should show draft indicator
    expect(screen.getByTestId('draft-indicator')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved draft changes')).toBeInTheDocument();

    // Should show restore button
    expect(screen.getByTestId('restore-draft-button')).toBeInTheDocument();
  });

  it('should allow restoring draft changes', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const draftChanges = {
      abilityScores: { strength: 20 },
      backstory: 'Draft backstory changes'
    };

    (CharacterService.getDraftChanges as jest.Mock).mockResolvedValue({
      success: true,
      data: draftChanges
    });

    renderCharacterStatsManager();

    await screen.findByTestId('character-stats-manager');

    const restoreButton = screen.getByTestId('restore-draft-button');
    await user.click(restoreButton);

    // Should enter edit mode with draft changes applied
    expect(screen.getByTestId('ability-strength-input')).toHaveValue(20);
  });

  it('should allow discarding draft changes', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const draftChanges = {
      abilityScores: { strength: 20 }
    };

    (CharacterService.getDraftChanges as jest.Mock).mockResolvedValue({
      success: true,
      data: draftChanges
    });
    (CharacterService.clearDraftChanges as jest.Mock).mockResolvedValue({
      success: true
    });

    renderCharacterStatsManager();

    await screen.findByTestId('character-stats-manager');

    const discardButton = screen.getByTestId('discard-draft-button');
    await user.click(discardButton);

    // Wait for the draft indicator to be removed
    await waitFor(() => {
      expect(screen.queryByTestId('draft-indicator')).not.toBeInTheDocument();
    });
  });
});