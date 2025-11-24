# Get Firebase Service Account Key - Step by Step

Your Firebase project is initialized, but you need the service account key for **server-side authentication**.

## Quick Steps (2 minutes)

### 1. Open Firebase Console
👉 **Go to**: https://console.firebase.google.com/project/nex-void/settings/serviceaccounts/adminsdk

Or manually:
- https://console.firebase.google.com
- Click on your project: **nex-void**
- Click the ⚙️ **gear icon** (top left)
- Click **Project settings**
- Click **Service accounts** tab

### 2. Generate Service Account Key
1. In the "Service accounts" tab, you'll see a section called **"Firebase Admin SDK"**
2. Click the button: **"Generate new private key"**
3. A warning dialog will appear - click **"Generate key"**
4. A JSON file will download to your Downloads folder

### 3. Move the File
1. **Find the downloaded file** (usually named something like `nex-void-firebase-adminsdk-xxxxx-xxxxx.json`)
2. **Rename it** to: `firebase-service-account.json`
3. **Move it** to: `X:\Prototype\server\`

### 4. Verify Location
The file should be at:
```
X:\Prototype\server\firebase-service-account.json
```

### 5. Test It
Start your server:
```bash
cd server
npm run dev
```

You should see:
```
✅ Firebase Admin initialized successfully
```

If you see:
```
⚠️  Firebase Admin not initialized
```

Then check:
- File exists at `server/firebase-service-account.json`
- File is valid JSON
- File has read permissions

## What the File Contains

The service account JSON file contains:
```json
{
  "type": "service_account",
  "project_id": "nex-void",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  ...
}
```

**Security Note**: This file gives full access to your Firebase project. It's already in `.gitignore` - **never commit it to Git!**

## Alternative: Environment Variables

Instead of a file, you can use environment variables. Set these in your server environment:

```bash
FIREBASE_ADMIN_PROJECT_ID=nex-void
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nex-void.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

But using the file is simpler for development.

## Next Steps

Once the service account file is in place:

1. ✅ Server can verify Firebase tokens
2. ✅ Players can authenticate securely
3. ✅ Character data persists with Firebase UID
4. ✅ No duplicate characters per user

**Ready to test?** Follow the instructions in `QUICK_START.md`!

