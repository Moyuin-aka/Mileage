FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
ARG NPM_PROXY=
RUN if [ -n "$NPM_PROXY" ]; then \
      npm config set proxy "$NPM_PROXY" && \
      npm config set https-proxy "$NPM_PROXY"; \
    fi && \
    npm ci --no-audit --no-fund --fetch-retries=5 --fetch-timeout=120000

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 8080
CMD ["npm", "run", "start"]
