# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json ./
RUN npm install --frozen-lockfile || npm install

# Copy app files
COPY . .

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Create cache directories and set permissions
RUN mkdir -p .next/cache/images
RUN chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]