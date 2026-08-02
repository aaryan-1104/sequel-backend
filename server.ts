import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { hashPassword, verifyPassword } from "./dbHelpers.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
let firebaseAdminInitialized = false;
let adminDb: any = null;
let adminAuth: any = null;

try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // Handle escaped newlines from env vars
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    const firebaseApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    });
    adminDb = getFirestore(firebaseApp);
    adminAuth = getAuth(firebaseApp);

    // Test Firestore access to avoid uncaught gRPC crashes later
    adminDb.collection("users").limit(1).get().then(() => {
      firebaseAdminInitialized = true;
      console.log("🔥 Firebase Admin SDK initialized successfully.");
    }).catch((err: any) => {
      console.error("⚠️ Firestore database does not exist or permission denied. Falling back to local DB.", err.message);
      adminDb = null;
    });
    
  } else {
    console.log("⚠️ Firebase Admin SDK NOT initialized: Missing environment variables.");
  }
} catch (error) {
  console.error("❌ Firebase Admin initialization error:", error);
}

// Add a test route for Firebase
app.get("/api/firebase-check", (req, res) => {
  if (firebaseAdminInitialized) {
    res.json({ status: "ok", message: "Firebase Admin is configured correctly!" });
  } else {
    res.status(500).json({ status: "error", message: "Firebase Admin is NOT configured. Check your secrets and ensure FIREBASE_PRIVATE_KEY uses \\n for line breaks." });
  }
});

// Initialize GoogleGenAI lazily and handle missing key gracefully
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not configured or is placeholder. Using offline fallback mode.");
    return null;
  }
  
  try {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    return aiClient;
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
    return null;
  }
}

// Pre-configured offline fallbacks for search
const OFFLINE_SEARCH_RESULTS: { [key: string]: any[] } = {
  movie: [],
  tv: [],
  game: [],
  book: [],
  audiobook: [],
  podcast: []
};

// API Endpoint: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiEnabled: !!getGeminiClient() });
});

interface DbUser {
  id: string;
  username: string;
  email?: string;
  salt: string;
  hash: string;
  avatar: string;
  bio: string;
  genres: string;
  createdAt: string;
  tmdbSessionId?: string;
  tmdbAccountId?: string;
  tmdbAccessToken?: string;
}

// -------------------------------------------------------------
// Database Helper Wrappers (Firebase Admin with In-Memory Fallback)
// -------------------------------------------------------------

const inMemoryUsers = new Map<string, DbUser>();
const inMemorySessions = new Map<string, string>(); // token -> userId
const inMemoryUserData = new Map<string, { library: any[], diary: any[], customLists: any[] }>();

async function findUserByUsernameOrEmail(identifier: string): Promise<DbUser | null> {
  identifier = identifier.toLowerCase().trim();
  const isAdmin = identifier === "pseudo-user@gmail.com" || identifier === "pseudo-user";

  if (adminDb) {
    try {
      let snapshot = await adminDb.collection("users").where("usernameLowerCase", "==", identifier).limit(1).get();
      if (!snapshot.empty) return snapshot.docs[0].data() as DbUser;
      snapshot = await adminDb.collection("users").where("emailLowerCase", "==", identifier).limit(1).get();
      if (!snapshot.empty) return snapshot.docs[0].data() as DbUser;
    } catch (err: any) {
      console.error("Firestore error (findUserByUsernameOrEmail):", err.message);
    }
  }

  // Check inMemoryUsers
  for (const user of inMemoryUsers.values()) {
    if (user.username.toLowerCase() === identifier || (user.email && user.email.toLowerCase() === identifier)) {
      return user;
    }
  }

  if (isAdmin) {
    const adminUser: DbUser = {
      id: "admin-pseudo-user",
      username: "pseudo-user",
      email: "pseudo-user@gmail.com",
      salt: "",
      hash: "",
      avatar: "👑",
      bio: "Admin User",
      genres: "All Categories",
      createdAt: new Date().toISOString()
    };
    inMemoryUsers.set(adminUser.id, adminUser);
    if (adminDb) {
      saveUser(adminUser).catch(() => {});
    }
    return adminUser;
  }

  return null;
}

async function findUserById(id: string): Promise<DbUser | null> {
  if (id === "admin-pseudo-user") {
    let admin = inMemoryUsers.get("admin-pseudo-user");
    if (!admin) {
      admin = {
        id: "admin-pseudo-user",
        username: "pseudo-user",
        email: "pseudo-user@gmail.com",
        salt: "",
        hash: "",
        avatar: "👑",
        bio: "Admin User",
        genres: "All Categories",
        createdAt: new Date().toISOString()
      };
      inMemoryUsers.set("admin-pseudo-user", admin);
    }
    return admin;
  }

  if (adminDb) {
    try {
      const doc = await adminDb.collection("users").doc(id).get();
      if (doc.exists) return doc.data() as DbUser;
    } catch (err: any) {
      console.error("Firestore error (findUserById):", err.message);
    }
  }
  return inMemoryUsers.get(id) || null;
}

async function saveUser(user: DbUser) {
  inMemoryUsers.set(user.id, user);
  if (adminDb) {
    try {
      const userData = {
        ...user,
        usernameLowerCase: user.username.toLowerCase(),
        emailLowerCase: user.email ? user.email.toLowerCase() : null
      };
      await adminDb.collection("users").doc(user.id).set(userData, { merge: true });
      return;
    } catch (err: any) {
      console.error("Firestore error (saveUser):", err.message);
    }
  }
}

async function createSession(userId: string, token: string) {
  inMemorySessions.set(token, userId);
  if (adminDb) {
    try {
      await adminDb.collection("sessions").doc(token).set({ userId });
      return;
    } catch (err: any) {
      console.error("Firestore error (createSession):", err.message);
    }
  }
}

async function deleteSession(token: string) {
  inMemorySessions.delete(token);
  if (adminDb) {
    try {
      await adminDb.collection("sessions").doc(token).delete();
      return;
    } catch (err: any) {
      console.error("Firestore error (deleteSession):", err.message);
    }
  }
}

async function getUserIdByToken(token: string): Promise<string | null> {
  if (inMemorySessions.has(token)) {
    return inMemorySessions.get(token)!;
  }
  if (adminDb) {
    try {
      const doc = await adminDb.collection("sessions").doc(token).get();
      if (doc.exists) return doc.data()?.userId;
    } catch (err: any) {
      console.error("Firestore error (getUserIdByToken):", err.message);
    }
  }
  return null;
}

async function getUserData(userId: string) {
  if (adminDb) {
    try {
      const doc = await adminDb.collection("user_data").doc(userId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        return {
          library: data.library || [],
          diary: data.diary || [],
          customLists: data.customLists || []
        };
      }
    } catch (err: any) {
      console.error("Firestore error (getUserData):", err.message);
    }
  }
  return inMemoryUserData.get(userId) || { library: [], diary: [], customLists: [] };
}

async function saveUserData(userId: string, library?: any[], diary?: any[], customLists?: any[]) {
  const existing = inMemoryUserData.get(userId) || { library: [], diary: [], customLists: [] };
  const updated = {
    library: library !== undefined ? library : existing.library,
    diary: diary !== undefined ? diary : existing.diary,
    customLists: customLists !== undefined ? customLists : existing.customLists
  };
  inMemoryUserData.set(userId, updated);

  if (adminDb) {
    try {
      const update: any = {};
      if (library) update.library = library;
      if (diary) update.diary = diary;
      if (customLists) update.customLists = customLists;
      await adminDb.collection("user_data").doc(userId).set(update, { merge: true });
      return;
    } catch (err: any) {
      console.error("Firestore error (saveUserData):", err.message);
    }
  }
}

// REGISTER ENDPOINT
app.post("/api/auth/register", async (req, res) => {
  const { username, password, email, avatar, bio, genres } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const existingUser = await findUserByUsernameOrEmail(username);
  if (existingUser) {
    return res.status(400).json({ error: "Username is already taken." });
  }

  if (email && email.trim() !== "") {
    const emailExists = await findUserByUsernameOrEmail(email);
    if (emailExists) {
      return res.status(400).json({ error: "Email is already registered." });
    }
  }

  const { salt, hash } = hashPassword(password);
  const userId = `user-${Date.now()}`;
  const newUser: DbUser = {
    id: userId,
    username: username.trim(),
    email: email && email.trim() !== "" ? email.trim() : undefined,
    salt,
    hash,
    avatar: avatar || "🍿",
    bio: bio || "",
    genres: genres || "",
    createdAt: new Date().toISOString()
  };

  await saveUser(newUser);
  
  // Initialize user details
  await saveUserData(userId, [], [], []);

  // Create session
  const token = `session-${crypto.randomBytes(24).toString("hex")}`;
  await createSession(userId, token);

  return res.json({
    success: true,
    token,
    user: {
      id: userId,
      username: newUser.username,
      email: newUser.email || "",
      avatar: newUser.avatar,
      bio: newUser.bio,
      genres: newUser.genres,
      tmdbSessionId: "",
      tmdbAccountId: "",
      tmdbAccessToken: "",
      createdAt: newUser.createdAt
    }
  });
});

// LOGIN ENDPOINT
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username or Email is required." });
  }

  const identifier = username.toLowerCase().trim();
  const isAdminBypass = identifier === "pseudo-user@gmail.com" || identifier === "pseudo-user";

  if (!isAdminBypass && !password) {
    return res.status(400).json({ error: "Username/Email and password are required." });
  }

  let user = await findUserByUsernameOrEmail(username);

  if (isAdminBypass) {
    if (!user) {
      user = {
        id: "admin-pseudo-user",
        username: "pseudo-user",
        email: "pseudo-user@gmail.com",
        salt: "",
        hash: "",
        avatar: "👑",
        bio: "Admin Companion Account",
        genres: "All Categories",
        createdAt: new Date().toISOString()
      };
      await saveUser(user);
      await saveUserData(user.id, [], [], []);
    }
  } else {
    if (!user || !verifyPassword(password, user.salt, user.hash)) {
      return res.status(401).json({ error: "Invalid username, email, or password." });
    }
  }

  // Create session
  const token = `session-${crypto.randomBytes(24).toString("hex")}`;
  await createSession(user.id, token);

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email || "",
      avatar: user.avatar,
      bio: user.bio,
      genres: user.genres,
      tmdbSessionId: user.tmdbSessionId || "",
      tmdbAccountId: user.tmdbAccountId || "",
      tmdbAccessToken: user.tmdbAccessToken || "",
      createdAt: user.createdAt
    }
  });
});

// GET PROFILE FROM SESSION
app.post("/api/auth/me", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  const user = await findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email || "",
      avatar: user.avatar,
      bio: user.bio,
      genres: user.genres,
      tmdbSessionId: user.tmdbSessionId || "",
      tmdbAccountId: user.tmdbAccountId || "",
      tmdbAccessToken: user.tmdbAccessToken || "",
      createdAt: user.createdAt
    }
  });
});

// LOGOUT ENDPOINT
app.post("/api/auth/logout", async (req, res) => {
  const { token } = req.body;
  if (token) {
    await deleteSession(token);
  }
  return res.json({ success: true });
});

// UPDATE PROFILE
app.post("/api/auth/update-profile", async (req, res) => {
  const { token, username, email, avatar, bio, genres, tmdbSessionId, tmdbAccountId, tmdbAccessToken, tmdbCustomApiKey } = req.body;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  const user = await findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (username && username.trim() !== "") {
    const existing = await findUserByUsernameOrEmail(username);
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: "Username is already taken by another account." });
    }
    user.username = username.trim();
  }

  if (email !== undefined) {
    if (email.trim() === "") {
      user.email = undefined;
    } else {
      const existing = await findUserByUsernameOrEmail(email);
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: "Email is already taken by another account." });
      }
      user.email = email.trim();
    }
  }

  if (avatar) user.avatar = avatar;
  if (bio !== undefined) user.bio = bio;
  if (genres !== undefined) user.genres = genres;
  
  if (tmdbSessionId !== undefined) user.tmdbSessionId = tmdbSessionId;
  if (tmdbAccountId !== undefined) user.tmdbAccountId = tmdbAccountId;
  const tokenVal = tmdbAccessToken !== undefined ? tmdbAccessToken : tmdbCustomApiKey;
  if (tokenVal !== undefined) user.tmdbAccessToken = tokenVal;

  await saveUser(user);

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email || "",
      avatar: user.avatar,
      bio: user.bio,
      genres: user.genres,
      tmdbSessionId: user.tmdbSessionId || "",
      tmdbAccountId: user.tmdbAccountId || "",
      tmdbAccessToken: user.tmdbAccessToken || "",
      createdAt: user.createdAt
    }
  });
});

// SYNC DATA GET
app.post("/api/auth/sync-get", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  const data = await getUserData(userId);
  return res.json(data);
});

// SYNC DATA SAVE
app.post("/api/auth/sync-save", async (req, res) => {
  const { token, library, diary, customLists } = req.body;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  await saveUserData(userId, library, diary, customLists);
  return res.json({ success: true });
});

// API Endpoint: Refresh TMDB Metadata
const REFRESH_CACHE = new Map<string, { timestamp: number; data: any }>();
const REFRESH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

app.post("/api/tmdb-refresh", async (req, res) => {
  const { title, type } = req.body;
  if (!title || !process.env.TMDB_API_KEY || (type !== 'movie' && type !== 'tv')) {
    return res.status(400).json({ error: "Invalid request or TMDB API key missing." });
  }

  const cacheKey = `${type}-${title.toLowerCase().trim()}`;
  const now = Date.now();
  if (REFRESH_CACHE.has(cacheKey)) {
    const cached = REFRESH_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < REFRESH_CACHE_TTL) {
      console.log(`[Cache Hit] Serving tmdb-refresh from cache for: ${cacheKey}`);
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const tmdbType = type === 'tv' ? 'tv' : 'movie';
    const tmdbUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(title)}&language=en-US&page=1&include_adult=false${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const tmdbRes = await fetch(tmdbUrl, { headers, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
    console.log(`[TMDB Refresh] Request: ${tmdbUrl}`);
    console.log(`[TMDB Refresh] Response Status: ${tmdbRes.status}`);

    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      console.log(`[TMDB Refresh] Received ${tmdbData.results?.length || 0} results`);
      const firstResult = (tmdbData.results || []).find((item: any) => item.media_type === tmdbType || item.media_type === undefined);
      
      if (firstResult) {
        const refreshData = {
          tmdbId: `tmdb-${firstResult.id}`,
          coverUrl: firstResult.poster_path ? `https://image.tmdb.org/t/p/w500${firstResult.poster_path}` : null,
          backdropUrl: firstResult.backdrop_path ? `https://image.tmdb.org/t/p/w1280${firstResult.backdrop_path}` : null,
          synopsis: firstResult.overview || null,
        };
        REFRESH_CACHE.set(cacheKey, { timestamp: now, data: refreshData });
        return res.json(refreshData);
      }
    } else {
      const errorText = await tmdbRes.text();
      console.error(`[TMDB Refresh] Error Response Body: ${errorText}`);
    }
    return res.status(404).json({ error: "No TMDB result found." });
  } catch (error) {
    console.error("TMDB refresh failed:", error);
    return res.status(500).json({ error: "TMDB refresh failed." });
  }
});

// API Endpoint: Get TMDB Full Details
const DETAILS_CACHE = new Map<string, { timestamp: number; data: any }>();
const DETAILS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

app.post("/api/tmdb-details", async (req, res) => {
  const { tmdbId, type } = req.body;
  if (!tmdbId || !process.env.TMDB_API_KEY || (type !== 'movie' && type !== 'tv')) {
    return res.status(400).json({ error: "Invalid request or TMDB API key missing." });
  }

  const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();
  if (!/^\d+$/.test(cleanId)) {
    return res.status(400).json({ error: "Invalid numeric TMDB ID." });
  }

  const cacheKey = `${type}-${cleanId}`;
  const now = Date.now();
  if (DETAILS_CACHE.has(cacheKey)) {
    const cached = DETAILS_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < DETAILS_CACHE_TTL) {
      console.log(`[Cache Hit] Serving tmdb-details from cache for: ${cacheKey}`);
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const tmdbType = type === 'tv' ? 'tv' : 'movie';
    const tmdbUrl = `https://api.themoviedb.org/3/${tmdbType}/${cleanId}?append_to_response=reviews,credits,videos,similar,recommendations,watch/providers,release_dates,content_ratings,external_ids&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const tmdbRes = await fetch(tmdbUrl, { headers, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
    
    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      
      const usProviders = tmdbData['watch/providers']?.results?.US;
      const streamingProviders = usProviders?.flatrate?.map((p: any) => ({ name: p.provider_name, logo: p.logo_path })) || [];
      const buyProviders = usProviders?.buy?.map((p: any) => ({ name: p.provider_name, logo: p.logo_path })) || [];
      
      let ageRating = null;
      if (tmdbType === 'movie') {
        const usRelease = tmdbData.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
        ageRating = usRelease?.release_dates?.[0]?.certification || null;
      } else {
        const usRating = tmdbData.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
        ageRating = usRating?.rating || null;
      }
      const imdbId = tmdbData.external_ids?.imdb_id || null;
      
      const rawSimilar = tmdbData.similar?.results || [];
      const rawRecommendations = tmdbData.recommendations?.results || [];
      const combinedSimilarMap = new Map();
      [...rawRecommendations, ...rawSimilar].forEach((item: any) => {
        if (item && item.id && !combinedSimilarMap.has(item.id)) {
          combinedSimilarMap.set(item.id, item);
        }
      });
      const combinedSimilar = Array.from(combinedSimilarMap.values());

      const detailsData = {
        rating: tmdbData.vote_average,
        reviews: tmdbData.reviews?.results || [],
        cast: tmdbData.credits?.cast || [],
        creators: tmdbType === 'movie' 
          ? tmdbData.credits?.crew?.filter((c: any) => c.job === 'Director').map((c: any) => c.name) || []
          : (tmdbData.created_by?.length > 0 
              ? tmdbData.created_by.map((c: any) => c.name) 
              : tmdbData.credits?.crew?.filter((c: any) => c.job === 'Executive Producer').map((c: any) => c.name) || []),
        videos: tmdbData.videos?.results || [],
        similar: combinedSimilar,
        providers: { streaming: streamingProviders, buy: buyProviders },
        runtime: tmdbData.runtime || tmdbData.episode_run_time?.[0] || 0,
        genres: tmdbData.genres?.map((g: any) => g.name) || [],
        networks: tmdbData.networks?.map((n: any) => n.name) || [],
        numberOfEpisodes: tmdbData.number_of_episodes || null,
        numberOfSeasons: tmdbData.number_of_seasons || null,
        seasons: tmdbData.seasons || [],
        ageRating,
        imdbId
      };
      
      DETAILS_CACHE.set(cacheKey, { timestamp: now, data: detailsData });
      return res.json(detailsData);
    } else {
      const errorText = await tmdbRes.text();
      console.error(`[TMDB Details] Error Response Body: ${errorText}`);
    }
    return res.status(404).json({ error: "No TMDB details found." });
  } catch (error) {
    console.error("TMDB details failed:", error);
    return res.status(500).json({ error: "TMDB details failed." });
  }
});

// API Endpoint: TMDB Season Details
const SEASON_CACHE = new Map<string, { timestamp: number; data: any }>();
const SEASON_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

app.post("/api/tmdb-season", async (req, res) => {
  const { tmdbId, seasonNumber } = req.body;
  if (!tmdbId || seasonNumber === undefined || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const cacheKey = `${tmdbId}-season-${seasonNumber}`;
  const now = Date.now();
  if (SEASON_CACHE.has(cacheKey)) {
    const cached = SEASON_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < SEASON_CACHE_TTL) {
      console.log(`[Cache Hit] Serving tmdb-season from cache for: ${cacheKey}`);
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();
    const tmdbUrl = `https://api.themoviedb.org/3/tv/${cleanId}/season/${seasonNumber}?language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };
    
    const tmdbRes = await fetch(tmdbUrl, { headers });
    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      const seasonData = { episodes: data.episodes || [] };
      SEASON_CACHE.set(cacheKey, { timestamp: now, data: seasonData });
      return res.json(seasonData);
    }
    return res.status(404).json({ error: "Season not found" });
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
});

// API Endpoint: TMDB TV Season Account States
app.post("/api/tmdb-tv/season-account-states", async (req, res) => {
  const { tmdbId, seasonNumber, sessionId } = req.body;
  if (!tmdbId || seasonNumber === undefined || !sessionId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();

    const tmdbUrl = `https://api.themoviedb.org/3/tv/${cleanId}/season/${seasonNumber}/account_states?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const tmdbRes = await fetch(tmdbUrl, { headers });
    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json(data);
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Season Account States] Error Response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to fetch season account states from TMDB." });
    }
  } catch (error) {
    console.error("Fetch TMDB season account states failed:", error);
    return res.status(500).json({ error: "Fetch TMDB season account states failed." });
  }
});

// API Endpoint: TMDB TV Episode Rate (Watched Sync)
app.post("/api/tmdb-tv/episode-rate", async (req, res) => {
  const { tmdbId, seasonNumber, episodeNumber, sessionId, rating } = req.body;
  if (!tmdbId || seasonNumber === undefined || episodeNumber === undefined || !sessionId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();

    const method = rating === null ? 'DELETE' : 'POST';
    const tmdbUrl = `https://api.themoviedb.org/3/tv/${cleanId}/season/${seasonNumber}/episode/${episodeNumber}/rating?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const body = rating !== null ? { value: rating } : undefined;

    const tmdbRes = await fetch(tmdbUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json({ success: true, data });
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Episode Rate] Error Response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to update TMDB episode rating." });
    }
  } catch (error) {
    console.error("Update TMDB episode rating failed:", error);
    return res.status(500).json({ error: "Update TMDB episode rating failed." });
  }
});

// API Endpoint: Create TMDB Auth Request Token
app.post("/api/tmdb-auth/request-token", async (req, res) => {
  const { customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!rawKey) {
    return res.status(400).json({ error: "Backend TMDB API key is missing." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;

    if (isBearer) {
      const url = `https://api.themoviedb.org/4/auth/request_token`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tmdbKey}`
      };
  
      const tmdbRes = await fetch(url, { 
        method: 'POST', 
        headers,
        body: JSON.stringify({ redirect_to: req.headers.origin || 'http://localhost:3000' })
      });
      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        if (data.success && data.request_token) {
          return res.json({
            success: true,
            request_token: data.request_token,
            auth_url: `https://www.themoviedb.org/auth/access?request_token=${data.request_token}`
          });
        }
      }
      const errText = await tmdbRes.text();
      console.error("[TMDB Request Token v4] Error:", errText);
      return res.status(500).json({ error: "Failed to generate TMDB v4 request token." });
    } else {
      const url = `https://api.themoviedb.org/3/authentication/token/new?api_key=${tmdbKey}`;
      const tmdbRes = await fetch(url);
      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        if (data.success && data.request_token) {
          return res.json({
            success: true,
            request_token: data.request_token,
            auth_url: `https://www.themoviedb.org/authenticate/${data.request_token}`
          });
        }
      }
      const errText = await tmdbRes.text();
      console.error("[TMDB Request Token v3] Error:", errText);
      return res.status(500).json({ error: "Failed to generate TMDB v3 request token." });
    }
  } catch (error) {
    console.error("TMDB Request Token error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// API Endpoint: Convert Request Token to Session ID & Fetch Account Details
app.post("/api/tmdb-auth/create-session", async (req, res) => {
  const { requestToken, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!requestToken || !rawKey) {
    return res.status(400).json({ error: "Missing request token or TMDB API key." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    
    if (isBearer) {
      // v4 Flow
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tmdbKey}`
      };

      // Step 1: Create v4 Access Token
      const v4AccessUrl = `https://api.themoviedb.org/4/auth/access_token`;
      const v4AccessRes = await fetch(v4AccessUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ request_token: requestToken })
      });

      if (!v4AccessRes.ok) {
        const errText = await v4AccessRes.text();
        console.error("[TMDB Create v4 Access Token] Error:", errText);
        return res.status(400).json({ error: "Failed to create TMDB v4 access token. Ensure you approved the token on TMDB." });
      }

      const v4Data = await v4AccessRes.json();
      if (!v4Data.success || !v4Data.access_token) {
        return res.status(400).json({ error: "TMDB v4 access token creation failed." });
      }

      const tmdbAccessToken = v4Data.access_token;
      const accountIdFromV4 = v4Data.account_id;

      // Step 2: Convert v4 Access Token to v3 Session ID
      const convertUrl = `https://api.themoviedb.org/3/authentication/session/convert/4`;
      const convertRes = await fetch(convertUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ access_token: tmdbAccessToken })
      });

      if (!convertRes.ok) {
        const errText = await convertRes.text();
        console.error("[TMDB Convert Session] Error:", errText);
        return res.status(400).json({ error: "Failed to convert TMDB v4 token to v3 session." });
      }

      const convertData = await convertRes.json();
      if (!convertData.success || !convertData.session_id) {
        return res.status(400).json({ error: "TMDB session conversion failed." });
      }

      const sessionId = convertData.session_id;

      // Step 3: Fetch Account details to get username
      const accountUrl = `https://api.themoviedb.org/3/account?session_id=${sessionId}`;
      const accountRes = await fetch(accountUrl, { headers });

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        return res.json({
          success: true,
          sessionId,
          accountId: accountData.id ? accountData.id.toString() : accountIdFromV4.toString(),
          tmdbAccessToken,
          username: accountData.username || accountData.name || ''
        });
      } else {
        return res.json({
          success: true,
          sessionId,
          accountId: accountIdFromV4 ? accountIdFromV4.toString() : '',
          tmdbAccessToken
        });
      }
    } else {
      // v3 Flow
      const sessionUrl = `https://api.themoviedb.org/3/authentication/session/new?api_key=${tmdbKey}`;
      const sessionRes = await fetch(sessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token: requestToken })
      });

      if (!sessionRes.ok) {
        const errText = await sessionRes.text();
        console.error("[TMDB Create Session v3] Error:", errText);
        return res.status(400).json({ error: "Failed to create TMDB session. Ensure you approved the token on TMDB." });
      }

      const sessionData = await sessionRes.json();
      if (!sessionData.success || !sessionData.session_id) {
        return res.status(400).json({ error: "TMDB session creation failed." });
      }

      const sessionId = sessionData.session_id;

      // Fetch Account details
      const accountUrl = `https://api.themoviedb.org/3/account?session_id=${sessionId}&api_key=${tmdbKey}`;
      const accountRes = await fetch(accountUrl);

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        return res.json({
          success: true,
          sessionId,
          accountId: accountData.id ? accountData.id.toString() : '',
          tmdbAccessToken: undefined, // no v4 token in v3 flow
          username: accountData.username || accountData.name || ''
        });
      } else {
        return res.json({
          success: true,
          sessionId,
          accountId: '',
          tmdbAccessToken: undefined
        });
      }
    }
  } catch (error) {
    console.error("TMDB Create Session error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Production-grade User Account Cache Maps
const WATCHLIST_CACHE = new Map<string, { timestamp: number; data: any }>();
const FAVORITE_CACHE = new Map<string, { timestamp: number; data: any }>();
const ACCOUNT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// API Endpoint: TMDB Watchlist Get
app.post("/api/tmdb-watchlist/get", async (req, res) => {
  const { accountId, sessionId } = req.body;
  if (!accountId || !sessionId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required account credentials or backend TMDB API key." });
  }

  const cacheKey = `${accountId}-${sessionId}`;
  const now = Date.now();
  if (WATCHLIST_CACHE.has(cacheKey)) {
    const cached = WATCHLIST_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < ACCOUNT_CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    // Fetch movie watchlist
    const movieUrl = `https://api.themoviedb.org/3/account/${accountId}/watchlist/movies?language=en-US&sort_by=created_at.desc&session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const tvUrl = `https://api.themoviedb.org/3/account/${accountId}/watchlist/tv?language=en-US&sort_by=created_at.desc&session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const [movieRes, tvRes] = await Promise.all([
      fetch(movieUrl, { headers }),
      fetch(tvUrl, { headers })
    ]);

    if (!movieRes.ok || !tvRes.ok) {
      const errM = await movieRes.text();
      const errT = await tvRes.text();
      console.error("[TMDB Watchlist Get] error response:", errM, errT);
      return res.status(400).json({ error: "Failed to fetch watchlist from TMDB. Please check your TMDB Account ID and Session ID." });
    }

    const movieData = await movieRes.json();
    const tvData = await tvRes.json();

    const movies = (movieData.results || []).map((item: any) => ({
      tmdbId: item.id,
      title: item.title,
      type: 'movie',
      releaseDate: item.release_date || '',
      synopsis: item.overview || '',
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      rating: item.vote_average || null,
      genres: []
    }));

    const tvs = (tvData.results || []).map((item: any) => ({
      tmdbId: item.id,
      title: item.name,
      type: 'tv',
      releaseDate: item.first_air_date || '',
      synopsis: item.overview || '',
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      rating: item.vote_average || null,
      genres: []
    }));

    const responseData = { watchlist: [...movies, ...tvs] };
    WATCHLIST_CACHE.set(cacheKey, { timestamp: now, data: responseData });
    return res.json(responseData);
  } catch (error) {
    console.error("Fetch TMDB watchlist failed:", error);
    return res.status(500).json({ error: "Fetch TMDB watchlist failed." });
  }
});

// API Endpoint: TMDB Favorites Get
app.post("/api/tmdb-favorite/get", async (req, res) => {
  const { accountId, sessionId } = req.body;
  if (!accountId || !sessionId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required account credentials or backend TMDB API key." });
  }

  const cacheKey = `${accountId}-${sessionId}`;
  const now = Date.now();
  if (FAVORITE_CACHE.has(cacheKey)) {
    const cached = FAVORITE_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < ACCOUNT_CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    // Fetch movie favorites
    const movieUrl = `https://api.themoviedb.org/3/account/${accountId}/favorite/movies?language=en-US&sort_by=created_at.desc&session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const tvUrl = `https://api.themoviedb.org/3/account/${accountId}/favorite/tv?language=en-US&sort_by=created_at.desc&session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const [movieRes, tvRes] = await Promise.all([
      fetch(movieUrl, { headers }),
      fetch(tvUrl, { headers })
    ]);

    if (!movieRes.ok || !tvRes.ok) {
      const errM = await movieRes.text();
      const errT = await tvRes.text();
      console.error("[TMDB Favorites Get] error response:", errM, errT);
      return res.status(400).json({ error: "Failed to fetch favorites from TMDB. Please check your TMDB Account ID and Session ID." });
    }

    const movieData = await movieRes.json();
    const tvData = await tvRes.json();

    const movies = (movieData.results || []).map((item: any) => ({
      tmdbId: item.id,
      title: item.title,
      type: 'movie',
      releaseDate: item.release_date || '',
      synopsis: item.overview || '',
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      rating: item.vote_average || null,
      genres: []
    }));

    const tvs = (tvData.results || []).map((item: any) => ({
      tmdbId: item.id,
      title: item.name,
      type: 'tv',
      releaseDate: item.first_air_date || '',
      synopsis: item.overview || '',
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      rating: item.vote_average || null,
      genres: []
    }));

    const responseData = { favorites: [...movies, ...tvs] };
    FAVORITE_CACHE.set(cacheKey, { timestamp: now, data: responseData });
    return res.json(responseData);
  } catch (error) {
    console.error("Fetch TMDB favorites failed:", error);
    return res.status(500).json({ error: "Fetch TMDB favorites failed." });
  }
});

// API Endpoint: TMDB Favorite Update
app.post("/api/tmdb-favorite/update", async (req, res) => {
  const { accountId, sessionId, mediaType, tmdbId, favorite } = req.body;
  if (!accountId || !sessionId || !mediaType || !tmdbId || favorite === undefined || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Invalid request parameters." });
  }

  // Invalidate cache immediately on update
  FAVORITE_CACHE.delete(`${accountId}-${sessionId}`);

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanId = parseInt(tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim(), 10);
    const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';

    const url = `https://api.themoviedb.org/3/account/${accountId}/favorite?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const body = {
      media_type: tmdbType,
      media_id: cleanId,
      favorite: favorite
    };

    const tmdbRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json({ success: true, data });
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Favorite Update] error response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to update TMDB favorite.", details: errText });
    }
  } catch (error) {
    console.error("Update TMDB favorite failed:", error);
    return res.status(500).json({ error: "Update TMDB favorite failed." });
  }
});

// API Endpoint: TMDB Rate Show or Movie
app.post("/api/tmdb-rating/update", async (req, res) => {
  const { accountId, sessionId, mediaType, tmdbId, rating } = req.body;
  if (!sessionId || !mediaType || !tmdbId || rating === undefined || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();
    const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';

    const tmdbUrl = `https://api.themoviedb.org/3/${tmdbType}/${cleanId}/rating?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const tmdbRes = await fetch(tmdbUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ value: rating })
    });

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json({ success: true, data });
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Show/Movie Rate] Error Response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to post rating to TMDB." });
    }
  } catch (error) {
    console.error("Post rating to TMDB failed:", error);
    return res.status(500).json({ error: "Post rating to TMDB failed." });
  }
});

// API Endpoint: TMDB Watchlist Update
app.post("/api/tmdb-watchlist/update", async (req, res) => {
  const { accountId, sessionId, mediaType, tmdbId, mediaId, watchlist } = req.body;
  const targetId = tmdbId || mediaId;
  if (!accountId || !sessionId || !mediaType || !targetId || watchlist === undefined || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Invalid request parameters." });
  }

  // Invalidate watchlist cache immediately on update
  WATCHLIST_CACHE.delete(`${accountId}-${sessionId}`);

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanId = parseInt(targetId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim(), 10);
    const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';

    const url = `https://api.themoviedb.org/3/account/${accountId}/watchlist?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const body = {
      media_type: tmdbType,
      media_id: cleanId,
      watchlist: watchlist
    };

    const tmdbRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json({ success: true, data });
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Watchlist Update] error response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to update TMDB watchlist.", details: errText });
    }
  } catch (error) {
    console.error("Update TMDB watchlist failed:", error);
    return res.status(500).json({ error: "Update TMDB watchlist failed." });
  }
});

// API Endpoint: TMDB Lists GetAll
app.post(["/api/tmdb-lists/get-all", "/api/tmdb-lists/get"], async (req, res) => {
  const { accountId, sessionId, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!accountId || !sessionId || !rawKey) {
    return res.status(400).json({ error: "Missing required credentials." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const combinedLists: any[] = [];
    const seenIds = new Set<string>();

    // Try v4 account lists first (only works with Bearer Access Token)
    if (isBearer) {
      try {
        const v4Url = `https://api.themoviedb.org/4/account/${accountId}/lists?page=1`;
        const v4Res = await fetch(v4Url, { headers, signal: AbortSignal.timeout(10000) });
        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          (v4Data.results || []).forEach((list: any) => {
            const listIdStr = `tmdb-list-${list.id}`;
            if (!seenIds.has(listIdStr)) {
              seenIds.add(listIdStr);
              combinedLists.push({
                id: listIdStr,
                name: list.name,
                description: list.description || '',
                itemCount: list.item_count || list.number_of_items || 0,
                listType: list.list_type || 'v4'
              });
            }
          });
        }
      } catch (e) {
        // Fallback silently
      }
    }

    // Try v3 account lists
    const v3Url = `https://api.themoviedb.org/3/account/${accountId}/lists?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Res = await fetch(v3Url, { headers });

    if (v3Res.ok) {
      const v3Data = await v3Res.json();
      (v3Data.results || []).forEach((list: any) => {
        const listIdStr = `tmdb-list-${list.id}`;
        if (!seenIds.has(listIdStr)) {
          seenIds.add(listIdStr);
          combinedLists.push({
            id: listIdStr,
            name: list.name,
            description: list.description || '',
            itemCount: list.item_count,
            listType: list.list_type || 'v3'
          });
        }
      });
    }

    if (combinedLists.length > 0 || v3Res.ok) {
      return res.json({ lists: combinedLists });
    } else {
      const errText = await v3Res.text();
      console.error("[TMDB Lists GetAll] error response:", errText);
      return res.status(400).json({ error: "Failed to fetch TMDB lists." });
    }
  } catch (error) {
    console.error("Fetch TMDB lists failed:", error);
    return res.status(500).json({ error: "Fetch TMDB lists failed." });
  }
});

// API Endpoint: TMDB List Details Get
app.post("/api/tmdb-lists/get-details", async (req, res) => {
  const { listId, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!listId || !rawKey) {
    return res.status(400).json({ error: "Missing list ID or API key." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanListId = listId.replace('tmdb-list-', '').trim();

    // 1. Try TMDB v4 list details first if Bearer Access Token is available
    if (isBearer) {
      try {
        const v4Url = `https://api.themoviedb.org/4/list/${cleanListId}?language=en-US&page=1`;
        const v4Res = await fetch(v4Url, { headers, signal: AbortSignal.timeout(10000) });
        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          const rawItems = v4Data.results || v4Data.items || [];
          const items = rawItems.map((item: any) => ({
            tmdbId: item.id,
            title: item.title || item.name,
            type: item.media_type || (item.title ? 'movie' : 'tv'),
            releaseDate: item.release_date || item.first_air_date || '',
            synopsis: item.overview || '',
            coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
            backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
            rating: item.vote_average || null,
            genres: []
          }));
          return res.json({ items });
        }
      } catch (e) {
        // Fallback to v3
      }
    }

    // 2. Fallback to TMDB v3 list details
    const v3Url = `https://api.themoviedb.org/3/list/${cleanListId}?language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Res = await fetch(v3Url, { headers });

    if (v3Res.ok) {
      const data = await v3Res.json();
      const items = (data.items || []).map((item: any) => ({
        tmdbId: item.id,
        title: item.title || item.name,
        type: item.media_type || (item.title ? 'movie' : 'tv'),
        releaseDate: item.release_date || item.first_air_date || '',
        synopsis: item.overview || '',
        coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
        backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
        rating: item.vote_average || null,
        genres: []
      }));
      return res.json({ items });
    } else {
      const errText = await v3Res.text();
      console.error("[TMDB List Details] error response:", errText);
      return res.status(400).json({ error: "Failed to fetch TMDB list details." });
    }
  } catch (error) {
    console.error("Fetch TMDB list details failed:", error);
    return res.status(500).json({ error: "Fetch TMDB list details failed." });
  }
});

// API Endpoint: TMDB List Create
app.post("/api/tmdb-lists/create", async (req, res) => {
  const { name, description, sessionId, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!name || !rawKey) {
    return res.status(400).json({ error: "Missing parameters." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    // 1. Try TMDB v4 list create first if Bearer Access Token is available
    if (isBearer) {
      try {
        const v4Url = `https://api.themoviedb.org/4/list`;
        const v4Body = {
          name,
          description: description || '',
          iso_639_1: 'en',
          public: false
        };
        const v4Res = await fetch(v4Url, {
          method: 'POST',
          headers,
          body: JSON.stringify(v4Body),
          signal: AbortSignal.timeout(10000)
        });

        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          const createdId = v4Data.id || v4Data.list_id;
          if (createdId) {
            return res.json({ id: `tmdb-list-${createdId}`, success: true });
          }
        }
      } catch (e) {
        // Fallback to v3
      }
    }

    // 2. Fallback to TMDB v3 list create
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required for v3 list creation." });
    }

    const v3Url = `https://api.themoviedb.org/3/list?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Body = {
      name,
      description: description || '',
      language: 'en'
    };

    const v3Res = await fetch(v3Url, {
      method: 'POST',
      headers,
      body: JSON.stringify(v3Body)
    });

    if (v3Res.ok) {
      const data = await v3Res.json();
      return res.json({ id: `tmdb-list-${data.list_id}`, success: true });
    } else {
      const errText = await v3Res.text();
      console.error("[TMDB List Create] error response:", errText);
      return res.status(400).json({ error: "Failed to create TMDB list." });
    }
  } catch (error) {
    console.error("Create TMDB list failed:", error);
    return res.status(500).json({ error: "Create TMDB list failed." });
  }
});

// API Endpoint: TMDB List Update Item (Add / Remove)
app.post("/api/tmdb-lists/update-item", async (req, res) => {
  const { listId, mediaId, mediaType, action, sessionId, customApiKey } = req.body; // action: 'add' | 'remove'
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!listId || !mediaId || !action || !rawKey) {
    return res.status(400).json({ error: "Missing parameters." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanListId = listId.toString().replace('tmdb-list-', '').trim();
    const cleanTmdbId = parseInt(mediaId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim(), 10);

    if (isNaN(cleanTmdbId)) {
      return res.status(400).json({ error: "Invalid TMDB media ID." });
    }

    const itemMediaType = mediaType === 'tv' ? 'tv' : 'movie';

    // 1. Try TMDB v4 list item update if Bearer Access Token is available (supports both Movies and TV shows!)
    if (isBearer) {
      try {
        const v4Method = action === 'add' ? 'POST' : 'DELETE';
        const v4Url = `https://api.themoviedb.org/4/list/${cleanListId}/items`;
        const v4Body = {
          items: [
            {
              media_type: itemMediaType,
              media_id: cleanTmdbId
            }
          ]
        };

        const v4Res = await fetch(v4Url, {
          method: v4Method,
          headers,
          body: JSON.stringify(v4Body),
          signal: AbortSignal.timeout(10000)
        });

        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          return res.json({ success: true, data: v4Data });
        } else {
          const errText = await v4Res.text();
          console.warn("[TMDB v4 List Update Item] status:", v4Res.status, errText);
        }
      } catch (e) {
        console.warn("[TMDB v4 List Update Item] exception:", e);
      }
    }

    // 2. TMDB v3 lists ONLY support movies!
    if (itemMediaType === 'tv' && action === 'add') {
      return res.status(400).json({
        error: "TMDB v3 lists only support Movies. To add TV shows, you must paste a TMDB v4 Read Access Token in Settings, or use Chronicle's Custom Lists."
      });
    }

    // 3. Fallback to TMDB v3 list item update
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required for v3 list fallback." });
    }

    const tmdbAction = action === 'add' ? 'add_item' : 'remove_item';
    const v3Url = `https://api.themoviedb.org/3/list/${cleanListId}/${tmdbAction}?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Body = {
      media_id: cleanTmdbId
    };

    const v3Res = await fetch(v3Url, {
      method: 'POST',
      headers,
      body: JSON.stringify(v3Body)
    });

    if (v3Res.ok) {
      const data = await v3Res.json();
      return res.json({ success: true, data });
    } else {
      const errText = await v3Res.text();
      console.error(`[TMDB List ${action}] error response:`, errText);
      let parsedErr: any = {};
      try { parsedErr = JSON.parse(errText); } catch(e){}

      let userMsg = `Failed to ${action} item on TMDB list.`;
      if (parsedErr.status_code === 11) {
        if (itemMediaType === 'tv') {
          userMsg = "TMDB v3 lists only support Movies. For TV shows, please use Chronicle's Custom Lists or provide a TMDB v4 Read Access Token.";
        } else {
          userMsg = "Item is already in this TMDB list.";
        }
      } else if (parsedErr.status_message) {
        userMsg = parsedErr.status_message;
      }

      return res.status(400).json({ error: userMsg, details: errText, statusCode: parsedErr.status_code });
    }
  } catch (error) {
    console.error(`TMDB List ${action} item failed:`, error);
    return res.status(500).json({ error: `TMDB List ${action} item failed.` });
  }
});

// API Endpoint: TMDB List Delete
app.post("/api/tmdb-lists/delete", async (req, res) => {
  const { listId, sessionId, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!listId || !rawKey) {
    return res.status(400).json({ error: "Missing parameters." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanListId = listId.replace('tmdb-list-', '').trim();

    // 1. Try TMDB v4 list delete first if Bearer Access Token is available
    if (isBearer) {
      try {
        const v4Url = `https://api.themoviedb.org/4/list/${cleanListId}`;
        const v4Res = await fetch(v4Url, {
          method: 'DELETE',
          headers,
          signal: AbortSignal.timeout(10000)
        });

        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          return res.json({ success: true, data: v4Data });
        }
      } catch (e) {
        // Fallback to v3
      }
    }

    // 2. Fallback to TMDB v3 list delete
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required for v3 list delete fallback." });
    }

    const v3Url = `https://api.themoviedb.org/3/list/${cleanListId}?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Res = await fetch(v3Url, {
      method: 'DELETE',
      headers
    });

    if (v3Res.ok) {
      const data = await v3Res.json();
      return res.json({ success: true, data });
    } else {
      const errText = await v3Res.text();
      console.error("[TMDB List Delete] error response:", errText);
      return res.status(400).json({ error: "Failed to delete TMDB list." });
    }
  } catch (error) {
    console.error("Delete TMDB list failed:", error);
    return res.status(500).json({ error: "Delete TMDB list failed." });
  }
});

const PERSON_CACHE = new Map<string, any>();

// API Endpoint: TMDB Person Details
app.post("/api/tmdb-person", async (req, res) => {
  const { personId } = req.body;
  if (!personId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Invalid request" });
  }
  
  if (PERSON_CACHE.has(personId.toString())) {
    console.log(`[Cache Hit] Person details for ID: ${personId}`);
    return res.json(PERSON_CACHE.get(personId.toString()));
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const tmdbUrl = `https://api.themoviedb.org/3/person/${personId}?append_to_response=combined_credits&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };
    
    const tmdbRes = await fetch(tmdbUrl, { headers });
    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      const personData = { 
        biography: data.biography,
        name: data.name,
        profilePath: data.profile_path,
        knownForDepartment: data.known_for_department,
        birthday: data.birthday,
        placeOfBirth: data.place_of_birth,
        credits: data.combined_credits?.cast || []
      };
      PERSON_CACHE.set(personId.toString(), personData);
      return res.json(personData);
    }
    return res.status(404).json({ error: "Person not found" });
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
});



let DISCOVER_CACHE: any = null;
let DISCOVER_CACHE_TIMESTAMP = 0;
const DISCOVER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// API Endpoint: Discover Feed (Trending, Top Rated, Upcoming, TV Airing Today, Sci-Fi)
app.get(["/api/tmdb-discover", "/api/discover"], async (req, res) => {
  const now = Date.now();
  if (DISCOVER_CACHE && (now - DISCOVER_CACHE_TIMESTAMP < DISCOVER_CACHE_TTL)) {
    console.log("[Cache Hit] Serving tmdb-discover feed from memory cache");
    return res.json(DISCOVER_CACHE);
  }

  const TMDB_GENRES: Record<number, string> = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
    10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
    10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
  };

  const hasTMDB = !!process.env.TMDB_API_KEY;

  if (hasTMDB) {
    try {
      const rawKey = process.env.TMDB_API_KEY || '';
      const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
      const isBearer = tmdbKey.length > 40;
      const headers = {
        accept: 'application/json',
        ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
      };

      const fetchTMDB = async (endpoint: string) => {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `https://api.themoviedb.org/3/${endpoint}${separator}language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
        const tmdbRes = await fetch(url, { headers });
        if (tmdbRes.ok) {
          const data = await tmdbRes.json();
          return data.results || [];
        }
        return [];
      };

      const [trendingRaw, upcomingRaw, topRatedRaw, airingTodayRaw, sciFiRaw] = await Promise.all([
        fetchTMDB('trending/all/week'),
        fetchTMDB('movie/upcoming'),
        fetchTMDB('movie/top_rated'),
        fetchTMDB('tv/popular'), // Airing Today / Popular TV is cleaner
        fetchTMDB('discover/movie?with_genres=878&sort_by=vote_average.desc&vote_count.gte=300') // Sci-Fi
      ]);

      const mapItem = (item: any, defaultType?: 'movie' | 'tv') => {
        const detectedType = item.media_type || defaultType || (item.first_air_date || item.name ? 'tv' : 'movie');
        const isTV = detectedType === 'tv';
        return {
          id: `tmdb-${item.id}`,
          title: item.title || item.name || item.original_name || "Unknown Title",
          type: detectedType,
          releaseDate: item.release_date || item.first_air_date || "",
          synopsis: item.overview || "",
          genres: (item.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean),
          creators: [],
          platforms: [],
          coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
          backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "",
          rating: item.vote_average || null,
          ...(isTV ? {
            tvSpecifics: { currentSeason: 1, currentEpisode: 1, totalSeasons: 1, totalEpisodes: 1 }
          } : {
            movieSpecifics: { director: "" }
          })
        };
      };

      const payload = {
        trending: trendingRaw.slice(0, 10).map((i: any) => mapItem(i)),
        upcoming: upcomingRaw.slice(0, 10).map((i: any) => mapItem(i, 'movie')),
        topRated: topRatedRaw.slice(0, 10).map((i: any) => mapItem(i, 'movie')),
        airingToday: airingTodayRaw.slice(0, 10).map((i: any) => mapItem(i, 'tv')),
        sciFi: sciFiRaw.slice(0, 10).map((i: any) => mapItem(i, 'movie')),
        source: "tmdb"
      };
      DISCOVER_CACHE = payload;
      DISCOVER_CACHE_TIMESTAMP = Date.now();
      return res.json(payload);

    } catch (error) {
      console.error("Failed to fetch discovery feed from TMDB, falling back to Gemini:", error);
    }
  }

  // If TMDB is not available or failed, use Gemini client or high-quality curated fallback list
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are a universal media discovery engine inside a premium media tracking application named Sequel.
Generate a beautiful, realistic, real-time-looking collection of trending and popular movies and TV shows for July 2026.
Ensure the titles and details correspond to actual real-world titles (including blockbusters and acclaimed series released recently or up to 2026, or classic masterpieces).

Generate a JSON object containing exactly 5 arrays of items:
1. 'trending': 8 items representing movies or TV shows trending this week globally.
2. 'upcoming': 8 movies currently in theaters or upcoming in 2026.
3. 'topRated': 8 of the highest-rated movies of all time.
4. 'airingToday': 8 of the most popular TV shows right now.
5. 'sciFi': 8 top-rated classic or modern Sci-Fi films.

For each item, generate the following fields:
- id: a string formatted as "tmdb-[random integer]" (e.g., "tmdb-10293") so it looks like a real TMDB ID
- title: string
- type: 'movie' | 'tv'
- releaseDate: YYYY-MM-DD
- synopsis: string description
- genres: array of 2-3 standard genre strings (e.g. ["Sci-Fi", "Action", "Drama"])
- coverUrl: For visual thumbnail/poster cover URLs (image), you must use the following strict rules:
  - For Movies and TV Shows: Use real, verified TMDB poster path CDN URLs if you know them (e.g., "https://image.tmdb.org/t/p/w500/{poster_path}"). If you do not know the exact path, use a highly specific Unsplash photo search URL matching the visual style of the title, or a high-quality movie-theater concept Unsplash image (e.g., "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80").
- backdropUrl: a high-quality landscape Unsplash backdrop image URL matching this item's atmosphere (e.g., "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80").
- rating: a number between 1.0 and 10.0 representing the average user rating (e.g., 8.4)`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trending: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, type: { type: Type.STRING }, releaseDate: { type: Type.STRING }, synopsis: { type: Type.STRING }, genres: { type: Type.ARRAY, items: { type: Type.STRING } }, coverUrl: { type: Type.STRING }, backdropUrl: { type: Type.STRING }, rating: { type: Type.NUMBER } }, required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "coverUrl", "backdropUrl", "rating"] } },
              upcoming: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, type: { type: Type.STRING }, releaseDate: { type: Type.STRING }, synopsis: { type: Type.STRING }, genres: { type: Type.ARRAY, items: { type: Type.STRING } }, coverUrl: { type: Type.STRING }, backdropUrl: { type: Type.STRING }, rating: { type: Type.NUMBER } }, required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "coverUrl", "backdropUrl", "rating"] } },
              topRated: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, type: { type: Type.STRING }, releaseDate: { type: Type.STRING }, synopsis: { type: Type.STRING }, genres: { type: Type.ARRAY, items: { type: Type.STRING } }, coverUrl: { type: Type.STRING }, backdropUrl: { type: Type.STRING }, rating: { type: Type.NUMBER } }, required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "coverUrl", "backdropUrl", "rating"] } },
              airingToday: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, type: { type: Type.STRING }, releaseDate: { type: Type.STRING }, synopsis: { type: Type.STRING }, genres: { type: Type.ARRAY, items: { type: Type.STRING } }, coverUrl: { type: Type.STRING }, backdropUrl: { type: Type.STRING }, rating: { type: Type.NUMBER } }, required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "coverUrl", "backdropUrl", "rating"] } },
              sciFi: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, type: { type: Type.STRING }, releaseDate: { type: Type.STRING }, synopsis: { type: Type.STRING }, genres: { type: Type.ARRAY, items: { type: Type.STRING } }, coverUrl: { type: Type.STRING }, backdropUrl: { type: Type.STRING }, rating: { type: Type.NUMBER } }, required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "coverUrl", "backdropUrl", "rating"] } }
            },
            required: ["trending", "upcoming", "topRated", "airingToday", "sciFi"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      const payload = {
        trending: parsed.trending || [],
        upcoming: parsed.upcoming || [],
        topRated: parsed.topRated || [],
        airingToday: parsed.airingToday || [],
        sciFi: parsed.sciFi || [],
        source: "gemini"
      };
      DISCOVER_CACHE = payload;
      DISCOVER_CACHE_TIMESTAMP = Date.now();
      return res.json(payload);
    } catch (e) {
      console.error("Gemini discover feed generation failed, falling back to static offline:", e);
    }
  }

  // Pure Offline Static Fallbacks
  const fallbackMovies = [
    {
      id: "tmdb-693134",
      title: "Dune: Part Two",
      type: "movie",
      releaseDate: "2024-03-01",
      synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
      genres: ["Sci-Fi", "Adventure", "Drama"],
      coverUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
      rating: 8.3
    },
    {
      id: "tmdb-823464",
      title: "Godzilla x Kong: The New Empire",
      type: "movie",
      releaseDate: "2024-03-27",
      synopsis: "Following their explosive showdown, Godzilla and Kong must reunite against a colossal undiscovered threat hidden within our world.",
      genres: ["Action", "Sci-Fi", "Adventure"],
      coverUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80",
      rating: 7.2
    }
  ];

  const fallbackShows = [
    {
      id: "tmdb-114472",
      title: "Severance",
      type: "tv",
      releaseDate: "2022-02-18",
      synopsis: "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.",
      genres: ["Sci-Fi", "Mystery", "Drama"],
      coverUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
      rating: 8.4
    }
  ];

  const payload = {
    trending: fallbackMovies,
    upcoming: fallbackMovies,
    topRated: fallbackMovies,
    airingToday: fallbackShows,
    sciFi: fallbackMovies,
    source: "static"
  };
  DISCOVER_CACHE = payload;
  DISCOVER_CACHE_TIMESTAMP = Date.now();
  return res.json(payload);
});

// API Endpoint: Universal Search
app.post("/api/search", async (req, res) => {
  const { query, type, useAI } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Search query is required." });
  }

  console.log(`[Search] query="${query}" type="${type}" useAI=${useAI} TMDB_KEY_PRESENT=${!!process.env.TMDB_API_KEY}`);

  // TMDB Integration for Movies and TV Shows
  if (process.env.TMDB_API_KEY && (!type || type === 'movie' || type === 'tv')) {
    try {
      const rawKey = process.env.TMDB_API_KEY || '';
      const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
      const isBearer = tmdbKey.length > 40;
      const tmdbType = type === 'tv' ? 'tv' : type === 'movie' ? 'movie' : 'multi';
      const tmdbUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
      
      const headers = {
        accept: 'application/json',
        ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
      };
      
      const tmdbRes = await fetch(tmdbUrl, { headers });
      console.log(`[TMDB Search] Request: ${tmdbUrl.replace(tmdbKey, 'HIDDEN_KEY')}`);
      console.log(`[TMDB Search] Response Status: ${tmdbRes.status}`);

      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        console.log(`[TMDB Search] Received ${tmdbData.results?.length || 0} results`);
        console.log(`[TMDB Search] Full Response:`, JSON.stringify(tmdbData, null, 2));
        let results = (tmdbData.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv' || tmdbType !== 'multi')
          .slice(0, 5)
          .map((item: any) => {
            const isTV = item.media_type === 'tv' || tmdbType === 'tv';
            const mappedType = isTV ? 'tv' : 'movie';
            
            return {
              id: `tmdb-${item.id}`,
              _originalId: item.id,
              title: item.title || item.name || item.original_name || "Unknown Title",
              type: mappedType,
              releaseDate: item.release_date || item.first_air_date || "",
              synopsis: item.overview || "",
              genres: [],
              creators: [], 
              platforms: [], 
              runtime: "",
              coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
              backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "",
              [isTV ? 'tvSpecifics' : 'movieSpecifics']: isTV ? {
                currentSeason: 1, currentEpisode: 1, totalSeasons: 1, totalEpisodes: 1
              } : {
                director: ""
              }
            };
          });
          
        // Fetch full details for the results to populate creators, runtime, genres, platforms
        results = await Promise.all(results.map(async (res: any) => {
          const detailUrl = `https://api.themoviedb.org/3/${res.type}/${res._originalId}?append_to_response=credits&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
          try {
            const detailRes = await fetch(detailUrl, { headers });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.genres) res.genres = detailData.genres.map((g: any) => g.name);
              
              if (res.type === 'movie' && detailData.credits?.crew) {
                res.creators = detailData.credits.crew.filter((c: any) => c.job === 'Director').map((c: any) => c.name);
              } else if (res.type === 'tv' && detailData.created_by) {
                res.creators = detailData.created_by.map((c: any) => c.name);
              }
              
              if (detailData.networks) res.platforms = detailData.networks.map((n: any) => n.name);
              
              const runtime = detailData.runtime || detailData.episode_run_time?.[0] || 0;
              if (runtime > 0) res.runtime = `${runtime}m`;
              
              if (res.type === 'tv' && res.tvSpecifics) {
                if (detailData.number_of_seasons) res.tvSpecifics.totalSeasons = detailData.number_of_seasons;
                if (detailData.number_of_episodes) res.tvSpecifics.totalEpisodes = detailData.number_of_episodes;
              }
            }
          } catch (e) {
            console.error(`Failed to fetch details for ${res.title}`, e);
          }
          delete res._originalId;
          return res;
        }));
          
        // If we queried TMDB successfully, return the results (even if empty)
        // If useAI is true and TMDB returned 0 results, we might want to let AI try, 
        // but if useAI is false, we should definitively return the empty array from TMDB.
        if (results.length > 0 || useAI === false) {
          return res.json({ results });
        }
      } else {
        const errorText = await tmdbRes.text();
        console.error(`[TMDB Search] Error Response Body: ${errorText}`);
      }
    } catch (error) {
      console.error("TMDB search failed, falling back:", error);
    }
  }


  // Books and Audiobooks Integration (OpenLibrary, iTunes, Google Books fallback)
  if (type === 'book' || type === 'audiobook') {
    try {
      const q = encodeURIComponent(query);
      let results: any[] = [];

      // 1. iTunes for Audiobooks
      if (type === 'audiobook') {
        try {
          const itunesUrl = `https://itunes.apple.com/search?term=${q}&media=audiobook&limit=5`;
          const itunesRes = await fetch(itunesUrl);
          if (itunesRes.ok) {
            const data = await itunesRes.json();
            results = (data.results || []).map((item: any) => ({
              id: `itunes-${item.collectionId}`,
              title: item.collectionName || "Unknown Title",
              type: 'audiobook',
              releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : "",
              synopsis: (item.description || "").replace(/<[^>]*>?/gm, ''),
              genres: item.primaryGenreName ? [item.primaryGenreName] : [],
              creators: item.artistName ? [item.artistName] : [],
              platforms: ["Apple Books"],
              runtime: "",
              coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "",
              backdropUrl: "",
              audiobookSpecifics: {
                currentMinutes: 0,
                totalMinutes: 0,
                narrator: "",
                author: item.artistName || ""
              }
            }));
          }
        } catch (e) {
          console.error("iTunes search failed", e);
        }
      }

      // 2. OpenLibrary First for Books
      if (type === 'book' && results.length === 0) {
        try {
          const olUrl = `https://openlibrary.org/search.json?q=${q}&fields=key,title,author_name,first_publish_year,cover_i,publisher,isbn,ratings_average,ratings_count,number_of_pages_median,subject&limit=5`;
          const olRes = await fetch(olUrl);
          if (olRes.ok) {
            const data = await olRes.json();
            
            // Fetch descriptions in parallel
            const docsWithDesc = await Promise.all((data.docs || []).map(async (item: any) => {
              try {
                const workRes = await fetch(`https://openlibrary.org${item.key}.json`);
                if (workRes.ok) {
                  const workData = await workRes.json();
                  let desc = "";
                  if (workData.description) {
                     desc = typeof workData.description === 'string' ? workData.description : workData.description.value;
                  }
                  item.fetchedDescription = desc.replace(/<[^>]*>?/gm, '');
                }
              } catch (e) {
                item.fetchedDescription = "";
              }
              return item;
            }));

            results = docsWithDesc.map((item: any) => ({
              id: `ol-${item.key.replace('/works/', '')}`,
              title: item.title || "Unknown Title",
              type: 'book',
              releaseDate: item.first_publish_year ? item.first_publish_year.toString() : "",
              synopsis: item.fetchedDescription || "",
              genres: item.subject ? item.subject.slice(0, 3) : [],
              creators: item.author_name || [],
              platforms: [],
              runtime: item.number_of_pages_median ? `${item.number_of_pages_median} pages` : "",
              coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : "",
              backdropUrl: "",
              bookSpecifics: {
                currentPage: 0,
                totalPages: item.number_of_pages_median || 0,
                format: 'Hardcover',
                author: item.author_name?.[0] || "",
                publisher: item.publisher?.[0] || "",
                isbn: item.isbn?.[0] || "",
                averageRating: item.ratings_average || 0,
                ratingsCount: item.ratings_count || 0
              }
            }));
          }
        } catch (e) {
          console.error("OpenLibrary search failed", e);
        }
      }

      // 3. Google Books Fallback
      if (type === 'book' && results.length === 0) {
        try {
          const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5`;
          const gBooksRes = await fetch(googleBooksUrl);
          if (gBooksRes.ok) {
            const gBooksData = await gBooksRes.json();
            results = (gBooksData.items || []).map((item: any) => {
              const vol = item.volumeInfo || {};
              let coverUrl = vol.imageLinks?.thumbnail || vol.imageLinks?.smallThumbnail || "";
              if (coverUrl.startsWith("http:")) coverUrl = coverUrl.replace("http:", "https:");
              if (coverUrl) {
                coverUrl = coverUrl.replace("&edge=curl", "").replace("zoom=1", "zoom=3");
              } else {
                 const isbn = vol.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13' || i.type === 'ISBN_10')?.identifier;
                 if (isbn) {
                    coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
                 }
              }
              
              return {
                id: `gbooks-${item.id}`,
                title: vol.title || "Unknown Title",
                type: type,
                releaseDate: vol.publishedDate || "",
                synopsis: (vol.description || "").replace(/<[^>]*>?/gm, ''),
                genres: vol.categories || [],
                creators: vol.authors || [],
                platforms: [],
                runtime: type === 'book' && vol.pageCount ? `${vol.pageCount} pages` : "",
                coverUrl: coverUrl,
                backdropUrl: "",
                [type === 'book' ? 'bookSpecifics' : 'audiobookSpecifics']: type === 'book' ? {
                  currentPage: 0,
                  totalPages: vol.pageCount || 0,
                  format: 'Hardcover',
                  author: vol.authors?.[0] || "",
                  publisher: vol.publisher || "",
                  isbn: vol.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13' || i.type === 'ISBN_10')?.identifier || "",
                  averageRating: vol.averageRating || 0,
                  ratingsCount: vol.ratingsCount || 0
                } : {
                  currentMinutes: 0,
                  totalMinutes: 0,
                  narrator: "",
                  author: vol.authors?.[0] || "",
                  publisher: vol.publisher || "",
                  averageRating: vol.averageRating || 0,
                  ratingsCount: vol.ratingsCount || 0
                }
              };
            });
          }
        } catch (error) {
          console.error("Google Books search failed:", error);
        }
      }



      if (results.length > 0 || useAI === false) {
        return res.json({ results });
      }
    } catch (e) {
      console.error("Book/Audiobook search error:", e);
    }
  }

  // If useAI is false, and TMDB didn't have results (or wasn't queried), fallback to offline
  if (useAI === false) {
    const mediaType = type || "movie";
    const sourceList = OFFLINE_SEARCH_RESULTS[mediaType] || OFFLINE_SEARCH_RESULTS.movie;
    const filtered = sourceList.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) || 
      item.synopsis.toLowerCase().includes(query.toLowerCase())
    );
    return res.json({ results: filtered.length > 0 ? filtered : sourceList.slice(0, 3) });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Offline mode: filter fallback list
    const mediaType = type || "movie";
    const sourceList = OFFLINE_SEARCH_RESULTS[mediaType] || OFFLINE_SEARCH_RESULTS.movie;
    const filtered = sourceList.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) || 
      item.synopsis.toLowerCase().includes(query.toLowerCase())
    );
    // If no results, return some fallbacks
    return res.json({ results: filtered.length > 0 ? filtered : sourceList.slice(0, 3) });
  }

  try {
    const prompt = `You are a universal media database engine. 
Generate 4-5 highly relevant, realistic real-world search results matching the query: "${query}" ${type ? `specifically of type "${type}"` : ""}.
The media type should be one of: 'movie', 'tv', 'game', 'book', 'audiobook', 'podcast'. 
Make sure the structure perfectly fits the media items. Give standard properties. Use standard platform options.
For each item, generate:
- id: a unique short random string (e.g. "gem-1a2b")
- title: string
- type: MediaType ('movie', 'tv', 'game', 'book', 'audiobook', 'podcast')
- releaseDate: string in YYYY-MM-DD (e.g. "2024-03-15")
- synopsis: string description
- genres: array of strings
- creators: array of strings (directors, authors, developers, hosts)
- platforms: array of strings (Netflix, Steam, Audible, Spotify, Nintendo Switch, PS5, etc.)
- runtime: string (e.g. "122 min", "8 episodes", "25h play time", "340 pages")
- coverUrl: For visual thumbnail/poster cover URLs (image), you must use the following strict rules:
  - For Movies and TV Shows: Use real, verified TMDB poster path CDN URLs if you know them (e.g., "https://image.tmdb.org/t/p/w500/{poster_path}"). If you do not know the exact path, use a highly specific Unsplash photo search URL matching the visual style of the title, or a high-quality movie-theater concept Unsplash image (e.g., "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80").
  - For Books and Audiobooks: Use the public OpenLibrary Cover API URL if you can approximate the ISBN (e.g., "https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg") or use a highly thematic Unsplash photo (e.g., "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80").
  - For Podcasts: Use high-quality abstract, technology, microphone, or artistic studio photography from Unsplash (e.g., "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&q=80").
- backdropUrl: a wide high-quality landscape Unsplash photo matching the vibe/atmosphere of the media item with w=1200 (e.g., "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80").
- Specifics block matching the type:
  - 'movie': director (string)
  - 'tv': currentSeason: 1, currentEpisode: 1, totalSeasons: integer, totalEpisodes: integer, episodesPerSeason: { 1: integer, 2: integer }
  - 'game': hoursPlayed: 0, platform: first platform from platforms list, totalAchievements: integer, unlockedAchievements: 0, developer: string
  - 'book': currentPage: 0, totalPages: integer, format: 'paperback', author: creator name
  - 'audiobook': currentMinutes: 0, totalMinutes: integer, narrator: string, author: creator name
  - 'podcast': isSubscribed: false, lastListenedEpisode: "", totalEpisodes: integer, host: creator name`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  releaseDate: { type: Type.STRING },
                  synopsis: { type: Type.STRING },
                  genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                  creators: { type: Type.ARRAY, items: { type: Type.STRING } },
                  platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  runtime: { type: Type.STRING },
                  coverUrl: { type: Type.STRING },
                  backdropUrl: { type: Type.STRING },
                  // Specific fields
                  movieSpecifics: {
                    type: Type.OBJECT,
                    properties: { director: { type: Type.STRING } }
                  },
                  tvSpecifics: {
                    type: Type.OBJECT,
                    properties: {
                      currentSeason: { type: Type.INTEGER },
                      currentEpisode: { type: Type.INTEGER },
                      totalSeasons: { type: Type.INTEGER },
                      totalEpisodes: { type: Type.INTEGER },
                    }
                  },
                  gameSpecifics: {
                    type: Type.OBJECT,
                    properties: {
                      hoursPlayed: { type: Type.INTEGER },
                      platform: { type: Type.STRING },
                      totalAchievements: { type: Type.INTEGER },
                      unlockedAchievements: { type: Type.INTEGER },
                      developer: { type: Type.STRING }
                    }
                  },
                  bookSpecifics: {
                    type: Type.OBJECT,
                    properties: {
                      currentPage: { type: Type.INTEGER },
                      totalPages: { type: Type.INTEGER },
                      format: { type: Type.STRING },
                      author: { type: Type.STRING }
                    }
                  },
                  audiobookSpecifics: {
                    type: Type.OBJECT,
                    properties: {
                      currentMinutes: { type: Type.INTEGER },
                      totalMinutes: { type: Type.INTEGER },
                      narrator: { type: Type.STRING },
                      author: { type: Type.STRING }
                    }
                  },
                  podcastSpecifics: {
                    type: Type.OBJECT,
                    properties: {
                      isSubscribed: { type: Type.BOOLEAN },
                      lastListenedEpisode: { type: Type.STRING },
                      totalEpisodes: { type: Type.INTEGER },
                      host: { type: Type.STRING }
                    }
                  }
                },
                required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "creators", "platforms", "coverUrl", "backdropUrl"]
              }
            }
          },
          required: ["results"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ results: parsed.results || [] });
  } catch (error) {
    console.error("Gemini search failed:", error);
    // Return offline fallback
    const mediaType = type || "movie";
    const fallbackList = OFFLINE_SEARCH_RESULTS[mediaType] || OFFLINE_SEARCH_RESULTS.movie;
    return res.json({ results: fallbackList.slice(0, 3) });
  }
});

// API Endpoint: Intelligent Recommendations
app.post("/api/recommend", async (req, res) => {
  const { watchlist } = req.body; // Array of items
  const ai = getGeminiClient();

  if (!ai || !watchlist || watchlist.length === 0) {
    // Generate static offline recommendations
    const items = [
      {
        id: "rec-1",
        title: "Interstellar",
        type: "movie",
        releaseDate: "2014-11-07",
        synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        genres: ["Sci-Fi", "Adventure", "Drama"],
        creators: ["Christopher Nolan"],
        platforms: ["Prime Video", "Apple TV"],
        coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
        reason: "Since you love deep Sci-Fi and mind-bending storytelling like Inception."
      },
      {
        id: "rec-2",
        title: "The Witcher 3: Wild Hunt",
        type: "game",
        releaseDate: "2015-05-19",
        synopsis: "Geralt of Rivia, a monster hunter, searches for his adopted daughter who is on the run from the Wild Hunt.",
        genres: ["RPG", "Adventure", "Open World"],
        creators: ["CD Projekt Red"],
        platforms: ["PC", "PS5", "Xbox Series X/S", "Switch"],
        coverUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80",
        reason: "Because you enjoy expansive fantasy roleplaying and rich character-driven narratives like Zelda."
      },
      {
        id: "rec-3",
        title: "The Martian",
        type: "book",
        releaseDate: "2011-09-27",
        synopsis: "An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal to Earth.",
        genres: ["Sci-Fi", "Adventure"],
        creators: ["Andy Weir"],
        platforms: ["Kindle", "Paperback", "Audible"],
        coverUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200&auto=format&fit=crop&q=80",
        reason: "By the author of Project Hail Mary, matching your love for hard-science space survival stories."
      }
    ];
    return res.json({ recommendations: items });
  }

  try {
    const watchlistSummary = watchlist.map((w: any) => `- ${w.title} (${w.type}): ${w.genres?.join(", ")}. Status: ${w.status}.`).join("\n");
    const prompt = `You are a personalized recommendation advisor for a media tracking app named Sequel.
Based on the user's watchlist below, recommend exactly 3 distinct real-world media items (movies, tv, games, books, audiobooks, or podcasts) they would absolutely love.
Do not recommend items that are already in their watchlist.

User's watchlist:
${watchlistSummary}

Generate a JSON object containing a 'recommendations' array. For each recommendation, provide:
- id: random short string
- title: string
- type: 'movie' | 'tv' | 'game' | 'book' | 'audiobook' | 'podcast'
- releaseDate: YYYY-MM-DD
- synopsis: string description
- genres: array of strings
- creators: array of strings
- platforms: array of strings
- coverUrl: For visual thumbnail/poster cover URLs (image), you must use the following strict rules:
  - For Movies and TV Shows: Use real, verified TMDB poster path CDN URLs if you know them (e.g., "https://image.tmdb.org/t/p/w500/{poster_path}"). If you do not know the exact path, use a highly specific Unsplash photo search URL matching the visual style of the title, or a high-quality movie-theater concept Unsplash image (e.g., "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80").
  - For Books and Audiobooks: Use the public OpenLibrary Cover API URL if you can approximate the ISBN (e.g., "https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg") or use a highly thematic Unsplash photo (e.g., "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80").
  - For Podcasts: Use high-quality abstract, technology, microphone, or artistic studio photography from Unsplash (e.g., "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&q=80").
- backdropUrl: a high-quality landscape Unsplash backdrop image URL matching this item's atmosphere (e.g., "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80").
- reason: a short 1-2 sentence personalized explanation of 'why' they will love it based on their watchlist (e.g. "Because you liked 'Inception', Denis Villeneuve's cinematic style will resonate with you.").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  releaseDate: { type: Type.STRING },
                  synopsis: { type: Type.STRING },
                  genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                  creators: { type: Type.ARRAY, items: { type: Type.STRING } },
                  platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  coverUrl: { type: Type.STRING },
                  backdropUrl: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "creators", "platforms", "coverUrl", "backdropUrl", "reason"]
              }
            }
          },
          required: ["recommendations"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ recommendations: parsed.recommendations || [] });
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return res.json({ recommendations: [] });
  }
});

// API Endpoint: Diary Co-pilot helper
app.post("/api/diary/generate-insight", async (req, res) => {
  const { title, type, notes } = req.body;
  if (!notes) {
    return res.status(400).json({ error: "User notes/thoughts are required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      enhancedNotes: notes,
      titleSuggestion: `Reflections on ${title}`,
      tags: [type, "Journal"]
    });
  }

  try {
    const prompt = `You are an AI co-pilot inside Sequel, a beautiful personal media journal app.
The user watched/played/read/listened to "${title}" (${type}) and left these raw notes:
"${notes}"

Analyze their notes and generate:
1. 'enhancedNotes': A beautifully polished, coherent, and highly engaging version of their review/journal entry. Keep their core ideas but write them with clean, eloquent film/book/gaming review vocabulary.
2. 'titleSuggestion': A punchy, gorgeous title for this review entry (e.g. "A Masterclass in Tension" or "Atmospheric but Shallow").
3. 'tags': 2-3 custom stylistic tags (e.g. ["Must-Watch", "Heartbreaking", "Masterpiece"]).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedNotes: { type: Type.STRING },
            titleSuggestion: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["enhancedNotes", "titleSuggestion", "tags"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Diary insight generator failed:", error);
    return res.json({
      enhancedNotes: notes,
      titleSuggestion: `Reflections on ${title}`,
      tags: [type]
    });
  }
});

// API Endpoint: Dynamic cover and backdrop suggestions
app.post("/api/generate-cover", async (req, res) => {
  const { title, type } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    const fallbacks: Record<string, { coverUrl: string; backdropUrl: string }> = {
      movie: {
        coverUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80"
      },
      tv: {
        coverUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80"
      },
      game: {
        coverUrl: "https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?w=1200&auto=format&fit=crop&q=80"
      },
      book: {
        coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1200&auto=format&fit=crop&q=80"
      },
      audiobook: {
        coverUrl: "https://images.unsplash.com/photo-1484906028478-849c177e76a1?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1484906028478-849c177e76a1?w=1200&auto=format&fit=crop&q=80"
      },
      podcast: {
        coverUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1200&auto=format&fit=crop&q=80"
      }
    };
    return res.json(fallbacks[type] || fallbacks.movie);
  }

  try {
    const prompt = `You are an expert media visual archivist.
We have a media item of type "${type}" titled "${title}".
Suggest a single highly-specific, relevant and high-quality vertical poster Unsplash image URL (coverUrl) and a landscape backdrop Unsplash image URL (backdropUrl) that matches this specific title.
For example, if the item is "Dune", suggest a stunning desert/sci-fi Unsplash image. If it's a specific book like "The Hobbit", suggest a cozy forest/fantasy image.
If there is no specific match, suggest a generic high-quality photo matching the atmosphere of "${title}"'s genre/medium.

Generate a JSON object containing:
- coverUrl: For visual thumbnail/poster cover URLs (image), you must use the following strict rules:
  - For Movies and TV Shows: Use real, verified TMDB poster path CDN URLs if you know them (e.g., "https://image.tmdb.org/t/p/w500/{poster_path}"). If you do not know the exact path, use a highly specific Unsplash photo search URL matching the visual style of the title, or a high-quality movie-theater concept Unsplash image (e.g., "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80").
  - For Books and Audiobooks: Use the public OpenLibrary Cover API URL if you can approximate the ISBN (e.g., "https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg") or use a highly thematic Unsplash photo (e.g., "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80").
  - For Podcasts: Use high-quality abstract, technology, microphone, or artistic studio photography from Unsplash (e.g., "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&q=80").
- backdropUrl: a high-quality relevant wide Unsplash photo URL (w=1200&auto=format&fit=crop&q=80)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coverUrl: { type: Type.STRING },
            backdropUrl: { type: Type.STRING }
          },
          required: ["coverUrl", "backdropUrl"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Failed to generate cover:", error);
    return res.json({
      coverUrl: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80`,
      backdropUrl: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80`
    });
  }
});

// Start API server and mount Vite middleware for dev mode
async function startServer() {
  app.get('/', (req, res) => {
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

  app.get('/api/status', (req, res) => {
    res.json({
      name: "Sequel / Chronicle Backend API",
      status: "online",
      version: "1.0.0",
      endpoints: [
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

  // 404 Handler for unmatched API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite middleware omitted:", e);
    }
  }

  if (process.env.NODE_ENV !== "test") {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`🚀 Sequel Backend API server running on port ${PORT}`);
    });
  }
}

startServer();

export { app };
export default app;
