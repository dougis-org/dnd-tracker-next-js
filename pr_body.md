Fixes #625. This change adds validation to the `userId` and `ownerId` parameters in the `CharacterService` and
`EncounterService` to ensure they are valid ObjectIds before being used in database queries.
