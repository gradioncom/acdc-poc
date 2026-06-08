# Loop 2 instruction — post-PR review (append to the task prompt)

Work on a branch. Open the pull request as soon as your implementation compiles
and `npm test` passes locally — do NOT run SonarQube on yourself first.
After the PR is open, wait for SonarQube Cloud PR analysis and Gitar to review.
Then address their findings by editing code yourself and pushing follow-up
commits (you may adopt Gitar's suggested fixes, but YOU apply them via commits —
do not let Gitar auto-commit unmediated). Iterate until the same "green" bar is
met: quality gate passes, no Medium+ issues on changed code, `npm test` green.
