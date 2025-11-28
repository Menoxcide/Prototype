# Setting Firebase Admin Environment Variables in Cloud Run

## Option 1: Using Secret Manager (Most Secure)

**Step 1: Remove the old environment variable (if it exists)**

```bash
gcloud run services update mars-nexus-server \
  --region=us-east1 \
  --project=mars-nexus \
  --remove-env-vars="FIREBASE_ADMIN_PRIVATE_KEY"
```

**Step 2: Create the secret in Secret Manager (run once)**

```bash
# Create the secret (run this once)
echo -n "-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5NCzQps12C3zz
GknNTCwddrdswDTQTYil8CI+0JaeUeEByOu/kqgr+utEItzx55r/IMjIrSr4NsyO
2ACm+GxU/DebkuRDAZGYm1+nb6MFGIOx7iBI8hNesZbSP0apWiOAKJaR/D1BjrNm
AjvBow/lP6x27UMi+GGUStl5VazcO//BztUtnbbh6KiZohd41RN6J+ZMOgdUolyv
sylgE1v3tvELoo2BJGO2pcZdt4vpdcDlF3Oh0MkwHuEu1ZfpDAAhlAQNPQLmS9yR
ElAAWOn6JJzraa7Ecx99gdWN6wdCV+mMyGOcc70viCNYM7hV+iUE1zfAszh+zmqI
4MPqIMqfAgMBAAECggEAUeD9RynXgC7ICPpAUqEwh74qjcvUDZuZpDMsELVLQadV
YOKhR0rhSsBeLvtyzwfkAJNP8ViNvLsNaMGaWDdQPapcM02X2P/ijKN0gKPcYK5b
2tg6McXERoMg+Ma8yLZvJ4PKPbRUqJ0cNycZoBwlNOcXqmRu4BELovIMf5YfHCYx
8GR5RIy6kbpXVCNZE+J5qQVgWkqgO3zNyBNwTUq249Ae0c9QqVurWEQXMfrC9JRi
NaeZMZKalMQ6s3XRg/TZVhWmMsoCVsrY08L6XIvN0P2LQrja0PpUQHVE7Yfr8Wp3
JECNTGFGPBoz7VwOwaR0DeUU9EQCmXtxQ6RCxa+n0QKBgQDe7mNzk2Pz0NY8yafl
9FB+H2e5iox9IsvnlUd+YW/UdZLAvGmdRFnge/lzjKBC51SjSyvf1nBoV7nI4kw6
cULWP9pYUTTofoicXAhdJMax6pn7HFFoBaPcfnd2LGT00+8w3YPJ0eCJnQEVahwI
RzaVUwqQbeCzvBBS70MH+QPlPQKBgQDUrR9qpBYJ+ffIFhJ/fSuzxVC/N4RqLH3u
nncdjKbZkWHs90FB3yG7BGSMcPqLOjkWleSW+4gjAJbcd7hO8b937SZT0Twrbt+m
yDRtvwNqkztJeB34clHAVG5cURmPFqa01/wVNxHqNTP7kt/4US22ugqwZP9OlftD
POaI+qbFCwKBgQC7ItYtIN7Yvsf4gzcD29Dt7qL9p4ZDTUBpiHBZcKWVbZThYcgu
kj/4J1nBW5z0TIhKA0IzRilaDboRHZXrwUPf4f4CATkuqXk3+DG1Lrf0hgD4QE89
yO5Cm47gjme49WdmV6zXb+zS2A8e0NHzSQRS2UCW+QWVGxuA4wQb3zcb6QKBgGZV
04st34j3Zfo6XLZJ1bCQHnWUUjwAoqwiRjDK0DJamWM76oO2yXVC/NrzNiuuXW/3
umHIMM6e5vi5Bs+91aLwUwP751cC581KAqhYRF2Q8PM+QDWfVKUWO3Biecj3Xkog
r6TJte4boaLJHspOzY9iX+hXAN6gnqHQ+SEqcvrXAoGBANv9pFKNBepTz5nRAoNj
YSFkmQHHTY5SrERZaFyRFGAgY6FZsXR4B0Zcz53rTXLAOx9beM6v7qaAcrcutrvy
X4ghMbzO25idgsaEET7ymPTJqqBReBG7bGGPm3ae0UnPO5zLE/uli/lmjqi/nVXC
sOwgGQQcfuto2IN01LCpwsL4
-----END PRIVATE KEY-----" | gcloud secrets create firebase-admin-key \
  --data-file=- \
  --project=mars-nexus
```

**Step 3: Grant Cloud Run access to the secret**

```bash
# Get the service account (usually the default compute service account)
SERVICE_ACCOUNT=$(gcloud run services describe mars-nexus-server \
  --region=us-east1 \
  --format='value(spec.template.spec.serviceAccountName)' \
  --project=mars-nexus)

# If no service account is set, use the default compute service account
if [ -z "$SERVICE_ACCOUNT" ]; then
  SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  PROJECT_NUMBER=$(gcloud projects describe mars-nexus --format='value(projectNumber)')
  SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

# Grant access
gcloud secrets add-iam-policy-binding firebase-admin-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=mars-nexus
```

**Step 4: Set environment variables and secret**

```bash
gcloud run services update mars-nexus-server \
  --region=us-east1 \
  --project=mars-nexus \
  --update-env-vars="FIREBASE_ADMIN_PROJECT_ID=mars-nexus,FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com" \
  --update-secrets="FIREBASE_ADMIN_PRIVATE_KEY=firebase-admin-key:latest"
```

**But first, you need to create the secret in Secret Manager:**

```bash
# Create the secret (run this once)
echo -n "-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5NCzQps12C3zz
GknNTCwddrdswDTQTYil8CI+0JaeUeEByOu/kqgr+utEItzx55r/IMjIrSr4NsyO
2ACm+GxU/DebkuRDAZGYm1+nb6MFGIOx7iBI8hNesZbSP0apWiOAKJaR/D1BjrNm
AjvBow/lP6x27UMi+GGUStl5VazcO//BztUtnbbh6KiZohd41RN6J+ZMOgdUolyv
sylgE1v3tvELoo2BJGO2pcZdt4vpdcDlF3Oh0MkwHuEu1ZfpDAAhlAQNPQLmS9yR
ElAAWOn6JJzraa7Ecx99gdWN6wdCV+mMyGOcc70viCNYM7hV+iUE1zfAszh+zmqI
4MPqIMqfAgMBAAECggEAUeD9RynXgC7ICPpAUqEwh74qjcvUDZuZpDMsELVLQadV
YOKhR0rhSsBeLvtyzwfkAJNP8ViNvLsNaMGaWDdQPapcM02X2P/ijKN0gKPcYK5b
2tg6McXERoMg+Ma8yLZvJ4PKPbRUqJ0cNycZoBwlNOcXqmRu4BELovIMf5YfHCYx
8GR5RIy6kbpXVCNZE+J5qQVgWkqgO3zNyBNwTUq249Ae0c9QqVurWEQXMfrC9JRi
NaeZMZKalMQ6s3XRg/TZVhWmMsoCVsrY08L6XIvN0P2LQrja0PpUQHVE7Yfr8Wp3
JECNTGFGPBoz7VwOwaR0DeUU9EQCmXtxQ6RCxa+n0QKBgQDe7mNzk2Pz0NY8yafl
9FB+H2e5iox9IsvnlUd+YW/UdZLAvGmdRFnge/lzjKBC51SjSyvf1nBoV7nI4kw6
cULWP9pYUTTofoicXAhdJMax6pn7HFFoBaPcfnd2LGT00+8w3YPJ0eCJnQEVahwI
RzaVUwqQbeCzvBBS70MH+QPlPQKBgQDUrR9qpBYJ+ffIFhJ/fSuzxVC/N4RqLH3u
nncdjKbZkWHs90FB3yG7BGSMcPqLOjkWleSW+4gjAJbcd7hO8b937SZT0Twrbt+m
yDRtvwNqkztJeB34clHAVG5cURmPFqa01/wVNxHqNTP7kt/4US22ugqwZP9OlftD
POaI+qbFCwKBgQC7ItYtIN7Yvsf4gzcD29Dt7qL9p4ZDTUBpiHBZcKWVbZThYcgu
kj/4J1nBW5z0TIhKA0IzRilaDboRHZXrwUPf4f4CATkuqXk3+DG1Lrf0hgD4QE89
yO5Cm47gjme49WdmV6zXb+zS2A8e0NHzSQRS2UCW+QWVGxuA4wQb3zcb6QKBgGZV
04st34j3Zfo6XLZJ1bCQHnWUUjwAoqwiRjDK0DJamWM76oO2yXVC/NrzNiuuXW/3
umHIMM6e5vi5Bs+91aLwUwP751cC581KAqhYRF2Q8PM+QDWfVKUWO3Biecj3Xkog
r6TJte4boaLJHspOzY9iX+hXAN6gnqHQ+SEqcvrXAoGBANv9pFKNBepTz5nRAoNj
YSFkmQHHTY5SrERZaFyRFGAgY6FZsXR4B0Zcz53rTXLAOx9beM6v7qaAcrcutrvy
X4ghMbzO25idgsaEET7ymPTJqqBReBG7bGGPm3ae0UnPO5zLE/uli/lmjqi/nVXC
sOwgGQQcfuto2IN01LCpwsL4
-----END PRIVATE KEY-----" | gcloud secrets create firebase-admin-key \
  --data-file=- \
  --project=mars-nexus

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding firebase-admin-key \
  --member="serviceAccount:$(gcloud run services describe mars-nexus-server --region=us-east1 --format='value(spec.template.spec.serviceAccountName)')" \
  --role="roles/secretmanager.secretAccessor" \
  --project=mars-nexus
```

## Option 2: Direct Environment Variables (Simpler, Less Secure) - RECOMMENDED FOR QUICK FIX

**First, remove the old variable:**

```bash
gcloud run services update mars-nexus-server \
  --region=us-east1 \
  --project=mars-nexus \
  --remove-env-vars="FIREBASE_ADMIN_PRIVATE_KEY"
```

**Then set all variables together (PowerShell):**

```powershell
# Read the JSON file and extract values
$json = Get-Content mars-nexus-firebase-adminsdk-fbsvc-efd79e637c.json | ConvertFrom-Json

# Set all environment variables
gcloud run services update mars-nexus-server `
  --region=us-east1 `
  --project=mars-nexus `
  --update-env-vars="FIREBASE_ADMIN_PROJECT_ID=$($json.project_id),FIREBASE_ADMIN_CLIENT_EMAIL=$($json.client_email),FIREBASE_ADMIN_PRIVATE_KEY=$($json.private_key)"
```

**Or using bash/command line:**

```bash
# Extract the private key from the JSON file (with \n preserved)
PRIVATE_KEY=$(cat mars-nexus-firebase-adminsdk-fbsvc-efd79e637c.json | jq -r '.private_key')

# Set all environment variables
gcloud run services update mars-nexus-server \
  --region=us-east1 \
  --project=mars-nexus \
  --update-env-vars="FIREBASE_ADMIN_PROJECT_ID=mars-nexus,FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com,FIREBASE_ADMIN_PRIVATE_KEY=${PRIVATE_KEY}"
```

If you prefer to set the private key directly as an environment variable (less secure but simpler):

```bash
# Extract the private key from the JSON file (with \n preserved)
PRIVATE_KEY=$(cat mars-nexus-firebase-adminsdk-fbsvc-efd79e637c.json | jq -r '.private_key')

# Set all environment variables
gcloud run services update mars-nexus-server \
  --region=us-east1 \
  --project=mars-nexus \
  --update-env-vars="FIREBASE_ADMIN_PROJECT_ID=mars-nexus,FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com,FIREBASE_ADMIN_PRIVATE_KEY=${PRIVATE_KEY}"
```

**Note:** The private key contains newlines. Make sure your shell preserves them, or use the Secret Manager approach above.

## Option 3: Update cloudbuild.yaml (For Automated Deployments)

If you want to set these during deployment, you can update `server/cloudbuild.yaml` to include the environment variables in the deploy step. However, for secrets, it's better to use Secret Manager.

## Values Summary

- **FIREBASE_ADMIN_PROJECT_ID**: `mars-nexus`
- **FIREBASE_ADMIN_CLIENT_EMAIL**: `firebase-adminsdk-fbsvc@mars-nexus.iam.gserviceaccount.com`
- **FIREBASE_ADMIN_PRIVATE_KEY**: (The full private key from the JSON file, with `\n` preserved)

## After Setting Environment Variables

Once you've set the environment variables, the server will automatically use them instead of looking for the service account file. You can remove the COPY command for the Firebase JSON file from the Dockerfile if you prefer.

