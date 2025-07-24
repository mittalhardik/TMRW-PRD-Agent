#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Setting up credentials..."
./backend/setup-credentials.sh

echo "Building frontend..."
./build-frontend.sh

echo "Installing backend dependencies and starting server..."
cd backend
npm install

# Start the backend server (it will serve the frontend build if present)
npm start