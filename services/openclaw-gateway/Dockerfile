FROM node:20-alpine AS builder
# Set working directory
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune openclaw-gateway --docker

# Add lockfile and package.json's of isolated subworkspace
FROM node:20-alpine AS installer
WORKDIR /app

# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN npx turbo run build --filter=openclaw-gateway...

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=installer /app/ .

EXPOSE 3001
CMD [ "node", "services/openclaw-gateway/dist/index.js" ]
