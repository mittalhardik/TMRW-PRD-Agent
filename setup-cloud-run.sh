#!/bin/bash

# Cloud Run Setup Script for Automatic Authentication
echo "☁️  Setting up Cloud Run default service account for automatic authentication..."

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

# Get the default Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
DEFAULT_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

echo "🔑 Using default Cloud Run service account: $DEFAULT_SA"

# Grant necessary permissions to the default service account
echo "🔐 Granting permissions to default Cloud Run service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$DEFAULT_SA" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$DEFAULT_SA" \
    --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$DEFAULT_SA" \
    --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$DEFAULT_SA" \
    --role="roles/monitoring.metricWriter"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

echo "✅ Cloud Run default service account setup complete!"
echo "📧 Service account: $DEFAULT_SA"
echo "🔧 Permissions granted:"
echo "   - AI Platform User"
echo "   - Storage Object Viewer"
echo "   - Logging Writer"
echo "   - Monitoring Metric Writer"
echo ""
echo "🚀 You can now deploy to Cloud Run with automatic authentication!"
echo "   The service will use default credentials automatically." 