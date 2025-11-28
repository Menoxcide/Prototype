# Dockerfile for MARS://NEXUS Game Server
FROM node:20-slim

WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/
COPY server/tsconfig.json ./server/
COPY server/esbuild.config.js ./server/
# Copy patches directory (needed for patch-package to fix nanoid import)
COPY server/patches/ ./server/patches/

# Copy shared package files (server depends on shared)
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/

# Install server dependencies (including dev dependencies for building)
# patch-package will run via postinstall script to apply patches
WORKDIR /app/server
RUN npm install --legacy-peer-deps

# Install shared package dependencies
WORKDIR /app/shared
RUN npm install --legacy-peer-deps

# Copy source code
WORKDIR /app
COPY server/src/ ./server/src/
COPY server/shared/ ./server/shared/
COPY shared/src/ ./shared/src/

# Note: Firebase Admin SDK will use FIREBASE_ADMIN_* environment variables
# set in Cloud Run, so we don't need to copy the service account file

# Build shared package first (server depends on it)
WORKDIR /app/shared
RUN npm run build

# Build the application (this will compile TypeScript and bundle with esbuild)
WORKDIR /app/server
RUN npm run build

# Verify the build output exists
RUN if [ ! -f "dist/index.js" ]; then \
      echo "ERROR: dist/index.js not found after build!"; \
      ls -la dist/ || echo "dist directory does not exist"; \
      exit 1; \
    fi && \
    echo "✅ Build output verified: dist/index.js exists" && \
    ls -lh dist/index.js

# Copy and make startup script executable
COPY server/start.sh /app/server/start.sh
RUN chmod +x /app/server/start.sh

# Expose the port (Cloud Run will set PORT env var, default to 8080)
ENV PORT=8080
EXPOSE 8080

# Start the server using the startup script
WORKDIR /app/server
CMD ["./start.sh"]

