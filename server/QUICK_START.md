# Quick Start: Running the Server

## 🏠 Run Locally (Development)

```bash
cd server
npm install
npm run dev
```

Server will start on `ws://localhost:2567`

- **Colyseus Monitor**: http://localhost:2567/colyseus
- **Monitoring API**: http://localhost:2567/api/monitoring

## ☁️ Deploy to Google Cloud Run (Production)

### Prerequisites
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install-sdk#windows
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project mars-nexus`

### Deploy (One Command)

```bash
# From project root (X:\Prototype)
gcloud builds submit --config server/cloudbuild.yaml --project mars-nexus
```

This will:
1. Build Docker image
2. Push to Container Registry
3. Deploy to Cloud Run
4. Give you a URL like: `https://mars-nexus-server-xxxxx-ue.a.run.app`

### After Deployment

1. **Get your server URL:**
   ```bash
   gcloud run services describe mars-nexus-server \
     --platform managed \
     --region us-east1 \
     --format 'value(status.url)'
   ```

2. **Update your client** to use the server URL:
   - Set `VITE_SERVER_URL` to the Cloud Run URL
   - Set `VITE_WS_URL` to `wss://` version (e.g., `wss://mars-nexus-server-xxxxx-ue.a.run.app`)

## 🔧 Troubleshooting

### Permission Denied Error
If you get `PERMISSION_DENIED`:
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=mars-nexus
2. Add your email (`justin.kamen26@gmail.com`)
3. Grant roles: **Cloud Build Editor**, **Cloud Run Admin**, **Service Account User**

### Check if Server is Running
```bash
# Local
curl http://localhost:2567/api/monitoring

# Cloud Run (after deployment)
curl https://your-server-url/api/monitoring
```

## 📝 Notes

- **Firebase** = Frontend hosting, database, auth (static files)
- **Cloud Run** = Server hosting (Node.js/Colyseus)
- You need both: Firebase for frontend, Cloud Run for server

