import "dotenv/config";

async function testGroq() {
  console.log("\n--- Testing Groq API ---");
  const key = process.env.GROQ_API_KEY;
  if (!key) return console.log("No GROQ_API_KEY found.");

  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"];
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say 'Groq is operational!' in 3 words." }],
        }),
      });

      const data: any = await res.json();
      if (res.ok) {
        console.log(`✅ Groq (${model}) SUCCESS:`, data.choices?.[0]?.message?.content);
        break;
      } else {
        console.log(`❌ Groq (${model}) Error:`, data.error?.message);
      }
    } catch (err: any) {
      console.log(`❌ Groq (${model}) fetch error:`, err.message);
    }
  }
}

async function testGitHubModels() {
  console.log("\n--- Testing GitHub Models API ---");
  const token = process.env.GITHUB_TOKEN;
  if (!token) return console.log("No GITHUB_TOKEN found.");

  try {
    // Some regions use models.github.ai/inference
    const res = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say 'GitHub Models is operational!' in 3 words." }],
      }),
    });

    const text = await res.text();
    console.log(`GitHub Models Status: ${res.status}`);
    try {
      const data = JSON.parse(text);
      if (res.ok) {
        console.log("✅ GitHub Models SUCCESS:", data.choices?.[0]?.message?.content);
      } else {
        console.log("❌ GitHub Models Error:", data);
      }
    } catch {
      console.log("❌ Raw response:", text);
    }
  } catch (err: any) {
    console.log("❌ GitHub Models fetch error:", err.message);
  }
}

async function testHuggingFace() {
  console.log("\n--- Testing Hugging Face API ---");
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) return console.log("No HUGGINGFACE_API_KEY found.");

  try {
    const res = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ inputs: ["Inception Christopher Nolan Sci-Fi"] }),
    });

    const data: any = await res.json();
    if (res.ok && Array.isArray(data)) {
      const vector = Array.isArray(data[0]) ? data[0] : data;
      console.log(`✅ Hugging Face SUCCESS: Extracted ${vector.length} dimensional embedding vector!`);
    } else {
      console.log("❌ Hugging Face Error:", data);
    }
  } catch (err: any) {
    console.log("❌ Hugging Face fetch error:", err.message, err.cause);
  }
}

async function run() {
  await testGroq();
  await testGitHubModels();
  await testHuggingFace();
}

run().catch(console.error);
