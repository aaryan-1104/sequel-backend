import "dotenv/config";

async function testGroqActive() {
  const key = process.env.GROQ_API_KEY;
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
          messages: [{ role: "user", content: "In 1 sentence, why is cinema powerful?" }],
        }),
      });

      const data: any = await res.json();
      if (res.ok) {
        console.log(`✅ Groq (${model}) SUCCESS:`, data.choices?.[0]?.message?.content);
      } else {
        console.log(`❌ Groq (${model}) Error:`, data.error?.message);
      }
    } catch (err: any) {
      console.log(`❌ Error:`, err.message);
    }
  }
}

testGroqActive().catch(console.error);
