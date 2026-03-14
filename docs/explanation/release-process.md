# Release process

leaflet-atlas uses fully automated releases powered by
[semantic-release](https://semantic-release.gitbook.io/).
Every push to `main` is evaluated, and a new version is
published when warranted — no manual steps required.

## How it works

The release pipeline runs as a GitHub Actions workflow
(`.github/workflows/release.yml`) on every push to `main`.

### 1. Commit analysis

semantic-release inspects every commit since the last
tag using the
[Conventional Commits](https://www.conventionalcommits.org/)
specification. Only certain commit types trigger a
release:

| Commit prefix      | Version bump |
| ------------------ | ------------ |
| `feat`             | Minor        |
| `fix`              | Patch        |
| `BREAKING CHANGE`  | Major        |

Other types (`docs`, `test`, `ci`, `build`, `chore`) do
not trigger a release on their own but are included in the
release notes when bundled with a triggering commit.

If no releasable commits are found, the pipeline exits
and nothing is published.

### 2. Version bump and preparation

Once the next version is determined, semantic-release:

1. Updates the `version` field in `package.json`
2. Replaces CDN version references in `README.md` and
   `docs/how-to/install.md` (via `@semantic-release/exec`)

### 3. Publish to npm

The package is built (`prepublishOnly` runs `npm run build`)
and published to the
[npm registry](https://www.npmjs.com/package/leaflet-atlas).

CDN availability on [unpkg](https://unpkg.com/) and
[jsDelivr](https://www.jsdelivr.com/) follows
automatically — both proxy npm packages.

### 4. Commit and tag

The version bump and CDN URL changes are committed back
to `main` as `chore(release): X.Y.Z [skip ci]` and a git
tag is created (without `v` prefix, e.g. `0.3.0`).

### 5. GitHub release

A GitHub release is created with categorized release notes
generated from the conventional commit messages.

## Why this approach

### Why semantic-release

semantic-release enforces a direct link between commit
messages and version numbers. There is no opportunity for
human error in choosing the wrong version, forgetting to
tag, or publishing stale artifacts. The conventional
commits convention was already in use for this project,
so semantic-release fits naturally.

### Why no changelog file

Release notes live on the
[GitHub releases page](https://github.com/rlespinasse/leaflet-atlas/releases),
which is the canonical place users look for changes. A
separate `CHANGELOG.md` would duplicate that information
and require additional tooling to keep in sync.

### Why CDN URLs are updated via sed

The CDN version references (e.g.
`leaflet-atlas@0.2.0`) live inside markdown code fences,
where semantic-release's built-in generic file updater
cannot place annotation markers. A sed replacement in the
prepare phase keeps the approach simple and self-contained.

## Configuration

The pipeline is configured in two files:

- **`.releaserc.json`** — semantic-release plugin chain
  and release notes sections
- **`.github/workflows/release.yml`** — GitHub Actions
  workflow using
  [cycjimmy/semantic-release-action](https://github.com/cycjimmy/semantic-release-action)

## Authentication

Publishing to npm uses
[Trusted Publishers](https://docs.npmjs.com/generating-provenance-statements)
(OIDC) instead of long-lived tokens. GitHub Actions
authenticates directly with the npm registry via an
OpenID Connect identity token — no `NPM_TOKEN` secret is
needed.

This requires:

- **`id-token: write`** permission in the workflow
- **`NPM_CONFIG_PROVENANCE=true`** environment variable
- A Trusted Publisher configured on npmjs.com linking
  the repository, workflow, and `npm` environment

The `GITHUB_TOKEN` is provided automatically by GitHub
Actions and used for creating tags and releases.
