# Deployment foundation

`main` is the reviewed source branch. GitHub Pages still serves the existing
`gh-pages` branch until the deployment cutover is separately reviewed and
verified.

## Current checkpoint

Every pull request and push to `main` runs the existing browser gates through
`.github/workflows/ci.yml`. A green source-gates run is required before any
deployment work begins.

## Cutover sequence

1. Keep the current `gh-pages` commit as the rollback anchor.
2. Produce a deployment artifact from the exact reviewed `main` commit.
3. Verify all protected HTML paths, service workers, offline gates, and the
   GitHub Pages deployment run against a checkpoint deployment.
4. Change the Pages publishing source only after that checkpoint succeeds.
5. Stop direct development on `gh-pages`; it becomes deployment output only.

During the transition, the restored Radio Free Helsinki morning-wire workflow is
the only approved content-only writer to both branches; it does not deploy code.

## Rollback

If a checkpoint or live deployment fails, restore the recorded `gh-pages`
anchor through a normal reviewed deployment. Do not force-push either branch,
change the public domain, or delete the previous production tree.

The workflow that performs the actual cutover is intentionally not part of the
CI-foundation change. Source validation must prove stable first.
