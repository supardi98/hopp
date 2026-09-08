# Dockerfile for Hopp Standalone Sync Relay Server
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY index.js ./

EXPOSE 8080

CMD ["npm", "start"]
