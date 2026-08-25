import "dotenv/config";
import { getUserData } from "../src/server/services/db.js";

async function test() {
  const userId = "9fBabMgtWaW7QWd0nW6O0l2zK543"; // Main user ID
  console.log("Fetching full library from CockroachDB for user:", userId);

  const start = performance.now();
  const data = await getUserData(userId);
  const duration = (performance.now() - start).toFixed(2);

  console.log(`⚡ Full library loaded in ${duration}ms!`);
  console.log(`Items retrieved: ${data.library.length}`);
  console.log(`Diary entries:   ${data.diary.length}`);
  console.log(`Custom lists:    ${data.customLists.length}`);
  process.exit(0);
}

test();
