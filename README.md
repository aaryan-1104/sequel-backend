# Sequel / Chronicle Backend API

Standalone Express + Node.js backend server with Gemini AI and Firebase Admin integrations.

## Features
- **Media Search API**: Unified proxy for TMDB (movies/TV), OpenLibrary (books), Apple Podcasts, and Gemini AI search fallback.
- **AI Details & Synopsis**: Generates summaries, cast lists, ratings, and covers using Google Gemini AI (`@google/genai`).
- **Firebase Sync**: Handles cloud syncing for user media library via Firebase Admin SDK.
- **CORS Support**: Configured to accept cross-origin requests from web clients and mobile applications (Android/iOS).

## Prerequisites
- Node.js v18 or v20+
- Gemini API Key from Google AI Studio (`GEMINI_API_KEY`)
- TMDB API Key (`TMDB_API_KEY`) for Movies & TV metadata

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

## Production Build & Run

```bash
# Build bundled JavaScript
npm run build

# Start production server
npm start
```

## Deployment Options
- **Vercel**: Pre-configured with `vercel.json`. Deploy via `vercel` CLI or GitHub integration.
- **Render / Railway / Fly.io**: Connect this repository directly and set environment variables in the dashboard.
