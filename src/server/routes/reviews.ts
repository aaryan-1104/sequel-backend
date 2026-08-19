import { Router } from "express";
import { getGeminiClient } from "../config/gemini.js";
import { Type } from "@google/genai";

const router = Router();

interface ReviewItem {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  score?: number;
  date: string;
  likes?: number;
  source: 'custom' | 'tmdb' | 'trakt' | 'nyt' | 'googlebooks' | 'openlibrary' | 'critics' | 'gemini_consensus';
  sourceUrl?: string;
  isCritic?: boolean;
  publication?: string;
  hasSpoilers?: boolean;
}

/**
 * Fetch New York Times Movie Reviews
 */
async function fetchNytMovieReviews(title: string): Promise<ReviewItem[]> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://api.nytimes.com/svc/movies/v2/reviews/search.json?query=${encodeURIComponent(title)}&api-key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();

    const reviews: ReviewItem[] = [];
    for (const r of data.results || []) {
      if (r.summary_short) {
        reviews.push({
          id: `nyt-movie-${encodeURIComponent(r.display_title || title)}`,
          author: r.byline ? `${r.byline}` : 'The New York Times',
          content: r.summary_short,
          score: 4.5,
          date: r.publication_date ? new Date(r.publication_date).toLocaleDateString() : 'NYT Review',
          source: 'nyt',
          isCritic: true,
          publication: 'The New York Times',
          sourceUrl: r.link?.url || undefined,
        });
      }
    }
    return reviews;
  } catch (err) {
    console.warn("[ReviewsRoute] NYT Movie Reviews fetch failed:", err);
    return [];
  }
}

/**
 * Fetch New York Times Book Reviews
 */
async function fetchNytBookReviews(title: string, author?: string, isbn?: string): Promise<ReviewItem[]> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) return [];

  try {
    let url = `https://api.nytimes.com/svc/books/v3/reviews.json?api-key=${apiKey}`;
    if (isbn) {
      url += `&isbn=${encodeURIComponent(isbn)}`;
    } else if (title) {
      url += `&title=${encodeURIComponent(title)}`;
    } else if (author) {
      url += `&author=${encodeURIComponent(author)}`;
    } else {
      return [];
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();

    const reviews: ReviewItem[] = [];
    for (const r of data.results || []) {
      if (r.summary) {
        reviews.push({
          id: `nyt-book-${encodeURIComponent(r.book_title || title)}`,
          author: r.byline ? `${r.byline}` : 'The New York Times',
          content: r.summary,
          score: 4.5,
          date: r.publication_dt ? new Date(r.publication_dt).toLocaleDateString() : 'NYT Book Review',
          source: 'nyt',
          isCritic: true,
          publication: 'The New York Times Book Review',
          sourceUrl: r.url || undefined,
        });
      }
    }
    return reviews;
  } catch (err) {
    console.warn("[ReviewsRoute] NYT Book Reviews fetch failed:", err);
    return [];
  }
}

/**
 * Fetch Trakt.tv Comments (Optional, enabled if TRAKT_CLIENT_ID exists)
 */
async function fetchTraktComments(tmdbId: string | number, mediaType: 'movie' | 'tv'): Promise<ReviewItem[]> {
  const traktClientId = process.env.TRAKT_CLIENT_ID;
  if (!traktClientId || !tmdbId) return [];

  try {
    const endpoint = mediaType === 'movie' ? `movies/${tmdbId}/comments` : `shows/${tmdbId}/comments`;
    const res = await fetch(`https://api.trakt.tv/${endpoint}?extended=full`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': traktClientId,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    const reviews: ReviewItem[] = [];
    for (const item of (data || []).slice(0, 8)) {
      if (item.comment) {
        reviews.push({
          id: `trakt-${item.id}`,
          author: item.user?.username || 'Trakt Cinephile',
          authorAvatar: item.user?.images?.avatar?.full || undefined,
          content: item.comment,
          score: item.user_rating ? item.user_rating / 2 : 4,
          date: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Trakt Review',
          likes: item.likes || 0,
          source: 'trakt',
          publication: 'Trakt.tv',
          hasSpoilers: Boolean(item.spoiler),
        });
      }
    }
    return reviews;
  } catch (err) {
    console.warn("[ReviewsRoute] Trakt comments fetch failed:", err);
    return [];
  }
}

// Server-side persistent in-memory cache
const serverReviewsCache = new Map<string, { reviews: ReviewItem[]; scores: any; count: number }>();

/**
 * Main Unified Reviews Aggregation Endpoint
 * GET /api/reviews/aggregate
 */
router.get("/reviews/aggregate", async (req, res) => {
  const { title, mediaType, tmdbId, author, isbn, useAI } = req.query;

  if (!title && !tmdbId && !isbn) {
    return res.status(400).json({ error: "title, tmdbId, or isbn is required" });
  }

  const type = (mediaType as string) || "movie";
  const titleStr = (title as string) || "";
  const authorStr = (author as string) || "";
  const isbnStr = (isbn as string) || "";
  const shouldRunAI = useAI === "true" || useAI === "1";

  // Set long-term immutable Edge caching header (1 year on Vercel CDN)
  res.setHeader("Cache-Control", "public, s-maxage=31536000, max-age=86400, stale-while-revalidate=86400");

  const cacheKey = `${type}_${titleStr.toLowerCase()}_${tmdbId || ''}_${isbnStr || ''}_${shouldRunAI}`;
  if (serverReviewsCache.has(cacheKey)) {
    return res.json(serverReviewsCache.get(cacheKey));
  }

  try {
    const reviews: ReviewItem[] = [];
    const scores: any = {};


    // 1. Movies & TV aggregation
    if (type === "movie" || type === "tv") {
      const [nytReviews, traktReviews] = await Promise.all([
        fetchNytMovieReviews(titleStr),
        tmdbId ? fetchTraktComments(tmdbId as string, type) : Promise.resolve([]),
      ]);

      reviews.push(...nytReviews);
      reviews.push(...traktReviews);
    } 
    // 2. Books aggregation
    else if (type === "book") {
      const nytReviews = await fetchNytBookReviews(titleStr, authorStr, isbnStr);
      reviews.push(...nytReviews);
    }

    // 3. Gemini AI Review Consensus (STRICTLY when useAI is true)
    if (shouldRunAI && titleStr) {
      const ai = getGeminiClient();
      if (ai) {
        try {
          const prompt = `Provide a concise 1-sentence critical consensus and 2 brief highlights for the ${type} "${titleStr}" ${authorStr ? `by ${authorStr}` : ''}.
Return strictly a JSON object with:
- 'consensusSummary': 1 eloquent, balanced sentence summarizing audience and critic sentiment.
- 'highlightPositive': A brief phrase on what audiences loved.
- 'highlightCritique': A brief phrase on what critics noted.`;

          const aiRes = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  consensusSummary: { type: Type.STRING },
                  highlightPositive: { type: Type.STRING },
                  highlightCritique: { type: Type.STRING },
                },
                required: ["consensusSummary"],
              },
            },
          });

          const parsed = JSON.parse(aiRes.text || "{}");
          if (parsed.consensusSummary) {
            scores.consensusSummary = parsed.consensusSummary;
          }
        } catch (aiErr) {
          console.warn("[ReviewsRoute] Gemini consensus extraction failed:", aiErr);
        }
      }
    }

    const payload = {
      reviews,
      scores,
      count: reviews.length,
    };

    serverReviewsCache.set(cacheKey, payload);
    return res.json(payload);
  } catch (error: any) {
    console.error("[ReviewsRoute] Aggregation failed:", error);
    return res.status(500).json({ error: error?.message || "Failed to aggregate reviews." });
  }
});

export default router;
