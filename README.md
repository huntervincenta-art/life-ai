# Life AI

Personal life management app — pantry tracking, expiry alerts, and recipe suggestions powered by Claude AI.

## Features

- **Pantry tracker** — add items manually or by parsing Walmart order emails
- **Expiry alerts** — daily cron job at 5 PM updates item statuses and sends push notifications via ntfy
- **Recipe suggestions** — Claude analyzes what's in your pantry and suggests recipes, prioritizing items expiring soonest
- **Walmart order parsing** — paste a confirmation email, Claude extracts and saves every grocery item automatically

## Project structure

```
life-ai/
  client/     React + Vite frontend
  server/     Express API + MongoDB
```

## Setup

### Prerequisites

- Node.js 18+
- A MongoDB database (Atlas free tier works great)
- An Anthropic API key
- A Gmail account with an App Password enabled (optional, for future email features)
- An ntfy account or self-hosted instance

### 1. Install dependencies

```bash
# From the root
npm install           # installs concurrently
npm run install:all   # installs both client and server deps
```

### 2. Configure environment variables

#### `server/.env`

| Variable           | Description                                      |
|--------------------|--------------------------------------------------|
| `PORT`             | Port for the Express server (default: 3001)      |
| `MONGODB_URI`      | MongoDB connection string                        |
| `ANTHROPIC_API_KEY`| Your Anthropic API key                           |
| `GMAIL_USER`       | Gmail address (for future email features)        |
| `GMAIL_APP_PASSWORD`| Gmail App Password                              |
| `NTFY_TOPIC`       | ntfy topic name for push notifications           |

#### `client/.env`

| Variable        | Description                         |
|-----------------|-------------------------------------|
| `VITE_API_URL`  | URL of the Express server            |

### 3. Run in development

```bash
npm run dev
```

This starts both the Express server (port 3001) and the Vite dev server (port 5173) concurrently.

## API reference

| Method | Path                  | Description                               |
|--------|-----------------------|-------------------------------------------|
| GET    | /api/health           | Health check                              |
| GET    | /api/pantry           | List all pantry items (sorted by expiry)  |
| POST   | /api/pantry           | Add a pantry item manually                |
| PATCH  | /api/pantry/:id       | Update quantity, status, or notes         |
| DELETE | /api/pantry/:id       | Remove an item                            |
| POST   | /api/pantry/analyze   | Get Claude recipe suggestions             |
| POST   | /api/email/parse      | Parse a Walmart email and save items      |
| GET    | /api/email/orders     | List all parsed Walmart orders            |

## Deployment

The server is designed to deploy to Railway. After deploying, update the `deployUrl` placeholder in `server/jobs/expiryChecker.js` with your Railway URL.
