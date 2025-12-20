# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production --prefer-offline --no-audit && \
    npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS builder
RUN apk add --no-cache openssl python3 make g++
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dev dependencies only for build
RUN npm ci --prefer-offline --no-audit && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build with increased memory limit
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application and Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

