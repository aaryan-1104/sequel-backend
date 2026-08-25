import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function link() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Linking media items, custom lists, and settings from user-1785955687430 to 9fBabMgtWaW7QWd0nW6O0l2zK543...");

  // Update media_items
  await client.query("UPDATE media_items SET user_id = '9fBabMgtWaW7QWd0nW6O0l2zK543' WHERE user_id = 'user-1785955687430';");
  
  // Update diary_entries
  await client.query("UPDATE diary_entries SET user_id = '9fBabMgtWaW7QWd0nW6O0l2zK543' WHERE user_id = 'user-1785955687430';");

  // Update custom_lists
  await client.query("UPDATE custom_lists SET user_id = '9fBabMgtWaW7QWd0nW6O0l2zK543' WHERE user_id = 'user-1785955687430';");

  // Update user_settings
  await client.query("DELETE FROM user_settings WHERE user_id = '9fBabMgtWaW7QWd0nW6O0l2zK543';");
  await client.query("UPDATE user_settings SET user_id = '9fBabMgtWaW7QWd0nW6O0l2zK543' WHERE user_id = 'user-1785955687430';");

  console.log("Verification after linking:");
  const itemsCount = await client.query("SELECT COUNT(*) FROM media_items WHERE user_id = '9fBabMgtWaW7QWd0nW6O0l2zK543';");
  const listsCount = await client.query("SELECT COUNT(*) FROM custom_lists WHERE user_id = '9fBabMgtWaW7QWd0nW6O0l2zK543';");

  console.log("Items for 9fBabMgtWaW7QWd0nW6O0l2zK543: " + itemsCount.rows[0].count);
  console.log("Lists for 9fBabMgtWaW7QWd0nW6O0l2zK543: " + listsCount.rows[0].count);

  await client.end();
}

link();
