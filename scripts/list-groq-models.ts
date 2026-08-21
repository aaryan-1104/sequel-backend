import "dotenv/config";

async function listGroqModels() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return;

  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });

  const data: any = await res.json();
  console.log("Active Groq models:", data.data?.map((m: any) => m.id));
}

listGroqModels().catch(console.error);
