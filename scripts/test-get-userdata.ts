import "dotenv/config";
import { getUserData } from "../src/server/services/db.js";
import { pool } from "../src/server/db/index.js";

async function testGet() {
  try {
    const userRes = await pool.query("SELECT id, username FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
      console.log("No users found in database.");
      return;
    }
    const user = userRes.rows[0];
    console.log("Testing getUserData for user:", user);

    const data = await getUserData("9fBabMgtWaW7QWd0nW6O0l2zK543");
    console.log("Total library items returned:", data.library?.length);
    console.log("Total diary entries returned:", data.diary?.length);
    console.log("Total custom lists returned:", data.customLists?.length);
    if (data.library && data.library.length > 0) {
      console.log("Sample item from getUserData:", JSON.stringify(data.library[0], null, 2));
    }
    const tvShow = data.library?.find(i => i.type === 'tv' && i.watchedEpisodes && Object.keys(i.watchedEpisodes).length > 0);
    if (tvShow) {
      console.log("Found TV Show with watched episodes:", tvShow.title, "Watched count:", Object.keys(tvShow.watchedEpisodes).length);
      console.log("Sample watchedEpisodes JSONB:", JSON.stringify(Object.entries(tvShow.watchedEpisodes).slice(0, 5)));
    }
  } catch (e: any) {
    console.error("TEST FAILED:", e);
  } finally {
    process.exit(0);
  }
}

testGet();
