# PowerShell script to setup Firebase Admin credentials in Google Secret Manager
# This ensures Firebase Admin SDK works correctly in Cloud Run

$ErrorActionPreference = "Stop"

$PROJECT_ID = "mars-nexus"
$REGION = "us-east1"
$SERVICE_NAME = "mars-nexus-server"
$SECRET_NAME = "firebase-admin-key"

Write-Host "🔧 Setting up Firebase Admin credentials for Cloud Run..." -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID"
Write-Host ""

# Check if gcloud is installed
try {
    $null = gcloud --version 2>&1
} catch {
    Write-Host "❌ Error: gcloud CLI is not installed" -ForegroundColor Red
    Write-Host "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Check if service account JSON file exists
$SERVICE_ACCOUNT_FILE = "..\mars-nexus-firebase-adminsdk-fbsvc-efd79e637c.json"
if (-not (Test-Path $SERVICE_ACCOUNT_FILE)) {
    Write-Host "❌ Error: Service account file not found: $SERVICE_ACCOUNT_FILE" -ForegroundColor Red
    Write-Host "Download it from: https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
    exit 1
}

Write-Host "✅ Found service account file: $SERVICE_ACCOUNT_FILE" -ForegroundColor Green

# Read and parse JSON file
$json = Get-Content $SERVICE_ACCOUNT_FILE | ConvertFrom-Json
$PRIVATE_KEY = $json.private_key

if ([string]::IsNullOrWhiteSpace($PRIVATE_KEY)) {
    Write-Host "❌ Error: Could not extract private key from service account file" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Extracted private key from service account file" -ForegroundColor Green

# Check if secret already exists
$secretExists = $false
try {
    $null = gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID 2>&1
    $secretExists = $true
} catch {
    $secretExists = $false
}

if ($secretExists) {
    Write-Host "📝 Secret '$SECRET_NAME' already exists. Updating..." -ForegroundColor Yellow
    $PRIVATE_KEY | gcloud secrets versions add $SECRET_NAME `
        --data-file=- `
        --project=$PROJECT_ID
    Write-Host "✅ Secret updated" -ForegroundColor Green
} else {
    Write-Host "📝 Creating secret '$SECRET_NAME'..." -ForegroundColor Yellow
    $PRIVATE_KEY | gcloud secrets create $SECRET_NAME `
        --data-file=- `
        --project=$PROJECT_ID
    Write-Host "✅ Secret created" -ForegroundColor Green
}

# Get the Cloud Run service account
Write-Host ""
Write-Host "🔍 Getting Cloud Run service account..." -ForegroundColor Cyan
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format='value(projectNumber)'
$SERVICE_ACCOUNT = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Check if service has a custom service account
try {
    $CUSTOM_SA = gcloud run services describe $SERVICE_NAME `
        --region=$REGION `
        --project=$PROJECT_ID `
        --format='value(spec.template.spec.serviceAccountName)' 2>&1
    
    if ($CUSTOM_SA -and $CUSTOM_SA -ne "null" -and $CUSTOM_SA.Trim() -ne "") {
        $SERVICE_ACCOUNT = $CUSTOM_SA.Trim()
        Write-Host "✅ Using custom service account: $SERVICE_ACCOUNT" -ForegroundColor Green
    } else {
        Write-Host "✅ Using default compute service account: $SERVICE_ACCOUNT" -ForegroundColor Green
    }
} catch {
    Write-Host "✅ Using default compute service account: $SERVICE_ACCOUNT" -ForegroundColor Green
}

# Grant the service account access to the secret
Write-Host ""
Write-Host "🔐 Granting service account access to secret..." -ForegroundColor Cyan
try {
    gcloud secrets add-iam-policy-binding $SECRET_NAME `
        --member="serviceAccount:$SERVICE_ACCOUNT" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID `
        --quiet | Out-Null
    Write-Host "✅ Service account has access to secret" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Policy binding may already exist (this is OK)" -ForegroundColor Yellow
}

# Update Cloud Run service with environment variables and secret
Write-Host ""
Write-Host "🚀 Updating Cloud Run service with Firebase credentials..." -ForegroundColor Cyan
gcloud run services update $SERVICE_NAME `
    --region=$REGION `
    --project=$PROJECT_ID `
    --update-env-vars="FIREBASE_ADMIN_PROJECT_ID=$PROJECT_ID,FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com" `
    --update-secrets="FIREBASE_ADMIN_PRIVATE_KEY=$SECRET_NAME`:latest" `
    --quiet

Write-Host ""
Write-Host "✅ Firebase Admin credentials configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "The following environment variables are now set in Cloud Run:"
Write-Host "  - FIREBASE_ADMIN_PROJECT_ID=$PROJECT_ID"
Write-Host "  - FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com"
Write-Host "  - FIREBASE_ADMIN_PRIVATE_KEY (from Secret Manager: $SECRET_NAME)"
Write-Host ""
Write-Host "The next deployment will automatically use these credentials."

