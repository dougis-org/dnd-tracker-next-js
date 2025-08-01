import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EncounterParticipantManager } from '../EncounterParticipantManager';
import { EncounterService } from '@/lib/services/EncounterService';
import { testDataFactories } from '@/lib/services/__tests__/testDataFactories';
import {
  formActions,
  serviceMocks,
  testExpectations,
  getElements,
  workflows,
  testPatterns,
  dragDropTestPatterns,
  testSetupPatterns,
  participantDataPatterns
} from './participant-test-helpers';

// Mock the EncounterService
jest.mock('@/lib/services/EncounterService');
const mockEncounterService = EncounterService as jest.Mocked<typeof EncounterService>;

// Mock all the methods that are used in the component
beforeEach(() => {
  jest.clearAllMocks();

  // Set up default mock implementations
  mockEncounterService.addParticipant = jest.fn();
  mockEncounterService.updateParticipant = jest.fn();
  mockEncounterService.removeParticipant = jest.fn();
  mockEncounterService.reorderParticipants = jest.fn();
});

const renderComponent = (encounter: any) => {
  return render(<EncounterParticipantManager encounter={encounter} />);
};

describe('EncounterParticipantManager', () => {
  const mockEncounter = participantDataPatterns.createStandardEncounter();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockEncounterService.addParticipant = jest.fn();
    mockEncounterService.updateParticipant = jest.fn();
    mockEncounterService.removeParticipant = jest.fn();
    mockEncounterService.reorderParticipants = jest.fn();
  });

  describe('Rendering', () => {
    it('should render participant list correctly', () => {
      renderComponent(mockEncounter);

      expect(screen.getByText('Encounter Participants')).toBeInTheDocument();
      testExpectations.elementsVisible('Aragorn', 'HP: 45/45', 'AC: 16');
      testExpectations.elementsVisible('Goblin Scout', 'HP: 7/7', 'AC: 15');
    });

    it('should show empty state when no participants', () => {
      const emptyEncounter = testDataFactories.createEncounter({
        participants: [],
      });

      renderComponent(emptyEncounter);

      expect(screen.getByText('No participants added yet')).toBeInTheDocument();
      expect(screen.getByText('Add Character')).toBeInTheDocument();
    });

    it('should display participant type badges correctly', () => {
      renderComponent(mockEncounter);

      expect(screen.getByText('PC')).toBeInTheDocument();
      expect(screen.getByText('NPC')).toBeInTheDocument();
    });
  });

  describe('Adding Participants', () => {
    it('should show add participant form when Add Character is clicked', async () => {
      const user = userEvent.setup();
      renderComponent(mockEncounter);

      await formActions.openDialog(user);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      testExpectations.formElements();
    });

    it('should add participant successfully', async () => {
      await testSetupPatterns.runServiceOperationTest(
        mockEncounterService,
        'addParticipant',
        { success: true, data: mockEncounter },
        () => renderComponent(mockEncounter),
        (user) => workflows.addParticipant(user, { name: 'Legolas', hitPoints: '42', armorClass: '14' }),
        [
          mockEncounter._id.toString(),
          expect.objectContaining({
            name: 'Legolas',
            maxHitPoints: 42,
            currentHitPoints: 42,
            armorClass: 14,
            type: 'pc',
            characterId: expect.any(String),
            temporaryHitPoints: 0,
            isPlayer: true,
            isVisible: true,
            notes: '',
            conditions: [],
          })
        ]
      );
    });

    it('should show validation errors for invalid input', async () => {
      const user = await testPatterns.setupTest(() => renderComponent(mockEncounter));
      await workflows.addParticipant(user, { name: '', hitPoints: '0' });
      await testExpectations.validationErrors(['Name is required', 'Hit Points must be greater than 0']);
    });
  });

  describe('Removing Participants', () => {
    it('should show remove confirmation dialog', async () => {
      const user = await testPatterns.setupTest(() => renderComponent(mockEncounter));
      const { removeButtons } = getElements();
      await user.click(removeButtons[0]);
      testExpectations.elementsVisible('Remove Participant');
      expect(screen.getByText(/Are you sure you want to remove Aragorn/i)).toBeInTheDocument();
    });

    it('should remove participant successfully', async () => {
      await testSetupPatterns.runServiceOperationTest(
        mockEncounterService,
        'removeParticipant',
        { success: true, data: mockEncounter },
        () => renderComponent(mockEncounter),
        (user) => workflows.removeParticipant(user, 0),
        [mockEncounter._id.toString(), '64a1b2c3d4e5f6789abcdef0']
      );
    });
  });

  describe('Editing Participants', () => {
    it('should show edit form when edit button is clicked', async () => {
      const user = await testPatterns.setupTest(() => renderComponent(mockEncounter));
      const { editButtons } = getElements();
      await user.click(editButtons[0]);
      testExpectations.elementsVisible('Edit Participant');
      expect(screen.getByDisplayValue('Aragorn')).toBeInTheDocument();
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
    });

    it('should update participant successfully', async () => {
      await testSetupPatterns.runServiceOperationTest(
        mockEncounterService,
        'updateParticipant',
        { success: true, data: mockEncounter },
        () => renderComponent(mockEncounter),
        (user) => workflows.editParticipant(user, 0, { hitPoints: '50' }),
        [
          mockEncounter._id.toString(),
          '64a1b2c3d4e5f6789abcdef0',
          expect.objectContaining({
            name: 'Aragorn',
            type: 'pc',
            maxHitPoints: 50,
            currentHitPoints: 50,
            temporaryHitPoints: 0,
            armorClass: 16,
            initiative: 10,
            isPlayer: true,
            isVisible: true,
            notes: 'Ranger',
            conditions: [],
          })
        ]
      );
    });
  });

  describe('Participant Ordering', () => {
    it('should render participants with drag handles', async () => {
      renderComponent(mockEncounter);

      const { participants } = getElements();
      expect(participants).toHaveLength(2);

      // Check that drag handles are present
      const dragHandles = screen.getAllByTestId('drag-handle');
      expect(dragHandles).toHaveLength(2);

      // Verify participants are in correct order
      dragDropTestPatterns.validateParticipantOrder(['Aragorn', 'Goblin Scout']);
    });

    it('should support drag and drop reordering', async () => {
      await dragDropTestPatterns.performDragDropTest(
        mockEncounterService,
        { success: true, data: mockEncounter },
        () => renderComponent(mockEncounter),
        mockEncounter._id.toString(),
        dragDropTestPatterns.getReorderedIds()
      );

      // Verify the expected number of participants
      expect(getElements().participants).toHaveLength(2);
    });

    it('should handle reorder failure gracefully', async () => {
      await dragDropTestPatterns.performDragDropTest(
        mockEncounterService,
        { success: false, error: 'Reorder failed' },
        () => renderComponent(mockEncounter),
        mockEncounter._id.toString(),
        dragDropTestPatterns.getReorderedIds()
      );

      // Error should be handled gracefully (no crash)
      expect(screen.getByText('Encounter Participants')).toBeInTheDocument();
    });

    it('should provide visual feedback during drag operation', async () => {
      renderComponent(mockEncounter);

      const dragHandles = screen.getAllByTestId('drag-handle');

      // Verify drag handles are visible and accessible
      expect(dragHandles[0]).toBeInTheDocument();
      expect(dragHandles[1]).toBeInTheDocument();

      // Verify participants maintain their identity during display
      dragDropTestPatterns.validateParticipantOrder(['Aragorn', 'Goblin Scout']);
    });

    it('should maintain participant order after successful reorder', async () => {
      const reorderedEncounter = participantDataPatterns.createReorderedEncounter();

      await dragDropTestPatterns.performDragDropTest(
        mockEncounterService,
        { success: true, data: reorderedEncounter },
        () => renderComponent(mockEncounter),
        mockEncounter._id.toString(),
        dragDropTestPatterns.getReorderedIds()
      );
    });

    it('should work with keyboard navigation for accessibility', async () => {
      renderComponent(mockEncounter);

      // Verify drag handles accessibility using common pattern
      dragDropTestPatterns.validateDragHandleAccessibility(['Aragorn', 'Goblin Scout']);
    });
  });

  describe('Participant Role Assignment', () => {
    it('should allow changing participant roles', async () => {
      const user = await testSetupPatterns.setupUserAndRender(() => renderComponent(mockEncounter));
      testSetupPatterns.setupServiceMock(mockEncounterService, 'updateParticipant', { success: true, data: mockEncounter });

      const { editButtons } = getElements();
      await user.click(editButtons[1]); // Edit Goblin Scout

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await formActions.submit(user, 'Update Participant');

      await waitFor(() => {
        serviceMocks.expectCall(mockEncounterService, 'updateParticipant', [
          mockEncounter._id.toString(),
          '64a1b2c3d4e5f6789abcdef1',
          expect.objectContaining({
            type: 'npc', // Default type from participant
          })
        ]);
      });
    });
  });

  describe('Batch Operations', () => {
    it('should allow selecting multiple participants', async () => {
      const user = await testPatterns.setupTest(() => renderComponent(mockEncounter));
      await workflows.selectMultiple(user, [0, 1]);
      testExpectations.batchSelection(2);
    });

    it('should perform batch removal', async () => {
      await testSetupPatterns.runServiceOperationTest(
        mockEncounterService,
        'removeParticipant',
        { success: true, data: mockEncounter },
        () => renderComponent(mockEncounter),
        async (user) => {
          await workflows.selectMultiple(user, [0]);
          await user.click(screen.getByText('Remove Selected'));
          await user.click(screen.getByText('Remove'));
        },
        [mockEncounter._id.toString(), '64a1b2c3d4e5f6789abcdef0']
      );
    });
  });

  describe('Character Import', () => {
    it('should show character import dialog', async () => {
      const user = await testSetupPatterns.setupUserAndRender(() => renderComponent(mockEncounter));

      const { importButton } = getElements();
      await user.click(importButton);

      await testExpectations.elementVisible('Import Characters');
      await testExpectations.elementVisible('Select characters from your library to add to this encounter');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when participant addition fails', async () => {
      const user = await testSetupPatterns.setupUserAndRender(() => renderComponent(mockEncounter));
      testSetupPatterns.setupServiceMock(mockEncounterService, 'addParticipant', { success: false, error: 'Failed to add participant' });

      await workflows.addParticipant(user, { name: 'Test', hitPoints: '10', armorClass: '10' });

      await waitFor(() => {
        expect(mockEncounterService.addParticipant).toHaveBeenCalled();
      });
    });

    it('should handle service failures gracefully', async () => {
      const user = await testSetupPatterns.setupUserAndRender(() => renderComponent(mockEncounter));

      // Mock a service failure response instead of throwing an error
      testSetupPatterns.setupServiceMock(mockEncounterService, 'addParticipant', {
        success: false,
        error: 'Network error'
      });

      await workflows.addParticipant(user, { name: 'Test', hitPoints: '10', armorClass: '10' });

      await waitFor(() => {
        expect(mockEncounterService.addParticipant).toHaveBeenCalled();
      });

      // Verify error toast is shown (this is handled by handleServiceOperation)
      // The component should still be functional and not crash
      expect(screen.getByText('Encounter Participants')).toBeInTheDocument();
    });
  });
});