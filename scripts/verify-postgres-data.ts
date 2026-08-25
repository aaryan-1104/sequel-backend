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
  const diaryCount = await client.query("SELECT COUNT(*) FROM diary_entries;");
  const listsCount = await client.query("SELECT COUNT(*) FROM custom_lists;");
  const settingsCount = await client.query("SELECT COUNT(*) FROM user_settings;");

  console.log("Users count:        " + usersCount.rows[0].count);
  console.log("Media items count:  " + mediaCount.rows[0].count);
  console.log("Diary entries count: " + diaryCount.rows[0].count);
  console.log("Custom lists count: " + listsCount.rows[0].count);
  console.log("User settings count: " + settingsCount.rows[0].count);

  const sampleItems = await client.query("SELECT id, title, type, status, rating FROM media_items LIMIT 5;");
  console.log("\nSample media items in CockroachDB:");
  console.table(sampleItems.rows);

  await client.end();
}

verify();
