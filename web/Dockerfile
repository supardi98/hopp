# Stage 1: Build static web assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json for monorepo devDependencies (tsc, vite, etc.)
COPY package*.json ./
COPY web/package*.json ./web/

RUN npm install

# Copy source code
COPY . .

# Build production bundle
RUN npm run build --prefix web

# Stage 2: Serve via NGINX Production
FROM nginx:alpine

COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
