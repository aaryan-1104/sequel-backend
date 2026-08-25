import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("=== USERS IN COCKROACHDB ===");
  const usersRes = await client.query("SELECT id, username, email FROM users;");
  console.table(usersRes.rows);

  console.log("=== MEDIA ITEMS GROUPED BY USER_ID ===");
  const itemsRes = await client.query("SELECT user_id, COUNT(*) as count FROM media_items GROUP BY user_id;");
  console.table(itemsRes.rows);

  console.log("=== SESSIONS ===");
  const sessionsRes = await client.query("SELECT * FROM sessions LIMIT 10;");
  console.table(sessionsRes.rows);

  await client.end();
}

check();
