import "dotenv/config";
import { AIGateway } from "../src/server/config/aiGateway.js";
async function testActualUseCase() {
  console.log("\n--- SEQUEL ACTUAL USE CASE TEST ---\n");
  
  console.log("Requesting full recommendation summary from AIGateway...");
  const result = await AIGateway.generateCompletion({
    prompt: "Based on the user's favorite movies (Inception, Interstellar), recommend 1 sci-fi thriller and explain why in 2 sentences.",
    responseFormat: "text"
  });

  console.log("Provider Used:", result.provider.toUpperCase());
  console.log("Model Used:", result.model);
  console.log("Generated Summary:\n");
  console.log(result.text);
}

testActualUseCase().catch(console.error);