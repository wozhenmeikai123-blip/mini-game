# Use official Node image
FROM node:20-alpine

# Create app dir
WORKDIR /app

# Copy package files first (for caching)
COPY package.json package-lock.json* ./ 

# Install deps
RUN npm install --production

# Copy app
COPY . .

# Expose the port the app listens on (matches internal_port)
EXPOSE 8080

# Start
CMD ["npm", "start"]
