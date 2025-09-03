import { Types } from 'mongoose';
import { EncounterService } from '../EncounterService';
import type { IEncounter } from '../../models/encounter/interfaces';
import { Encounter } from '../../models/encounter';
import { Character } from '../../models/Character';

// Mock the database models
jest.mock('../../models/encounter', () => ({
  Encounter: {
    findById: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../../models/Character', () => ({
  Character: {
    find: jest.fn(),
    create: jest.fn(),
  },
}));

describe('EncounterService Integration Tests', () => {
  let mockUserId: string;
  let mockEncounterId: string;
  let mockEncounter: IEncounter;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserId = new Types.ObjectId().toString();
    mockEncounterId = new Types.ObjectId().toString();

    mockEncounter = {
      _id: new Types.ObjectId(mockEncounterId),
      ownerId: new Types.ObjectId(mockUserId),
      name: 'Test Integration Encounter',
      description: 'Integration test encounter',
      tags: ['integration', 'test'],
      difficulty: 'medium',
      estimatedDuration: 45,
      targetLevel: 4,
      status: 'draft',
      isPublic: false,
      sharedWith: [],
      version: 1,
      participants: [
        {
          characterId: new Types.ObjectId(),
          name: 'Test Character',
          type: 'pc',
          maxHitPoints: 30,
          currentHitPoints: 30,
          temporaryHitPoints: 0,
          armorClass: 16,
          initiative: 14,
          isPlayer: true,
          isVisible: true,
          notes: 'Test notes',
          conditions: [],
        },
      ],
      settings: {
        allowPlayerVisibility: true,
        autoRollInitiative: false,
        trackResources: true,
        enableLairActions: false,
        enableGridMovement: false,
        gridSize: 5,
      },
      combatState: {
        isActive: false,
        currentRound: 0,
        currentTurn: 0,
        totalDuration: 0,
        initiativeOrder: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as IEncounter;
  });

  describe('Import/Export Integration', () => {
    it('should export and import encounter successfully', async () => {
      // Arrange
      const newEncounterId = new Types.ObjectId();
      const createdEncounter = { ...mockEncounter, _id: newEncounterId };

      // Mock the database models
      (Encounter.findById as jest.Mock).mockResolvedValue(mockEncounter);
      (Character.find as jest.Mock).mockResolvedValue([]);
      (Encounter.create as jest.Mock).mockResolvedValue(createdEncounter);
      (Character.create as jest.Mock).mockResolvedValue({});

      // Act - Export
      const exportResult = await EncounterService.exportToJson(
        mockEncounterId,
        mockUserId,
        { includeCharacterSheets: false }
      );

      // Assert - Export
      expect(exportResult.success).toBe(true);
      expect(exportResult.data).toBeDefined();
      expect(Encounter.findById).toHaveBeenCalledWith(mockEncounterId);

      // Act - Import
      if (exportResult.success) {
        const importResult = await EncounterService.importFromJson(
          exportResult.data!,
          { ownerId: mockUserId }
        );

        // Assert - Import
        expect(importResult.success).toBe(true);
        expect(Encounter.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Integration Encounter',
            description: 'Integration test encounter',
            ownerId: mockUserId,
          })
        );
      }
    });

    it('should create template and export it', async () => {
      // Arrange
      // Mock the database models
      (Encounter.findById as jest.Mock).mockResolvedValue(mockEncounter);
      (Character.find as jest.Mock).mockResolvedValue([]);

      // Act
      const templateResult = await EncounterService.createEncounterTemplate(
        mockEncounterId,
        mockUserId,
        'My Template'
      );

      // Assert
      expect(templateResult.success).toBe(true);
      expect(templateResult.data).toBeDefined();
      expect(templateResult.data!.encounter.name).toBe('My Template');
      expect(templateResult.data!.encounter.status).toBe('draft');
      expect(templateResult.data!.encounter.combatState.isActive).toBe(false);
      expect(Encounter.findById).toHaveBeenCalledWith(mockEncounterId);
    });

    it('should generate shareable link', async () => {
      // Arrange
      // Mock the database models
      (Encounter.findById as jest.Mock).mockResolvedValue(mockEncounter);
      (Character.find as jest.Mock).mockResolvedValue([]);

      // Act
      const shareResult = await EncounterService.generateShareableLink(
        mockEncounterId,
        mockUserId
      );

      // Assert
      expect(shareResult.success).toBe(true);
      expect(shareResult.data).toBeDefined();
      expect(shareResult.data!.startsWith('http')).toBe(true);
      expect(shareResult.data!.includes('/encounters/shared/')).toBe(true);
      expect(Encounter.findById).toHaveBeenCalledWith(mockEncounterId);
    });

    it('should export to XML format', async () => {
      // Arrange
      // Mock the database models
      (Encounter.findById as jest.Mock).mockResolvedValue(mockEncounter);
      (Character.find as jest.Mock).mockResolvedValue([]);

      // Act
      const xmlResult = await EncounterService.exportToXml(
        mockEncounterId,
        mockUserId,
        { includeCharacterSheets: false }
      );

      // Assert
      expect(xmlResult.success).toBe(true);
      expect(xmlResult.data).toBeDefined();
      expect(xmlResult.data!.startsWith('<?xml version="1.0"')).toBe(true);
      expect(xmlResult.data!.includes('<encounterExport>')).toBe(true);
      expect(xmlResult.data!.includes('<name>Test Integration Encounter</name>')).toBe(true);
      expect(Encounter.findById).toHaveBeenCalledWith(mockEncounterId);
    });

    it('should handle round-trip export/import with XML', async () => {
      // Arrange
      const newEncounterId = new Types.ObjectId();
      const createdEncounter = { ...mockEncounter, _id: newEncounterId };

      // Mock the database models
      (Encounter.findById as jest.Mock).mockResolvedValue(mockEncounter);
      (Character.find as jest.Mock).mockResolvedValue([]);
      (Encounter.create as jest.Mock).mockResolvedValue(createdEncounter);
      (Character.create as jest.Mock).mockResolvedValue({});

      // Act - Export to XML
      const xmlExportResult = await EncounterService.exportToXml(
        mockEncounterId,
        mockUserId,
        { includeCharacterSheets: false }
      );

      // Assert - Export succeeded
      expect(xmlExportResult.success).toBe(true);
      expect(xmlExportResult.data).toBeDefined();

      // Act - Import from XML
      if (xmlExportResult.success) {
        const xmlImportResult = await EncounterService.importFromXml(
          xmlExportResult.data!,
          { ownerId: mockUserId }
        );

        // Assert - Import succeeded
        expect(xmlImportResult.success).toBe(true);
        expect(Encounter.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Integration Encounter',
            description: 'Integration test encounter',
            ownerId: mockUserId,
          })
        );
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle export failures gracefully', async () => {
      // Arrange
      // Mock the database models to return null (encounter not found)
      (Encounter.findById as jest.Mock).mockResolvedValue(null);
      (Character.find as jest.Mock).mockResolvedValue([]);

      // Act
      const exportResult = await EncounterService.exportToJson(
        'invalid-id',
        mockUserId
      );

      // Assert
      expect(exportResult.success).toBe(false);
      expect(exportResult.error?.message).toBe('Encounter not found');
      expect(Encounter.findById).toHaveBeenCalledWith('invalid-id');
    });

    it('should handle import failures gracefully', async () => {
      // Arrange
      const invalidJsonData = '{"invalid": "data"}';

      // Act
      const importResult = await EncounterService.importFromJson(
        invalidJsonData,
        { ownerId: mockUserId }
      );

      // Assert
      expect(importResult.success).toBe(false);
      expect(importResult.error?.message).toBe('Invalid JSON format');
    });
  });

  describe('Permission Handling Integration', () => {
    it('should prevent unauthorized export', async () => {
      // Arrange
      const differentOwnerIdString = '507f1f77bcf86cd799439011'; // Hardcoded different ObjectId
      const differentOwnerId = new Types.ObjectId(differentOwnerIdString);
      const unauthorizedEncounter = {
        ...mockEncounter,
        ownerId: differentOwnerId, // Different owner
        sharedWith: [], // Not shared
      };

      // Mock the database models to return unauthorized encounter
      (Encounter.findById as jest.Mock).mockResolvedValue(unauthorizedEncounter);
      (Character.find as jest.Mock).mockResolvedValue([]);

      // Act
      const exportResult = await EncounterService.exportToJson(
        mockEncounterId,
        mockUserId // This user is NOT the owner
      );

      // Assert
      expect(exportResult.success).toBe(false);
      expect(exportResult.error?.message).toBe('You do not have permission to export this encounter');
      expect(Encounter.findById).toHaveBeenCalledWith(mockEncounterId);
    });

    it('should prevent unauthorized sharing', async () => {
      // Arrange
      const differentOwnerIdString = '507f1f77bcf86cd799439011'; // Hardcoded different ObjectId
      const differentOwnerId = new Types.ObjectId(differentOwnerIdString);
      const unauthorizedEncounter = {
        ...mockEncounter,
        ownerId: differentOwnerId, // Different owner
        sharedWith: [], // Not shared
      };

      // Mock the database models to return unauthorized encounter
      (Encounter.findById as jest.Mock).mockResolvedValue(unauthorizedEncounter);
      (Character.find as jest.Mock).mockResolvedValue([]);

      // Act
      const shareResult = await EncounterService.generateShareableLink(
        mockEncounterId,
        mockUserId // This user is NOT the owner
      );

      // Assert
      expect(shareResult.success).toBe(false);
      expect(shareResult.error?.message).toBe('You do not have permission to share this encounter');
      expect(Encounter.findById).toHaveBeenCalledWith(mockEncounterId);
    });
  });
});