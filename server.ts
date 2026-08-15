import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { firebaseAdminInitialized } from "./src/server/config/firebase.js";
import { getGeminiClient } from "./src/server/config/gemini.js";

import authRouter from "./src/server/routes/auth.js";
import tmdbRouter from "./src/server/routes/tmdb.js";
import aiRouter from "./src/server/routes/ai.js";
import booksRouter from "./src/server/routes/books.js";
import searchRouter from "./src/server/routes/search.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
