#!/bin/bash

# Frontend Build Script
echo "🔨 Building React frontend..."

# Check if we're in the right directory
if [ ! -d "product-manager-ai" ]; then
    echo "❌ product-manager-ai directory not found"
    echo "📝 Please run this script from the project root directory"
    exit 1
fi

# Navigate to frontend directory
cd product-manager-ai

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Build the frontend
echo "🔨 Building React app..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully!"
    echo "📁 Build files created in: product-manager-ai/build/"
    echo ""
    echo "🚀 You can now start the backend:"
    echo "   cd backend && npm start"
    echo ""
    echo "🌐 The app will be available at: http://localhost:8080"
else
    echo "❌ Frontend build failed"
    echo "📝 Check the error messages above"
    exit 1
fi 