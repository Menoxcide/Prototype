#!/bin/bash
# Script to set Firebase Admin environment variables in Cloud Run

set -e

PROJECT_ID="mars-nexus"
SERVICE_NAME="mars-nexus-server"
REGION="us-east1"
JSON_FILE="../mars-nexus-firebase-adminsdk-fbsvc-efd79e637c.json"

echo "🔧 Setting Firebase Admin environment variables for Cloud Run service..."

# Extract values from JSON file
PROJECT_ID_VALUE=$(jq -r '.project_id' "$JSON_FILE")
CLIENT_EMAIL=$(jq -r '.client_email' "$JSON_FILE")
PRIVATE_KEY=$(jq -r '.private_key' "$JSON_FILE")

echo "📋 Values:"
echo "  Project ID: $PROJECT_ID_VALUE"
echo "  Client Email: $CLIENT_EMAIL"
echo "  Private Key: [hidden]"

# Set environment variables
echo ""
echo "🚀 Updating Cloud Run service..."
gcloud run services update "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --update-env-vars="FIREBASE_ADMIN_PROJECT_ID=$PROJECT_ID_VALUE,FIREBASE_ADMIN_CLIENT_EMAIL=$CLIENT_EMAIL,FIREBASE_ADMIN_PRIVATE_KEY=$PRIVATE_KEY"

echo ""
echo "✅ Firebase Admin environment variables set successfully!"
echo ""
echo "The server will now use these environment variables instead of the service account file."

