import { GoogleGenAI } from "@google/genai";

interface KeyState {
  key: string;
  client: GoogleGenAI;
  cooldownUntil: number;
}

let keyPool: KeyState[] = [];
let roundRobinIndex = 0;

/**
 * Initializes or refreshes the Gemini key pool from environment variables.
 * Supports GEMINI_API_KEYS (comma-separated) or single GEMINI_API_KEY.
 */
function initKeyPool(): KeyState[] {
  if (keyPool.length > 0) return keyPool;

  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const keys = rawKeys
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k && k !== "MY_GEMINI_API_KEY");

  keyPool = keys.map((key) => ({
    key,
    client: new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    }),
    cooldownUntil: 0,
  }));

  return keyPool;
}

/**
 * Retrieves an active Gemini client from the pool with round-robin load balancing
 * and automatic rate-limit cooldown avoidance.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const pool = initKeyPool();
  if (pool.length === 0) return null;

  const now = Date.now();
  // Find available key not in cooldown
  for (let i = 0; i < pool.length; i++) {
    const idx = (roundRobinIndex + i) % pool.length;
    const candidate = pool[idx];
    if (candidate.cooldownUntil <= now) {
      roundRobinIndex = (idx + 1) % pool.length;
      return candidate.client;
    }
  }

  // If all are in cooldown, use the one that expires soonest
  pool.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  return pool[0].client;
}

/**
 * Flags the active key associated with a client for temporary cooldown (e.g. on 429 quota exhaustion).
 */
export function markKeyCooldown(durationMs = 60000) {
  const pool = initKeyPool();
  if (pool.length === 0) return;

  const currentIdx = (roundRobinIndex - 1 + pool.length) % pool.length;
  pool[currentIdx].cooldownUntil = Date.now() + durationMs;
  console.warn(`[Gemini] Key #${currentIdx + 1} placed in cooldown for ${durationMs / 1000}s.`);
}

/**
 * Supported model cascades for resilient fallback execution.
 */
export const MODEL_CASCADES = {
  embedding: ["text-embedding-004", "embedding-001"],
  fastGeneration: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"],
  creativeGeneration: ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
};

/**
 * Executes an AI operation across multiple models and keys with graceful cascading fallback.
 */
export async function executeWithModelFallback<T>(
  modelList: string[],
  operation: (client: GoogleGenAI, model: string) => Promise<T>
): Promise<T> {
  let lastError: any = null;

  for (const model of modelList) {
    const client = getGeminiClient();
    if (!client) break;

    try {
      return await operation(client, model);
    } catch (error: any) {
      lastError = error;
      const errorMsg = String(error?.message || error || "");
      const isQuotaOrRateLimit =
        errorMsg.includes("429") ||
        errorMsg.includes("RESOURCE_EXHAUSTED") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("rate limit");

      if (isQuotaOrRateLimit) {
        markKeyCooldown(60000);
      }
      console.warn(`[Gemini] Model ${model} failed, cascading to next model:`, errorMsg.slice(0, 120));
    }
  }

  throw lastError || new Error("All AI model fallback attempts exhausted.");
}
