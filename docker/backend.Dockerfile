FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY backend/package*.json ./backend/

RUN npm install --workspace=backend

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

RUN npm run build:backend

# ---- Production image ----
FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/backend/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
