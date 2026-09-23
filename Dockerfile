# Multi-stage Dockerfile for Arr House
# Stage 1: Build the client assets and backend server bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (including devDependencies required for vite and esbuild)
RUN npm install

# Copy application source code
COPY . .

# Build Vite frontend and bundled backend server
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV ARR_DATA_DIR=/app/data

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled distribution files from builder
COPY --from=builder /app/dist ./dist

# Set up persistent storage directory
RUN mkdir -p /app/data

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "dist/server.cjs"]
