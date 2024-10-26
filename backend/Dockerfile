# Use an official Node.js runtime as a parent image
FROM node

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 3001

# Run the application
CMD ["node", "index.js"] # Replace 'index.js' with your entry file if different
