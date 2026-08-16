import { adminDb } from "../config/firebase.js";

export interface DbUser {
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

const inMemoryUsers = new Map<string, DbUser>();
const inMemorySessions = new Map<string, string>(); // token -> userId
const inMemoryUserData = new Map<string, { library: any[], diary: any[], customLists: any[] }>();

// Timeout helper to prevent infinite hangs on bad Firebase credentials
const withTimeout = <T>(promise: Promise<T>, ms = 8000): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Firestore request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
};

export async function findUserByUsernameOrEmail(identifier: string): Promise<DbUser | null> {
  identifier = identifier.toLowerCase().trim();
  const isAdmin = identifier === "pseudo-user@gmail.com";

  if (isAdmin) {
    let adminUser = inMemoryUsers.get("admin-pseudo-user");
    if (!adminUser) {
      adminUser = {
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
    }
    return adminUser;
  }

  if (adminDb) {
    try {
      let snapshot = await withTimeout(adminDb.collection("users").where("usernameLowerCase", "==", identifier).limit(1).get());
      if (!snapshot.empty) return snapshot.docs[0].data() as DbUser;
      snapshot = await withTimeout(adminDb.collection("users").where("emailLowerCase", "==", identifier).limit(1).get());
      if (!snapshot.empty) return snapshot.docs[0].data() as DbUser;
    } catch (err: any) {
      console.error("Firestore error (findUserByUsernameOrEmail):", err.message);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.username.toLowerCase() === identifier || (user.email && user.email.toLowerCase() === identifier)) {
      return user;
    }
  }

  return null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
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
      const doc = await withTimeout(adminDb.collection("users").doc(id).get());
      if (doc.exists) return doc.data() as DbUser;
    } catch (err: any) {
      console.error("Firestore error (findUserById):", err.message);
    }
  }
  return inMemoryUsers.get(id) || null;
}

export async function saveUser(user: DbUser) {
  inMemoryUsers.set(user.id, user);
  if (adminDb) {
    try {
      const cleanUser: Record<string, any> = {};
      for (const [key, val] of Object.entries(user)) {
        if (val !== undefined) {
          cleanUser[key] = val;
        }
      }
      cleanUser.usernameLowerCase = (user.username || "").toLowerCase();
      cleanUser.emailLowerCase = user.email ? user.email.toLowerCase() : null;
      if (!cleanUser.email) {
        cleanUser.email = "";
      }

      await withTimeout(adminDb.collection("users").doc(user.id).set(cleanUser, { merge: true }));
      return;
    } catch (err: any) {
      console.error("Firestore error (saveUser):", err.message);
    }
  }
}

export async function createSession(userId: string, token: string) {
  inMemorySessions.set(token, userId);
  if (adminDb) {
    try {
      await withTimeout(adminDb.collection("sessions").doc(token).set({ userId }));
      return;
    } catch (err: any) {
      console.error("Firestore error (createSession):", err.message);
    }
  }
}

export async function deleteSession(token: string) {
  inMemorySessions.delete(token);
  if (adminDb) {
    try {
      await withTimeout(adminDb.collection("sessions").doc(token).delete());
      return;
    } catch (err: any) {
      console.error("Firestore error (deleteSession):", err.message);
    }
  }
}

export async function getUserIdByToken(token: string): Promise<string | null> {
  if (inMemorySessions.has(token)) {
    return inMemorySessions.get(token)!;
  }
  if (adminDb) {
    try {
      const doc = await withTimeout(adminDb.collection("sessions").doc(token).get());
      if (doc.exists) return doc.data()?.userId;
    } catch (err: any) {
      console.error("Firestore error (getUserIdByToken):", err.message);
    }
  }
  return null;
}

export async function getUserData(userId: string) {
  if (adminDb) {
    try {
      const doc = await withTimeout(adminDb.collection("user_data").doc(userId).get());
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

export async function saveUserData(userId: string, library?: any[], diary?: any[], customLists?: any[]) {
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
      await withTimeout(adminDb.collection("user_data").doc(userId).set(update, { merge: true }));
      return;
    } catch (err: any) {
      console.error("Firestore error (saveUserData):", err.message);
    }
  }
}
