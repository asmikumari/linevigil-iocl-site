# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install all dependencies (including devDependencies for building Vite)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the production bundle
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:alpine

# Copy built assets from build stage to Nginx directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose Nginx port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
