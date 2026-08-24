import { adminDb } from "../config/firebase.js";
import { verifyJwtToken } from "../utils/jwt.js";

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
const inMemoryUserData = new Map<string, { 
  library: any[], 
  diary: any[], 
  customLists: any[], 
  customCollections?: any[], 
  dismissedRecommendations?: any[], 
  settings?: any 
}>();

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

  if (adminDb) {
    try {
      let snapshot: any = await withTimeout(adminDb.collection("users").where("usernameLowerCase", "==", identifier).limit(1).get());
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
  if (adminDb) {
    try {
      const doc: any = await withTimeout(adminDb.collection("users").doc(id).get());
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
  if (!token || typeof token !== "string") return null;

  // 1. Instant Stateless Cryptographic Verification (0ms, 0 network calls)
  const jwtUserId = verifyJwtToken(token);
  if (jwtUserId) {
    return jwtUserId;
  }

  // 2. In-Memory Cache fallback for legacy raw session tokens
  if (inMemorySessions.has(token)) {
    return inMemorySessions.get(token)!;
  }

  // 3. Firestore fallback for legacy non-JWT sessions
  if (adminDb) {
    try {
      const doc: any = await withTimeout(adminDb.collection("sessions").doc(token).get());
      if (doc.exists) {
        const userId = doc.data()?.userId;
        if (userId) {
          inMemorySessions.set(token, userId);
          return userId;
        }
      }
    } catch (err: any) {
      console.error("Firestore error (getUserIdByToken):", err.message);
    }
  }
  return null;
}

export async function getUserData(userId: string) {
  if (adminDb) {
    try {
      // 1. Check Granular Subcollections first
      const itemsSnap = await withTimeout(adminDb.collection("users").doc(userId).collection("items").get()) as any;
      const diarySnap = await withTimeout(adminDb.collection("users").doc(userId).collection("diary").get()) as any;
      const listsSnap = await withTimeout(adminDb.collection("users").doc(userId).collection("lists").get()) as any;
      const metaDoc = await withTimeout(adminDb.collection("users").doc(userId).collection("meta").doc("preferences").get()) as any;

      if (!itemsSnap.empty || !diarySnap.empty || !listsSnap.empty) {
        const library = itemsSnap.docs.map((d: any) => d.data());
        const diary = diarySnap.docs.map((d: any) => d.data());
        const customLists = listsSnap.docs.map((d: any) => d.data());
        const metaData = metaDoc.exists ? metaDoc.data() : {};

        return {
          library,
          diary,
          customLists,
          customCollections: metaData?.customCollections || [],
          dismissedRecommendations: metaData?.dismissedRecommendations || [],
          settings: metaData?.settings || {},
        };
      }

      // 2. Fallback to Legacy Monolithic user_data document
      const doc: any = await withTimeout(adminDb.collection("user_data").doc(userId).get());
      if (doc.exists) {
        const data = doc.data() || {};
        return {
          library: data.library || [],
          diary: data.diary || [],
          customLists: data.customLists || [],
          customCollections: data.customCollections || [],
          dismissedRecommendations: data.dismissedRecommendations || [],
          settings: data.settings || {}
        };
      }
    } catch (err: any) {
      console.error("Firestore error (getUserData):", err.message);
    }
  }
  return inMemoryUserData.get(userId) || { library: [], diary: [], customLists: [], customCollections: [], dismissedRecommendations: [], settings: {} };
}

export async function saveUserItem(userId: string, item: any) {
  if (!item || !item.id) return;
  const existing = inMemoryUserData.get(userId) || { library: [], diary: [], customLists: [], customCollections: [], dismissedRecommendations: [], settings: {} };
  const idx = existing.library.findIndex((i: any) => String(i.id) === String(item.id));
  if (idx >= 0) {
    existing.library[idx] = item;
  } else {
    existing.library.push(item);
  }
  inMemoryUserData.set(userId, existing);

  if (adminDb) {
    try {
      await withTimeout(
        adminDb.collection("users").doc(userId).collection("items").doc(String(item.id)).set(item, { merge: true })
      );
    } catch (err: any) {
      console.error("Firestore error (saveUserItem):", err.message);
    }
  }
}

export async function deleteUserItem(userId: string, itemId: string | number) {
  if (!itemId) return;
  const existing = inMemoryUserData.get(userId);
  if (existing) {
    existing.library = existing.library.filter((i: any) => String(i.id) !== String(itemId));
    inMemoryUserData.set(userId, existing);
  }

  if (adminDb) {
    try {
      await withTimeout(
        adminDb.collection("users").doc(userId).collection("items").doc(String(itemId)).delete()
      );
    } catch (err: any) {
      console.error("Firestore error (deleteUserItem):", err.message);
    }
  }
}

export async function saveUserDiaryEntry(userId: string, entry: any) {
  if (!entry || !entry.id) return;
  const existing = inMemoryUserData.get(userId) || { library: [], diary: [], customLists: [], customCollections: [], dismissedRecommendations: [], settings: {} };
  const idx = existing.diary.findIndex((d: any) => String(d.id) === String(entry.id));
  if (idx >= 0) {
    existing.diary[idx] = entry;
  } else {
    existing.diary.push(entry);
  }
  inMemoryUserData.set(userId, existing);

  if (adminDb) {
    try {
      await withTimeout(
        adminDb.collection("users").doc(userId).collection("diary").doc(String(entry.id)).set(entry, { merge: true })
      );
    } catch (err: any) {
      console.error("Firestore error (saveUserDiaryEntry):", err.message);
    }
  }
}

export async function deleteUserDiaryEntry(userId: string, entryId: string | number) {
  if (!entryId) return;
  const existing = inMemoryUserData.get(userId);
  if (existing) {
    existing.diary = existing.diary.filter((d: any) => String(d.id) !== String(entryId));
    inMemoryUserData.set(userId, existing);
  }

  if (adminDb) {
    try {
      await withTimeout(
        adminDb.collection("users").doc(userId).collection("diary").doc(String(entryId)).delete()
      );
    } catch (err: any) {
      console.error("Firestore error (deleteUserDiaryEntry):", err.message);
    }
  }
}

export async function saveUserData(
  userId: string,
  library?: any[],
  diary?: any[],
  customLists?: any[],
  dismissedRecommendations?: any[],
  customCollections?: any[],
  settings?: any
) {
  const existing = inMemoryUserData.get(userId) || {
    library: [],
    diary: [],
    customLists: [],
    customCollections: [],
    dismissedRecommendations: [],
    settings: {}
  };

  const updated = {
    library: library !== undefined ? library : existing.library,
    diary: diary !== undefined ? diary : existing.diary,
    customLists: customLists !== undefined ? customLists : existing.customLists,
    customCollections: customCollections !== undefined ? customCollections : existing.customCollections,
    dismissedRecommendations: dismissedRecommendations !== undefined ? dismissedRecommendations : existing.dismissedRecommendations,
    settings: settings !== undefined ? settings : existing.settings
  };
  inMemoryUserData.set(userId, updated as any);

  if (adminDb) {
    try {
      // 1. Maintain Legacy user_data document for small payloads (< 200 items to respect 1MB doc limit)
      const update: any = {};
      if (library !== undefined && library.length <= 200) update.library = library;
      if (diary !== undefined && diary.length <= 200) update.diary = diary;
      if (customLists !== undefined) update.customLists = customLists;
      if (customCollections !== undefined) update.customCollections = customCollections;
      if (dismissedRecommendations !== undefined) update.dismissedRecommendations = dismissedRecommendations;
      if (settings !== undefined) update.settings = settings;

      if (Object.keys(update).length > 0) {
        try {
          await withTimeout(adminDb.collection("user_data").doc(userId).set(update, { merge: true }), 10000);
        } catch (e: any) {
          console.warn("Legacy user_data doc write skipped/failed (likely large payload):", e.message);
        }
      }

      // 2. Safe chunked batch writes to subcollections (/users/{userId}/items, etc., max 400 ops per batch)
      const allOps: Array<{ ref: any; data: any }> = [];

      if (Array.isArray(library)) {
        for (const item of library) {
          if (item?.id) {
            const docRef = adminDb.collection("users").doc(userId).collection("items").doc(String(item.id));
            allOps.push({ ref: docRef, data: item });
          }
        }
      }
      if (Array.isArray(diary)) {
        for (const entry of diary) {
          if (entry?.id) {
            const docRef = adminDb.collection("users").doc(userId).collection("diary").doc(String(entry.id));
            allOps.push({ ref: docRef, data: entry });
          }
        }
      }
      if (Array.isArray(customLists)) {
        for (const list of customLists) {
          if (list?.id) {
            const docRef = adminDb.collection("users").doc(userId).collection("lists").doc(String(list.id));
            allOps.push({ ref: docRef, data: list });
          }
        }
      }
      const metaRef = adminDb.collection("users").doc(userId).collection("meta").doc("preferences");
      allOps.push({
        ref: metaRef,
        data: {
          customCollections: customCollections || [],
          dismissedRecommendations: dismissedRecommendations || [],
          settings: settings || {},
          updatedAt: new Date().toISOString(),
        }
      });

      // Commit in chunks of 400 operations to respect Firestore's 500 ops batch limit
      const CHUNK_SIZE = 400;
      for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
        const chunk = allOps.slice(i, i + CHUNK_SIZE);
        const batch = adminDb.batch();
        for (const op of chunk) {
          batch.set(op.ref, op.data, { merge: true });
        }
        await withTimeout(batch.commit(), 20000);
      }
      return;
    } catch (err: any) {
      console.error("Firestore error (saveUserData):", err.message);
      throw err;
    }
  }
}
