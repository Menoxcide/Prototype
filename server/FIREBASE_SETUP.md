# Firebase Admin Setup - Quick Fix

If you're seeing the error "Firebase Admin not initialized", run this one-time setup:

## Quick Fix (One-Time Setup)

**On Linux/macOS:**
```bash
cd server
./setup-firebase-secrets.sh
```

**On Windows (PowerShell):**
```powershell
cd server
.\setup-firebase-secrets.ps1
```

## What This Does

1. ✅ Creates a secret in Google Secret Manager with your Firebase private key
2. ✅ Grants Cloud Run service account access to the secret
3. ✅ Configures environment variables in Cloud Run:
   - `FIREBASE_ADMIN_PROJECT_ID=mars-nexus`
   - `FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com`
   - `FIREBASE_ADMIN_PRIVATE_KEY` (from Secret Manager)

## After Running the Script

- ✅ All future deployments will automatically use these credentials
- ✅ The `cloudbuild.yaml` is already configured to use the secret
- ✅ No need to run this again unless you regenerate your Firebase service account key

## Requirements

- `gcloud` CLI installed and authenticated
- `jq` installed (for bash script) - `brew install jq` or `apt-get install jq`
- Service account JSON file: `mars-nexus-firebase-adminsdk-fbsvc-efd79e637c.json` in project root

## Troubleshooting

**Error: Secret already exists**
- This is OK! The script will update the existing secret.

**Error: Permission denied**
- Make sure you're authenticated: `gcloud auth login`
- Make sure you have the correct project: `gcloud config set project mars-nexus`

**Error: Service account file not found**
- Download it from: https://console.firebase.google.com/project/mars-nexus/settings/serviceaccounts/adminsdk
- Save it as `mars-nexus-firebase-adminsdk-fbsvc-efd79e637c.json` in the project root

