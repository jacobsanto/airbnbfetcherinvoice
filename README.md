# Airbnb Invoice Fetcher

Automates downloading Airbnb commission invoices in PDF format for multiple host accounts. Uses Puppeteer browser automation (no official API required), stores PDFs in Supabase Storage, and provides a React dashboard.

## Architecture

```
Frontend (React + Vite)  →  Backend API (Fastify)  →  Supabase (DB + Storage)
                                    ↓
                          Redis / BullMQ Queue
                                    ↓
                        Scraper Worker (Puppeteer)
                         navigates airbnb.com →
                          downloads PDF invoices
```

## Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for Redis + services)
- Supabase account + project

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp scraper/.env.example scraper/.env
cp frontend/.env.example frontend/.env
```

Fill in your Supabase URL, service role key, anon key, and generate an encryption key:

```bash
openssl rand -hex 32   # → use as ENCRYPTION_KEY in backend/.env and scraper/.env
```

### 3. Run Supabase migrations

```bash
npx supabase db push
```

### 4. Start services

```bash
# Start Redis
docker-compose up redis -d

# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Scraper worker
npm run dev:scraper

# Terminal 3: Frontend
npm run dev:frontend
```

Open `http://localhost:5173`

## How It Works

1. **Add Accounts** — Enter your Airbnb host email + password. Credentials are encrypted (AES-256-GCM) before storage.

2. **Create Download Job** — Select an account and month/year. A BullMQ job is queued.

3. **Scraper runs** — Puppeteer logs into Airbnb, navigates to `/hosting/financials/invoices`, applies the month filter, and downloads all invoice PDFs using your session cookies.

4. **2FA Handling** — If Airbnb requires a verification code, the job pauses and prompts you in the UI to enter the OTP. The scraper polls for your input.

5. **PDFs stored** — Downloaded PDFs are uploaded to Supabase Storage at `invoices/{user_id}/{account_id}/{year}/{month}/{invoice}.pdf`.

6. **Download** — Click the download button in the Invoices page to get a 60-second signed URL.

## Deployment

| Component | Platform |
|-----------|----------|
| Frontend | Vercel |
| Backend API | Railway |
| Scraper Worker | Railway (Docker) |
| Redis | Upstash |
| Database + Storage | Supabase |

### Build for production

```bash
npm run build:backend
npm run build:scraper
npm run build:frontend
```

### Docker

```bash
# Build scraper image (includes Chromium)
docker build -f docker/scraper.Dockerfile -t invoice-scraper .

# Build backend image
docker build -f docker/backend.Dockerfile -t invoice-backend .

# Run everything
docker-compose up
```

## Security

- Airbnb credentials encrypted at rest (AES-256-GCM), encryption key lives only in env vars
- All tables protected by Supabase Row Level Security — users see only their own data
- PDF storage is private; download links are signed and expire in 60 seconds
- The frontend never receives plaintext passwords

## Environment Variables

See `backend/.env.example`, `scraper/.env.example`, and `frontend/.env.example`.
