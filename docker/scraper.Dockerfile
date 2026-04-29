# ---- Build stage ----
FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY package.json ./
COPY scraper/package*.json ./scraper/

RUN npm install --workspace=scraper

COPY scraper/src ./scraper/src
COPY scraper/tsconfig.json ./scraper/

RUN npm run build:scraper

# ---- Production image ----
FROM node:20-bullseye-slim

# Install Chromium and required system dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium, not download its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY scraper/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/scraper/dist ./dist

CMD ["node", "dist/index.js"]
