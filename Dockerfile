# Use Node.js for building both frontend and backend
FROM node:18 AS build

# Set working directory for frontend build
WORKDIR /app/product-manager-ai
COPY product-manager-ai/package.json product-manager-ai/package-lock.json ./
RUN npm install
COPY product-manager-ai/ ./
RUN npm run build

# Set working directory for backend
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm install
COPY backend/ ./

# Copy frontend build to backend public directory
RUN mkdir -p public && cp -r /app/product-manager-ai/build/* public/

# Expose port
EXPOSE 8080

# Start backend server
CMD ["node", "index.js"]