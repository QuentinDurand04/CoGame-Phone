# Use the official Node.js image as the base image
FROM node:22

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if they exist)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .
