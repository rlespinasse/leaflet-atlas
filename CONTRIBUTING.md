# Contributing to leaflet-atlas

Thank you for your interest in contributing!

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- [mise](https://mise.jdx.dev/) (optional, manages Node version automatically)

## Setup

```bash
git clone https://github.com/rlespinasse/leaflet-atlas.git
cd leaflet-atlas
npm install
```

## Development workflow

### Build the library

```bash
npm run build
```

Build in watch mode for iterative development:

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Run linters

ESLint (JavaScript) and markdownlint (documentation):

```bash
npm run lint
```

### Full check before submitting

```bash
npm run build && npm run lint && npm test
```

## Project structure

```text
src/
  js/           Source modules (ES modules)
  css/          Stylesheets
docs/           Documentation (Diataxis structure)
  tutorials/    Learning-oriented guides
  how-to/       Task-oriented guides
  explanation/  Understanding-oriented content
  reference/    API and configuration reference
dist/           Built output (not committed)
```

## Pull requests

1. Create a branch from `main`
2. Make your changes
3. Ensure `npm run build`, `npm run lint`, and `npm test` all pass
4. Use [Conventional Commits](https://www.conventionalcommits.org/)
   for your commit messages
5. Open a pull request against `main`

CI will automatically run tests, linting, and build checks on your PR.

## License

By contributing, you agree that your contributions will be licensed
under the [MIT License](LICENSE).
