# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG BETTER_AUTH_SECRET
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
RUN npm run build

# Stage 2: Run
FROM node:22-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --production
RUN mkdir -p /app/data /app/data/media && chown -R appuser:appgroup /app
USER appuser
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=40s \
    CMD wget --quiet --tries=2 --spider http://127.0.0.1:3000/health || exit 1
CMD ["node", "build/index.js"]