import { AIGateway } from "../config/aiGateway.js";
import { calculateCentroid, normalize } from "../utils/vectorMath.js";

// In-memory cache for computed embeddings (Key: item id / text hash -> 384-dim vector)
const EMBEDDING_CACHE = new Map<string, number[]>();

/**
 * Formats a media item into a rich semantic text document for embedding.
 */
export function formatSemanticDocument(item: {
  title: string;
  type?: string;
  genres?: string[];
  creators?: string[];
  synopsis?: string;
  overview?: string;
}): string {
  const title = item.title || "Untitled";
  const type = item.type || "media";
  const genres = Array.isArray(item.genres) && item.genres.length > 0 ? item.genres.join(", ") : "General";
  const creators = Array.isArray(item.creators) && item.creators.length > 0 ? item.creators.join(", ") : "";
  const premise = item.synopsis || item.overview || "";

  return `Title: ${title} | Type: ${type} | Genres: ${genres}${creators ? ` | Creator: ${creators}` : ""}${
    premise ? ` | Premise: ${premise}` : ""
  }`;
}

/**
 * Generates an embedding vector using local Transformers.js via AIGateway.
 */
export async function getEmbedding(text: string, cacheKey?: string): Promise<number[]> {
  const key = cacheKey || text.slice(0, 100);
  if (EMBEDDING_CACHE.has(key)) {
    return EMBEDDING_CACHE.get(key)!;
  }

  const result = await AIGateway.generateEmbedding(text);
  const vector = result.vector;
  
  EMBEDDING_CACHE.set(key, vector);
  return vector;
}

/**
 * Batch embeds an array of media candidates with concurrent rate protection.
 */
export async function batchEmbedMediaItems(
  items: Array<{
    id: string;
    title: string;
    type?: string;
    genres?: string[];
    creators?: string[];
    synopsis?: string;
    overview?: string;
  }>
): Promise<Map<string, number[]>> {
  const resultMap = new Map<string, number[]>();
  if (!items || items.length === 0) return resultMap;

  const toFetch: Array<{ item: (typeof items)[0]; doc: string }> = [];

  for (const item of items) {
    if (EMBEDDING_CACHE.has(item.id)) {
      resultMap.set(item.id, EMBEDDING_CACHE.get(item.id)!);
    } else {
      toFetch.push({ item, doc: formatSemanticDocument(item) });
    }
  }

  if (toFetch.length === 0) return resultMap;

  // Process in small parallel chunks (up to 10 concurrent)
  const chunkSize = 10;
  for (let i = 0; i < toFetch.length; i += chunkSize) {
    const chunk = toFetch.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async ({ item, doc }) => {
        const vec = await getEmbedding(doc, item.id);
        resultMap.set(item.id, vec);
      })
    );
  }

  return resultMap;
}

/**
 * Computes a weighted User Taste Centroid Vector based on user favorites and ratings.
 */
export async function computeUserTasteVector(
  library: Array<{
    id: string;
    title: string;
    type?: string;
    genres?: string[];
    creators?: string[];
    synopsis?: string;
    overview?: string;
    favorite?: boolean;
    rating?: number | null;
    status?: string;
  }>
): Promise<number[] | null> {
  if (!Array.isArray(library) || library.length === 0) return null;

  // Filter items with strong user affinity
  const positiveItems = library.filter((item) => {
    if (!item || !item.title) return false;
    const isFav = Boolean(item.favorite);
    const isHighRating = typeof item.rating === "number" && item.rating >= 3.5;
    const isCompleted = item.status === "completed";
    const isInProgress = item.status === "in-progress" || (item.status as string) === "in_progress";

    return isFav || isHighRating || isCompleted || isInProgress;
  });

  const pool = positiveItems.length > 0 ? positiveItems : library.slice(0, 15);
  const weightedVectors: Array<{ vector: number[]; weight: number }> = [];

  for (const item of pool) {
    let weight = 1.0;
    if (item.favorite) weight += 4.0;
    if (item.status === "completed") weight += 3.0;
    else if (item.status === "in-progress" || (item.status as string) === "in_progress") weight += 2.0;

    if (typeof item.rating === "number" && item.rating > 0) {
      const normalizedRating = item.rating > 5 ? item.rating / 2 : item.rating;
      weight += (normalizedRating - 3.0) * 1.5;
    }

    const doc = formatSemanticDocument(item);
    const vector = await getEmbedding(doc, `lib-${item.id}`);
    weightedVectors.push({ vector, weight: Math.max(0.2, weight) });
  }

  return calculateCentroid(weightedVectors);
}
