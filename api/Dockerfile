# Dockerfile for mims-graph-api service
# Two-stage build for production TypeScript best practices

# Build stage - includes dev dependencies for TypeScript compilation
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests and install all dependencies (including dev)
COPY package*.json ./
RUN npm ci

# Copy source code and compile TypeScript
COPY . .
RUN npm run build

# Production stage - lean runtime image
FROM node:20-alpine AS production
WORKDIR /app

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --production && npm cache clean --force

# Copy compiled JavaScript from build stage
COPY --from=builder /app/dist ./dist

# Expose the port the API listens on (default 3000)
EXPOSE 3000

# Start the API with compiled JavaScript
CMD ["node", "dist/server.js"]
