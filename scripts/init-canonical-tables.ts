import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

async function initCanonicalTables() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to CockroachDB...");
    await client.connect();
    console.log("Connected successfully!");

    console.log("Creating canonical architecture tables...");

    // 1. canonical_media
    await client.query(`
      CREATE TABLE IF NOT EXISTS canonical_media (
        id STRING PRIMARY KEY,
        type STRING NOT NULL,
        title STRING NOT NULL,
        original_title STRING,
        release_date STRING,
        poster STRING,
        backdrop STRING,
        synopsis STRING,
        genres JSONB DEFAULT '[]'::jsonb,
        creators JSONB DEFAULT '[]'::jsonb,
        platforms JSONB DEFAULT '[]'::jsonb,
        runtime STRING,
        total_episodes INT4,
        raw_metadata JSONB,
        created_at STRING NOT NULL,
        updated_at STRING
      );
      CREATE INDEX IF NOT EXISTS idx_canonical_type ON canonical_media(type);
      CREATE INDEX IF NOT EXISTS idx_canonical_title ON canonical_media(title);
    `);
    console.log("✓ canonical_media table ready");

    // 2. media_external_ids
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_external_ids (
        media_id STRING NOT NULL REFERENCES canonical_media(id) ON DELETE CASCADE,
        provider STRING NOT NULL,
        external_id STRING NOT NULL,
        PRIMARY KEY (provider, external_id)
      );
      CREATE INDEX IF NOT EXISTS idx_external_ids_media ON media_external_ids(media_id);
    `);
    console.log("✓ media_external_ids table ready");

    // 3. user_library
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_library (
        user_id STRING NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        media_id STRING NOT NULL REFERENCES canonical_media(id) ON DELETE CASCADE,
        status STRING NOT NULL,
        rating FLOAT8,
        favorite BOOL DEFAULT false,
        progress INT4,
        notes STRING,
        tags JSONB DEFAULT '[]'::jsonb,
        watched_episodes JSONB DEFAULT '{}'::jsonb,
        user_progress JSONB,
        tv_specifics JSONB,
        book_specifics JSONB,
        movie_specifics JSONB,
        added_at STRING NOT NULL,
        last_updated_at STRING,
        PRIMARY KEY (user_id, media_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_library_user ON user_library(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_library_user_status ON user_library(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_user_library_updated ON user_library(user_id, last_updated_at);
    `);
    console.log("✓ user_library table ready");

    // 4. custom_list_items
    console.log("Ensuring custom_lists(id) has a unique index...");
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_custom_lists_id ON custom_lists(id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_list_items (
        list_id STRING NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
        media_id STRING NOT NULL REFERENCES canonical_media(id) ON DELETE CASCADE,
        position INT4 NOT NULL,
        notes STRING,
        added_at STRING NOT NULL,
        PRIMARY KEY (list_id, media_id)
      );
      CREATE INDEX IF NOT EXISTS idx_custom_list_items_order ON custom_list_items(list_id, position);
    `);
    console.log("✓ custom_list_items table ready");

    console.log("All canonical architecture tables initialized successfully!");
  } catch (err: any) {
    console.error("Database initialization error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initCanonicalTables();
