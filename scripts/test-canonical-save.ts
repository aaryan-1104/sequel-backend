import "dotenv/config";
import { getUserData, saveUserItem, deleteUserItem } from "../src/server/services/db.js";
import { pool } from "../src/server/db/index.js";

async function testSaveAndDelete() {
  const testUserId = "9fBabMgtWaW7QWd0nW6O0l2zK543";
  const testItem = {
    id: "test-movie-canonical-9999",
    type: "movie",
    title: "Interstellar (Canonical Test)",
    status: "in-progress",
    rating: 4.5,
    favorite: true,
    progress: 75,
    coverUrl: "https://example.com/poster.jpg",
    backdropUrl: "https://example.com/backdrop.jpg",
    releaseDate: "2014-11-07",
    synopsis: "Mankind was born on Earth. It was never meant to die here.",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    tags: ["space", "nolan"],
    notes: "Masterpiece cinema",
    addedAt: new Date().toISOString()
  };

  try {
    console.log("1. Saving new item via saveUserItem...");
    await saveUserItem(testUserId, testItem);

    console.log("2. Fetching user data to verify insertion...");
    const data = await getUserData(testUserId);
    const saved = data.library.find((i: any) => i.title === testItem.title);
    if (!saved) {
      console.log("Items in library starting with Interstellar:", data.library.filter((i: any) => i.title?.includes("Interstellar")));
      throw new Error("Saved item not found in getUserData library!");
    }
    console.log("✓ Found saved item:", saved.title, "ID:", saved.id, "Rating:", saved.rating, "Status:", saved.status);

    console.log("3. Deleting item via deleteUserItem...");
    await deleteUserItem(testUserId, saved.id);

    console.log("4. Fetching user data to verify soft-deletion...");
    const dataAfterDelete = await getUserData(testUserId);
    const after = dataAfterDelete.library.find((i: any) => i.id === saved.id);
    if (after) {
      throw new Error("Item was not soft-deleted!");
    }
    console.log("✓ Verified: Item successfully soft-deleted and excluded from library.");

    console.log("\nALL CANONICAL WRITE & READ TESTS PASSED!");
  } catch (err: any) {
    console.error("TEST FAILED:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testSaveAndDelete();
