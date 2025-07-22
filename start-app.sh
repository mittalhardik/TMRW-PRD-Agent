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

# Start the backend server in the background
npm start &

# Wait for the backend to initialize
echo "Waiting for backend to start..."
sleep 10

echo "Backend started. The application should be available at http://localhost:8080"

# Wait for the backend process to exit
wait $!

echo "Installing 'serve' globally and starting frontend server..."
sudo npm install -g serve

# Navigate to product-manager-ai to serve the build folder from there
cd product-manager-ai
serve -s build &
FRONTEND_PID=$!
cd ..

wait $BACKEND_PID $FRONTEND_PID