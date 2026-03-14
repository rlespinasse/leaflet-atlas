# Install dependencies
install:
    npm install

# Build the library
build:
    npm run build

# Build in watch mode
dev:
    npm run dev

# Lint all sources (JS + markdown)
lint:
    npm run lint

# Build and dry-run pack to verify package contents
check: build lint
    npm pack --dry-run

# Publish to npm
publish: build
    npm publish
