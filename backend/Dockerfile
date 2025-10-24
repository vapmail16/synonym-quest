# Build stage
FROM node:22 AS build

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json* ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build || echo "No build script found"

# Production stage
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json* ./

# Install only production dependencies
RUN npm install --only=production

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy other necessary files
COPY --from=build /app/package.json ./

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "start"]
