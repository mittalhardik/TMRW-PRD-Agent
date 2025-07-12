#!/bin/bash

# Cloud Run Setup Script for Automatic Authentication
echo "☁️  Setting up Cloud Run service account for automatic authentication..."

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

# Create service account for Cloud Run if it doesn't exist
SERVICE_ACCOUNT_NAME="rag-engine-service"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo "🔑 Checking for Cloud Run service account: $SERVICE_ACCOUNT_EMAIL"

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &> /dev/null; then
    echo "📝 Creating Cloud Run service account..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="RAG Engine Cloud Run Service Account" \
        --description="Service account for Cloud Run RAG Engine backend"
fi

# Grant necessary permissions for Cloud Run
echo "🔐 Granting permissions to Cloud Run service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/monitoring.metricWriter"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

echo "✅ Cloud Run service account setup complete!"
echo "📧 Service account: $SERVICE_ACCOUNT_EMAIL"
echo "🔧 Permissions granted:"
echo "   - AI Platform User"
echo "   - Storage Object Viewer"
echo "   - Logging Writer"
echo "   - Monitoring Metric Writer"
echo ""
echo "🚀 You can now deploy to Cloud Run with automatic authentication!"
echo "   The service will use default credentials automatically." 