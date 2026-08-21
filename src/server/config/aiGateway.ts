import { getGeminiClient } from "./gemini.js";
import { normalize } from "../utils/vectorMath.js";

export interface AICompletionOptions {
  prompt: string;
  systemPrompt?: string;
  responseFormat?: "json" | "text";
}

export interface AICompletionResult {
  text: string;
  provider: "gemini" | "groq" | "fallback";
  model: string;
}

export interface AIEmbeddingResult {
  vector: number[];
  provider: "gemini" | "huggingface" | "local";
  model: string;
}

/**
 * Universal Multi-Provider AI Gateway
 * Transparently orchestrates across Google Gemini, Groq (Open Source Llama/Qwen/GPT-OSS), and Local Vector Projections.
 */
export class AIGateway {
  /**
   * Generates text/structured completions with multi-provider fallback.
   * Cascade Order: Groq (Open Source gpt-oss-120b / qwen3.6-27b) -> Gemini -> Fallback
   */
  static async generateCompletion(opts: AICompletionOptions): Promise<AICompletionResult> {
    const { prompt, systemPrompt, responseFormat } = opts;

    // 1. Try Groq (Ultra-fast open source models: openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.6-27b)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"];
      for (const model of groqModels) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                { role: "user", content: prompt },
              ],
              ...(responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (res.ok) {
            const data: any = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              return { text: content, provider: "groq", model };
            }
          }
        } catch (err) {
          console.warn(`[AIGateway] Groq (${model}) failed, cascading:`, String(err).slice(0, 100));
        }
      }
    }

    // 2. Try Google Gemini
    const gemini = getGeminiClient();
    if (gemini) {
      const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
      for (const model of models) {
        try {
          const contents = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
          const response = await gemini.models.generateContent({
            model,
            contents,
            config: responseFormat === "json" ? { responseMimeType: "application/json" } : undefined,
          });

          if (response.text) {
            return { text: response.text, provider: "gemini", model };
          }
        } catch (err) {
          console.warn(`[AIGateway] Gemini (${model}) failed, cascading:`, String(err).slice(0, 100));
        }
      }
    }

    // 3. Safe Fallback
    return {
      text: responseFormat === "json" ? "{}" : "Insight unavailable.",
      provider: "fallback",
      model: "offline-template",
    };
  }

  /**
   * Generates dense vector embeddings with multi-provider fallback.
   * Cascade Order: Gemini (text-embedding-004) -> Hugging Face -> Local 768-Dim Dense Projection
   */
  static async generateEmbedding(text: string): Promise<AIEmbeddingResult> {
    // 1. Try Google Gemini text-embedding-004
    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const response: any = await (gemini.models as any).embedContent({
          model: "text-embedding-004",
          contents: text,
        });

        const values = response?.embedding?.values || response?.values;
        if (Array.isArray(values) && values.length > 0) {
          return {
            vector: normalize(values),
            provider: "gemini",
            model: "text-embedding-004",
          };
        }
      } catch (err) {
        console.warn("[AIGateway] Gemini embedding failed, falling back:", String(err).slice(0, 100));
      }
    }

    // 2. Try Hugging Face
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    if (hfKey) {
      try {
        const res = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hfKey}`,
          },
          body: JSON.stringify({ inputs: [text] }),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data)) {
            const vector = Array.isArray(data[0]) ? data[0] : data;
            // Pad or trim vector to 768 dimensions for consistency with local/gemini if needed
            // all-MiniLM-L6-v2 is 384 dimensions. To mix it, it has to match the DB schema.
            // But since local is 768 and gemini is 768, we need 768. 
            // Wait, returning a 384-dim vector will break dot product if DB expects 768!
            // Let's just pass it to the local fallback if HF is 384 dim.
            console.warn("[AIGateway] HuggingFace returned 384-dim vector, using Local Fallback instead to maintain 768-dim consistency.");
          }
        }
      } catch (err) {
         console.warn("[AIGateway] Hugging Face embedding failed, falling back:", String(err).slice(0, 100));
      }
    }

    // 3. Local Deterministic 768-Dim Dense Fallback (0 API, 0 latency, 100% uptime guaranteed)
    const fallbackVector = createLocalDenseProjection(text);
    return {
      vector: fallbackVector,
      provider: "local",
      model: "deterministic-dense-projection-768",
    };
  }
}

/**
 * Generates an in-memory 768-dimensional normalized projection vector without external API calls.
 */
function createLocalDenseProjection(text: string): number[] {
  const dim = 768;
  const vector = new Array(dim).fill(0);
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const word = words[wIdx];
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const baseIdx = Math.abs(hash) % dim;
    vector[baseIdx] += 1.0 / (wIdx + 1);
    vector[(baseIdx + 13) % dim] += 0.5;
    vector[(baseIdx + 37) % dim] += 0.25;
  }

  return normalize(vector);
}
