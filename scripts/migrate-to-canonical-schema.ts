import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

function resolveCanonicalId(item: any): string {
  const type = item.type || "movie";
  
  if (item.tmdb_id) {
    return `${type}-tmdb-${item.tmdb_id}`;
  }
  if (item.imdb_id) {
    return `${type}-imdb-${item.imdb_id}`;
  }
  if (item.tvdb_id) {
    return `tv-tvdb-${item.tvdb_id}`;
  }
  if (item.source_id) {
    return `${type}-${item.source_id.replace(/^([a-z0-9]+)-/i, '')}`;
  }
  
  // Clean raw id
  const rawId = String(item.id || "").trim();
  const clean = rawId.replace(/^(tvtime-show-|tvtime-movie-|tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/i, "");
  return `${type}-${clean || rawId}`;
}

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL not set");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to CockroachDB for migration.");

    console.log("\n--- Phase 2.1: Migrating media_items to canonical_media & user_library ---");
    const mediaRes = await client.query("SELECT * FROM media_items;");
    const rawItems = mediaRes.rows;
    console.log(`Found ${rawItems.length} legacy media items across all users.`);

    const canonicalMap = new Map<string, any>(); // canonicalId -> metadata
    const userLibraryRows: any[] = [];
    const externalIdRows: { mediaId: string; provider: string; externalId: string }[] = [];
    const idToCanonicalMap = new Map<string, string>(); // legacy id -> canonicalId

    for (const item of rawItems) {
      const canonicalId = resolveCanonicalId(item);
      idToCanonicalMap.set(item.id, canonicalId);
      if (item.source_id) idToCanonicalMap.set(item.source_id, canonicalId);

      // Collect external IDs
      if (item.tmdb_id) {
        externalIdRows.push({ mediaId: canonicalId, provider: "tmdb", externalId: String(item.tmdb_id) });
      }
      if (item.imdb_id) {
        externalIdRows.push({ mediaId: canonicalId, provider: "imdb", externalId: String(item.imdb_id) });
      }
      if (item.tvdb_id) {
        externalIdRows.push({ mediaId: canonicalId, provider: "tvdb", externalId: String(item.tvdb_id) });
      }
      if (item.source_id) {
        externalIdRows.push({ mediaId: canonicalId, provider: "source", externalId: String(item.source_id) });
      }

      // Merge canonical metadata (prefer non-null poster/backdrop/synopsis)
      const existing = canonicalMap.get(canonicalId);
      const meta = item.raw_metadata || {};
      const genres = Array.isArray(item.genres) ? item.genres : (existing?.genres || []);
      const creators = meta.creators || existing?.creators || [];
      const platforms = meta.platforms || existing?.platforms || [];
      const runtime = meta.runtime || existing?.runtime || null;

      canonicalMap.set(canonicalId, {
        id: canonicalId,
        type: item.type || "movie",
        title: item.title || existing?.title || "Untitled",
        original_title: meta.originalTitle || existing?.original_title || null,
        release_date: item.release_date || existing?.release_date || null,
        poster: item.poster || existing?.poster || null,
        backdrop: item.backdrop || existing?.backdrop || null,
        synopsis: meta.synopsis || meta.overview || item.notes || existing?.synopsis || null,
        genres: JSON.stringify(genres),
        creators: JSON.stringify(creators),
        platforms: JSON.stringify(platforms),
        runtime: runtime,
        total_episodes: item.total_episodes || existing?.total_episodes || null,
        raw_metadata: JSON.stringify(meta),
        created_at: item.added_at || new Date().toISOString(),
        updated_at: item.last_updated_at || new Date().toISOString()
      });

      // User library row
      userLibraryRows.push({
        user_id: item.user_id,
        media_id: canonicalId,
        status: item.status || "planned",
        rating: item.rating,
        favorite: Boolean(item.favorite),
        progress: meta.progress ?? null,
        notes: item.notes || null,
        tags: JSON.stringify(Array.isArray(item.tags) ? item.tags : []),
        watched_episodes: JSON.stringify(item.watched_episodes || item.tv_specifics?.watchedEpisodes || {}),
        user_progress: JSON.stringify(item.user_progress || null),
        tv_specifics: JSON.stringify(item.tv_specifics || null),
        book_specifics: JSON.stringify(item.book_specifics || null),
        movie_specifics: JSON.stringify(meta.movieSpecifics || null),
        added_at: item.added_at || new Date().toISOString(),
        last_updated_at: item.last_updated_at || item.added_at || new Date().toISOString()
      });
    }

    console.log(`Deduplicated into ${canonicalMap.size} unique canonical media entities.`);
    console.log(`Prepared ${userLibraryRows.length} user library records.`);

    // Batch insert canonical_media
    console.log("Upserting canonical_media in chunks...");
    const canonicalList = Array.from(canonicalMap.values());
    const chunkSize = 200;
    for (let i = 0; i < canonicalList.length; i += chunkSize) {
      const chunk = canonicalList.slice(i, i + chunkSize);
      for (const m of chunk) {
        await client.query(`
          INSERT INTO canonical_media (
            id, type, title, original_title, release_date, poster, backdrop,
            synopsis, genres, creators, platforms, runtime, total_episodes,
            raw_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO UPDATE SET
            poster = COALESCE(EXCLUDED.poster, canonical_media.poster),
            backdrop = COALESCE(EXCLUDED.backdrop, canonical_media.backdrop),
            synopsis = COALESCE(EXCLUDED.synopsis, canonical_media.synopsis),
            updated_at = EXCLUDED.updated_at;
        `, [
          m.id, m.type, m.title, m.original_title, m.release_date, m.poster, m.backdrop,
          m.synopsis, m.genres, m.creators, m.platforms, m.runtime, m.total_episodes,
          m.raw_metadata, m.created_at, m.updated_at
        ]);
      }
    }
    console.log(`✓ Inserted ${canonicalList.length} canonical_media records.`);

    // Batch insert media_external_ids
    console.log("Inserting media_external_ids...");
    for (const ext of externalIdRows) {
      await client.query(`
        INSERT INTO media_external_ids (media_id, provider, external_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (provider, external_id) DO NOTHING;
      `, [ext.mediaId, ext.provider, ext.externalId]);
    }
    console.log(`✓ Inserted external IDs.`);

    // Batch insert user_library
    console.log("Inserting user_library records...");
    for (let i = 0; i < userLibraryRows.length; i += chunkSize) {
      const chunk = userLibraryRows.slice(i, i + chunkSize);
      for (const u of chunk) {
        await client.query(`
          INSERT INTO user_library (
            user_id, media_id, status, rating, favorite, progress, notes, tags,
            watched_episodes, user_progress, tv_specifics, book_specifics,
            movie_specifics, added_at, last_updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (user_id, media_id) DO UPDATE SET
            status = EXCLUDED.status,
            rating = EXCLUDED.rating,
            favorite = EXCLUDED.favorite,
            progress = EXCLUDED.progress,
            notes = EXCLUDED.notes,
            tags = EXCLUDED.tags,
            watched_episodes = EXCLUDED.watched_episodes,
            tv_specifics = EXCLUDED.tv_specifics,
            book_specifics = EXCLUDED.book_specifics,
            movie_specifics = EXCLUDED.movie_specifics,
            last_updated_at = EXCLUDED.last_updated_at;
        `, [
          u.user_id, u.media_id, u.status, u.rating, u.favorite, u.progress, u.notes,
          u.tags, u.watched_episodes, u.user_progress, u.tv_specifics, u.book_specifics,
          u.movie_specifics, u.added_at, u.last_updated_at
        ]);
      }
    }
    console.log(`✓ Inserted ${userLibraryRows.length} user_library records.`);

    console.log("\n--- Phase 2.2: Migrating custom_lists.item_ids to custom_list_items ---");
    const listsRes = await client.query("SELECT id, user_id, item_ids FROM custom_lists;");
    let migratedListItems = 0;

    for (const list of listsRes.rows) {
      const itemIds: string[] = Array.isArray(list.item_ids) ? list.item_ids : [];
      let position = 0;

      for (const rawItemId of itemIds) {
        const canonicalId = idToCanonicalMap.get(rawItemId) || resolveCanonicalId({ id: rawItemId });
        
        // Ensure canonical row exists if created by custom list ID
        await client.query(`
          INSERT INTO canonical_media (id, type, title, created_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING;
        `, [canonicalId, "movie", "Custom Item", new Date().toISOString()]);

        await client.query(`
          INSERT INTO custom_list_items (list_id, media_id, position, added_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (list_id, media_id) DO UPDATE SET position = EXCLUDED.position;
        `, [list.id, canonicalId, position++, new Date().toISOString()]);
        migratedListItems++;
      }
    }
    console.log(`✓ Migrated ${migratedListItems} custom list items into custom_list_items.`);

    console.log("\n==========================================");
    console.log("MIGRATION & VERIFICATION COMPLETED");
    console.log("==========================================");
    const countCanonical = await client.query("SELECT COUNT(*) FROM canonical_media;");
    const countUserLib = await client.query("SELECT COUNT(*) FROM user_library;");
    const countListItems = await client.query("SELECT COUNT(*) FROM custom_list_items;");
    console.log("Canonical Media count:   " + countCanonical.rows[0].count);
    console.log("User Library count:      " + countUserLib.rows[0].count);
    console.log("Custom List Items count: " + countListItems.rows[0].count);

  } catch (err: any) {
    console.error("Migration error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
