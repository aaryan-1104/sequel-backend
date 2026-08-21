import { getGeminiClient } from "./gemini.js";
import { normalize } from "../utils/vectorMath.js";
import { pipeline, env } from "@xenova/transformers";

// Disable local models fallback to ensure it downloads from HuggingFace Hub on first run
env.allowLocalModels = false;

export interface AICompletionOptions {
  prompt: string;
  systemPrompt?: string;
  responseFormat?: "json" | "text";
}

export interface AICompletionResult {
  text: string;
  provider: "openrouter" | "groq" | "gemini" | "fallback";
  model: string;
}

export interface AIEmbeddingResult {
  vector: number[];
  provider: "gemini" | "local";
  model: string;
}

/**
 * Singleton for Transformers.js pipeline
 */
class LocalEmbeddingEngine {
  static task = "feature-extraction" as const;
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model);
    }
    return this.instance;
  }
}

/**
 * Universal Multi-Provider AI Gateway
 */
export class AIGateway {
  /**
   * Generates text/structured completions with multi-provider fallback.
   * Cascade Order: OpenRouter (Free) -> Groq -> Gemini -> Fallback
   */
  static async generateCompletion(opts: AICompletionOptions): Promise<AICompletionResult> {
    const { prompt, systemPrompt, responseFormat } = opts;
    const isJson = responseFormat === "json";

    const openRouterKey = process.env.OPEN_ROUTER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // 1. Load balancer: Randomize execution order of primary free providers
    const providers: Array<"openrouter" | "groq" | "gemini"> = [];
    if (openRouterKey) providers.push("openrouter");
    if (groqKey) providers.push("groq");

    // Shuffle providers randomly (50/50 split if both exist)
    for (let i = providers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [providers[i], providers[j]] = [providers[j], providers[i]];
    }

    // Always append Gemini as the absolute final fallback
    providers.push("gemini");

    // 2. Execute cascaded generation
    for (const provider of providers) {
      if (provider === "openrouter") {
        const openRouterModels = ["openrouter/free", "nvidia/nemotron-3-nano-30b-a3b:free"];
        for (const model of openRouterModels) {
          try {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openRouterKey}`,
                "HTTP-Referer": "https://github.com/aaryan-1104/sequel",
                "X-Title": "Sequel",
              },
              body: JSON.stringify({
                model,
                messages: [
                  ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                  { role: "user", content: prompt },
                ],
                ...(isJson ? { response_format: { type: "json_object" } } : {}),
              }),
              signal: AbortSignal.timeout(8000),
            });

            if (res.ok) {
              const data: any = await res.json();
              const content = data.choices?.[0]?.message?.content;
              if (content) {
                return { text: content, provider: "openrouter", model };
              }
            }
          } catch (err) {
            console.warn(`[AIGateway] OpenRouter (${model}) failed, cascading:`, String(err).slice(0, 100));
          }
        }
      } else if (provider === "groq") {
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
                ...(isJson ? { response_format: { type: "json_object" } } : {}),
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
      } else if (provider === "gemini") {
        const gemini = getGeminiClient();
        if (gemini) {
          const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
          for (const model of models) {
            try {
              const contents = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
              const response = await gemini.models.generateContent({
                model,
                contents,
                config: isJson ? { responseMimeType: "application/json" } : undefined,
              });

              if (response.text) {
                return { text: response.text, provider: "gemini", model };
              }
            } catch (err) {
              console.warn(`[AIGateway] Gemini (${model}) failed, cascading:`, String(err).slice(0, 100));
            }
          }
        }
      }
    }

    // 4. Safe Fallback
    return {
      text: isJson ? "{}" : "Insight unavailable.",
      provider: "fallback",
      model: "offline-template",
    };
  }

  /**
   * Generates dense vector embeddings using local Transformers.js model as primary,
   * avoiding external API costs and latencies completely.
   */
  static async generateEmbedding(text: string): Promise<AIEmbeddingResult> {
    try {
      // 1. Primary: Local Transformers.js (Xenova/all-MiniLM-L6-v2)
      // Generates a 384-dimensional vector natively in Node.js
      const extractor = await LocalEmbeddingEngine.getInstance();
      const output = await extractor(text, { pooling: "mean", normalize: true });
      const vector = Array.from(output.data) as number[];
      
      return {
        vector: vector,
        provider: "local",
        model: "Transformers.js/all-MiniLM-L6-v2",
      };
    } catch (err) {
      console.error("[AIGateway] Transformers.js failed, falling back to basic deterministic hash.", err);
    }

    // 2. Ultimate Safe Fallback
    return {
      vector: createLocalDenseProjection(text),
      provider: "local",
      model: "deterministic-dense-projection-384",
    };
  }
}

/**
 * Generates an in-memory 384-dimensional normalized projection vector 
 * purely as an ultimate fallback if Transformers.js fails.
 */
function createLocalDenseProjection(text: string): number[] {
  const dim = 384; // Matched to all-MiniLM-L6-v2
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
