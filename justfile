# Install dependencies
install:
    npm install

# Build the library
build:
    npm run build

# Build in watch mode
dev:
    npm run dev

# Lint markdown documentation
markdownlint:
    npx markdownlint-cli2 README.md "docs/**/*.md"

# Build and dry-run pack to verify package contents
check: build markdownlint
    npm pack --dry-run

# Publish to npm
publish: build
    npm publish
