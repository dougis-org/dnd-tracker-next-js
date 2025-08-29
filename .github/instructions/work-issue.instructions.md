---
    description: Configuration for AI behavior when asked to work on the next issue
    applyTo: '**'
---

---

# Work Issue Command

1. Use the GitHub MCP server get_issue method to read the details of the selected or provided issue
   1. If the MCP server fails or times out, use the gh command line of gh issue view
      1. Use the Desktop commander MCP server to execute the GH command line if possible
2. Once you have the issue details and description build a plan for the work it describes
   1. If the issue described needs to broken down into sub issues, please do so by
      1. Generating a planned list of steps to execute
      2. Creating a sub issue for each planned step (with description and acceptance criteria)
      3. Generating a status document to keep track of the overal goal of the work and its status
         1. This status document should be named with the primary issue number and description and be in the docs folder
      4. Add a final step to the plan to remove that status document
   2. If you have sub issues, iterate over each one following the steps below
3. Once the plan is laid out, execute on that plan making sure to
   - follow **all** instructions in /AGENTS.md
   - adhere to the standards in /CONTRIBUTING.md
4. After following the development steps and running your local checks
   1. Open a PR for your code changes
   2. Set your PR to auto merge (with squash)
   3. Wait 45 seconds for automated review to happen
   4. Address any PR comments
   5. Address and correct any failing checks
5. Only when the PR containing the work is merged automatically is the implementation of the issue is complete
   - **DO NOT FORCE MERGE**

##Guidelines##

- Follow all standards of the repo
- Iterate in small chunks as required
- Use MCP servers to allow automated work whenever possible
