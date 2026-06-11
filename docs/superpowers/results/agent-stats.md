# Agent Statistics — Autonomous Feature Run

> Living telemetry log for the Phase-2 parallel autonomous run on `gradionai/acdc-poc`.
> Each row = one subagent invocation. Backfilled for the run so far; appended going forward.

## Methodology & caveats

- **out_tokens** = `subagent_tokens` reported by the harness on completion — the tokens the
  agent *generated* (output). **Input tokens (context: prompts, file reads, tool results) are
  NOT captured per-agent** and are typically several× larger, so true billed cost is higher
  than the output-only figure below.
- **duration** = wall-clock the agent ran (`duration_ms`). Agents run in parallel (≤5), so the
  sum of durations is NOT elapsed time — see parallelism note in the summary.
- **tool_calls** = `tool_uses`, a rough proxy for task complexity / amount of work.
- **out_cost** = out_tokens × $15/M (Claude Sonnet 4.x output rate). All agents ran on Sonnet.
- **All-in cost estimate**: with input:output ratio R (agentic work ~5–15:1) and $3/M input,
  all-in ≈ out_tokens × (15 + 3R)/1e6 → roughly **2–4× the out_cost** shown. Treat out_cost as a
  lower bound.
- Model: `claude-sonnet-4-x` for all listed agents (orchestrator on Opus, not counted here).

## Suggested metrics to watch (the questions this answers)

- **Cost per merged PR** = total agent cost ÷ PRs merged — the headline ROI number.
- **Iterations per PR** = how many agent passes (impl + resolve + re-sync) a PR needed before
  merge. High = expensive churn (here: the `App.tsx` monolith drove many re-syncs).
- **CI-pass-first-try rate** — share of pushes that pass CI without a follow-up resolver.
- **Role mix** — impl vs resolve vs re-sync token/time share (re-sync = conflict-cascade tax).
- **Parallel speedup** = sum(durations) ÷ wall-clock elapsed.
- **Reliability** — stalled/failed agents (e.g. the 4 killed by a network drop on 2026-06-11).
- **tokens/min** — generation intensity per agent.

## Per-agent log

| # | Task | Role | PR | Duration (min) | out_tokens | tool_calls | out_cost ($) |
|---|------|------|----|---------------:|-----------:|-----------:|-------------:|
| 1 | Sync PR #59 onto main | sync | #59 | 9.0 | 83,598 | 54 | 1.25 |
| 2 | Foundation: e2e determinism (#62) | foundation | #62 | 5.5 | 50,775 | 60 | 0.76 |
| 3 | Recover #37 toasts | recover | #63 | 3.5 | 43,285 | 35 | 0.65 |
| 4 | Recover #36 loading states | recover | #64 | 4.8 | 53,130 | 36 | 0.80 |
| 5 | Impl #54 delete attachment | impl | #65 | 5.8 | 74,877 | 49 | 1.12 |
| 6 | Impl #44 sort options | impl | #67 | 8.3 | 92,117 | 64 | 1.38 |
| 7 | Finish #61 responsive (merge+findings) | sync | #61 | 12.1 | 91,803 | 88 | 1.38 |
| 8 | Impl #41 markdown body | impl | #66 | 4.3 | 48,148 | 36 | 0.72 |
| 9 | Impl #47 word/char count | impl | #68 | 4.1 | 51,684 | 34 | 0.78 |
| 10 | Impl #46 color labels | impl | #69 | 8.2 | 100,530 | 78 | 1.51 |
| 11 | Impl #45 duplicate note | impl | #70 | 5.3 | 68,778 | 44 | 1.03 |
| 12 | Impl #40 confirm dialog | impl | #73 | 6.6 | 67,283 | 49 | 1.01 |
| 13 | Impl #48 tag management | impl | #72 | 8.2 | 103,139 | 53 | 1.55 |
| 14 | Impl #38 keyboard shortcuts | impl | #75 | 7.2 | 71,957 | 53 | 1.08 |
| 15 | Impl #42 archive/unarchive | impl | #74 | 10.5 | 112,026 | 69 | 1.68 |
| 16 | Impl #52 multi-file upload | impl | #71 | 7.8 | 86,561 | 49 | 1.30 |
| 17 | Resolve #65 prettier CI | resolve | #65 | 3.2 | 22,540 | 24 | 0.34 |
| 18 | Resolve #66 markdown CI (ARIA/list) | resolve | #66 | 9.6 | 55,158 | 66 | 0.83 |
| 19 | Resolve #64 loading sonar+gitar | resolve | #64 | 7.1 | 78,720 | 52 | 1.18 |
| 20 | Resolve #67 sort CI+gitar | resolve | #67 | 12.8 | 103,065 | 101 | 1.55 |
| 21 | Resolve #61 responsive CI (commitlint) | resolve | #61 | 7.5 | 47,035 | 57 | 0.71 |
| 22 | Resolve #69 color CI+gitar | resolve | #69 | 4.2 | 67,918 | 35 | 1.02 |
| 23 | Resolve #73 confirm sync+gitar | resolve | #73 | 4.7 | 48,719 | 45 | 0.73 |
| 24 | Resolve #71 multi-upload sync+gitar | resolve | #71 | 4.9 | 62,990 | 46 | 0.94 |
| 25 | Resolve #74 archive sync+gitar | resolve | #74 | 10.1 | 109,544 | 72 | 1.64 |
| 26 | Fix-forward #76 nav (from #67) | resolve | #76 | 4.8 | 62,350 | 29 | 0.94 |
| 27 | Resolve #65 delete-button ambiguity | resolve | #65 | 4.2 | 55,504 | 32 | 0.83 |
| 28 | Resolve #72 tag CI (strict-mode) | resolve | #72 | 2.7 | 30,626 | 24 | 0.46 |
| 29 | Resolve #76 gitar findings | resolve | #76 | 4.0 | 36,953 | 34 | 0.55 |
| 30 | Resolve #75 keyboard sync+gitar | resolve | #75 | 5.5 | 49,637 | 49 | 0.74 |
| 31 | Sync #64 onto main | resync | #64 | 4.6 | 44,529 | 26 | 0.67 |
| 32 | Perfect #76 canonical nav | resolve | #76 | 4.6 | 64,571 | 26 | 0.97 |
| 33 | Re-sync #61 (canonical nav) | resync | #61 | 2.8 | 25,099 | 21 | 0.38 |
| 34 | Re-sync #71 + memory cap | resync | #71 | 4.4 | 51,852 | 36 | 0.78 |
| 35 | Re-sync #72 (nav) | resync | #72 | 4.3 | 49,287 | 35 | 0.74 |
| 36 | Re-sync #73 (nav) | resync | #73 | 4.4 | 45,710 | 44 | 0.69 |
| 37 | Re-sync #69 (nav) | resync | #69 | 6.8 | 93,601 | 47 | 1.40 |
| 38 | Re-sync #74 (nav) | resync | #74 | 6.0 | 75,848 | 42 | 1.14 |
| 39 | Re-sync #75 (nav) | resync | #75 | 2.4 | 42,862 | 21 | 0.64 |
| 40 | Re-sync+fix #61 (WCAG 44px) | resync | #61 | 3.9 | 49,669 | 36 | 0.75 |
| 41 | Re-sync+fix #73 (delete specs) | resync | #73 | 6.9 | 65,716 | 57 | 0.99 |
| 42 | Re-sync #74 onto new main | resync | #74 | 15.2 | 78,567 | 98 | 1.18 |
| 43 | Re-sync #75 onto new main | resync | #75 | 5.8 | 42,018 | 49 | 0.63 |
| 44 | Re-sync+fix #75 sonar coverage | resync | #75 | 10.6 | 67,977 | 88 | 1.02 |

## Aggregates (run so far)

- **Agents logged:** 44 (excludes 4 agents killed mid-run by a network drop — work recovered from disk, no telemetry)
- **Total output tokens:** 2,827,756
- **Total agent-minutes:** 279 min (4.7 agent-hours) — wall-clock far less due to ≤5 parallelism
- **Output-only cost:** $42.42  → **all-in estimate ≈ $85–$170**
- **Avg per agent:** 64,267 out_tokens, 6.3 min

### By role

| Role | Agents | out_tokens | avg out_tokens | total min | avg min | out_cost ($) |
|------|-------:|-----------:|---------------:|----------:|--------:|-------------:|
| impl | 11 | 877,100 | 79,736 | 76 | 6.9 | 13.16 |
| resolve | 15 | 895,330 | 59,689 | 90 | 6.0 | 13.43 |
| resync | 13 | 732,735 | 56,364 | 78 | 6.0 | 10.99 |
| sync | 2 | 175,401 | 87,700 | 21 | 10.5 | 2.63 |
| recover | 2 | 96,415 | 48,208 | 8 | 4.1 | 1.45 |
| foundation | 1 | 50,775 | 50,775 | 5 | 5.5 | 0.76 |

### Observations

- **Re-sync + resolve dominate**: a large share of tokens/time went to conflict resolution and
  review-finding fixes, NOT first-pass implementation. Root cause: `web/src/App.tsx` is a
  monolith every UI ticket edits, so each merge forced the others to re-sync (the cascade). The
  planned **#77 App.tsx decompose** is the direct mitigation.
- **CI-pass-first-try was low** for UI PRs: most needed ≥1 resolver pass (Prettier on new e2e
  specs, Playwright strict-mode locator collisions, SonarCloud new-code coverage <80%, and Gitar
  edge-case findings). Server-only PRs fared better.
- **Layered verification earned its keep**: CI e2e + Gitar caught real bugs unit tests missed
  (WCAG 44px touch targets, ARIA list roles, rate-limiter throttling the suite, nav edge cases).

_Note: backfilled best-effort from harness completion notifications for the post-restart portion
of the run; numbers are generation-side and approximate. Maintained going forward._
