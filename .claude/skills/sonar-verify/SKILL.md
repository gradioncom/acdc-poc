---
name: sonar-verify
description: Run SonarQube Agentic Analysis on changed files and iterate until clean. Use after writing or modifying code, before opening a PR.
---

# sonar-verify

Use the SonarQube MCP server to verify your own changes before review.

## Steps
1. Determine the files YOU changed in this branch. Diff against the ref you
   branched from — the run's start tag, not `main` (Task A branches from
   `baseline`, Task B from `task-b-bugged`):
   `git diff --name-only <start-tag>..HEAD` plus any uncommitted work
   (`git status --porcelain`). Do not diff against `main` — for Task B, `main`
   lacks the bugged ancestor and would over-report unrelated files.
2. For each changed source file, call `run_advanced_code_analysis` on it.
3. Read every returned issue. Treat severity Medium and above as blocking.
4. Fix the issues in code. Re-run `run_advanced_code_analysis` on the changed files.
5. Repeat 2–4 until no Medium+ issues remain AND `npm test` passes.
6. Only then proceed to open the pull request.

Report, for each iteration: which files were analyzed, the issues found
(rule key + severity), and what you changed.
