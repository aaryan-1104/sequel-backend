import { Router } from "express";
import crypto from "crypto";
import { 
  DbUser, 
  findUserByUsernameOrEmail, 
  findUserById, 
  saveUser, 
  createSession, 
  deleteSession, 
  getUserIdByToken, 
  getUserData, 
  getPaginatedLibrary,
  mergeUserData,
  saveUserData,
  saveUserItem,
  deleteUserItem,
  saveUserDiaryEntry,
  deleteUserDiaryEntry
} from "../services/db.js";
import { signJwtToken } from "../utils/jwt.js";
import { adminAuth, adminDb } from "../config/firebase.js";

const router = Router();

import util from "util";

const pbkdf2Async = util.promisify(crypto.pbkdf2);
const PBKDF2_ITERATIONS = 600000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

// OWASP-compliant Password utility (600,000 rounds of PBKDF2-HMAC-SHA512)
async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await pbkdf2Async(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return { salt, hash: derivedKey.toString("hex") };
}

async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  if (!salt || !hash) return false;
  try {
    const checkKey = await pbkdf2Async(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
    const checkHex = checkKey.toString("hex");
    if (hash.length === checkHex.length && crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(checkHex, "hex"))) {
      return true;
    }
    // Backward-compatibility check for legacy 1,000-iteration hashes
    const legacyKey = await pbkdf2Async(password, salt, 1000, PBKDF2_KEYLEN, PBKDF2_DIGEST);
    const legacyHex = legacyKey.toString("hex");
    if (hash.length === legacyHex.length && crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(legacyHex, "hex"))) {
      return true;
    }
  } catch (err) {
    console.error("Password verification error:", err);
  }
  return false;
}

// REGISTER ENDPOINT
router.post("/register", async (req, res) => {
  const { username, password, email, avatar, bio, genres } = req.body;
  
  const rawEmail = (email || (username && username.includes('@') ? username : '')).trim();
  if (!rawEmail || !rawEmail.includes('@')) {
    return res.status(400).json({ error: "A valid email address is required for account registration and verification." });
  }

  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  }

  // Derive username from part before '@' if username is an email or empty
  const derivedUsername = (username && !username.includes('@')) ? username.trim() : rawEmail.split('@')[0];

  const existingUser = await findUserByUsernameOrEmail(rawEmail);
  if (existingUser) {
    return res.status(400).json({ error: "This email address is already registered." });
  }

  const { salt, hash } = await hashPassword(password);
  const userId = `user-${Date.now()}`;
  const newUser: DbUser = {
    id: userId,
    username: derivedUsername,
    email: rawEmail,
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

  // Create stateless signed JWT session token
  const token = signJwtToken(userId);
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
router.post("/login", async (req, res) => {
  const { username, password, idToken } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username/Email and password are required." });
  }

  let user = await findUserByUsernameOrEmail(username);

  let isPasswordValid = false;

  // 1. If client provided a Firebase ID token (e.g. authenticated via Firebase client or after password reset)
  if (idToken && adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const decodedEmail = decoded.email?.toLowerCase().trim();
      const inputEmail = username.toLowerCase().trim();
      if (decodedEmail && (decodedEmail === inputEmail || (user && user.email?.toLowerCase().trim() === decodedEmail))) {
        isPasswordValid = true;
        // If user exists, sync new password hash to database so both systems remain in sync
        if (user) {
          const { salt, hash } = await hashPassword(password);
          user.salt = salt;
          user.hash = hash;
          if (decoded.uid && user.id !== decoded.uid) {
            await mergeUserData(user.id, decoded.uid);
            user.id = decoded.uid;
          }
          await saveUser(user);
        } else {
          // If user exists in Firebase Auth but not yet in DB, create record
          const userId = decoded.uid || `user-${Date.now()}`;
          const derivedUsername = decoded.name || inputEmail.split('@')[0] || 'User';
          const { salt, hash } = await hashPassword(password);
          user = {
            id: userId,
            username: derivedUsername,
            email: decodedEmail,
            salt,
            hash,
            avatar: decoded.picture || "🍿",
            bio: "",
            genres: "",
            createdAt: new Date().toISOString()
          };
          await saveUser(user);
          await saveUserData(user.id, [], [], []);
        }
      }
    } catch (err: any) {
      console.warn("Firebase ID token verification failed in /login:", err.message);
    }
  }

  // 2. Fallback to standard custom password hash verification if ID token was not verified
  if (!isPasswordValid && user) {
    isPasswordValid = await verifyPassword(password, user.salt, user.hash);
  }

  if (!user || !isPasswordValid) {
    return res.status(401).json({ error: "Invalid username, email, or password." });
  }

  // Create stateless signed JWT session token
  const token = signJwtToken(user.id);
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

// GOOGLE AUTH / FIRESTORE SIGN-IN ENDPOINT
router.post("/google", async (req, res) => {
  const { idToken, uid: clientUid, email: clientEmail, displayName: clientDisplayName, photoURL: clientPhotoURL } = req.body;

  let verifiedUid: string | null = null;
  let verifiedEmail: string | null = null;
  let verifiedDisplayName: string | null = null;
  let verifiedPhotoURL: string | null = null;

  if (idToken && adminAuth) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      verifiedUid = decodedToken.uid;
      verifiedEmail = decodedToken.email || null;
      verifiedDisplayName = decodedToken.name || null;
      verifiedPhotoURL = decodedToken.picture || null;
    } catch (err: any) {
      console.error("Firebase ID Token verification failed:", err.message);
      return res.status(401).json({ error: "Invalid or expired Firebase ID token." });
    }
  } else {
    // In environments where Firebase Admin is not initialized, fallback to client-supplied credentials
    if (adminAuth && process.env.NODE_ENV === "production") {
      return res.status(401).json({ error: "Firebase ID token is required for authentication." });
    }
    verifiedUid = clientUid || null;
    verifiedEmail = clientEmail || null;
    verifiedDisplayName = clientDisplayName || null;
    verifiedPhotoURL = clientPhotoURL || null;
  }

  if (!verifiedUid && !verifiedEmail) {
    return res.status(400).json({ error: "Google credentials are missing or invalid." });
  }

  try {
    let user: DbUser | null = null;
    if (verifiedEmail) {
      user = await findUserByUsernameOrEmail(verifiedEmail);
    }
    if (!user && verifiedUid) {
      user = await findUserById(verifiedUid);
    }

    if (!user) {
      const userId = verifiedUid || `google-${Date.now()}`;
      const username = verifiedDisplayName || (verifiedEmail ? verifiedEmail.split('@')[0] : 'User');
      user = {
        id: userId,
        username: username.trim(),
        email: verifiedEmail ? verifiedEmail.trim() : undefined,
        salt: "",
        hash: "",
        avatar: verifiedPhotoURL || "🍿",
        bio: "Signed in via Google",
        genres: "Movies, Series, Books",
        createdAt: new Date().toISOString()
      };
      await saveUser(user);
      await saveUserData(user.id, [], [], []);
    } else {
      if (verifiedUid && user.id !== verifiedUid) {
        await mergeUserData(user.id, verifiedUid);
        user.id = verifiedUid;
      }
      let updated = false;
      if (verifiedPhotoURL && (!user.avatar || user.avatar === "🍿")) {
        user.avatar = verifiedPhotoURL;
        updated = true;
      }
      if (verifiedDisplayName && (!user.username || user.username === user.email)) {
        user.username = verifiedDisplayName;
        updated = true;
      }
      if (updated || (verifiedUid && user.id === verifiedUid)) {
        await saveUser(user);
      }
    }

    const token = signJwtToken(user.id);
    await createSession(user.id, token);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email || "",
        avatar: user.avatar || "🍿",
        bio: user.bio || "",
        genres: user.genres || "",
        tmdbSessionId: user.tmdbSessionId || "",
        tmdbAccountId: user.tmdbAccountId || "",
        tmdbAccessToken: user.tmdbAccessToken || "",
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    console.error("Google auth endpoint error:", err);
    return res.status(500).json({ error: "Google authentication failed on server." });
  }
});

// GET PROFILE FROM SESSION
router.post("/me", async (req, res) => {
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
router.post("/logout", async (req, res) => {
  const { token } = req.body;
  if (token) {
    await deleteSession(token);
  }
  return res.json({ success: true });
});

// UPDATE PROFILE
router.post("/update-profile", async (req, res) => {
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

  if (email !== undefined) {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return res.status(400).json({ error: "A valid email address is required for profile verification." });
    }
    const existing = await findUserByUsernameOrEmail(trimmedEmail);
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: "Email is already taken by another account." });
    }
    user.email = trimmedEmail;
  }

  if (username && username.trim() !== "") {
    const existing = await findUserByUsernameOrEmail(username);
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: "Username is already taken by another account." });
    }
    user.username = username.trim();
  } else if (user.email) {
    user.username = user.email.split('@')[0];
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

// SYNC DATA GET (Supports Partitioned / Scoped Hydration)
router.post("/sync-get", async (req, res) => {
  const { token, scope = "all", fields, page, limit, type, status, search, sortBy } = req.body;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  // 1. If explicit pagination requested (e.g. page=1, limit=50)
  if (page !== undefined || limit !== undefined) {
    const paginated = await getPaginatedLibrary(userId, { page, limit, type, status, search, sortBy });
    const fullData = await getUserData(userId);
    return res.json({
      library: paginated.items,
      pagination: paginated.pagination,
      customCollections: fullData.customCollections || [],
      dismissedRecommendations: fullData.dismissedRecommendations || [],
      settings: fullData.settings || {},
      customLists: fullData.customLists || []
    });
  }

  const data: any = await getUserData(userId);

  // If explicit fields requested
  if (Array.isArray(fields) && fields.length > 0) {
    const filtered: Record<string, any> = {};
    for (const f of fields) {
      if (data[f] !== undefined) filtered[f] = data[f];
    }
    return res.json(filtered);
  }

  // Scoped partitioning to eliminate unnecessary network payload on dashboard
  if (scope === "dashboard") {
    return res.json({
      library: data.library || [],
      customCollections: data.customCollections || [],
      dismissedRecommendations: data.dismissedRecommendations || [],
      settings: data.settings || {}
    });
  }

  if (scope === "diary") {
    return res.json({
      diary: data.diary || []
    });
  }

  if (scope === "lists") {
    return res.json({
      customLists: data.customLists || []
    });
  }

  return res.json(data);
});

// DEDICATED PAGINATED LIBRARY ENDPOINT
router.post("/library", async (req, res) => {
  const { token, page = 1, limit = 50, type, status, search, sortBy } = req.body;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  const result = await getPaginatedLibrary(userId, { page, limit, type, status, search, sortBy });
  return res.json(result);
});

// SYNC DATA SAVE
router.post("/sync-save", async (req, res) => {
  try {
    const { token, library, diary, customLists, dismissedRecommendations, customCollections, settings } = req.body;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const userId = await getUserIdByToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid session." });
    }

    await saveUserData(userId, library, diary, customLists, dismissedRecommendations, customCollections, settings);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Sync save failed:", err);
    return res.status(500).json({ error: err?.message || "Failed to save user data." });
  }
});

// ATOMIC ITEM UPSERT (/users/{userId}/items/{itemId})
router.post("/sync-item", async (req, res) => {
  const { token, item } = req.body;
  if (!token || !item || !item.id) {
    return res.status(400).json({ error: "Invalid payload. Token and item with ID are required." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  await saveUserItem(userId, item);
  return res.json({ success: true });
});

// ATOMIC ITEM DELETE
router.post("/sync-item-delete", async (req, res) => {
  const { token, itemId } = req.body;
  if (!token || !itemId) {
    return res.status(400).json({ error: "Invalid payload. Token and itemId are required." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  await deleteUserItem(userId, itemId);
  return res.json({ success: true });
});

// ATOMIC DIARY UPSERT
router.post("/sync-diary", async (req, res) => {
  const { token, entry } = req.body;
  if (!token || !entry || !entry.id) {
    return res.status(400).json({ error: "Invalid payload. Token and entry with ID are required." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  await saveUserDiaryEntry(userId, entry);
  return res.json({ success: true });
});

// ATOMIC DIARY DELETE
router.post("/sync-diary-delete", async (req, res) => {
  const { token, entryId } = req.body;
  if (!token || !entryId) {
    return res.status(400).json({ error: "Invalid payload. Token and entryId are required." });
  }

  const userId = await getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid session." });
  }

  await deleteUserDiaryEntry(userId, entryId);
  return res.json({ success: true });
});

export default router;
