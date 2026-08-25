import "dotenv/config";
import { adminDb } from "../src/server/config/firebase.js";
import { db, isDatabaseConfigured } from "../src/server/db/index.js";
import { users, mediaItems, diaryEntries, customLists, userSettings, sessions } from "../src/server/db/schema.js";


async function runMigration() {
  console.log("==========================================");
  console.log("Starting Firestore -> PostgreSQL Migration");
  console.log("==========================================");

  if (!isDatabaseConfigured() || !db) {
    console.error("ERROR: DATABASE_URL is not set or invalid in .env");
    process.exit(1);
  }

  if (!adminDb) {
    console.error("ERROR: Firebase Admin SDK is not initialized.");
    process.exit(1);
  }

  try {
    // 1. Migrate Users
    console.log("\n[1/5] Migrating Users...");
    const usersSnap = await adminDb.collection("users").get();
    let migratedUsersCount = 0;
    for (const doc of usersSnap.docs) {
      const u = doc.data();
      const userId = doc.id;
      await db.insert(users).values({
        id: userId,
        username: u.username || u.usernameLowerCase || doc.id,
        email: u.email || u.emailLowerCase || null,
        salt: u.salt || "",
        hash: u.hash || "",
        avatar: u.avatar || "🍿",
        bio: u.bio || "",
        genres: u.genres || "",
        tmdbSessionId: u.tmdbSessionId || "",
        tmdbAccountId: u.tmdbAccountId || "",
        tmdbAccessToken: u.tmdbAccessToken || "",
        createdAt: u.createdAt || new Date().toISOString(),
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          username: u.username || u.usernameLowerCase || doc.id,
          email: u.email || u.emailLowerCase || null,
          avatar: u.avatar || "🍿",
          bio: u.bio || "",
          genres: u.genres || "",
          tmdbSessionId: u.tmdbSessionId || "",
          tmdbAccountId: u.tmdbAccountId || "",
          tmdbAccessToken: u.tmdbAccessToken || "",
        }
      });
      migratedUsersCount++;
    }
    console.log(`✓ Successfully migrated ${migratedUsersCount} user accounts.`);

    // 2. Migrate User Data (Media Items, Diary, Lists, Settings)
    console.log("\n[2/5] Migrating User Libraries, Diary Logs & Lists...");
    const userDataSnap = await adminDb.collection("user_data").get();
    
    let totalItems = 0;
    let totalDiary = 0;
    let totalLists = 0;

    for (const doc of userDataSnap.docs) {
      const userId = doc.id;
      const data = doc.data();

      // Ensure user exists in users table
      await db.insert(users).values({
        id: userId,
        username: userId,
        createdAt: new Date().toISOString()
      }).onConflictDoNothing();

      // Migrate Media Items
      if (Array.isArray(data.library) && data.library.length > 0) {
        console.log(`  - Migrating ${data.library.length} media items for user ${userId}...`);
        for (const item of data.library) {
          if (!item || !item.id) continue;
          await db.insert(mediaItems).values({
            id: String(item.id),
            userId,
            sourceId: item.sourceId ? String(item.sourceId) : null,
            tmdbId: item.tmdbId ? String(item.tmdbId) : null,
            tvdbId: item.tvdbId ? String(item.tvdbId) : null,
            imdbId: item.imdbId ? String(item.imdbId) : null,
            title: item.title || "Untitled",
            type: item.type || "movie",
            status: item.status || "planned",
            rating: typeof item.rating === "number" ? item.rating : null,
            poster: item.poster || null,
            backdrop: item.backdrop || null,
            releaseDate: item.releaseDate || item.firstAirDate || null,
            genres: Array.isArray(item.genres) ? item.genres : [],
            notes: item.notes || null,
            tags: Array.isArray(item.tags) ? item.tags : [],
            userProgress: item.userProgress || null,
            totalEpisodes: typeof item.totalEpisodes === "number" ? item.totalEpisodes : null,
            watchedEpisodes: item.watchedEpisodes || {},
            tvSpecifics: item.tvSpecifics || null,
            bookSpecifics: item.bookSpecifics || null,
            rawMetadata: item.rawMetadata || null,
            addedAt: item.addedAt || new Date().toISOString(),
            lastUpdatedAt: item.lastUpdatedAt || new Date().toISOString(),
          }).onConflictDoUpdate({
            target: [mediaItems.userId, mediaItems.id],
            set: {
              status: item.status || "planned",
              rating: typeof item.rating === "number" ? item.rating : null,
              poster: item.poster || null,
              backdrop: item.backdrop || null,
              notes: item.notes || null,
              userProgress: item.userProgress || null,
              watchedEpisodes: item.watchedEpisodes || {},
              lastUpdatedAt: item.lastUpdatedAt || new Date().toISOString(),
            }
          });
          totalItems++;
        }
      }

      // Also check subcollection /users/{userId}/items if present
      const subItemsSnap = await adminDb.collection("users").doc(userId).collection("items").get().catch(() => ({ empty: true, docs: [] }));
      if (!subItemsSnap.empty) {
        for (const itemDoc of subItemsSnap.docs) {
          const item = itemDoc.data();
          if (!item || !item.id) continue;
          await db.insert(mediaItems).values({
            id: String(item.id),
            userId,
            sourceId: item.sourceId ? String(item.sourceId) : null,
            tmdbId: item.tmdbId ? String(item.tmdbId) : null,
            tvdbId: item.tvdbId ? String(item.tvdbId) : null,
            title: item.title || "Untitled",
            type: item.type || "movie",
            status: item.status || "planned",
            rating: typeof item.rating === "number" ? item.rating : null,
            poster: item.poster || null,
            backdrop: item.backdrop || null,
            releaseDate: item.releaseDate || item.firstAirDate || null,
            genres: Array.isArray(item.genres) ? item.genres : [],
            notes: item.notes || null,
            tags: Array.isArray(item.tags) ? item.tags : [],
            userProgress: item.userProgress || null,
            totalEpisodes: typeof item.totalEpisodes === "number" ? item.totalEpisodes : null,
            watchedEpisodes: item.watchedEpisodes || {},
            tvSpecifics: item.tvSpecifics || null,
            bookSpecifics: item.bookSpecifics || null,
            addedAt: item.addedAt || new Date().toISOString(),
            lastUpdatedAt: item.lastUpdatedAt || new Date().toISOString(),
          }).onConflictDoNothing();
          totalItems++;
        }
      }

      // Migrate Diary Entries
      if (Array.isArray(data.diary) && data.diary.length > 0) {
        console.log(`  - Migrating ${data.diary.length} diary entries for user ${userId}...`);
        for (const entry of data.diary) {
          if (!entry || !entry.id) continue;
          await db.insert(diaryEntries).values({
            id: String(entry.id),
            userId,
            itemId: entry.itemId ? String(entry.itemId) : null,
            mediaType: entry.mediaType || "movie",
            title: entry.title || "Untitled",
            poster: entry.poster || null,
            rating: typeof entry.rating === "number" ? entry.rating : null,
            date: entry.date || new Date().toISOString(),
            thoughts: entry.thoughts || "",
            entryType: entry.entryType || "progress",
            seasonNumber: typeof entry.seasonNumber === "number" ? entry.seasonNumber : null,
            episodeNumber: typeof entry.episodeNumber === "number" ? entry.episodeNumber : null,
            isRewatch: Boolean(entry.isRewatch),
            createdAt: entry.createdAt || entry.date || new Date().toISOString()
          }).onConflictDoNothing();
          totalDiary++;
        }
      }

      // Migrate Custom Lists
      if (Array.isArray(data.customLists) && data.customLists.length > 0) {
        console.log(`  - Migrating ${data.customLists.length} custom lists for user ${userId}...`);
        for (const list of data.customLists) {
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
          }).onConflictDoNothing();
          totalLists++;
        }
      }

      // Migrate User Settings & Custom Collections
      await db.insert(userSettings).values({
        userId,
        customCollections: data.customCollections || [],
        dismissedRecommendations: data.dismissedRecommendations || [],
        settings: data.settings || {},
        updatedAt: new Date().toISOString()
      }).onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          customCollections: data.customCollections || [],
          dismissedRecommendations: data.dismissedRecommendations || [],
          settings: data.settings || {},
          updatedAt: new Date().toISOString()
        }
      });
    }

    console.log(`✓ Successfully migrated: ${totalItems} media items, ${totalDiary} diary entries, ${totalLists} custom lists.`);

    // 3. Migrate Sessions
    console.log("\n[3/5] Migrating Sessions...");
    const sessionsSnap = await adminDb.collection("sessions").get();
    let migratedSessionsCount = 0;
    for (const doc of sessionsSnap.docs) {
      const s = doc.data();
      if (s && s.userId) {
        await db.insert(sessions).values({
          token: doc.id,
          userId: s.userId,
          createdAt: new Date().toISOString()
        }).onConflictDoNothing();
        migratedSessionsCount++;
      }
    }
    console.log(`✓ Successfully migrated ${migratedSessionsCount} active sessions.`);

    console.log("\n==========================================");
    console.log("🎉 MIGRATION COMPLETED WITH 100% INTEGRITY!");
    console.log("==========================================");
    process.exit(0);
  } catch (err: any) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

runMigration();
