import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

async function initDb() {
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
    console.log("Connecting to CockroachDB / PostgreSQL...");
    await client.connect();
    console.log("Connected successfully!");

    console.log("Creating tables...");

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id STRING PRIMARY KEY,
        username STRING NOT NULL,
        email STRING,
        salt STRING DEFAULT '',
        hash STRING DEFAULT '',
        avatar STRING DEFAULT '🍿',
        bio STRING DEFAULT '',
        genres STRING DEFAULT '',
        tmdb_session_id STRING DEFAULT '',
        tmdb_account_id STRING DEFAULT '',
        tmdb_access_token STRING DEFAULT '',
        created_at STRING NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    console.log("✓ users table ready");

    // 2. Media Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_items (
        id STRING NOT NULL,
        user_id STRING NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_id STRING,
        tmdb_id STRING,
        tvdb_id STRING,
        imdb_id STRING,
        title STRING NOT NULL,
        type STRING NOT NULL,
        status STRING NOT NULL,
        rating FLOAT8,
        poster STRING,
        backdrop STRING,
        release_date STRING,
        genres JSONB DEFAULT '[]'::jsonb,
        notes STRING,
        tags JSONB DEFAULT '[]'::jsonb,
        user_progress JSONB,
        total_episodes INT4,
        watched_episodes JSONB DEFAULT '{}'::jsonb,
        tv_specifics JSONB,
        book_specifics JSONB,
        raw_metadata JSONB,
        added_at STRING NOT NULL,
        last_updated_at STRING,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_media_items_user ON media_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_media_items_user_type ON media_items(user_id, type);
      CREATE INDEX IF NOT EXISTS idx_media_items_user_status ON media_items(user_id, status);
    `);
    console.log("✓ media_items table ready");

    // 3. Diary Entries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id STRING NOT NULL,
        user_id STRING NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id STRING,
        media_type STRING,
        title STRING,
        poster STRING,
        rating FLOAT8,
        date STRING,
        thoughts STRING,
        entry_type STRING,
        season_number INT4,
        episode_number INT4,
        is_rewatch BOOL DEFAULT false,
        created_at STRING NOT NULL,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_diary_entries_user ON diary_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(user_id, date);
    `);
    console.log("✓ diary_entries table ready");

    // 4. Custom Lists Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_lists (
        id STRING NOT NULL,
        user_id STRING NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name STRING NOT NULL,
        description STRING,
        is_tmdb_sync BOOL DEFAULT false,
        tmdb_list_id STRING,
        cover_image STRING,
        item_ids JSONB DEFAULT '[]'::jsonb,
        created_at STRING NOT NULL,
        updated_at STRING,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_custom_lists_user ON custom_lists(user_id);
    `);
    console.log("✓ custom_lists table ready");

    // 5. User Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id STRING PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        custom_collections JSONB DEFAULT '[]'::jsonb,
        dismissed_recommendations JSONB DEFAULT '[]'::jsonb,
        settings JSONB DEFAULT '{}'::jsonb,
        updated_at STRING
      );
    `);
    console.log("✓ user_settings table ready");

    // 6. Sessions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token STRING PRIMARY KEY,
        user_id STRING NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at STRING NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `);
    console.log("✓ sessions table ready");

    console.log("\n=======================================================");
    console.log("🎉 ALL COCKROACHDB TABLES & INDEXES INITIALIZED CLEANLY!");
    console.log("=======================================================");
    await client.end();
    process.exit(0);
  } catch (err: any) {
    console.error("Database initialization failed:", err);
    await client.end();
    process.exit(1);
  }
}

initDb();
