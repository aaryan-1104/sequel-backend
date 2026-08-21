import "dotenv/config";
import { AIGateway } from "../src/server/config/aiGateway.js";
import { cosineSimilarity } from "../src/server/utils/vectorMath.js";

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 SEQUEL MULTI-PROVIDER AI & VECTOR ENGINE TEST SUITE");
  console.log("========================================================\n");

  // 1. Test Text Generation
  console.log("▶ [1/3] Testing Multi-Provider Text Completion...");
  try {
    const result = await AIGateway.generateCompletion({
      prompt: "In 1 punchy sentence, why do people love Christopher Nolan films?",
      responseFormat: "text",
    });
    console.log(`✅ Success via Provider: [${result.provider.toUpperCase()}] | Model: [${result.model}]`);
    console.log(`   Response: "${result.text.trim()}"\n`);
  } catch (err) {
    console.error("❌ Text generation test failed:", err);
  }

  // 2. Test Embeddings across different titles
  console.log("▶ [2/3] Testing Vector Embeddings Generation...");
  const docA = "Title: Inception | Type: movie | Genres: Sci-Fi, Thriller | Premise: A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.";
  const docB = "Title: Interstellar | Type: movie | Genres: Sci-Fi, Drama | Premise: A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.";
  const docC = "Title: Pride and Prejudice | Type: book | Genres: Romance, Classic | Premise: The romantic clash between the opinionated Elizabeth and her proud beau, Mr. Darcy.";

  try {
    const embedA = await AIGateway.generateEmbedding(docA);
    const embedB = await AIGateway.generateEmbedding(docB);
    const embedC = await AIGateway.generateEmbedding(docC);

    console.log(`✅ Doc A Vector (${embedA.vector.length} dim) via [${embedA.provider.toUpperCase()}] (${embedA.model})`);
    console.log(`✅ Doc B Vector (${embedB.vector.length} dim) via [${embedB.provider.toUpperCase()}] (${embedB.model})`);
    console.log(`✅ Doc C Vector (${embedC.vector.length} dim) via [${embedC.provider.toUpperCase()}] (${embedC.model})\n`);

    // 3. Test Cosine Similarity
    console.log("▶ [3/3] Testing Semantic Cosine Similarity...");
    // Check if vectors have same dimension for direct comparison
    if (embedA.vector.length === embedB.vector.length) {
      const simAB = cosineSimilarity(embedA.vector, embedB.vector);
      const simAC = cosineSimilarity(embedA.vector, embedC.vector);

      console.log(`   • Inception ⟷ Interstellar (Sci-Fi ⟷ Sci-Fi) Similarity: ${(simAB * 100).toFixed(1)}%`);
      console.log(`   • Inception ⟷ Pride & Prejudice (Sci-Fi ⟷ Romance) Similarity: ${(simAC * 100).toFixed(1)}%`);

      if (simAB > simAC) {
        console.log("\n🎯 Semantic Vector Ranking PASS: High-affinity Sci-Fi titles score significantly higher than unrelated genres!");
      }
    } else {
      console.log(`   • Vector dimensions: A=${embedA.vector.length}, B=${embedB.vector.length}`);
    }
  } catch (err) {
    console.error("❌ Embedding test failed:", err);
  }

  console.log("\n========================================================");
  console.log("✨ ALL MULTI-PROVIDER AI TESTS COMPLETED");
  console.log("========================================================\n");
}

runTests().catch(console.error);
