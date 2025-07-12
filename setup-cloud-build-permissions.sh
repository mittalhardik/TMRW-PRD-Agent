#!/bin/bash

# Cloud Build Permissions Setup Script
echo "🔧 Setting up Cloud Build permissions for Cloud Run deployment..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI (gcloud) is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Please authenticate with Google Cloud..."
    gcloud auth login
fi

# Set the project
PROJECT_ID="gen-lang-client-0723709535"
echo "📁 Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Get the Cloud Build service account
CLOUDBUILD_SA="$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"
echo "🔑 Cloud Build service account: $CLOUDBUILD_SA"

# Grant Cloud Build the necessary permissions
echo "🔐 Granting permissions to Cloud Build service account..."

# Allow Cloud Build to act as the default compute service account
gcloud iam service-accounts add-iam-policy-binding \
    $(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/iam.serviceAccountUser"

# Grant Cloud Build the Cloud Run Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/run.admin"

# Grant Cloud Build the IAM Service Account User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/iam.serviceAccountUser"

# Grant Cloud Build the Storage Object Viewer role (for build artifacts)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/storage.objectViewer"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable aiplatform.googleapis.com

echo "✅ Cloud Build permissions setup complete!"
echo "🔧 Permissions granted to Cloud Build:"
echo "   - Cloud Run Admin"
echo "   - IAM Service Account User"
echo "   - Storage Object Viewer"
echo ""
echo "🚀 You can now deploy using Cloud Build!"
echo "   The build will use the default Cloud Run service account." 