import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function verify() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("==========================================");
  console.log("COCKROACHDB DATA VERIFICATION REPORT");
  console.log("==========================================");

  const usersCount = await client.query("SELECT COUNT(*) FROM users;");
  const mediaCount = await client.query("SELECT COUNT(*) FROM media_items;");
  const canonicalCount = await client.query("SELECT COUNT(*) FROM canonical_media;");
  const extIdsCount = await client.query("SELECT COUNT(*) FROM media_external_ids;");
  const userLibCount = await client.query("SELECT COUNT(*) FROM user_library;");
  const listItemsCount = await client.query("SELECT COUNT(*) FROM custom_list_items;");
  const diaryCount = await client.query("SELECT COUNT(*) FROM diary_entries;");
  const listsCount = await client.query("SELECT COUNT(*) FROM custom_lists;");
  const settingsCount = await client.query("SELECT COUNT(*) FROM user_settings;");

  console.log("Users count:             " + usersCount.rows[0].count);
  console.log("Media items count:       " + mediaCount.rows[0].count);
  console.log("Canonical media count:   " + canonicalCount.rows[0].count);
  console.log("External IDs count:      " + extIdsCount.rows[0].count);
  console.log("User library count:      " + userLibCount.rows[0].count);
  console.log("Custom list items count: " + listItemsCount.rows[0].count);
  console.log("Diary entries count:     " + diaryCount.rows[0].count);
  console.log("Custom lists count:      " + listsCount.rows[0].count);
  console.log("User settings count:     " + settingsCount.rows[0].count);

  const sampleItems = await client.query("SELECT id, title, type, status, rating FROM media_items LIMIT 5;");
  console.log("\nSample media items in CockroachDB:");
  console.table(sampleItems.rows);

  await client.end();
}

verify();
