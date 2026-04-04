# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build:backend

# Stage 3: Runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts
COPY --from=backend-build /app/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./public
EXPOSE 3000
ENV PORT=3000
ENV CONFIG_PATH=/config/config.json
CMD ["node", "dist/index.js"]
