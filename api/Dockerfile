# Dockerfile for mims-graph-api service
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Expose the port the API listens on (default 3000)
EXPOSE 3000

# Start the API
CMD ["node", "server.js"]
