# Use the official Node.js image from Docker Hub
FROM node:20

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
    && echo "deb https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list \
    && apt-get update && apt-get install -y google-cloud-sdk \
    && gcloud --version

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

RUN chmod +x /usr/src/app/bin/rhubarb

# Expose the port the app will run on
EXPOSE 8080

# Start the app
CMD ["node", "index.js"]
