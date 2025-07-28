import type { CharacterCreation } from './character';
import { characterCreationSchema } from './character';
import { ValidationError } from './base';

/**
 * Error Recovery and Data Backup System for Character Validation
 *
 * Provides mechanisms to:
 * - Auto-save character data during form editing
 * - Recover from validation errors with suggested fixes
 * - Backup character data before operations
 * - Restore character data from backups
 */

export interface CharacterBackup {
  id: string;
  timestamp: Date;
  characterId?: string;
  data: Partial<CharacterCreation>;
  source: 'auto-save' | 'manual' | 'pre-operation';
  isValid: boolean;
}

export interface ValidationErrorWithFix extends ValidationError {
  suggestedFix?: string;
  autoFixable?: boolean;
  autoFixValue?: any;
}

export interface RecoveryOptions {
  enableAutoSave: boolean;
  autoSaveInterval: number; // milliseconds
  maxBackups: number;
  enableSuggestedFixes: boolean;
}

/**
 * Character Data Recovery Manager
 */
export class CharacterDataRecovery {
  private static readonly STORAGE_KEY = 'dnd_character_backups';

  private static readonly AUTO_SAVE_KEY = 'dnd_character_autosave';

  private static defaultOptions: RecoveryOptions = {
    enableAutoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    maxBackups: 10,
    enableSuggestedFixes: true,
  };

  /**
   * Create a backup of character data
   */
  static createBackup(
    data: Partial<CharacterCreation>,
    source: CharacterBackup['source'] = 'manual',
    characterId?: string
  ): CharacterBackup {
    const backup: CharacterBackup = {
      id: `backup_${Date.now()}_${require('crypto').randomBytes(5).toString('hex')}`,
      timestamp: new Date(),
      characterId,
      data: JSON.parse(JSON.stringify(data)), // Deep clone to avoid reference issues
      source,
      isValid: this.validateBackupData(data),
    };

    this.saveBackupToStorage(backup);
    this.cleanupOldBackups();

    return backup;
  }

  /**
   * Auto-save character data (called periodically during editing)
   */
  static autoSaveCharacterData(data: Partial<CharacterCreation>, characterId?: string): void {
    try {
      const autoSaveData = {
        timestamp: new Date().toISOString(),
        characterId,
        data: JSON.parse(JSON.stringify(data)),
      };

      localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(autoSaveData));
    } catch (error) {
      console.warn('Failed to auto-save character data:', error);
    }
  }

  /**
   * Retrieve auto-saved character data
   */
  static getAutoSavedData(): { data: Partial<CharacterCreation>; timestamp: Date; characterId?: string } | null {
    try {
      const saved = localStorage.getItem(this.AUTO_SAVE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      return {
        data: parsed.data,
        timestamp: new Date(parsed.timestamp),
        characterId: parsed.characterId,
      };
    } catch (error) {
      console.warn('Failed to retrieve auto-saved data:', error);
      return null;
    }
  }

  /**
   * Clear auto-saved data (after successful save)
   */
  static clearAutoSavedData(): void {
    try {
      localStorage.removeItem(this.AUTO_SAVE_KEY);
    } catch (error) {
      console.warn('Failed to clear auto-saved data:', error);
    }
  }

  /**
   * Get all character backups
   */
  static getAllBackups(): CharacterBackup[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const backups = JSON.parse(stored);
      return backups.map((backup: any) => ({
        ...backup,
        timestamp: new Date(backup.timestamp),
      }));
    } catch (error) {
      console.warn('Failed to retrieve backups:', error);
      return [];
    }
  }

  /**
   * Get backups for a specific character
   */
  static getCharacterBackups(characterId: string): CharacterBackup[] {
    return this.getAllBackups().filter(backup => backup.characterId === characterId);
  }

  /**
   * Restore character data from a backup
   */
  static restoreFromBackup(backupId: string): Partial<CharacterCreation> | null {
    const backups = this.getAllBackups();
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      throw new Error(`Backup with ID "${backupId}" not found`);
    }

    return JSON.parse(JSON.stringify(backup.data));
  }

  /**
   * Delete a specific backup
   */
  static deleteBackup(backupId: string): void {
    const backups = this.getAllBackups().filter(b => b.id !== backupId);
    this.saveBackupsToStorage(backups);
  }

  /**
   * Clear all backups
   */
  static clearAllBackups(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear backups:', error);
    }
  }

  /**
   * Validate and suggest fixes for character data
   */
  static validateWithRecovery(data: Partial<CharacterCreation>): {
    isValid: boolean;
    errors: ValidationErrorWithFix[];
    suggestedFixes: Record<string, any>;
    autoFixableData?: Partial<CharacterCreation>;
  } {
    const result = characterCreationSchema.safeParse(data);

    if (result.success) {
      return {
        isValid: true,
        errors: [],
        suggestedFixes: {},
      };
    }

    const errors: ValidationErrorWithFix[] = [];
    const suggestedFixes: Record<string, any> = {};
    const autoFixableData = this.cloneData(data);

    result.error.errors.forEach(error => {
      const { path, message, code } = error;
      const fieldPath = path.join('.');
      const validationError: ValidationErrorWithFix = new ValidationError(message, fieldPath);

      this.processValidationError(validationError, fieldPath, code, suggestedFixes);
      errors.push(validationError);
    });

    // Apply auto-fixes where possible
    this.applyAutoFixes(autoFixableData, suggestedFixes);

    return {
      isValid: false,
      errors,
      suggestedFixes,
      autoFixableData: Object.keys(suggestedFixes).length > 0 ? autoFixableData : undefined,
    };
  }

  /**
   * Create a deep clone of data without relying on JSON.stringify key ordering
   */
  private static cloneData(data: Partial<CharacterCreation>): any {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.cloneData(item));
    }

    const cloned: any = {};
    const sortedKeys = Object.keys(data).sort(); // Ensure stable key ordering
    for (const key of sortedKeys) {
      cloned[key] = this.cloneData((data as any)[key]);
    }
    return cloned;
  }

  /**
   * Process a single validation error and set suggested fixes
   */
  private static processValidationError(
    validationError: ValidationErrorWithFix,
    fieldPath: string,
    code: string,
    suggestedFixes: Record<string, any>
  ): void {
    switch (code) {
      case 'too_small':
        this.handleTooSmallError(validationError, fieldPath, suggestedFixes);
        break;
      case 'too_big':
        this.handleTooBigError(validationError, fieldPath, suggestedFixes);
        break;
      case 'invalid_type':
        this.handleInvalidTypeError(validationError, fieldPath, suggestedFixes);
        break;
      case 'invalid_enum_value':
        this.handleInvalidEnumError(validationError, fieldPath);
        break;
      default:
        validationError.suggestedFix = 'Please check the value and try again';
        break;
    }
  }

  /**
   * Handle 'too_small' validation errors
   */
  private static handleTooSmallError(
    validationError: ValidationErrorWithFix,
    fieldPath: string,
    suggestedFixes: Record<string, any>
  ): void {
    if (fieldPath.includes('name')) {
      validationError.suggestedFix = 'Character name must be at least 1 character long';
      validationError.autoFixable = false;
    } else if (fieldPath.includes('abilityScores')) {
      validationError.suggestedFix = 'Ability scores must be at least 1. Consider using 8 as minimum.';
      validationError.autoFixable = true;
      validationError.autoFixValue = 8;
      suggestedFixes[fieldPath] = 8;
    } else if (fieldPath === 'classes') {
      validationError.suggestedFix = 'At least one character class is required';
      validationError.autoFixable = false;
    }
  }

  /**
   * Handle 'too_big' validation errors
   */
  private static handleTooBigError(
    validationError: ValidationErrorWithFix,
    fieldPath: string,
    suggestedFixes: Record<string, any>
  ): void {
    if (fieldPath.includes('name')) {
      validationError.suggestedFix = 'Character name must be 100 characters or less';
      validationError.autoFixable = false;
    } else if (fieldPath.includes('abilityScores')) {
      validationError.suggestedFix = 'Ability scores cannot exceed 30. Consider using 20 as maximum.';
      validationError.autoFixable = true;
      validationError.autoFixValue = 20;
      suggestedFixes[fieldPath] = 20;
    }
  }

  /**
   * Handle 'invalid_type' validation errors
   */
  private static handleInvalidTypeError(
    validationError: ValidationErrorWithFix,
    fieldPath: string,
    suggestedFixes: Record<string, any>
  ): void {
    if (fieldPath.includes('level')) {
      validationError.suggestedFix = 'Level must be a number between 1 and 20';
      validationError.autoFixable = true;
      validationError.autoFixValue = 1;
      suggestedFixes[fieldPath] = 1;
    }
  }

  /**
   * Handle 'invalid_enum_value' validation errors
   */
  private static handleInvalidEnumError(
    validationError: ValidationErrorWithFix,
    fieldPath: string
  ): void {
    if (fieldPath === 'race') {
      validationError.suggestedFix = 'Please select a valid race from the dropdown list';
      validationError.autoFixable = false;
    } else if (fieldPath.includes('class')) {
      validationError.suggestedFix = 'Please select a valid class from the dropdown list';
      validationError.autoFixable = false;
    }
  }

  /**
   * Apply auto-fixes to data using safe property access
   */
  private static applyAutoFixes(
    autoFixableData: any,
    suggestedFixes: Record<string, any>
  ): void {
    Object.entries(suggestedFixes).forEach(([path, value]) => {
      this.setNestedProperty(autoFixableData, path, value);
    });
  }

  /**
   * Safely set nested property without relying on JSON.stringify key ordering
   */
  private static setNestedProperty(obj: any, path: string, value: any): void {
    const pathParts = path.split('.');
    let current = obj;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const key = pathParts[i];
      if (!current || typeof current !== 'object') {
        return; // Cannot set property on non-object
      }
      if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }

    if (current && typeof current === 'object') {
      const finalKey = pathParts[pathParts.length - 1];
      current[finalKey] = value;
    }
  }

  /**
   * Generate recovery suggestions for common character creation issues
   */
  static generateRecoverySuggestions(data: Partial<CharacterCreation>): string[] {
    const suggestions: string[] = [];

    // Check for missing required fields
    if (!data.name) {
      suggestions.push('Add a character name to identify your character');
    }

    if (!data.race) {
      suggestions.push('Select a character race to define racial traits');
    }

    if (!data.classes || data.classes.length === 0) {
      suggestions.push('Choose at least one character class to define abilities');
    }

    if (!data.abilityScores) {
      suggestions.push('Set ability scores using point buy, standard array, or rolled stats');
    } else {
      const scores = Object.values(data.abilityScores);
      if (scores.some(score => score < 1)) {
        suggestions.push('Ability scores should be at least 1 (consider 8 as practical minimum)');
      }
      if (scores.every(score => score <= 10)) {
        suggestions.push('Consider having at least one ability score above 10 for character effectiveness');
      }
    }

    if (!data.hitPoints || data.hitPoints.maximum < 1) {
      suggestions.push('Set maximum hit points based on class hit die and Constitution modifier');
    }

    if (!data.armorClass || data.armorClass < 10) {
      suggestions.push('Set armor class based on armor worn and Dexterity modifier (minimum 10 + Dex modifier)');
    }

    return suggestions;
  }

  private static validateBackupData(data: Partial<CharacterCreation>): boolean {
    try {
      // Basic validation - check if essential fields exist
      return !!(data.name || data.race || data.classes || data.abilityScores);
    } catch {
      return false;
    }
  }

  private static saveBackupToStorage(backup: CharacterBackup): void {
    try {
      const existing = this.getAllBackups();
      existing.push(backup);
      this.saveBackupsToStorage(existing);
    } catch (error) {
      console.warn('Failed to save backup:', error);
    }
  }

  private static saveBackupsToStorage(backups: CharacterBackup[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backups));
    } catch (error) {
      console.warn('Failed to save backups to storage:', error);
    }
  }

  private static cleanupOldBackups(): void {
    try {
      const backups = this.getAllBackups();
      if (backups.length > this.defaultOptions.maxBackups) {
        // Sort by timestamp and keep only the most recent ones
        backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const toKeep = backups.slice(0, this.defaultOptions.maxBackups);
        this.saveBackupsToStorage(toKeep);
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }
}

/**
 * Auto-save hook for React components
 */
export function useCharacterAutoSave(
  characterData: Partial<CharacterCreation>,
  characterId?: string,
  options: Partial<RecoveryOptions> = {}
) {
  const finalOptions = { ...CharacterDataRecovery['defaultOptions'], ...options };

  // Auto-save functionality
  if (typeof window !== 'undefined' && finalOptions.enableAutoSave) {
    const autoSaveInterval = setInterval(() => {
      if (characterData && Object.keys(characterData).length > 0) {
        CharacterDataRecovery.autoSaveCharacterData(characterData, characterId);
      }
    }, finalOptions.autoSaveInterval);

    // Cleanup interval on unmount
    return () => clearInterval(autoSaveInterval);
  }

  return () => {}; // No-op cleanup for SSR
}

// Note: ValidationErrorWithFix, RecoveryOptions, and CharacterBackup types are already exported above