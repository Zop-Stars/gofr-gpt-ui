# FROM node:19-alpine


# RUN mkdir -p /app
# WORKDIR /app
# COPY . .
# RUN npm install --force
# RUN npm run build
# EXPOSE 3000
# CMD ["npm", "start"]



# Stage 1: Build the Next.js application
FROM node:19-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm i --force

# Copy the rest of the application code
COPY . .

# Build the application for production
RUN npm run build

# Stage 2: Serve with NGINX
FROM nginx:stable-alpine

# Copy static files from the builder stage
COPY --from=builder /app/out /usr/share/nginx/html

# Copy custom NGINX configuration (optional)
COPY nginix.conf /etc/nginx/conf.d/default.conf

# Expose the port NGINX is running on
EXPOSE 3000

# Start NGINX server
CMD ["nginx", "-g", "daemon off;"]
