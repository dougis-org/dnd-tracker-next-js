# End-to-End Test Plan for D&D Encounter Tracker

This document outlines comprehensive end-to-end test flows for the D&D Encounter Tracker application using
Playwright. The flows are designed to be reusable components that can be combined to test complex user journeys.

## Product Requirements Validation

This test plan validates the core product requirements as defined in the Product Requirements Document (PRD
v2.3). Key areas include:

- **Multi-tier subscription system** with feature gating and usage limits
- **Core combat features** including initiative tracking, HP/AC management, legendary/lair actions
- **Data management** with cloud sync, automated backups, and persistence
- **Character/party/encounter management** across all subscription tiers
- **Dexterity-based tiebreakers** and combat rule enforcement
- **Freemium monetization model** with proper limit enforcement

## Core Flows

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F01-UserRegistration** | None | User creates a new account via Clerk | Basic |
| **F02-UserLogin** | F01-UserRegistration | User signs in to existing account | Basic |
| **F03-UserLogout** | F02-UserLogin | User signs out of the application | Basic |
| **F04-ProfileSetup** | F02-UserLogin | First-time user completes profile setup | Basic |
| **F05-DashboardAccess** | F02-UserLogin | User navigates to and views dashboard | Basic |

## Character Management Flows (PRD Section 4.2)

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F06-CreateCharacter** | F02-UserLogin | User creates character with name, race, class, Dexterity, AC, max/current HP (PRD spec) | Intermediate |
| **F07-ViewCharacterList** | F02-UserLogin | User views all their characters on characters page | Basic |
| **F08-ViewCharacterDetails** | F06-CreateCharacter | User views detailed character information including multiclass support | Intermediate |
| **F09-EditCharacter** | F06-CreateCharacter | User modifies character details (HP, AC, Dexterity, multiclassing) | Intermediate |
| **F10-DeleteCharacter** | F06-CreateCharacter | User removes a character from their collection | Intermediate |
| **F11-CharacterPlayerAssignment** | F06-CreateCharacter | User links characters to player names and contact info (PRD requirement) | Intermediate |
| **F12-CharacterImportExport** | F06-CreateCharacter | Import character data from D&D Beyond, Roll20 (PRD feature) | Advanced |
| **F13-BulkCharacterOperations** | F06-CreateCharacter (multiple) | User performs bulk operations on multiple characters | Advanced |

## Party Management Flows (PRD Section 4.2)

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F14-CreateParty** | F02-UserLogin | User creates a new party (respects tier limits: 1/3/10/25/∞) | Basic |
| **F15-ViewPartyList** | F02-UserLogin | User views all their parties | Basic |
| **F16-AddCharactersToParty** | F14-CreateParty, F06-CreateCharacter | User adds existing characters to a party | Intermediate |
| **F17-RemoveCharactersFromParty** | F16-AddCharactersToParty | User removes characters from a party | Intermediate |
| **F18-EditPartyDetails** | F14-CreateParty | User modifies party name and description | Basic |
| **F19-DeleteParty** | F14-CreateParty | User removes a party | Basic |
| **F20-PartyTemplates** | F14-CreateParty | User saves and reuses common party compositions (PRD feature) | Advanced |

## Encounter Management Flows (PRD Section 4.3)

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F21-CreateEncounter** | F02-UserLogin | User creates encounter (respects tier limits: 3/15/50/100/∞) | Intermediate |
| **F22-ViewEncounterList** | F02-UserLogin | User views all their encounters | Basic |
| **F23-ViewEncounterDetails** | F21-CreateEncounter | User views detailed encounter information | Intermediate |
| **F24-EditEncounter** | F21-CreateEncounter | User modifies encounter settings and participants | Advanced |
| **F25-CreateNPCMonster** | F21-CreateEncounter | User creates NPC/monster with name, AC, Dex, initiative, HP, actions (PRD spec) | Advanced |
| **F26-AddParticipantsToEncounter** | F21-CreateEncounter, F06-CreateCharacter | User adds characters/monsters to encounter (respects participant limits) | Intermediate |
| **F27-RemoveParticipantsFromEncounter** | F26-AddParticipantsToEncounter | User removes participants from encounter | Intermediate |
| **F28-EncounterBuilder** | F21-CreateEncounter | User uses drag-and-drop encounter creation with CR calculation (PRD feature) | Advanced |
| **F29-CreatureLibrary** | F25-CreateNPCMonster | User searches creatures with filtering by CR, type, source (PRD feature) | Advanced |
| **F30-LairConfiguration** | F21-CreateEncounter | User defines lair action triggers and environmental effects (PRD feature) | Advanced |
| **F31-DuplicateEncounter** | F21-CreateEncounter | User creates a copy of existing encounter | Intermediate |
| **F32-DeleteEncounter** | F21-CreateEncounter | User removes an encounter | Basic |
| **F33-EncounterTemplateSystem** | F21-CreateEncounter | User creates and reuses encounter templates (PRD feature) | Advanced |
| **F34-EncounterImportExport** | F21-CreateEncounter | User imports/exports encounter data (Seasoned+ tier) | Advanced |

## Combat System Flows (PRD Core Features)

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F35-StartCombat** | F26-AddParticipantsToEncounter | User initiates combat mode for an encounter | Intermediate |
| **F36-RollInitiative** | F35-StartCombat | System/user rolls initiative for all participants (automated or manual) | Intermediate |
| **F37-DexterityTiebreaking** | F36-RollInitiative | System handles initiative ties using Dexterity scores (PRD requirement) | Advanced |
| **F38-ManageInitiativeOrder** | F36-RollInitiative | User adjusts initiative order with manual override capability | Advanced |
| **F39-TakeCombatTurn** | F36-RollInitiative | User processes a single participant's turn with clear indication | Intermediate |
| **F40-ManageHitPoints** | F39-TakeCombatTurn | User updates participant HP with damage/healing and undo functionality | Intermediate |
| **F41-ApplyConditions** | F39-TakeCombatTurn | User applies status effects/conditions with duration timers | Advanced |
| **F42-HandleLairActions** | F35-StartCombat | System automatically triggers lair actions on initiative count 20 | Advanced |
| **F43-HandleLegendaryActions** | F35-StartCombat | User manages legendary action counters and usage tracking | Advanced |
| **F44-RoundTracking** | F35-StartCombat | System automatically advances rounds with duration tracking | Intermediate |
| **F45-EndCombat** | F35-StartCombat | User concludes combat and returns to encounter view | Intermediate |
| **F46-PauseCombat** | F35-StartCombat | User pauses combat and resumes later | Intermediate |
| **F47-CombatLogging** | F35-StartCombat | System tracks all combat events (advanced tier feature) | Advanced |

## Navigation & UI Flows

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F48-NavigateMainMenu** | F02-UserLogin | User navigates through main application sections | Basic |
| **F49-BreadcrumbNavigation** | F02-UserLogin | User uses breadcrumbs to navigate hierarchy | Basic |
| **F50-SearchFunctionality** | F02-UserLogin | User searches for characters, encounters, parties | Intermediate |
| **F51-FilterAndSortContent** | F02-UserLogin | User applies filters and sorting to lists | Intermediate |
| **F52-ResponsiveDesignTesting** | F02-UserLogin | UI adapts correctly to different screen sizes | Advanced |
| **F53-KeyboardNavigation** | F02-UserLogin | User navigates entirely via keyboard | Advanced |
| **F54-AccessibilityFeatures** | F02-UserLogin | Screen reader and accessibility testing | Advanced |

## Data Management Flows (PRD Requirements)

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F55-DataPersistence** | F02-UserLogin | User data persists across sessions | Intermediate |
| **F56-AutoSave** | F06-CreateCharacter | Changes are automatically saved | Intermediate |
| **F57-CloudSync** | F61-SubscriptionUpgrade | Data syncs across devices (Seasoned+ tier only) | Advanced |
| **F58-AutomatedBackups** | F61-SubscriptionUpgrade | Automated backups (Seasoned+ tier feature) | Advanced |
| **F59-LocalStorageOnly** | F02-UserLogin | Free tier limited to local storage only | Intermediate |
| **F60-OfflineMode** | F02-UserLogin | Application functions with limited connectivity | Advanced |

## Settings & Configuration Flows

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F51-UserSettings** | F02-UserLogin | User modifies account and app preferences | Intermediate |
| **F52-EncounterSettings** | F18-CreateEncounter | User configures encounter-specific settings | Intermediate |
| **F53-CombatSettings** | F28-StartCombat | User adjusts combat-specific preferences | Advanced |
| **F54-NotificationSettings** | F02-UserLogin | User configures alerts and notifications | Intermediate |

## Error Handling & Edge Case Flows

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F55-NetworkErrorHandling** | F02-UserLogin | Application handles network connectivity issues | Advanced |
| **F56-ValidationErrorHandling** | F06-CreateCharacter | Form validation and error messaging | Intermediate |
| **F57-ConcurrentUserActions** | F02-UserLogin (multiple sessions) | Multiple users or sessions handling conflicts | Advanced |
| **F58-DataCorruptionRecovery** | F02-UserLogin | System recovers from corrupted data states | Advanced |
| **F59-SessionTimeout** | F02-UserLogin | Handling of expired user sessions | Intermediate |

## Subscription & Payment Flows (PRD Requirements Validation)

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F60-ViewSubscriptionLimits** | F02-UserLogin | Free tier user sees usage limits and prompts (1 party, 3 encounters, 10 creatures, 6 participants) | Intermediate |
| **F61-SubscriptionUpgrade** | F02-UserLogin | User upgrades between tiers (Free→Seasoned→Expert→Master→Guild) | Advanced |
| **F62-FeatureGating** | F02-UserLogin | Premium features locked for free users (cloud sync, themes, export, collaboration) | Intermediate |
| **F63-UsageLimitEnforcement** | F06-CreateCharacter | System enforces tier-based limits (parties: 1/3/10/25/∞, encounters: 3/15/50/100/∞) | Advanced |
| **F64-PaymentProcessing** | F61-SubscriptionUpgrade | Payment integration and processing for subscription tiers | Advanced |
| **F65-TrialSystem** | F01-UserRegistration | New users get 14-day free trial of premium features | Advanced |
| **F66-SubscriptionDowngrade** | F61-SubscriptionUpgrade | User downgrades subscription and data handling | Advanced |

## Help & Support Flows

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F67-AccessHelpSystem** | F02-UserLogin | User accesses help documentation | Basic |
| **F68-SearchHelpContent** | F67-AccessHelpSystem | User searches within help system | Intermediate |
| **F69-ViewGettingStarted** | F02-UserLogin | New user views onboarding content | Basic |
| **F70-ViewFeatureGuides** | F02-UserLogin | User reads feature-specific guides | Intermediate |

## Integration Test Flows (Complex Scenarios - PRD Validation)

| Flow Name | Dependencies | Description | Complexity |
|-----------|-------------|-------------|------------|
| **F71-FullCampaignWorkflow** | Multiple core flows | Complete workflow from registration to running combat (PRD end-to-end validation) | Expert |
| **F72-MultiPartyEncounter** | F12-CreateParty, F18-CreateEncounter | Encounter with participants from multiple parties (collaboration feature) | Expert |
| **F73-LongRunningCombat** | F28-StartCombat, Multiple combat flows | Extended combat with all PRD features (lair, legendary, conditions, tiebreakers) | Expert |
| **F74-TierLimitValidation** | Multiple flows | Validate all subscription tier limits across features (PRD feature gating) | Expert |
| **F75-CollaborativeMode** | F61-SubscriptionUpgrade | Multi-user shared campaigns (Expert+ tier feature) | Expert |
| **F76-DataMigrationScenario** | F02-UserLogin | User data migration between versions | Expert |
| **F77-PerformanceUnderLoad** | Multiple flows | System performance with maximum tier limits (Guild tier: unlimited) | Expert |
| **F78-CrossBrowserCompatibility** | All flows | Ensure functionality across different browsers | Expert |
| **F79-APIIntegration** | F61-SubscriptionUpgrade | Third-party integrations (Master tier feature) | Expert |

## Flow Execution Guidelines

### Basic Flows (1-5 minutes)
- Single feature validation
- Core user actions
- Quick regression tests

### Intermediate Flows (5-15 minutes)  
- Multi-step processes
- Feature combinations
- Standard user workflows

### Advanced Flows (15-30 minutes)
- Complex feature interactions
- Edge cases and error scenarios
- Multi-user interactions

### Expert Flows (30+ minutes)
- End-to-end complete workflows
- Performance and stress testing
- Cross-platform validation

## Test Data Requirements

Each flow should define:
- **Setup Data**: Required test data before execution
- **Test Data**: Data created during test execution  
- **Cleanup Data**: Data to be removed after test completion
- **Validation Points**: Expected outcomes and checkpoints

## Implementation Notes

1. **Page Object Model**: Each major page/component should have corresponding page objects
2. **Reusable Components**: Common actions (login, navigation) should be extracted as utilities
3. **Environment Configs**: Tests should run against dev, staging, and production environments
4. **Parallel Execution**: Independent flows can run in parallel to reduce test time
5. **Retry Logic**: Flaky UI interactions should include retry mechanisms
6. **Screenshots & Videos**: Failures should capture visual evidence
7. **Test Reporting**: Generate comprehensive reports with flow execution metrics

This test plan provides comprehensive coverage of all major user journeys while maintaining modularity and
reusability for efficient test development and maintenance.
