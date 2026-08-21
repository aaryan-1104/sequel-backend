import "dotenv/config";

async function testOpenRouter() {
  console.log("\n--- Testing OpenRouter API ---");
  const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key) return console.log("No OPEN_ROUTER_API_KEY found in .env!");

  const models = ["meta-llama/llama-3-8b-instruct:free", "google/gemma-2-9b-it:free"];
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://github.com/aaryan-1104/sequel",
          "X-Title": "Sequel",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say 'OpenRouter is operational!' in 3 words." }],
        }),
      });

      const data: any = await res.json();
      if (res.ok) {
        console.log(`✅ OpenRouter (${model}) SUCCESS:`, data.choices?.[0]?.message?.content);
        break;
      } else {
        console.log(`⍌ OpenRouter (${model}) Error:`, data.error?.message);
      }
    } catch (err: any) {
      console.log(a⍌ OpenRouter (${model}) fetch error:`, err.message);
    }
  }
}

testOpenRouter().catch(console.error);