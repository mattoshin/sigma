## GBrain Search Guidance (configured by /sync-gbrain)
<!-- gstack-gbrain-search-guidance:start -->

GBrain is set up and synced on this machine. The agent should prefer gbrain
over Grep when the question is semantic or when you don't know the exact
identifier yet.

**This worktree is pinned to a worktree-scoped code source** via the
`.gbrain-source` file in the repo root (kubectl-style context).
`gbrain code-def`, `code-refs`, `code-callers`, `code-callees`, `search`, and
`query` from anywhere under this worktree route to that source by default,
with no `--source` flag needed. Conductor sibling worktrees of the same repo
each have their own pin and indexed pages, so semantic results match the code
on disk here.

Call-graph queries (`code-callers` and `code-callees`) also need the graph to
be built first. Run `/sync-gbrain --dream` or `/sync-gbrain --full` if they
return `count: 0`. This only works if the source's schema pack extracts code
symbols. On a non-code-aware pack, the graph stays empty and reports a warning.

Two indexed corpora are available through the `gbrain` CLI:

- This worktree's code, auto-pinned through `.gbrain-source`.
- `~/.gstack/` curated memory, managed by the existing federation pipeline.

Prefer gbrain when:

- The intent is semantic and the exact string is unknown: `gbrain search
  "<terms>"` or `gbrain query "<question>"`.
- A symbol definition or reference is needed: `gbrain code-def <symbol>` or
  `gbrain code-refs <symbol>`.
- A call relationship is needed: `gbrain code-callers <symbol>` or `gbrain
  code-callees <symbol>`.
- A prior decision, plan, retrospective, or learning is needed: `gbrain search
  "<terms>"` against the curated memory source.

Grep remains the right tool for known exact strings, regex, multiline
patterns, and file globs. Run `/sync-gbrain` after meaningful code changes.
Do not install gbrain autopilot in this environment.

Safety: do not run `/sync-gbrain` while another sync process is active. Prefer
registering local repositories with `gbrain sources add --path <dir>`.

<!-- gstack-gbrain-search-guidance:end -->
