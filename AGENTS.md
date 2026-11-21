# Man vs Myopia app: agent map

A Vite + React + TypeScript single-page app for measuring visual acuity at home; `README.md` says what it does for a user. It serves Kevin's own eye data from production, so treat every merge as shipping to a live medical record. `CLAUDE.md` is a symlink to this file.

## Where things live

- `app/`: all code and its tooling (`package.json`, `package-lock.json`, strict `tsconfig`, ESLint, Prettier).
  - `app/src/lib/UserLogMARGuessingEngine.ts`: the QUEST+ acuity estimator.
  - `app/src/firebase.ts`: Firebase client config; `npm run dev` points it at the local emulators.
  - `app/firestore.rules`, `app/firestore.indexes.json`: Firestore config. **Not deployed by merging**; see below.
- `.github/workflows/`: `ci.yml` (the `check` job), `firestore-rules-gate.yml` (the `firestore-rules` job), `verify-production.yml` (post-merge deploy check).
- `.github/rulesets/main.json`: the ruleset that protects `main`, as exported JSON.
- `scripts/verify-production-deploy.sh`: proves production serves a given build.
- `docs/`, `laboratory-config/`: images and reference notes, no code.
- Legacy, not on any live path: `.devcontainer/`, `database/init.sql` and `app/run-dev.sh` (from a Postgres era), `app/cloudbuild.yaml` and the `hosting` block of `app/firebase.json` (Firebase Hosting, torn down 2026-10-31). Do not read them as how anything runs today.

## Build and check

Everything goes through the root `Makefile`, and CI runs the same targets:

- `make setup`: `npm ci` in `app/` (only when `package-lock.json` changed) and points `core.hooksPath` at `.githooks/`.
- `make check`: format check, lint, unit tests, typecheck and production build. This is exactly what the required `check` job runs. Lint warnings pass; errors fail.
- `make test`, `make build`: the single steps.

`npm --prefix app run format` fixes formatting. The `pre-push` hook runs `make check`; `git push --no-verify` skips it, CI does not. Hooks and targets work from any git worktree; Claude Code's worktrees go under `.claude/worktrees/`, which is ignored.

Unit tests are Vitest files beside the code (`*.test.ts`). Two QUEST+ tests are marked `it.fails` because the engine and their expected values disagree; KEV-360 decides which is wrong. When they agree, `it.fails` turns red and must come off.

To click through the app locally: `npx firebase-tools emulators:start` in `app/` (needs Java; never install `firebase-tools` globally), then `npm --prefix app run dev`.

## Shipping a change

1. Branch in a worktree, open a PR. Vercel builds a preview for every push.
2. The `main` ruleset requires the `check` and `firestore-rules` jobs green, a pull request, no force-push and no deletion. Merge with `gh pr merge --merge`. `gh` acts as Kevin, the repo admin, so an agent could edit or disable the ruleset: never do it, and never pass `--admin`. A blocked merge is the signal, not an obstacle.
3. Before merging, have an agent that did not write the change review the diff in a fresh context. GitHub cannot enforce this yet: agents and Kevin share one account and GitHub forbids approving your own PR (identity work is Linear project P-KEV-24).
4. **Merge is the deploy.** Vercel ships `main` to https://man-vs-myopia-app.vercel.app, usually within a minute.
5. **Verify it landed.** The `Verify production deploy` workflow runs on every push to `main`: it builds the commit and waits until production serves a byte-identical `index.html` (Vite names assets by content hash) and every asset loads. Read its result with `gh run list --workflow verify-production.yml --branch main`. Locally: `make build && scripts/verify-production-deploy.sh`. This relies on CI and Vercel producing the same bundle, which holds while the build reads no Vercel-only environment variables; adding a `VITE_*` variable on Vercel would make every verify time out.
6. **Roll back by revert.** `git revert <sha>` (with `-m 1` when it is a merge commit) on a new branch, PR, same gates, merge; the verify workflow then confirms production serves the reverted build. No special access needed.

## Firestore rules do not deploy on merge

Vercel ships the site only. `app/firestore.rules` and `app/firestore.indexes.json` reach production only when someone with credentials for the Firebase project `myopia-data-streams` deploys them, and today that is Kevin alone. On 2026-10-31 production was found enforcing rules ten days older than the repo's, granting a former contractor access to every user's document, because merging had looked like shipping.

So the `firestore-rules` job fails any PR that changes either file until the PR carries the label `firestore-rules-deployed`. An agent never deploys rules and never adds that label itself; it assigns the work to Kevin, who deploys from the PR branch and then labels the PR, so `main` and production agree the moment it merges:

```
cd app
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project myopia-data-streams
```

The same deploy is two REST calls against `firebaserules.googleapis.com` (create a ruleset, then point the `cloud.firestore` release at it): https://firebase.google.com/docs/reference/rules/rest.

A push that changes either file after the label was added removes the label and fails the check, so the deploy always matches what merges. Nothing yet compares the live rules with `main`: if a labelled PR is abandoned, redeploy `main`'s rules by hand.

## Agent-ready status

Measured against the `/agent-ready-repo` essentials, 2026-11-21:

| Essential | State |
| -- | -- |
| 1. Protected mainline | `.github/rulesets/main.json`. Agents cannot apply it (`gh api` is denied to them), so Kevin imports it in the repo's settings; `gh ruleset check main` shows whether it is live. Binds agents only while they never use admin powers (above). |
| 2. CI required before merge | `check` and `firestore-rules`, required by the ruleset. |
| 3. Narrow CI | `check` finishes green in seconds when only Markdown, `docs/` or `laboratory-config/` changed; npm downloads are cached on the lockfile. |
| 4. Merge is the deploy | Vercel, for the site. Firestore config is the named exception, gated above. |
| 5. Verify and roll back | `verify-production.yml`; revert PR. |
| 6. Repeatable build | `Makefile`, `package-lock.json`, Node 24 in CI. |
| 7. End-to-end tests | **Skipped.** Needs the Firebase emulators plus a stub for Chrome's speech recognition, which answers every test question. KEV-362. |
| 8. Local hooks mirroring CI | `.githooks/pre-push` runs `make check`, installed by `make setup`. |
| 9. `AGENTS.md`, `CLAUDE.md` symlinked | This file. |
| 10. Fresh-context review | Practised, not enforceable until agents have their own GitHub identity (P-KEV-24). |
| 11. Worktree-native | Relative hooks path, no absolute paths, `.claude/worktrees/` ignored. |
