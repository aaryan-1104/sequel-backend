import { adminDb } from "../config/firebase.js";
import { verifyJwtToken } from "../utils/jwt.js";
import { db, pool, isDatabaseConfigured } from "../db/index.js";
import { users, mediaItems, diaryEntries, customLists, userSettings, sessions } from "../db/schema.js";
import { eq, or, sql, and } from "drizzle-orm";

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
const inMemorySessions = new Map<string, string>();
const inMemoryUserData = new Map<string, { 
  library: any[], 
  diary: any[], 
  customLists: any[], 
  customCollections?: any[], 
  dismissedRecommendations?: any[], 
  settings?: any 
}>();

const userDataCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western", 10759: "Action & Adventure",
  10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics"
};

export async function enrichItemFromTmdb(item: any): Promise<any> {
  if (!item || (item.type !== 'tv' && item.type !== 'movie')) return item;
  if (item.tmdbId && item.poster && item.backdrop) return item;

  const rawKey = process.env.TMDB_API_KEY || '';
  const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
  const isBearer = tmdbKey.length > 40;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json',
    ...(isBearer ? { 'Authorization': `Bearer ${tmdbKey}` } : {})
  };

  const tmdbType = item.type === 'movie' ? 'movie' : 'tv';
  let match: any = null;

  // 1. Try TVDB ID resolution
  if (item.tvdbId) {
    const cleanTvdbId = String(item.tvdbId).replace(/\D/g, '');
    if (cleanTvdbId) {
      try {
        const findUrl = `https://api.tmdb.org/3/find/${cleanTvdbId}?external_source=tvdb_id&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
        const res = await fetch(findUrl, { headers, signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          match = data.tv_results?.[0] || data.movie_results?.[0];
        }
      } catch (e) {}
    }
  }

  // 2. Try Title Search fallback
  if (!match && item.title) {
    try {
      const cleanTitle = (item.title || '').replace(/\s*\(\d{4}\)$/, '').trim();
      const searchUrl = `https://api.tmdb.org/3/search/${tmdbType}?query=${encodeURIComponent(cleanTitle)}&language=en-US&page=1${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
      const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        match = data.results?.[0];
      }
    } catch (e) {}
  }

  if (match && match.id) {
    const genreNames = Array.isArray(match.genre_ids) 
      ? match.genre_ids.map((gid: number) => TMDB_GENRES[gid]).filter(Boolean)
      : [];

    return {
      ...item,
      tmdbId: `tmdb-${match.id}`,
      poster: item.poster || item.coverUrl || (match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null),
      backdrop: item.backdrop || (match.backdrop_path ? `https://image.tmdb.org/t/p/w1280${match.backdrop_path}` : null),
      releaseDate: item.releaseDate || match.first_air_date || match.release_date || null,
      genres: (item.genres && item.genres.length > 0) ? item.genres : genreNames,
      notes: item.notes || match.overview || null,
    };
  }

  return item;
}

export async function findUserByUsernameOrEmail(identifier: string): Promise<DbUser | null> {
  identifier = identifier.toLowerCase().trim();

  if (isDatabaseConfigured() && db) {
    try {
      const rows = await db.select().from(users).where(
        or(
          sql`lower(${users.email}) = ${identifier}`,
          sql`lower(${users.username}) = ${identifier}`
        )
      ).limit(1);
      if (rows.length > 0) {
        const u = rows[0];
        return {
          id: u.id,
          username: u.username,
          email: u.email || "",
          salt: u.salt || "",
          hash: u.hash || "",
          avatar: u.avatar || "🍿",
          bio: u.bio || "",
          genres: u.genres || "",
          tmdbSessionId: u.tmdbSessionId || "",
          tmdbAccountId: u.tmdbAccountId || "",
          tmdbAccessToken: u.tmdbAccessToken || "",
          createdAt: u.createdAt
        };
      }
    } catch (err: any) {
      console.error("PostgreSQL error (findUserByUsernameOrEmail):", err.message);
    }
  }

  if (adminDb) {
    try {
      let snapshot: any = await adminDb.collection("users").where("usernameLowerCase", "==", identifier).limit(1).get();
      if (!snapshot.empty) return snapshot.docs[0].data() as DbUser;
      snapshot = await adminDb.collection("users").where("emailLowerCase", "==", identifier).limit(1).get();
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
  if (isDatabaseConfigured() && db) {
    try {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (rows.length > 0) {
        const u = rows[0];
        return {
          id: u.id,
          username: u.username,
          email: u.email || "",
          salt: u.salt || "",
          hash: u.hash || "",
          avatar: u.avatar || "🍿",
          bio: u.bio || "",
          genres: u.genres || "",
          tmdbSessionId: u.tmdbSessionId || "",
          tmdbAccountId: u.tmdbAccountId || "",
          tmdbAccessToken: u.tmdbAccessToken || "",
          createdAt: u.createdAt
        };
      }
    } catch (err: any) {
      console.error("PostgreSQL error (findUserById):", err.message);
    }
  }

  if (adminDb) {
    try {
      const doc: any = await adminDb.collection("users").doc(id).get();
      if (doc.exists) return doc.data() as DbUser;
    } catch (err: any) {
      console.error("Firestore error (findUserById):", err.message);
    }
  }
  return inMemoryUsers.get(id) || null;
}

export async function saveUser(user: DbUser) {
  inMemoryUsers.set(user.id, user);

  if (isDatabaseConfigured() && db) {
    try {
      await db.insert(users).values({
        id: user.id,
        username: user.username,
        email: user.email || null,
        salt: user.salt || "",
        hash: user.hash || "",
        avatar: user.avatar || "🍿",
        bio: user.bio || "",
        genres: user.genres || "",
        tmdbSessionId: user.tmdbSessionId || "",
        tmdbAccountId: user.tmdbAccountId || "",
        tmdbAccessToken: user.tmdbAccessToken || "",
        createdAt: user.createdAt || new Date().toISOString()
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          username: user.username,
          email: user.email || null,
          salt: user.salt || "",
          hash: user.hash || "",
          avatar: user.avatar || "🍿",
          bio: user.bio || "",
          genres: user.genres || "",
          tmdbSessionId: user.tmdbSessionId || "",
          tmdbAccountId: user.tmdbAccountId || "",
          tmdbAccessToken: user.tmdbAccessToken || "",
        }
      });
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (saveUser):", err.message);
    }
  }

  if (adminDb) {
    try {
      const cleanUser: Record<string, any> = {};
      for (const [key, val] of Object.entries(user)) {
        if (val !== undefined) cleanUser[key] = val;
      }
      cleanUser.usernameLowerCase = (user.username || "").toLowerCase();
      cleanUser.emailLowerCase = user.email ? user.email.toLowerCase() : null;
      if (!cleanUser.email) cleanUser.email = "";

      await adminDb.collection("users").doc(user.id).set(cleanUser, { merge: true });
      return;
    } catch (err: any) {
      console.error("Firestore error (saveUser):", err.message);
    }
  }
}

export async function createSession(userId: string, token: string) {
  inMemorySessions.set(token, userId);

  if (isDatabaseConfigured() && db) {
    try {
      await db.insert(sessions).values({
        token,
        userId,
        createdAt: new Date().toISOString()
      }).onConflictDoNothing();
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (createSession):", err.message);
    }
  }

  if (adminDb) {
    try {
      await adminDb.collection("sessions").doc(token).set({ userId });
    } catch (err: any) {
      console.error("Firestore error (createSession):", err.message);
    }
  }
}

export async function deleteSession(token: string) {
  inMemorySessions.delete(token);

  if (isDatabaseConfigured() && db) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (deleteSession):", err.message);
    }
  }

  if (adminDb) {
    try {
      await adminDb.collection("sessions").doc(token).delete();
    } catch (err: any) {
      console.error("Firestore error (deleteSession):", err.message);
    }
  }
}

export async function getUserIdByToken(token: string): Promise<string | null> {
  const memUserId = inMemorySessions.get(token);
  if (memUserId) return memUserId;

  const jwtVerifiedId = verifyJwtToken(token);
  if (jwtVerifiedId) return jwtVerifiedId;

  if (isDatabaseConfigured() && db) {
    try {
      const rows = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.token, token)).limit(1);
      if (rows.length > 0) {
        const userId = rows[0].userId;
        inMemorySessions.set(token, userId);
        return userId;
      }
    } catch (err: any) {
      console.error("PostgreSQL error (getUserIdByToken):", err.message);
    }
  }

  if (adminDb) {
    try {
      const doc: any = await adminDb.collection("sessions").doc(token).get();
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
  const cached = userDataCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  if (isDatabaseConfigured() && db) {
    try {
      const [items, diary, lists, settingsRows] = await Promise.all([
        db.select().from(mediaItems).where(eq(mediaItems.userId, userId)),
        db.select().from(diaryEntries).where(eq(diaryEntries.userId, userId)),
        db.select().from(customLists).where(eq(customLists.userId, userId)),
        db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
      ]);

      const settings = settingsRows.length > 0 ? settingsRows[0] : null;

      const result = {
        library: items.map(i => ({
          ...i,
          coverUrl: i.poster || (i as any).coverUrl || "",
          backdropUrl: i.backdrop || (i as any).backdropUrl || "",
          genres: i.genres || [],
          tags: i.tags || [],
          watchedEpisodes: i.watchedEpisodes || i.tvSpecifics?.watchedEpisodes || {},
        })),
        diary: diary.map(d => ({
          id: d.id,
          mediaId: d.itemId || (d as any).mediaId || "",
          mediaTitle: d.title || (d as any).mediaTitle || "Untitled",
          mediaType: d.mediaType || "movie",
          coverUrl: d.poster || (d as any).coverUrl || "",
          rating: d.rating ?? undefined,
          date: d.date || d.createdAt || "",
          note: d.thoughts || (d as any).note || "",
          activityType: d.entryType || (d as any).activityType || "noted",
          isRewatch: Boolean(d.isRewatch),
          createdAt: d.createdAt || d.date || "",
          updatedAt: (d as any).updatedAt || d.createdAt || d.date || ""
        })),
        customLists: lists.map(l => ({ ...l, itemIds: l.itemIds || [] })),
        customCollections: (settings?.customCollections as any[]) || [],
        dismissedRecommendations: (settings?.dismissedRecommendations as any[]) || [],
        settings: (settings?.settings as any) || {}
      };

      userDataCache.set(userId, { data: result, timestamp: Date.now() });
      return result;
    } catch (err: any) {
      console.error("PostgreSQL error (getUserData):", err.message);
    }
  }

  if (adminDb) {
    try {
      const doc: any = await adminDb.collection("user_data").doc(userId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        const result = {
          library: data.library || [],
          diary: data.diary || [],
          customLists: data.customLists || [],
          customCollections: data.customCollections || [],
          dismissedRecommendations: data.dismissedRecommendations || [],
          settings: data.settings || {}
        };
        userDataCache.set(userId, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (err: any) {
      console.error("Firestore error (getUserData):", err.message);
    }
  }

  return inMemoryUserData.get(userId) || { library: [], diary: [], customLists: [], customCollections: [], dismissedRecommendations: [], settings: {} };
}

export async function saveUserItem(userId: string, item: any) {
  if (!item || !item.id) return;
  userDataCache.delete(userId);

  if (isDatabaseConfigured() && db) {
    try {
      const incomingId = String(item.id);
      const incomingSourceId = item.sourceId ? String(item.sourceId) : null;
      const incomingTvdbId = item.tvdbId ? String(item.tvdbId) : null;
      const incomingTmdbId = item.tmdbId ? String(item.tmdbId).replace(/^(tmdb-)+/, '') : null;

      // Smart de-duplication: check if an existing row already exists for this user by ID, sourceId, tvdbId, or tmdbId
      let targetId = incomingId;
      if (pool) {
        try {
          const existingMatch = await pool.query(
            `SELECT id FROM media_items 
             WHERE user_id = $1 AND (
               id = $2 OR 
               (source_id IS NOT NULL AND source_id = $3) OR 
               (tvdb_id IS NOT NULL AND tvdb_id = $4) OR 
               (tmdb_id IS NOT NULL AND tmdb_id = $5)
             ) LIMIT 1;`,
            [userId, incomingId, incomingSourceId, incomingTvdbId, incomingTmdbId]
          );

          if (existingMatch.rows.length > 0) {
            targetId = existingMatch.rows[0].id;
          }
        } catch (matchErr) {
          // Non-blocking fallback
        }
      }

      await db.insert(mediaItems).values({
        id: targetId,
        userId,
        sourceId: incomingSourceId,
        tmdbId: incomingTmdbId,
        tvdbId: incomingTvdbId,
        imdbId: item.imdbId ? String(item.imdbId) : null,
        title: item.title || "Untitled",
        type: item.type || "movie",
        status: item.status || "planned",
        rating: typeof item.rating === "number" ? item.rating : null,
        favorite: Boolean(item.favorite),
        poster: item.coverUrl || item.poster || null,
        backdrop: item.backdrop || null,
        releaseDate: item.releaseDate || item.firstAirDate || null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        creators: Array.isArray(item.creators) ? item.creators : [],
        platforms: Array.isArray(item.platforms) ? item.platforms : [],
        runtime: item.runtime || null,
        progress: typeof item.progress === "number" ? item.progress : null,
        notes: item.notes || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        userProgress: item.userProgress || null,
        totalEpisodes: typeof item.totalEpisodes === "number" ? item.totalEpisodes : null,
        watchedEpisodes: item.watchedEpisodes || item.tvSpecifics?.watchedEpisodes || {},
        movieSpecifics: item.movieSpecifics || null,
        tvSpecifics: item.tvSpecifics || null,
        bookSpecifics: item.bookSpecifics || null,
        rawMetadata: item.rawMetadata || null,
        addedAt: item.addedAt || new Date().toISOString(),
        lastUpdatedAt: item.lastUpdatedAt || new Date().toISOString(),
      }).onConflictDoUpdate({
        target: [mediaItems.userId, mediaItems.id],
        set: {
          tmdbId: incomingTmdbId,
          tvdbId: incomingTvdbId,
          status: item.status || "planned",
          rating: typeof item.rating === "number" ? item.rating : null,
          favorite: Boolean(item.favorite),
          poster: item.coverUrl || item.poster || null,
          backdrop: item.backdrop || null,
          notes: item.notes || null,
          genres: Array.isArray(item.genres) ? item.genres : [],
          creators: Array.isArray(item.creators) ? item.creators : [],
          platforms: Array.isArray(item.platforms) ? item.platforms : [],
          runtime: item.runtime || null,
          progress: typeof item.progress === "number" ? item.progress : null,
          tags: Array.isArray(item.tags) ? item.tags : [],
          userProgress: item.userProgress || null,
          watchedEpisodes: item.watchedEpisodes || item.tvSpecifics?.watchedEpisodes || {},
          movieSpecifics: item.movieSpecifics || null,
          tvSpecifics: item.tvSpecifics || null,
          bookSpecifics: item.bookSpecifics || null,
          lastUpdatedAt: item.lastUpdatedAt || new Date().toISOString(),
        }
      });
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (saveUserItem):", err.message);
    }
  }

  if (adminDb) {
    try {
      await adminDb.collection("users").doc(userId).collection("items").doc(String(item.id)).set(item, { merge: true });
    } catch (err: any) {
      console.error("Firestore error (saveUserItem):", err.message);
    }
  }
}

export async function deleteUserItem(userId: string, itemId: string | number) {
  if (!itemId) return;
  userDataCache.delete(userId);

  if (isDatabaseConfigured() && db) {
    try {
      await db.delete(mediaItems).where(
        and(eq(mediaItems.userId, userId), eq(mediaItems.id, String(itemId)))
      );
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (deleteUserItem):", err.message);
    }
  }

  if (adminDb) {
    try {
      await adminDb.collection("users").doc(userId).collection("items").doc(String(itemId)).delete();
    } catch (err: any) {
      console.error("Firestore error (deleteUserItem):", err.message);
    }
  }
}

export async function saveUserDiaryEntry(userId: string, entry: any) {
  if (!entry || !entry.id) return;
  userDataCache.delete(userId);

  if (isDatabaseConfigured() && db) {
    try {
      await db.insert(diaryEntries).values({
        id: String(entry.id),
        userId,
        itemId: entry.mediaId || entry.itemId ? String(entry.mediaId || entry.itemId) : null,
        mediaType: entry.mediaType || "movie",
        title: entry.mediaTitle || entry.title || "Untitled",
        poster: entry.coverUrl || entry.poster || null,
        rating: typeof entry.rating === "number" ? entry.rating : null,
        date: entry.date || new Date().toISOString(),
        thoughts: entry.note || entry.thoughts || "",
        entryType: entry.activityType || entry.entryType || "progress",
        seasonNumber: typeof entry.seasonNumber === "number" ? entry.seasonNumber : null,
        episodeNumber: typeof entry.episodeNumber === "number" ? entry.episodeNumber : null,
        isRewatch: Boolean(entry.isRewatch),
        createdAt: entry.createdAt || entry.date || new Date().toISOString()
      }).onConflictDoUpdate({
        target: [diaryEntries.userId, diaryEntries.id],
        set: {
          title: entry.mediaTitle || entry.title || "Untitled",
          poster: entry.coverUrl || entry.poster || null,
          thoughts: entry.note || entry.thoughts || "",
          rating: typeof entry.rating === "number" ? entry.rating : null,
          date: entry.date || new Date().toISOString(),
          entryType: entry.activityType || entry.entryType || "progress",
          isRewatch: Boolean(entry.isRewatch),
        }
      });
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (saveUserDiaryEntry):", err.message);
    }
  }

  if (adminDb) {
    try {
      await adminDb.collection("users").doc(userId).collection("diary").doc(String(entry.id)).set(entry, { merge: true });
    } catch (err: any) {
      console.error("Firestore error (saveUserDiaryEntry):", err.message);
    }
  }
}

export async function deleteUserDiaryEntry(userId: string, entryId: string | number) {
  if (!entryId) return;
  userDataCache.delete(userId);

  if (isDatabaseConfigured() && db) {
    try {
      await db.delete(diaryEntries).where(
        and(eq(diaryEntries.userId, userId), eq(diaryEntries.id, String(entryId)))
      );
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (deleteUserDiaryEntry):", err.message);
    }
  }

  if (adminDb) {
    try {
      await adminDb.collection("users").doc(userId).collection("diary").doc(String(entryId)).delete();
    } catch (err: any) {
      console.error("Firestore error (deleteUserDiaryEntry):", err.message);
    }
  }
}

export async function saveUserCustomLists(userId: string, lists: any[]) {
  userDataCache.delete(userId);
  if (!Array.isArray(lists)) return;

  if (isDatabaseConfigured() && db) {
    try {
      const activeIds = new Set<string>();
      for (const list of lists) {
        if (!list || !list.id) continue;
        const sId = String(list.id);
        activeIds.add(sId);
        await db.insert(customLists).values({
          id: sId,
          userId,
          name: list.name || "Untitled List",
          description: list.description || "",
          isTmdbSync: Boolean(list.isTmdbSync),
          tmdbListId: list.tmdbListId ? String(list.tmdbListId) : null,
          coverImage: list.coverImage || null,
          itemIds: Array.isArray(list.itemIds) ? list.itemIds : [],
          createdAt: list.createdAt || new Date().toISOString(),
          updatedAt: list.updatedAt || new Date().toISOString()
        }).onConflictDoUpdate({
          target: [customLists.userId, customLists.id],
          set: {
            name: list.name || "Untitled List",
            description: list.description || "",
            isTmdbSync: Boolean(list.isTmdbSync),
            tmdbListId: list.tmdbListId ? String(list.tmdbListId) : null,
            coverImage: list.coverImage || null,
            itemIds: Array.isArray(list.itemIds) ? list.itemIds : [],
            updatedAt: new Date().toISOString()
          }
        });
      }

      const existingLists = await db.select({ id: customLists.id }).from(customLists).where(eq(customLists.userId, userId));
      for (const el of existingLists) {
        if (!activeIds.has(el.id)) {
          await db.delete(customLists).where(and(eq(customLists.userId, userId), eq(customLists.id, el.id)));
        }
      }
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (saveUserCustomLists):", err.message);
    }
  }

  if (adminDb) {
    try {
      await adminDb.collection("user_data").doc(userId).set({ customLists: lists }, { merge: true });
    } catch (err: any) {
      console.error("Firestore error (saveUserCustomLists):", err.message);
    }
  }
}

export async function saveUserSettingsAndCollections(
  userId: string,
  data: { customCollections?: any[]; dismissedRecommendations?: any[]; settings?: any }
) {
  userDataCache.delete(userId);

  if (isDatabaseConfigured() && db) {
    try {
      await db.insert(userSettings).values({
        userId,
        customCollections: data.customCollections || [],
        dismissedRecommendations: data.dismissedRecommendations || [],
        settings: data.settings || {},
        updatedAt: new Date().toISOString()
      }).onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          ...(data.customCollections !== undefined ? { customCollections: data.customCollections } : {}),
          ...(data.dismissedRecommendations !== undefined ? { dismissedRecommendations: data.dismissedRecommendations } : {}),
          ...(data.settings !== undefined ? { settings: data.settings } : {}),
          updatedAt: new Date().toISOString()
        }
      });
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (saveUserSettingsAndCollections):", err.message);
    }
  }

  if (adminDb) {
    try {
      await adminDb.collection("user_data").doc(userId).set(data, { merge: true });
    } catch (err: any) {
      console.error("Firestore error (saveUserSettingsAndCollections):", err.message);
    }
  }
}

export async function saveUserData(
  userId: string,
  library?: any[],
  diary?: any[],
  customListsData?: any[],
  dismissedRecommendations?: any[],
  customCollections?: any[],
  settings?: any
) {
  userDataCache.delete(userId);

  if (isDatabaseConfigured() && db) {
    try {
      if (Array.isArray(library) && library.length > 0) {
        // Asynchronously enrich missing items in background if any exist (e.g. from TV Time CSV imports)
        const unpopulated = library.filter(i => (!i.tmdbId || i.tmdbId === '') && (i.type === 'tv' || i.type === 'movie'));
        if (unpopulated.length > 0) {
          (async () => {
            for (const unpop of unpopulated) {
              try {
                const enriched = await enrichItemFromTmdb(unpop);
                if (enriched.tmdbId) {
                  await saveUserItem(userId, enriched);
                }
              } catch (e) {}
            }
          })().catch(() => {});
        }

        for (const item of library) {
          if (!item || !item.id) continue;
          const incomingId = String(item.id);
          const incomingSourceId = item.sourceId ? String(item.sourceId) : null;
          const incomingTvdbId = item.tvdbId ? String(item.tvdbId) : null;
          const incomingTmdbId = item.tmdbId ? String(item.tmdbId) : null;

          let targetId = incomingId;
          if (incomingSourceId || incomingTvdbId || incomingTmdbId) {
            try {
              const existingMatch = await pool.query(
                `SELECT id FROM media_items 
                 WHERE user_id = $1 AND (
                   id = $2 OR 
                   (source_id IS NOT NULL AND source_id = $3) OR 
                   (tvdb_id IS NOT NULL AND tvdb_id = $4) OR 
                   (tmdb_id IS NOT NULL AND tmdb_id = $5)
                 ) LIMIT 1;`,
                [userId, incomingId, incomingSourceId, incomingTvdbId, incomingTmdbId]
              );

              if (existingMatch.rows.length > 0) {
                targetId = existingMatch.rows[0].id;
              }
            } catch (matchErr) {
              // Non-blocking fallback
            }
          }

          await db.insert(mediaItems).values({
            id: targetId,
            userId,
            sourceId: incomingSourceId,
            tmdbId: incomingTmdbId,
            tvdbId: incomingTvdbId,
            imdbId: item.imdbId ? String(item.imdbId) : null,
            title: item.title || "Untitled",
            type: item.type || "movie",
            status: item.status || "planned",
            rating: typeof item.rating === "number" ? item.rating : null,
            favorite: Boolean(item.favorite),
            poster: item.poster || item.coverUrl || null,
            backdrop: item.backdrop || null,
            releaseDate: item.releaseDate || item.firstAirDate || null,
            genres: Array.isArray(item.genres) ? item.genres : [],
            creators: Array.isArray(item.creators) ? item.creators : [],
            platforms: Array.isArray(item.platforms) ? item.platforms : [],
            runtime: item.runtime || null,
            progress: typeof item.progress === "number" ? item.progress : null,
            notes: item.notes || null,
            tags: Array.isArray(item.tags) ? item.tags : [],
            userProgress: item.userProgress || null,
            totalEpisodes: typeof item.totalEpisodes === "number" ? item.totalEpisodes : null,
            watchedEpisodes: item.watchedEpisodes || item.tvSpecifics?.watchedEpisodes || {},
            movieSpecifics: item.movieSpecifics || null,
            tvSpecifics: item.tvSpecifics || null,
            bookSpecifics: item.bookSpecifics || null,
            rawMetadata: item.rawMetadata || null,
            addedAt: item.addedAt || new Date().toISOString(),
            lastUpdatedAt: item.lastUpdatedAt || new Date().toISOString(),
          }).onConflictDoUpdate({
            target: [mediaItems.userId, mediaItems.id],
            set: {
              tmdbId: incomingTmdbId,
              tvdbId: incomingTvdbId,
              status: item.status || "planned",
              rating: typeof item.rating === "number" ? item.rating : null,
              favorite: Boolean(item.favorite),
              poster: item.poster || item.coverUrl || null,
              backdrop: item.backdrop || null,
              notes: item.notes || null,
              genres: Array.isArray(item.genres) ? item.genres : [],
              creators: Array.isArray(item.creators) ? item.creators : [],
              platforms: Array.isArray(item.platforms) ? item.platforms : [],
              runtime: item.runtime || null,
              progress: typeof item.progress === "number" ? item.progress : null,
              tags: Array.isArray(item.tags) ? item.tags : [],
              userProgress: item.userProgress || null,
              watchedEpisodes: item.watchedEpisodes || item.tvSpecifics?.watchedEpisodes || {},
              movieSpecifics: item.movieSpecifics || null,
              tvSpecifics: item.tvSpecifics || null,
              bookSpecifics: item.bookSpecifics || null,
              lastUpdatedAt: item.lastUpdatedAt || new Date().toISOString(),
            }
          });
        }
      }

      if (Array.isArray(diary) && diary.length > 0) {
        for (const entry of diary) {
          if (!entry || !entry.id) continue;
          await db.insert(diaryEntries).values({
            id: String(entry.id),
            userId,
            itemId: entry.mediaId || entry.itemId ? String(entry.mediaId || entry.itemId) : null,
            mediaType: entry.mediaType || "movie",
            title: entry.mediaTitle || entry.title || "Untitled",
            poster: entry.coverUrl || entry.poster || null,
            rating: typeof entry.rating === "number" ? entry.rating : null,
            date: entry.date || new Date().toISOString(),
            thoughts: entry.note || entry.thoughts || "",
            entryType: entry.activityType || entry.entryType || "progress",
            seasonNumber: typeof entry.seasonNumber === "number" ? entry.seasonNumber : null,
            episodeNumber: typeof entry.episodeNumber === "number" ? entry.episodeNumber : null,
            isRewatch: Boolean(entry.isRewatch),
            createdAt: entry.createdAt || entry.date || new Date().toISOString()
          }).onConflictDoUpdate({
            target: [diaryEntries.userId, diaryEntries.id],
            set: {
              title: entry.mediaTitle || entry.title || "Untitled",
              poster: entry.coverUrl || entry.poster || null,
              thoughts: entry.note || entry.thoughts || "",
              rating: typeof entry.rating === "number" ? entry.rating : null,
              date: entry.date || new Date().toISOString(),
              entryType: entry.activityType || entry.entryType || "progress",
              isRewatch: Boolean(entry.isRewatch),
            }
          });
        }
      }

      if (Array.isArray(customListsData) && customListsData.length > 0) {
        for (const list of customListsData) {
          if (!list || !list.id) continue;
          await db.insert(customLists).values({
            id: String(list.id),
            userId,
            name: list.name || "Untitled List",
            description: list.description || "",
            isTmdbSync: Boolean(list.isTmdbSync),
            tmdbListId: list.tmdbListId ? String(list.tmdbListId) : null,
            coverImage: list.coverImage || null,
            itemIds: Array.isArray(list.itemIds) ? list.itemIds : [],
            createdAt: list.createdAt || new Date().toISOString(),
            updatedAt: list.updatedAt || new Date().toISOString()
          }).onConflictDoUpdate({
            target: [customLists.userId, customLists.id],
            set: {
              name: list.name || "Untitled List",
              description: list.description || "",
              isTmdbSync: Boolean(list.isTmdbSync),
              tmdbListId: list.tmdbListId ? String(list.tmdbListId) : null,
              coverImage: list.coverImage || null,
              itemIds: Array.isArray(list.itemIds) ? list.itemIds : [],
              updatedAt: new Date().toISOString()
            }
          });
        }
      }

      await db.insert(userSettings).values({
        userId,
        customCollections: customCollections || [],
        dismissedRecommendations: dismissedRecommendations || [],
        settings: settings || {},
        updatedAt: new Date().toISOString()
      }).onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          customCollections: customCollections || [],
          dismissedRecommendations: dismissedRecommendations || [],
          settings: settings || {},
          updatedAt: new Date().toISOString()
        }
      });
      return;
    } catch (err: any) {
      console.error("PostgreSQL error (saveUserData):", err.message);
    }
  }

  if (adminDb) {
    try {
      const update: any = {};
      if (library !== undefined && library.length <= 200) update.library = library;
      if (diary !== undefined && diary.length <= 200) update.diary = diary;
      if (customListsData !== undefined) update.customLists = customListsData;
      if (customCollections !== undefined) update.customCollections = customCollections;
      if (dismissedRecommendations !== undefined) update.dismissedRecommendations = dismissedRecommendations;
      if (settings !== undefined) update.settings = settings;

      if (Object.keys(update).length > 0) {
        await adminDb.collection("user_data").doc(userId).set(update, { merge: true });
      }
    } catch (err: any) {
      console.error("Firestore error (saveUserData):", err.message);
    }
  }
}

export async function getPaginatedLibrary(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
    sortBy?: string;
  }
) {
  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.max(1, Math.min(200, Number(options?.limit) || 50));
  const offset = (page - 1) * limit;

  if (isDatabaseConfigured() && db) {
    try {
      const conditions = [eq(mediaItems.userId, userId)];
      if (options?.type && options.type !== 'all') {
        conditions.push(eq(mediaItems.type, options.type));
      }
      if (options?.status && options.status !== 'all') {
        conditions.push(eq(mediaItems.status, options.status));
      }
      if (options?.search) {
        conditions.push(sql`lower(${mediaItems.title}) LIKE ${'%' + options.search.toLowerCase().trim() + '%'}`);
      }

      const whereClause = and(...conditions);

      const [totalRows, items] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(mediaItems).where(whereClause),
        db.select().from(mediaItems)
          .where(whereClause)
          .orderBy(sql`${mediaItems.addedAt} DESC`)
          .limit(limit)
          .offset(offset)
      ]);

      const total = Number(totalRows[0]?.count) || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items: items.map(i => ({
          ...i,
          coverUrl: i.poster || (i as any).coverUrl || "",
          backdropUrl: i.backdrop || (i as any).backdropUrl || "",
          genres: i.genres || [],
          tags: i.tags || [],
          watchedEpisodes: i.watchedEpisodes || i.tvSpecifics?.watchedEpisodes || {},
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      };
    } catch (err: any) {
      console.error("PostgreSQL error (getPaginatedLibrary):", err.message);
    }
  }

  const fullData = await getUserData(userId);
  let list = fullData.library;
  if (options?.type && options.type !== 'all') {
    list = list.filter(i => i.type === options.type);
  }
  if (options?.status && options.status !== 'all') {
    list = list.filter(i => i.status === options.status);
  }
  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(i => (i.title || '').toLowerCase().includes(q));
  }
  const total = list.length;
  const paginated = list.slice(offset, offset + limit);
  return {
    items: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + limit < total
    }
  };
}

export async function mergeUserData(fromUserId: string, toUserId: string) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return;
  userDataCache.delete(fromUserId);
  userDataCache.delete(toUserId);

  if (isDatabaseConfigured() && db) {
    try {
      await db.update(mediaItems).set({ userId: toUserId }).where(eq(mediaItems.userId, fromUserId));
      await db.update(diaryEntries).set({ userId: toUserId }).where(eq(diaryEntries.userId, fromUserId));
      await db.update(customLists).set({ userId: toUserId }).where(eq(customLists.userId, fromUserId));
      await db.delete(userSettings).where(eq(userSettings.userId, toUserId));
      await db.update(userSettings).set({ userId: toUserId }).where(eq(userSettings.userId, fromUserId));
    } catch (err: any) {
      console.error("PostgreSQL error (mergeUserData):", err.message);
    }
  }
}
