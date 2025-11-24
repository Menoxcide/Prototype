# Quick Start Guide - Firebase Setup Complete! 🚀

Firebase has been initialized in your project. Here's what to do next:

## ✅ What's Already Done

- ✅ Firebase project linked (`nex-void`)
- ✅ Realtime Database initialized
- ✅ Security rules file created (`database.rules.json`)
- ✅ Firebase configuration files created
- ✅ AI Logic enabled

## 🔧 Required: Server-Side Setup

### Step 1: Get Firebase Service Account Key

You need to download the service account JSON file for server-side authentication:

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `nex-void`
3. **Click the gear icon** ⚙️ → **Project Settings**
4. **Go to "Service Accounts" tab**
5. **Click "Generate new private key"**
6. **Click "Generate key"** (JSON file will download)
7. **Rename the file** to `firebase-service-account.json`
8. **Move it** to the `server/` directory

**Important**: This file contains sensitive credentials and is already in `.gitignore` - never commit it!

### Step 2: Verify File Location

Make sure the file is here:
```
server/firebase-service-account.json
```

### Step 3: Install Dependencies

```bash
# Install client-side dependencies (if not done)
npm install

# Install server-side dependencies (if not done)
cd server
npm install
```

### Step 4: Run Database Migration

If you're using PostgreSQL, run this migration:

```sql
-- This adds a unique constraint on player names
ALTER TABLE players ADD CONSTRAINT unique_player_name UNIQUE (name);
```

Or manually run: `server/src/migrations/002_add_firebase_auth.sql`

### Step 5: Test Everything

1. **Start the game server**:
   ```bash
   cd server
   npm run dev
   ```
   
   You should see: `✅ Firebase Admin initialized successfully`

2. **Start the client** (in another terminal):
   ```bash
   npm run dev
   ```

3. **Visit**: http://localhost:3000

4. **You should see**: Google Sign-In button

5. **Sign in** and create a character!

## 🔍 Troubleshooting

### "Firebase Admin not initialized"
- Check that `firebase-service-account.json` exists in `server/` directory
- Verify the file is valid JSON
- Check server console for specific error messages

### "Authentication required" error
- Make sure Firebase Admin initialized (check server logs)
- Verify the service account file has correct permissions
- Check that Firebase project ID matches

### Client can't connect
- Check browser console for errors
- Verify Firebase config in `src/firebase/config.ts`
- Make sure client dependencies are installed (`npm install`)

## 📁 Files Created by Firebase Init

- `firebase.json` - Firebase project configuration
- `.firebaserc` - Firebase project aliases
- `database.rules.json` - Realtime Database security rules

## 🎯 What Happens Now

1. **User visits game** → Sees Google Sign-In
2. **Signs in** → Firebase authenticates
3. **Creates character** → Saved to database with Firebase UID
4. **Plays game** → Progress persists across reloads
5. **Same account, different device** → Character loads automatically

Your game now has:
- ✅ Secure authentication
- ✅ Persistent player data
- ✅ Duplicate name prevention
- ✅ Cross-device support

Enjoy your authenticated game! 🎮

