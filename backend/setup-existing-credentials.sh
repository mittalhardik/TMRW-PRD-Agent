#!/bin/bash

# Setup script for existing Google Cloud credentials
echo "🔧 Setting up existing Google Cloud credentials..."

# Check if service account key file exists
if [ -f "service-account-key.json" ]; then
    echo "✅ Found existing service account key: service-account-key.json"
    export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account-key.json"
else
    echo "❌ No service account key found."
    echo "Please place your service account JSON key file in this directory and name it 'service-account-key.json'"
    echo "Or run './setup-credentials.sh' to create a new one."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Google Cloud Credentials
GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/service-account-key.json

# RAG Engine Configuration
GCLOUD_PROJECT_ID=gen-lang-client-0723709535
GCLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
VERTEX_RAG_CORPUS=projects/gen-lang-client-0723709535/locations/us-central1/ragCorpora/2305843009213693952
VERTEX_RAG_ENGINE=projects/gen-lang-client-0723709535/locations/us-central1/ragEngines/2305843009213693952
EOF
else
    echo "📝 Adding credentials to existing .env file..."
    # Check if GOOGLE_APPLICATION_CREDENTIALS is already in .env
    if ! grep -q "GOOGLE_APPLICATION_CREDENTIALS" .env; then
        echo "GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/service-account-key.json" >> .env
    fi
fi

echo "✅ Credentials set up successfully!"
echo "🔧 Environment variable set: GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS"
echo "🎉 You can now run the backend with: npm start" 