FROM node:18-alpine

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Expose backend API port
EXPOSE 5001

# Start the application
CMD ["npm", "start"]
