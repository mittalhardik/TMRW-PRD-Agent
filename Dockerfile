# Use official Node.js image as the build environment
FROM node:20 AS build

# Set working directory
WORKDIR /app

# Copy frontend code and install dependencies
COPY product-manager-ai ./product-manager-ai
WORKDIR /app/product-manager-ai
RUN npm install && npm run build

# Prepare backend
WORKDIR /app
COPY backend ./backend
WORKDIR /app/backend
RUN npm install

# Copy frontend build to backend public directory
RUN mkdir -p ./public && cp -r /app/product-manager-ai/build/* ./public/

# Expose port (Cloud Run expects 8080)
EXPOSE 8080

# Set environment variables for production
ENV NODE_ENV=production

# Start the backend server
CMD ["node", "index.js"]