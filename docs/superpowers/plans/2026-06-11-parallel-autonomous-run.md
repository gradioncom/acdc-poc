# Parallel Autonomous Run — Workflow (v2, supersedes the sequential Phase 2b loop)

> Orchestrator = a Claude Code session. Workers = subagents in git worktrees. Reviewers
> = Gitar + CodeRabbit on each PR (Claude Code review disabled for cost). Auto-merge gated
> on CI (build-test-scan) + SonarCloud + lint(commitlint) all green AND no unresolved
> blocking finding (bug/security/Medium+). This replaces "one issue at a time" with
> bounded parallelism + a conflict-recovery loop.

## Decisions (locked 2026-06-11)
- **v3 — CONTINUOUS worker-pool (supersedes v2 batching):** keep **≤5 agents running at
  once**. NO batch barrier — the moment a PR is green-and-gated, **merge it immediately**,
  free the slot, and start the next Todo ticket. Each ticket runs its own async chain
  (implement → review → resolve → gate → merge → refill). "≤5 agents" = ≤5 concurrent
  subagents (implementer/resolver/sync); since each in-flight ticket has ≤1 active subagent
  at a time, cap ≈ ≤5 in-flight tickets. Background `gh` polls don't count toward the 5.
- When picking the next ticket, prefer one touching **different files** from in-flight PRs
  to reduce conflicts.
- **Conflict handling: MERGE `main` into the branch** (NOT rebase). After ANY merge,
  in-flight PRs that go behind/conflicting get a sync subagent (`git merge origin/main` →
  resolve → re-green) before they can be gated/merged. One resolve pass, no force-push.
- App stays small-but-not-minimal; in-memory store (no DB).
- **Re-derive live state from GitHub** each decision point (`gh pr list`,
  `gh pr view N --json mergeable,mergeStateStatus,statusCheckRollup`) rather than trusting
  in-memory state — robust across a long run.

## The loop
1. **Select a batch** of up to 4 `agent-ready` issues, preferring non-overlapping file
   areas (e.g. one web-UI, one server, one tags, one infra) to reduce conflicts.
2. **Move each ticket to "In Progress" at dispatch time** (NOT at PR creation). For each
   issue N, before/as you launch its implementer, set its board status:
   ```bash
   PROJECT=PVT_kwDOAhSpyc4BaJcp                  # acdc-poc Delivery (#7)
   STATUS_FIELD=PVTSSF_lADOAhSpyc4BaJcpzhVDFJw    # "Status"
   IN_PROGRESS=47fc9ee4                            # Todo=f75ad846 · In review=df73e18b · Done=98236657
   ITEM=$(gh project item-list 7 --owner gradionai --format json --jq ".items[]|select(.content.number==N)|.id")
   gh project item-edit --id "$ITEM" --project-id "$PROJECT" --field-id "$STATUS_FIELD" --single-select-option-id "$IN_PROGRESS"
   ```
   (The board's built-in PR-linked transitions still handle In review / Done later.)
2b. **Fan out implementers** (parallel, `run_in_background`): each in its own worktree
   `acdc-poc-wt/issue-N` off the CURRENT `main`, on `run/issue-N`. Each: reads issue +
   `CLAUDE.md`, implements, adds a Playwright e2e, runs the green bar
   (`lint && build && test:cov server && test:cov web && test:e2e`), commits
   (**Conventional Commits, body lines ≤100** — commitlint), pushes, opens a PR closing
   the issue. Prompt baseline: `docs/superpowers/experiment/phase2a/implementer-prompt.md`
   plus the standing reminders (commit-body wrap; e2e robustness: shared in-memory server,
   `workers:1` already set, unique per-run tokens + scoped/filtered locators).
3. **Review + resolve in parallel:** for each PR, poll `gh pr checks` until settled,
   capture Gitar+CodeRabbit findings, dispatch a resolver subagent (in that PR's worktree)
   to fix blocking findings / dismiss nits, re-green. (`resolver-prompt.md`.)
4. **Serialize merges with conflict recovery:**
   - Maintain a set of PRs that are "gate-green" (CI+Sonar+lint pass, no unresolved
     blocking finding).
   - **Merge ONE** gate-green PR (`gh pr merge --merge`).
   - After it merges, for EVERY other open PR check mergeability
     (`gh pr view N --json mergeable,mergeStateStatus`). If `BEHIND`/`DIRTY`/`CONFLICTING`,
     dispatch a **sync subagent** for it: `git fetch origin main && git merge origin/main`
     in the worktree → resolve conflicts → re-run the green bar → commit + push. CI +
     reviewers re-run on the push.
   - Re-evaluate gates; merge the next gate-green PR; repeat until the batch is drained.
5. **Cleanup** each merged PR's worktree/branch; **start the next batch** off the updated
   `main`.

## Sync-subagent prompt (conflict recovery) — add to the prompt library
> You are syncing PR #<PR> (branch `run/issue-N`, worktree `<path>`) onto the latest
> `main`. `git fetch origin main && git merge origin/main`. Resolve any conflicts
> preserving BOTH the feature and what's now on `main` (other merged features). Keep the
> app working. Re-run the full green bar (install chromium if needed). Commit the merge
> (Conventional Commits, body ≤100) and push. Report conflicts resolved + green-bar
> results. Do NOT merge the PR. Report BLOCKED if a conflict needs a human decision.

## Caveats
- **Overlap serializes:** when batched tickets touch the same files (e.g. `App.tsx`), the
  conflict-recovery loop effectively serializes them. Mitigate by batching independent
  tickets together; accept some queueing.
- **Cost:** each implementer + resolver + sync pass burns tokens. Batch size 4 balances
  speed vs cost/conflict-churn.
- **GitHub merge queue** (Team/Enterprise) could automate step 4, but we drive it from the
  orchestrator for observability.

## Per-issue gate (unchanged)
CI `build-test-scan` ✓ + `SonarCloud Code Analysis` ✓ + `lint` (commitlint) ✓ + Gitar not
in changes-requested + no unresolved blocking finding → auto-merge.
