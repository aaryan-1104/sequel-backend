import "dotenv/config";

async function testGitHubModels() {
  const token = process.env.GITHUB_TOKEN;
  console.log("Testing GitHub Models with token prefix:", token?.substring(0, 15));

  const models = ["gpt-4o-mini", "Mistral-large"];
  for (const model of models) {
    try {
      const res = await fetch("https://models.inference.ai.azure.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say 'GitHub Models is live!' in 4 words." }],
        }),
      });

      console.log(`GitHub Models [${model}] HTTP Status:`, res.status);
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (res.ok) {
          console.log(`✅ [${model}] Success:`, data.choices?.[0]?.message?.content);
          break;
        } else {
          console.log(`❌ [${model}] Error:`, data);
        }
      } catch {
        console.log(`❌ [${model}] Non-JSON Response:`, text);
      }
    } catch (err: any) {
      console.log(`❌ [${model}] Error:`, err.message);
    }
  }
}

testGitHubModels().catch(console.error);
