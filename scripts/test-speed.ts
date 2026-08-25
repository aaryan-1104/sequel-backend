import "dotenv/config";
import { getUserData } from "../src/server/services/db.js";

async function test() {
  const userId = "user-1785955687430"; // Main user ID
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
