# Sequel / Chronicle Backend API Documentation

Welcome to the **Sequel / Chronicle Backend API** documentation. This service is a Node.js Express server providing unified media search, Google Gemini AI intelligence, TMDB media integration, and Firebase Admin cloud sync.

- **Production Base URL**: `https://sequel-backend.vercel.app`
- **Local Base URL**: `http://localhost:3000`

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [System & Health Endpoints](#2-system--health-endpoints)
3. [User Authentication & Cloud Sync](#3-user-authentication--cloud-sync)
4. [Media Search & AI Intelligence](#4-media-search--ai-intelligence)
5. [TMDB Media Integration](#5-tmdb-media-integration)
6. [TMDB Account & Custom Lists](#6-tmdb-account--custom-lists)

---

## 1. Authentication

Protected endpoints require session authorization. You can pass your session token in either of the following formats:
- **Authorization Header**: `Authorization: Bearer <session-token>`
- **JSON Body Field**: `{ "token": "<session-token>" }`

---

## 2. System & Health Endpoints

### `GET /`
Returns backend API details, version info, and main route index.

**Response `(200 OK)`**:
```json
{
  "name": "Sequel / Chronicle Backend API",
  "status": "online",
  "version": "1.0.0",
  "endpoints": [
    "/api/status",
    "/api/health",
    "/api/firebase-check",
    "/api/search",
    "/api/discover",
    "/api/tmdb-details",
    "/api/recommend",
    "/api/generate-cover",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/sync-get",
    "/api/auth/sync-save"
  ]
}
```

### `GET /api/status`
Returns server status and active endpoint directory.

### `GET /api/health`
Checks server readiness and verifies whether Google Gemini AI (`GEMINI_API_KEY`) is active.

**Response `(200 OK)`**:
```json
{
  "status": "ok",
  "geminiEnabled": true
}
```

### `GET /api/firebase-check`
Checks whether Firebase Admin SDK is initialized successfully with Cloud Firestore credentials.

---

## 3. User Authentication & Cloud Sync

### `POST /api/auth/register`
Registers a new user account.

**Request Body**:
```json
{
  "username": "johndoe",
  "password": "SecretPassword123!",
  "email": "johndoe@example.com",
  "avatar": "🍿",
  "bio": "Movie & TV show collector",
  "genres": "Sci-Fi, Action, Drama"
}
```

**Response `(200 OK)`**:
```json
{
  "success": true,
  "token": "session-4a7b8c9d...",
  "user": {
    "id": "user-1718000000000",
    "username": "johndoe",
    "email": "johndoe@example.com",
    "avatar": "🍿",
    "bio": "Movie & TV show collector",
    "genres": "Sci-Fi, Action, Drama",
    "createdAt": "2026-08-01T12:00:00.000Z"
  }
}
```

---

### `POST /api/auth/login`
Authenticates user credentials and creates a session token.

**Request Body**:
```json
{
  "username": "johndoe",
  "password": "SecretPassword123!"
}
```

**Response `(200 OK)`**:
```json
{
  "success": true,
  "token": "session-4a7b8c9d...",
  "user": {
    "id": "user-1718000000000",
    "username": "johndoe",
    "avatar": "🍿"
  }
}
```

---

### `POST /api/auth/me`
Fetches current authenticated user profile.

**Headers**: `Authorization: Bearer <session-token>`

**Response `(200 OK)`**:
```json
{
  "success": true,
  "user": {
    "id": "user-1718000000000",
    "username": "johndoe",
    "email": "johndoe@example.com",
    "avatar": "🍿",
    "bio": "Movie & TV show collector"
  }
}
```

---

### `POST /api/auth/logout`
Logs out user and invalidates session token.

**Request Body**: `{ "token": "session-4a7b8c9d..." }`

---

### `POST /api/auth/sync-get`
Retrieves user's cloud library, diary logs, and custom lists.

**Headers**: `Authorization: Bearer <session-token>`

**Response `(200 OK)`**:
```json
{
  "success": true,
  "library": [],
  "diary": [],
  "customLists": []
}
```

---

### `POST /api/auth/sync-save`
Saves/syncs user's media library, diary logs, and custom lists.

**Request Body**:
```json
{
  "library": [ { "id": "tmdb-27205", "title": "Inception", "status": "watched" } ],
  "diary": [ { "id": "log-1", "title": "Inception", "watchedDate": "2026-08-01" } ],
  "customLists": []
}
```

---

## 4. Media Search & AI Intelligence

### `POST /api/search`
Unified multi-source search across Movies, TV Shows, Books, Audiobooks, and Podcasts.

**Request Body**:
```json
{
  "query": "Inception",
  "type": "movie"
}
```
*Valid `type` values: `"movie"`, `"tv"`, `"book"`, `"audiobook"`, `"podcast"`, or omit for all.*

**Response `(200 OK)`**:
```json
{
  "results": [
    {
      "id": "tmdb-27205",
      "title": "Inception",
      "type": "movie",
      "releaseDate": "2010-07-15",
      "synopsis": "Cobb, a skilled thief who commits corporate espionage...",
      "coverUrl": "https://image.tmdb.org/t/p/w500/...",
      "rating": 8.4
    }
  ]
}
```

---

### `GET /api/discover` (or `/api/tmdb-discover`)
Fetches cached discover feed containing Trending Movies, Trending TV, Top Rated Movies, Upcoming Movies, TV Airing Today, and Sci-Fi spotlight.

**Response `(200 OK)`**:
```json
{
  "trendingMovies": [ ... ],
  "trendingTV": [ ... ],
  "topRatedMovies": [ ... ],
  "upcomingMovies": [ ... ],
  "tvAiringToday": [ ... ],
  "scifiSpotlight": [ ... ]
}
```

---

### `POST /api/recommend`
Generates AI-powered media recommendations using Google Gemini AI.

**Request Body**:
```json
{
  "title": "Inception",
  "type": "movie",
  "genres": "Sci-Fi, Thriller"
}
```

**Response `(200 OK)`**:
```json
{
  "recommendations": [
    {
      "title": "Interstellar",
      "type": "movie",
      "reason": "Mind-bending Sci-Fi directed by Christopher Nolan with high emotional stakes."
    }
  ]
}
```

---

### `POST /api/generate-cover`
Generates custom artwork and backdrop image URLs using Google Gemini AI.

**Request Body**:
```json
{
  "title": "Neuromancer",
  "type": "book"
}
```

**Response `(200 OK)`**:
```json
{
  "coverUrl": "https://...",
  "backdropUrl": "https://..."
}
```

---

## 5. TMDB Media Integration

### `POST /api/tmdb-details`
Fetches complete metadata for a movie or TV show from TMDB (including cast, crew, reviews, videos, and recommendations).

**Request Body**:
```json
{
  "tmdbId": 27205,
  "type": "movie"
}
```

---

### `POST /api/tmdb-season`
Fetches season episode listings and details for a TV series.

**Request Body**:
```json
{
  "tmdbId": 1399,
  "seasonNumber": 1
}
```

---

### `POST /api/tmdb-person`
Fetches actor/person details, biography, and filmography.

**Request Body**:
```json
{
  "personId": 6193
}
```

---

## 6. TMDB Account & Custom Lists

### `POST /api/tmdb-watchlist/update`
Adds or removes a movie/TV show to/from user's TMDB watchlist.

**Request Body**:
```json
{
  "sessionId": "tmdb-session-id",
  "mediaType": "movie",
  "targetId": 27205,
  "watchlist": true
}
```

---

### `POST /api/tmdb-favorite/update`
Adds or removes a media item to/from user's TMDB favorites.

**Request Body**:
```json
{
  "sessionId": "tmdb-session-id",
  "mediaType": "movie",
  "targetId": 27205,
  "favorite": true
}
```

---

### `POST /api/tmdb-rating/update`
Submits a rating score (0.5 to 10.0) for a movie or TV show to TMDB.

**Request Body**:
```json
{
  "sessionId": "tmdb-session-id",
  "mediaType": "movie",
  "tmdbId": 27205,
  "rating": 9.0
}
```

---

### `POST /api/tmdb-lists/create`
Creates a custom collection list on TMDB.

**Request Body**:
```json
{
  "sessionId": "tmdb-session-id",
  "name": "Favorite Sci-Fi Classics",
  "description": "My top sci-fi movies of all time",
  "language": "en"
}
```
