# Install dependencies
install:
    npm install

# Build the library
build:
    npm run build

# Build in watch mode
dev:
    npm run dev

# Build and dry-run pack to verify package contents
check: build
    npm pack --dry-run

# Publish to npm
publish: build
    npm publish
