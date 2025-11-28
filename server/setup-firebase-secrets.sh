#!/bin/bash
# Setup script to configure Firebase Admin credentials in Google Secret Manager
# This ensures Firebase Admin SDK works correctly in Cloud Run

set -e

PROJECT_ID="mars-nexus"
REGION="us-east1"
SERVICE_NAME="mars-nexus-server"
SECRET_NAME="firebase-admin-key"

echo "🔧 Setting up Firebase Admin credentials for Cloud Run..."
echo "Project: $PROJECT_ID"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if jq is installed (needed to parse JSON)
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed"
    echo "Install it: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check if service account JSON file exists
SERVICE_ACCOUNT_FILE="../mars-nexus-firebase-adminsdk-fbsvc-efd79e637c.json"
if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "❌ Error: Service account file not found: $SERVICE_ACCOUNT_FILE"
    echo "Download it from: https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
    exit 1
fi

echo "✅ Found service account file: $SERVICE_ACCOUNT_FILE"

# Extract private key from JSON file
PRIVATE_KEY=$(cat "$SERVICE_ACCOUNT_FILE" | jq -r '.private_key')

if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" == "null" ]; then
    echo "❌ Error: Could not extract private key from service account file"
    exit 1
fi

echo "✅ Extracted private key from service account file"

# Check if secret already exists
if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &> /dev/null; then
    echo "📝 Secret '$SECRET_NAME' already exists. Updating..."
    echo -n "$PRIVATE_KEY" | gcloud secrets versions add "$SECRET_NAME" \
        --data-file=- \
        --project="$PROJECT_ID"
    echo "✅ Secret updated"
else
    echo "📝 Creating secret '$SECRET_NAME'..."
    echo -n "$PRIVATE_KEY" | gcloud secrets create "$SECRET_NAME" \
        --data-file=- \
        --project="$PROJECT_ID"
    echo "✅ Secret created"
fi

# Get the Cloud Run service account
echo ""
echo "🔍 Getting Cloud Run service account..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Check if service has a custom service account
CUSTOM_SA=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || echo "")

if [ -n "$CUSTOM_SA" ] && [ "$CUSTOM_SA" != "null" ]; then
    SERVICE_ACCOUNT="$CUSTOM_SA"
    echo "✅ Using custom service account: $SERVICE_ACCOUNT"
else
    echo "✅ Using default compute service account: $SERVICE_ACCOUNT"
fi

# Grant the service account access to the secret
echo ""
echo "🔐 Granting service account access to secret..."
gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet || echo "⚠️  Policy binding may already exist (this is OK)"

echo "✅ Service account has access to secret"

# Update Cloud Run service with environment variables and secret
echo ""
echo "🚀 Updating Cloud Run service with Firebase credentials..."
gcloud run services update "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --update-env-vars="FIREBASE_ADMIN_PROJECT_ID=$PROJECT_ID,FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com" \
    --update-secrets="FIREBASE_ADMIN_PRIVATE_KEY=$SECRET_NAME:latest" \
    --quiet

echo ""
echo "✅ Firebase Admin credentials configured successfully!"
echo ""
echo "The following environment variables are now set in Cloud Run:"
echo "  - FIREBASE_ADMIN_PROJECT_ID=$PROJECT_ID"
echo "  - FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com"
echo "  - FIREBASE_ADMIN_PRIVATE_KEY (from Secret Manager: $SECRET_NAME)"
echo ""
echo "The next deployment will automatically use these credentials."

