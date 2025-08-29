---
    description: Configuration for AI behavior when asked to work on the next issue
    applyTo: '**'
---

---

# Next Issue Command

1. Pull main for latest plan document provided (referred to as `#$ARGUMENTS` document in remaining steps)
2. Find next incomplete, not `in-progress` item to be worked on
3. Execute the work following the instructions in /AGENTS.md and adhering to the standards in /CONTRIBUTING.md
4. Following the development steps, open a PR for your code changes, address any PR comments and failing checks
5. Only when the PR containing the work is merged and the implementation of the issue is complete, update the `#$ARGUMENTS` document with
   1. Details of the completed work
   2. Any learnings and new standards to follow
      1. This may include new libraries or helper functions
   3. What the next step to execute is
   4. The status of the overall project

The `#$ARGUMENTS` document should serve as full context for a new chat
