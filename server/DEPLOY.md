# Server Deployment Guide

This guide explains how to deploy the MARS://NEXUS game server to production.

## Quick Start: Deploy to Google Cloud Run

### Prerequisites

1. **Install Google Cloud SDK**
   
   ⚠️ **Important**: Do NOT install the `gcloud` npm package - it's deprecated and incompatible with modern Node.js. Install the official Google Cloud SDK CLI tool instead.
   
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Windows
   # Download and run the installer from:
   # https://cloud.google.com/sdk/docs/install-sdk#windows
   # After installation, restart your terminal and verify with: gcloud --version
   
   # Linux
   curl https://sdk.cloud.google.com | bash
   ```

2. **Authenticate**
   ```bash
   gcloud auth login
   gcloud config set project mars-nexus
   ```

3. **Enable required APIs**
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

4. **Set up Firebase Admin credentials (ONE-TIME SETUP)**
   
   This is required for Firebase authentication to work. Run this once before your first deployment:
   
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
   
   This script will:
   - Create a secret in Google Secret Manager with your Firebase private key
   - Grant Cloud Run access to the secret
   - Configure environment variables in Cloud Run
   
   ⚠️ **Important**: You only need to run this once. The `cloudbuild.yaml` is already configured to use these secrets on every deployment.

### Deploy Using Cloud Build (Recommended)

```bash
# From project root
gcloud builds submit --config server/cloudbuild.yaml --project mars-nexus
```

This will:
1. Build the Docker image
2. Push it to Google Container Registry
3. Deploy to Cloud Run

### Manual Deployment Steps

1. **Build and push Docker image:**
   ```bash
   cd server
   gcloud builds submit --tag gcr.io/mars-nexus/mars-nexus-server
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy mars-nexus-server \
     --image gcr.io/mars-nexus/mars-nexus-server \
     --platform managed \
     --region us-east1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 2Gi \
     --cpu 2 \
     --min-instances 1 \
     --max-instances 10 \
     --set-env-vars NODE_ENV=production,PORT=8080,FIREBASE_ADMIN_PROJECT_ID=mars-nexus,FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com \
     --update-secrets FIREBASE_ADMIN_PRIVATE_KEY=firebase-admin-key:latest \
     --project mars-nexus
   ```
   
   ⚠️ **Note**: Make sure you've run `setup-firebase-secrets.sh` first to create the secret!

3. **Set up secrets (for sensitive data):**
   ```bash
   # Create secrets in Secret Manager
   echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
   echo -n "your-redis-url" | gcloud secrets create REDIS_URL --data-file=-
   echo -n "your-private-key" | gcloud secrets create FIREBASE_PRIVATE_KEY --data-file=-
   echo -n "your-client-email" | gcloud secrets create FIREBASE_CLIENT_EMAIL --data-file=-
   
   # Grant Cloud Run access to secrets
   gcloud secrets add-iam-policy-binding DATABASE_URL \
     --member serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com \
     --role roles/secretmanager.secretAccessor
   ```

4. **Get the service URL:**
   ```bash
   gcloud run services describe mars-nexus-server \
     --platform managed \
     --region us-east1 \
     --format 'value(status.url)'
   ```

5. **Update client environment variables:**
   - Set `VITE_SERVER_URL` to the Cloud Run URL
   - Set `VITE_WS_URL` to `wss://` version of the URL (Cloud Run supports WebSockets)

## Environment Variables

Required environment variables for the server:

- `NODE_ENV=production`
- `PORT=8080` (Cloud Run sets this automatically)
- `FIREBASE_ADMIN_PROJECT_ID=mars-nexus` ✅ (Set automatically by deployment)
- `FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com` ✅ (Set automatically by deployment)
- `FIREBASE_ADMIN_PRIVATE_KEY` ✅ (Set automatically from Secret Manager)

Optional:
- `DATABASE_URL=postgresql://...` (PostgreSQL connection string)
- `REDIS_URL=redis://...` (Optional, for scaling)

**Note**: Firebase Admin credentials are automatically configured via Secret Manager. You don't need to set them manually if you've run the setup script.

## Testing Locally with Docker

```bash
cd server
docker build -t mars-nexus-server .
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e FIREBASE_PROJECT_ID=mars-nexus \
  mars-nexus-server
```

## Monitoring

- **Cloud Run Logs**: View in Google Cloud Console → Cloud Run → Logs
- **Colyseus Monitor**: Available at `https://your-service-url/colyseus`
- **Monitoring API**: Available at `https://your-service-url/api/monitoring`

## Scaling

Cloud Run automatically scales based on traffic:
- **Min instances**: 1 (always running)
- **Max instances**: 10 (can be increased)
- **Concurrency**: 80 requests per instance (default)

To handle more traffic, increase `--max-instances`:
```bash
gcloud run services update mars-nexus-server \
  --max-instances 50 \
  --region us-east1
```

## Troubleshooting

### Firebase Admin not initialized

If you see the error "Firebase Admin not initialized", run the setup script:

```bash
cd server
./setup-firebase-secrets.sh  # Linux/macOS
# or
.\setup-firebase-secrets.ps1  # Windows PowerShell
```

This will configure Firebase credentials in Secret Manager and update Cloud Run.

### Server not starting
- Check Cloud Run logs: `gcloud run services logs read mars-nexus-server`
- Verify environment variables are set correctly
- Check that PORT is set to 8080
- Verify Firebase secrets are configured (see above)

### WebSocket connection issues
- Cloud Run supports WebSockets, but ensure you're using `wss://` (secure WebSocket)
- Check that the client is using the correct URL

### Database connection issues
- Verify DATABASE_URL is correct
- Check that Cloud SQL proxy is set up (if using Cloud SQL)
- Ensure database allows connections from Cloud Run IPs

## Cost Estimation

Cloud Run pricing (approximate):
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests
- **Free tier**: 2 million requests/month, 360,000 GiB-seconds/month

For a small game server with ~100 concurrent players:
- Estimated cost: $10-30/month

