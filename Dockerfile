FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build frontend assets
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"] 