# PowerShell script to verify Cloud Run environment variables and secrets are correctly configured
# Run this after deploying to ensure everything is set up correctly

$ErrorActionPreference = "Stop"

$PROJECT_ID = "mars-nexus"
$REGION = "us-east1"
$SERVICE_NAME = "mars-nexus-server"
$SECRET_NAME = "firebase-admin-key"

Write-Host "🔍 Verifying Cloud Run environment configuration..." -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID"
Write-Host "Service: $SERVICE_NAME"
Write-Host ""

# Check if service exists
Write-Host "1️⃣ Checking if Cloud Run service exists..." -ForegroundColor Yellow
try {
    $service = gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="json" 2>&1 | ConvertFrom-Json
    Write-Host "✅ Service exists" -ForegroundColor Green
} catch {
    Write-Host "❌ Service not found: $SERVICE_NAME" -ForegroundColor Red
    exit 1
}

# Check environment variables
Write-Host ""
Write-Host "2️⃣ Checking environment variables..." -ForegroundColor Yellow
$serviceJson = gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="json" 2>&1 | ConvertFrom-Json
$envVars = $serviceJson.spec.template.spec.containers[0].env

$requiredEnvVars = @(
    "NODE_ENV",
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL"
)

$foundEnvVars = @()
foreach ($var in $requiredEnvVars) {
    $envVarObj = $envVars | Where-Object { $_.name -eq $var }
    if ($envVarObj) {
        Write-Host "  ✅ $var = $($envVarObj.value)" -ForegroundColor Green
        $foundEnvVars += $var
    } else {
        Write-Host "  ❌ $var is missing" -ForegroundColor Red
    }
}

# Check secret
Write-Host ""
Write-Host "3️⃣ Checking secret configuration..." -ForegroundColor Yellow
$secretEnvVar = $envVars | Where-Object { $_.name -eq "FIREBASE_ADMIN_PRIVATE_KEY" }
if ($secretEnvVar -and $secretEnvVar.valueFrom.secretKeyRef.name -eq $SECRET_NAME) {
    Write-Host "  ✅ FIREBASE_ADMIN_PRIVATE_KEY is configured from secret: $SECRET_NAME" -ForegroundColor Green
    $secretConfigured = $true
} else {
    Write-Host "  ❌ FIREBASE_ADMIN_PRIVATE_KEY secret is not configured correctly" -ForegroundColor Red
    if ($secretEnvVar) {
        Write-Host "     Expected: $SECRET_NAME, Found: $($secretEnvVar.valueFrom.secretKeyRef.name)" -ForegroundColor Yellow
    } else {
        Write-Host "     Secret environment variable not found" -ForegroundColor Yellow
    }
    $secretConfigured = $false
}

# Check if secret exists
Write-Host ""
Write-Host "4️⃣ Checking if secret exists in Secret Manager..." -ForegroundColor Yellow
try {
    $secret = gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID --format="json" 2>&1 | ConvertFrom-Json
    Write-Host "  ✅ Secret '$SECRET_NAME' exists" -ForegroundColor Green
    
    # Get latest version
    $versions = gcloud secrets versions list $SECRET_NAME --project=$PROJECT_ID --format="value(name)" --limit=1 2>&1
    if ($versions) {
        Write-Host "  ✅ Secret has at least one version" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Secret exists but has no versions" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Secret '$SECRET_NAME' does not exist" -ForegroundColor Red
    Write-Host "     Run: server\setup-firebase-secrets.ps1" -ForegroundColor Yellow
}

# Check service account permissions
Write-Host ""
Write-Host "5️⃣ Checking service account permissions..." -ForegroundColor Yellow
$serviceAccount = $serviceJson.spec.template.spec.serviceAccountName
if (-not $serviceAccount) {
    $projectNumber = gcloud projects describe $PROJECT_ID --format="value(projectNumber)" 2>&1
    $serviceAccount = "${projectNumber}-compute@developer.gserviceaccount.com"
}
if ($serviceAccount) {
    Write-Host "  ✅ Service account: $serviceAccount" -ForegroundColor Green
    
    # Check IAM policy
    $policy = gcloud secrets get-iam-policy $SECRET_NAME --project=$PROJECT_ID --format="json" 2>&1 | ConvertFrom-Json
    $hasAccess = $false
    foreach ($binding in $policy.bindings) {
        if ($binding.role -eq "roles/secretmanager.secretAccessor") {
            foreach ($member in $binding.members) {
                if ($member -like "*$serviceAccount*") {
                    $hasAccess = $true
                    break
                }
            }
        }
    }
    
    if ($hasAccess) {
        Write-Host "  ✅ Service account has access to secret" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Service account does NOT have access to secret" -ForegroundColor Red
        Write-Host "     Run: gcloud secrets add-iam-policy-binding $SECRET_NAME --member=`"serviceAccount:$serviceAccount`" --role=`"roles/secretmanager.secretAccessor`" --project=$PROJECT_ID" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Using default compute service account" -ForegroundColor Yellow
}

# Summary
if ($foundEnvVars.Count -eq $requiredEnvVars.Count -and $secretRef -eq $SECRET_NAME) {
    Write-Host "✅ All environment variables and secrets are correctly configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The service should be able to initialize Firebase Admin SDK correctly." -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Some configuration issues were found. Please review the output above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To fix issues:" -ForegroundColor Cyan
    Write-Host "  1. Run: server\setup-firebase-secrets.ps1" -ForegroundColor White
    Write-Host "  2. Or manually update via Cloud Console:" -ForegroundColor White
    Write-Host "     https://console.cloud.google.com/run/detail/us-east1/mars-nexus-server?project=mars-nexus" -ForegroundColor White
}

