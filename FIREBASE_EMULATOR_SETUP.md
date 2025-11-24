# Firebase Emulator Suite Setup

This guide explains how to use Firebase Emulator Suite (Firebase Sandbox) for local development and testing.

## What is Firebase Emulator Suite?

Firebase Emulator Suite is a set of local emulators that allow you to:
- **Test Firebase features locally** without affecting production data
- **Develop offline** without internet connection
- **Run automated tests** with predictable data
- **Debug** Firebase interactions in a controlled environment
- **Save costs** by avoiding production API calls during development

## Prerequisites

- Node.js 18+ installed
- `firebase-tools` installed (already in package.json)
- Firebase project created (see `FIREBASE_SETUP.md`)

## Rules Files

The emulators require security rules files:
- `firestore.rules` - Firestore security rules
- `storage.rules` - Storage security rules
- `database.rules.json` - Realtime Database rules (already exists)

These files are configured in `firebase.json` and are automatically used by the emulators.

## Quick Start

### 1. Start the Emulators

```bash
npm run emulators
```

This will start all configured emulators:
- **Auth Emulator** on `http://localhost:9099`
- **Realtime Database Emulator** on `http://localhost:9000`
- **Firestore Emulator** on `http://localhost:8080`
- **Storage Emulator** on `http://localhost:9199`
- **Emulator UI** on `http://localhost:4000` (web interface)

### 2. Start Your Development Server

In a separate terminal:

```bash
# Client
npm run dev

# Server (in another terminal)
cd server
npm run dev
```

The app will automatically connect to the emulators when running in development mode.

## Emulator UI

Access the Emulator UI at `http://localhost:4000` to:
- View and manage authentication users
- Browse Firestore collections
- Inspect Realtime Database data
- Monitor Storage files
- View emulator logs

## Configuration

### Client-Side Configuration

The client automatically uses emulators when:
- Running in development mode (`npm run dev`)
- `VITE_USE_FIREBASE_EMULATORS` is not set to `'false'`

To explicitly disable emulators:
```bash
VITE_USE_FIREBASE_EMULATORS=false npm run dev
```

### Server-Side Configuration

The server automatically uses emulators when:
- `NODE_ENV` is not `'production'`
- `USE_FIREBASE_EMULATORS` is not set to `'false'`

To explicitly disable emulators:
```bash
USE_FIREBASE_EMULATORS=false npm run dev
```

### Custom Emulator Ports

You can customize emulator ports via environment variables:

**Client (.env):**
```env
VITE_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
VITE_FIREBASE_DATABASE_EMULATOR_HOST=localhost:9000
VITE_FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080
VITE_FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

**Server (.env):**
```env
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_DATABASE_EMULATOR_HOST=localhost:9000
FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

## Available Scripts

### Start Emulators
```bash
npm run emulators
```

### Export Emulator Data
Save emulator state for later use:
```bash
npm run emulators:export ./emulator-data
```

### Import Emulator Data
Load previously exported emulator state:
```bash
npm run emulators:import ./emulator-data
```

### Run Command with Emulators
Execute a command while emulators are running:
```bash
npm run emulators:exec "npm test"
```

## Testing with Emulators

### Manual Testing

1. Start emulators: `npm run emulators`
2. Start your app: `npm run dev`
3. Use the Emulator UI to create test users and data
4. Test your app - all Firebase calls go to emulators

### Automated Testing

The emulators automatically start when running tests. Example:

```typescript
// In your test file
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

beforeAll(() => {
  // Connect to emulator
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://localhost:9099')
})
```

## Emulator Features

### Authentication Emulator

- Create test users without real Google accounts
- Test different authentication scenarios
- Simulate authentication errors
- No rate limits

**Creating Test Users via Emulator UI:**
1. Go to `http://localhost:4000`
2. Click "Authentication"
3. Click "Add user"
4. Enter email/password or use any provider

### Realtime Database Emulator

- Test database rules locally
- No data persistence (unless exported)
- Fast and isolated from production

### Firestore Emulator

- Test Firestore queries and rules
- Export/import data for consistent testing
- No costs or quotas

### Storage Emulator

- Test file uploads/downloads
- No storage costs
- Files stored locally

## Data Persistence

By default, emulator data is **not persisted** between restarts. To persist data:

### Export Data
```bash
npm run emulators:export ./emulator-data
```

### Import Data
```bash
npm run emulators:import ./emulator-data
```

### Auto-Export on Shutdown

Add to `firebase.json`:
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "exportOnExit": "./emulator-data"
  }
}
```

## Troubleshooting

### Emulators Won't Start

**Port Already in Use:**
```bash
# Find process using port
netstat -ano | findstr :9099  # Windows
lsof -i :9099                 # Mac/Linux

# Kill process or change port in firebase.json
```

**Firebase Tools Not Found:**
```bash
npm install -g firebase-tools
# Or use npx
npx firebase-tools emulators:start
```

### App Not Connecting to Emulators

1. **Check environment variables:**
   - Client: `VITE_USE_FIREBASE_EMULATORS` should not be `'false'`
   - Server: `USE_FIREBASE_EMULATORS` should not be `'false'`

2. **Verify emulators are running:**
   - Check `http://localhost:4000` (Emulator UI)
   - Check console for connection messages

3. **Check for errors:**
   - Browser console for client errors
   - Server logs for backend errors

### Authentication Not Working

1. **Verify emulator connection:**
   - Look for "Connected to Firebase Auth Emulator" in console
   - Check Emulator UI shows Auth emulator running

2. **Create test user:**
   - Use Emulator UI to create a test user
   - Or use any email/password (emulator doesn't validate)

3. **Check CORS:**
   - Emulators should handle CORS automatically
   - If issues persist, check browser console

## Production vs Development

### Development (with Emulators)
- All Firebase calls go to local emulators
- No production data affected
- No costs incurred
- Fast iteration

### Production
- Emulators automatically disabled
- Uses real Firebase project
- Real data and costs
- Set `NODE_ENV=production` to ensure emulators are off

## Best Practices

1. **Always use emulators in development** - Never test against production
2. **Export test data** - Create consistent test scenarios
3. **Use Emulator UI** - Great for debugging and manual testing
4. **Clean up between tests** - Reset emulator state for consistent results
5. **Version control emulator data** - Export useful test datasets

## Additional Resources

- [Firebase Emulator Suite Documentation](https://firebase.google.com/docs/emulator-suite)
- [Emulator UI Guide](https://firebase.google.com/docs/emulator-suite/ui/overview)
- [Testing with Emulators](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)

## Example Workflow

```bash
# Terminal 1: Start emulators
npm run emulators

# Terminal 2: Start client
npm run dev

# Terminal 3: Start server
cd server && npm run dev

# Terminal 4: Run tests
npm test
```

All Firebase operations will use the local emulators, keeping your production data safe!

