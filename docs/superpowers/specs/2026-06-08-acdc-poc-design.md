# AC/DC Proof-of-Concept — Design

**Date:** 2026-06-08
**Status:** Approved (brainstorm) — pending spec review
**Author:** dung.nguyen@gradion.com (with Claude Code)

## Purpose

Validate Sonar's **Agent-Centric Development Cycle (AC/DC)** by proving its
end-to-end loop works on a real codebase — specifically its distinctive claim
that **pre-commit, sandbox self-verification** produces a cleaner, lower-rework
outcome than a traditional post-PR AI-review loop.

**Thesis under test:** *Does pre-commit self-verification (the AC/DC ideal)
produce a cleaner, lower-rework outcome than a post-PR AI-review loop — on the
same task?*

This is a structured observation (two task types, not a statistical benchmark).
It proves the **mechanics** of the loop and produces a credible narrative plus a
comparison scorecard.

## Scope

### In scope
- A freshly scaffolded **TypeScript/Node** REST API as the subject codebase,
  fully under our control.
- **Two tasks** run through the loops (feature add + planted-bug fix).
- **Two loop shapes**, run side by side on each task (4 runs total).
- The Sonar-native AC/DC stack on **GitHub**: Claude Code (agent), SonarQube
  Cloud (deterministic Verify), Gitar (agentic review + remediation), GitHub
  Actions (tests/CI).
- A scorecard capturing the comparison across all runs.

### Out of scope (YAGNI)
- Building any automated pipeline or AC/DC "product."
- Self-managed GitLab (deferred; the available instance is GitLab 14.0.5-ee,
  below tool support thresholds).
- CodeRabbit in the main loop — it is an **optional side-test** only, on its own
  branch/PR, kept out of the main comparison to avoid confounding the thesis.
- Multi-language support; only TypeScript/Node.
- A large/realistic production app — the baseline is intentionally minimal.

## The AC/DC stages and tool mapping

| Stage | Tool(s) | Role |
|-------|---------|------|
| **Guide** | `CLAUDE.md` + coding-standards doc | Inject repo context/standards into the agent, **held constant across both loops** |
| **Generate** | Claude Code | Write the feature / bug fix |
| **Verify** | SonarQube Cloud (deterministic) + Gitar (agentic AI review) | Analyze the change |
| **Solve** | Claude Code + Gitar remediation / SonarQube AI CodeFix | Fix what Verify surfaces, then re-verify |

Gitar is the **canonical** AI reviewer for this PoC (it is Sonar's own AC/DC
review/remediation product). CodeRabbit, if used, is a separate side experiment.

## Subject codebase — the baseline app

A small but realistic **TS/Node REST API** (a **notes/tasks API**), scaffolded
once as the shared baseline:
- Express or Fastify + a simple in-memory or lightweight store.
- A working test suite.
- GitHub Actions CI running the tests.
- Clean SonarQube Cloud onboarding from a known-good baseline.

The baseline is committed and tagged before any task runs, so every run starts
from the identical starting point.

## The two tasks

Both tasks are run through **both loops** (see below). Each is chosen to give the
Verify stage something substantive to engage with.

### Task A — Feature with built-in pitfalls
Add an endpoint that naturally invites security/quality issues — e.g. a
**file-upload / attachment endpoint** (risks: path traversal, missing input
validation, unsafe parsing, unbounded size). The agent implements it from the
Guide context.

### Task B — Planted-bug fix
We introduce a realistic, **known** bug into the baseline (e.g. broken input
validation, or an off-by-one in pagination) and tag that state. The agent then
fixes it through each loop. Because we planted it, we know the correct fix and
can judge whether each loop converges on it.

## Architecture & Flow

### Shared setup — the Guide stage (done once)
- Scaffold the baseline app; commit and tag it.
- Author a **`CLAUDE.md`** plus a short coding-standards doc encoding the app's
  conventions, architecture notes, and constraints. This is the Guide context
  for **both** loops, so Guide is held constant and only the loop *shape* varies.
- Connect a SonarQube Cloud project to the repo with a fixed quality
  profile/ruleset (identical for every run).
- Install Gitar on the repo.
- Confirm the test suite runs in GitHub Actions.

### Loop 1 — Pre-commit self-verify (the AC/DC ideal)
1. **Guide** — Claude Code reads `CLAUDE.md` + the task.
2. **Generate** — implements the task on a branch.
3. **Verify (self)** — the agent runs SonarQube analysis on its *own* branch
   *before* opening any PR, plus the test suite.
4. **Solve** — the agent fixes whatever Verify surfaced; repeat steps 3↔4 until
   clean.
5. Opens the PR **only when green**. Record what was already clean at PR time.

### Loop 2 — Post-PR review (traditional + AI)
1. **Guide + Generate** — same context; implements the task on a *separate*
   branch.
2. Opens the PR **immediately** (no self-check).
3. **Verify** — SonarQube Cloud PR analysis + Gitar review fire on the PR.
4. **Solve** — the agent reacts to their comments (Gitar may also propose/commit
   fixes); iterate until green.

Both loops begin from the identical Guide context and the identical task
starting point. The **only deliberate variable is when verification happens**
(before vs. after the PR).

### Run matrix
2 tasks (A, B) × 2 loops (1, 2) = **4 runs**, each scored on the same scorecard.

## Measurement — the scorecard

For each of the 4 runs, record:

| Metric | Why it matters |
|--------|----------------|
| **Rework cycles** — # of Verify→Solve iterations before green | Core AC/DC claim: self-verify front-loads fixing |
| **Issues caught & when** — quality/security/bug issues, and at which stage | Shows whether pre-commit catches what post-PR finds later |
| **Regressions / test failures** — and which stage caught them | Did self-verify prevent a broken PR ever existing? |
| **Escaped issues** — anything still present at the end of each run | Final quality of the merged result |
| **Human-attention events** — times a human would need to intervene | Tests AC/DC's "humans govern, not author" claim |
| **Rough effort / wall-clock** — qualitative | Sanity check on cost |

The writeup will state the limitation explicitly: two task types prove loop
mechanics and yield a narrative + table, not statistical superiority.

## Risks & open items (to resolve during planning)

1. **Pre-commit self-verify mechanism (biggest unknown).** Confirm how Claude
   Code calls SonarQube on an un-PR'd branch — via the Sonar MCP server /
   SonarQube Agentic Analysis, or via a local/CI branch scan with
   `sonar-scanner`. The chosen mechanism must let the agent read results back
   and act on them within a session.
2. **Gitar on a fresh repo.** Confirm Gitar installs and reviews on a fresh
   public repo under the user's GitHub account.
3. **Comparison fairness.**
   - Same task run twice by the same agent risks the second run "learning" from
     the first. Mitigate by running the two loops in **separate, fresh agent
     sessions**, and **commit to a definite loop order** (recorded in the
     writeup so any learning effect can be flagged).
   - **SonarQube config must be identical across all runs** (same quality
     profile/ruleset); differing rulesets would silently bias iteration counts.
   - **Define what counts as a "human-attention event"** up front (e.g. agent
     stuck, ambiguous review comment requiring human judgment, a manual approval
     gate) so the metric is countable, not a judgment call.
   - **Decide how Gitar's auto-commits are handled** in Loop 2 (accept as-is vs.
     agent mediates), since it affects the rework and human-attention counts and
     must be consistent for a fair comparison against Loop 1.
4. **Sample-size caveat.** Two task types prove mechanics, not statistical
   superiority. The writeup must say so plainly.

## Deliverables

- The fresh subject repo with the scaffolded baseline, `CLAUDE.md`, and
  standards (Guide artifacts), with the baseline and planted-bug states tagged.
- Four PRs (2 tasks × 2 loops) on the repo.
- A filled-in scorecard table comparing all four runs.
- A short written narrative of findings, including the sample-size caveat and the
  resolution of the open items above.

## Success criteria

The PoC succeeds if it demonstrates, end to end, that:
- The full Guide→Generate→Verify→Solve loop can be executed with the named tools
  on a real codebase, **and**
- The two loop shapes can be run on the same task and compared on the scorecard
  across both task types, producing a defensible answer to the thesis (whichever
  direction it points).
