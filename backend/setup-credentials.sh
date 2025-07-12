#!/bin/bash

# Google Cloud Credentials Setup Script for Local Development
echo "🔧 Setting up Google Cloud credentials for local development..."

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

# Create service account if it doesn't exist
SERVICE_ACCOUNT_NAME="rag-engine-service"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo "🔑 Checking for service account: $SERVICE_ACCOUNT_EMAIL"

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &> /dev/null; then
    echo "📝 Creating service account..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="RAG Engine Service Account" \
        --description="Service account for RAG Engine backend"
fi

# Grant necessary permissions
echo "🔐 Granting permissions to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.objectViewer"

# Create and download key
echo "🔑 Creating service account key..."
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account-key.json"
echo "✅ Credentials set up successfully!"
echo "📁 Service account key saved to: $(pwd)/service-account-key.json"
echo "🔧 Environment variable set: GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS"

# Add to .env file
echo "📝 Adding credentials to .env file..."
cat >> .env << EOF

# Google Cloud Credentials
GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/service-account-key.json
EOF

echo "🎉 Setup complete! You can now run the backend with: npm start" 