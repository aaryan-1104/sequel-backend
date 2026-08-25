import "dotenv/config";
import { getPaginatedLibrary } from "../src/server/services/db.js";

async function test() {
  const userId = "9fBabMgtWaW7QWd0nW6O0l2zK543";
  console.log("Testing server-side pagination for user:", userId);

  const start = performance.now();
  const page1 = await getPaginatedLibrary(userId, { page: 1, limit: 50 });
  const duration = (performance.now() - start).toFixed(2);

  console.log(`⚡ Page 1 (50 items) fetched in ${duration}ms!`);
  console.log("Pagination metadata:", page1.pagination);
  console.log(`Returned items count: ${page1.items.length}`);
  console.log("First item title:", page1.items[0]?.title);
  process.exit(0);
}

test();
