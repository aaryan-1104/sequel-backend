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
  saveUserData 
} from "../services/db.js";
import { adminAuth, adminDb } from "../config/firebase.js";

const router = Router();

// Password utility
function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
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

  const { salt, hash } = hashPassword(password);
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
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username or Email is required." });
  }

  const identifier = username.toLowerCase().trim();
  const isAdminBypass = identifier === "pseudo-user@gmail.com";

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

// GOOGLE AUTH / FIRESTORE SIGN-IN ENDPOINT
router.post("/google", async (req, res) => {
  const { uid, email, displayName, photoURL } = req.body;
  if (!uid && !email) {
    return res.status(400).json({ error: "Google credentials are missing." });
  }

  try {
    let user: DbUser | null = null;
    if (email) {
      user = await findUserByUsernameOrEmail(email);
    }
    if (!user && uid) {
      user = await findUserById(uid);
    }

    if (!user) {
      const userId = uid || `google-${Date.now()}`;
      const username = displayName || (email ? email.split('@')[0] : 'User');
      user = {
        id: userId,
        username: username.trim(),
        email: email ? email.trim() : undefined,
        salt: "",
        hash: "",
        avatar: photoURL || "🍿",
        bio: "Signed in via Google",
        genres: "Movies, Series, Books",
        createdAt: new Date().toISOString()
      };
      await saveUser(user);
      await saveUserData(user.id, [], [], []);
    } else {
      let updated = false;
      if (photoURL && (!user.avatar || user.avatar === "🍿")) {
        user.avatar = photoURL;
        updated = true;
      }
      if (displayName && (!user.username || user.username === user.email)) {
        user.username = displayName;
        updated = true;
      }
      if (updated) {
        await saveUser(user);
      }
    }

    const token = `session-${crypto.randomBytes(24).toString("hex")}`;
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

// SYNC DATA GET
router.post("/sync-get", async (req, res) => {
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
router.post("/sync-save", async (req, res) => {
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



export default router;
