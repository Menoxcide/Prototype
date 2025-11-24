# Firebase Setup Guide

This guide will help you set up Firebase Authentication for NEX://VOID.

## Prerequisites

1. A Google account
2. Access to Firebase Console (https://console.firebase.google.com)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. Enable Google Analytics (optional but recommended)

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Click on **Google** provider
3. Enable it and set your support email
4. Save the changes

## Step 3: Get Client-Side Config

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click on the Web icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the `firebaseConfig` object values

## Step 4: Configure Client-Side Environment

Create a `.env` file in the root directory with:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Replace the values with your actual Firebase config values.

## Step 5: Set Up Server-Side Admin SDK

### Option A: Using Service Account File (Recommended)

1. In Firebase Console, go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Save the JSON file as `firebase-service-account.json` in the `server/` directory
4. **IMPORTANT**: Add this file to `.gitignore` - it contains sensitive credentials!

### Option B: Using Environment Variables

Alternatively, you can set these environment variables on your server:

```env
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

You can find these values in the service account JSON file.

## Step 6: Authorized Domains

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Add your localhost domain: `localhost`
3. Add your production domain when deploying

## Step 7: Install Dependencies

Run these commands in the project root and server directory:

```bash
# Client-side dependencies (already in package.json)
npm install

# Server-side dependencies (already in package.json)
cd server
npm install
```

## Step 8: Test the Setup

1. Start the development server: `npm run dev`
2. You should see a "Sign in with Google" button
3. Click it and authenticate with your Google account
4. Check the browser console for any errors

## Troubleshooting

### "Firebase not initialized" error

- Check that your `.env` file exists and has all required variables
- Make sure variable names start with `VITE_` for client-side access
- Restart your dev server after adding environment variables

### "Token verification failed" on server

- Verify that `firebase-service-account.json` exists in the `server/` directory
- Check that the service account has proper permissions
- Ensure the project ID matches between client and server configs

### Google Sign-In not working

- Verify Google sign-in method is enabled in Firebase Console
- Check that your domain is in the authorized domains list
- Look for CORS errors in the browser console

## Security Notes

1. **Never commit** `firebase-service-account.json` to version control
2. **Never commit** `.env` files with real credentials
3. The `.gitignore` file already excludes these files
4. Use environment variables in production
5. Restrict API keys in Firebase Console if needed

## Next Steps

After setup, the game will:
- Require Google authentication to play
- Use Firebase UID as the persistent player ID
- Save player data tied to the authenticated user
- Prevent duplicate character creation per user
- Persist progress across reloads and devices

