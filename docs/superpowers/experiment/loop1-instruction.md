# Loop 1 instruction — pre-commit self-verify (append to the task prompt)

Work on a branch. Before opening any pull request:
- Use the `sonar-scan` skill to fetch guidelines at the start.
- Use the `sonar-verify` skill: run `run_advanced_code_analysis` on your changed
  files and iterate until no Medium+ issues remain AND `npm test` passes.
Only open the PR once that "green" bar is met. Do not ask a human to review
intermediate states.
