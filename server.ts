import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { firebaseAdminInitialized } from "./src/server/config/firebase.js";
import { getGeminiClient } from "./src/server/config/gemini.js";

import authRouter from "./src/server/routes/auth.js";
import tmdbRouter from "./src/server/routes/tmdb.js";
import aiRouter from "./src/server/routes/ai.js";
import booksRouter from "./src/server/routes/books.js";
import searchRouter from "./src/server/routes/search.js";
import recommendationsRouter from "./src/server/routes/recommendations.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Vercel Proxy for rate limiting
app.set("trust proxy", 1);

// Security and Performance Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., curl, mobile apps)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://sequel.app',
      'https://www.sequel.app',
      'https://sequel-web.vercel.app',
      'https://chr0nicle.vercel.app'
    ];
    
    // Allow specific production domains, localhost, and local network IPs (like 192.168.x.x)
    if (
      allowedOrigins.includes(origin) || 
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.match(/^https:\/\/sequel-.*\.vercel\.app$/) // Allow Vercel preview deployments
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Global Rate Limiting: 600 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use(globalLimiter);

app.get("/", (req, res) => {
  res.json({
    name: "Sequel / Chronicle Backend API",
    status: "online",
    version: "1.0.0",
    endpoints: [
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
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    name: "Sequel / Chronicle Backend API",
    status: "online",
    version: "1.0.0"
  });
});

// API Endpoint: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiEnabled: !!getGeminiClient() });
});

// Add a test route for Firebase
app.get("/api/firebase-check", (req, res) => {
  if (firebaseAdminInitialized) {
    res.json({ status: "ok", message: "Firebase Admin is configured correctly!" });
  } else {
    res.status(500).json({ status: "error", message: "Firebase Admin is NOT configured. Check your secrets and ensure FIREBASE_PRIVATE_KEY uses \\n for line breaks." });
  }
});

app.use("/api/auth", authRouter);
app.use("/api", tmdbRouter);
app.use("/api", searchRouter);
app.use("/api", booksRouter);
app.use("/api", aiRouter);
app.use("/api", recommendationsRouter);

// API 404 fallback handler to ensure /api/* requests return JSON
app.all("/api/*", (req, res) => {
  return res.status(404).json({ error: `API route ${req.method} ${req.path} not found.` });
});

// Global error handler for Express API routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express handler error:", err);
  if (res.headersSent) {
    return next(err);
  }
  if (req.path.startsWith("/api/")) {
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
  next(err);
});

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(PORT as number, "0.0.0.0", () => {
    console.log(`Backend API Server running on port ${PORT}`);
  });
}

export { app };
export default app;
