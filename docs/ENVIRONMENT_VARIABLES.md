# Production Environment Variables

This document describes the required environment variables for production builds.

## Overview

The client application uses environment variables prefixed with `VITE_` to configure Firebase and server endpoints. These variables are injected at build time by Vite.

## Required Variables

### Firebase Configuration

Get these values from: **Firebase Console → Project Settings → General → Your apps**

```bash
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### Server Configuration

Production server URLs - these should point to your deployed server:

```bash
# Production server HTTP/HTTPS URL (e.g., https://mars-nexus-server-xxxxx.run.app)
VITE_SERVER_URL=https://your-production-server-url.com

# Production WebSocket URL (e.g., wss://mars-nexus-server-xxxxx.run.app)
# If not set, will be derived from VITE_SERVER_URL
VITE_WS_URL=wss://your-production-server-url.com
```

### Firebase Emulators (Production)

In production, emulators should be disabled:

```bash
VITE_USE_FIREBASE_EMULATORS=false
```

## Usage

### Local Development

For local development, create a `.env` file in the project root with development values. The application will automatically use localhost for the server in development mode.

### Production Build

For production builds, you have two options:

1. **Create `.env.production` file** (recommended for local builds):
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your production values
   ```

2. **Set environment variables in CI/CD** (recommended for automated deployments):
   - Set the `VITE_*` variables as environment variables in your CI/CD platform
   - Vite will automatically inject them during `npm run build`

### Building for Production

```bash
npm run build
```

Vite will automatically:
- Use production mode
- Load variables from `.env.production` if it exists
- Inject environment variables prefixed with `VITE_`

## Important Notes

- All `VITE_*` variables are **exposed to the client code** - never include secrets
- Never commit `.env.production` with real values to version control
- Development mode uses localhost by default, even if production URLs are set
- The application automatically detects development vs production mode using `import.meta.env.DEV`

## Environment Detection

The application uses the following to determine the environment:

- **Development**: `import.meta.env.DEV === true` or `import.meta.env.MODE === 'development'`
- **Production**: `import.meta.env.MODE === 'production'` (default when running `npm run build`)

## Example `.env.production` File

Create a `.env.production` file in the project root with the following structure:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=mars-nexus.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mars-nexus
VITE_FIREBASE_STORAGE_BUCKET=mars-nexus.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=649504816384
VITE_FIREBASE_APP_ID=1:649504816384:web:...
VITE_FIREBASE_MEASUREMENT_ID=G-...

# Server Configuration
VITE_SERVER_URL=https://mars-nexus-server-xxxxx.run.app
VITE_WS_URL=wss://mars-nexus-server-xxxxx.run.app

# Emulators
VITE_USE_FIREBASE_EMULATORS=false
```

