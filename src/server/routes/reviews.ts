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
  source: 'custom' | 'tmdb' | 'trakt' | 'nyt' | 'googlebooks' | 'openlibrary' | 'critics' | 'letterboxd' | 'gemini_consensus';
  sourceUrl?: string;
  isCritic?: boolean;
  publication?: string;
  hasSpoilers?: boolean;
}

/**
 * Fetch Authentic Community Reviews and Weighted Score from Letterboxd
 * Handles slug disambiguation via IMDb redirects and omits reviews with spoiler warnings.
 */
async function fetchLetterboxdData(title: string, releaseYear?: string, imdbId?: string): Promise<{
  reviews: ReviewItem[];
  score?: { rating: number; count: number };
}> {
  if (!title && !imdbId) return { reviews: [] };

  try {
    let filmSlug = "";

    // 1. Resolve exact canonical slug using IMDb ID redirect if available
    if (imdbId && imdbId.startsWith("tt")) {
      try {
        const redirectRes = await fetch(`https://letterboxd.com/imdb/${imdbId}/`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(3500),
        });
        if (redirectRes.ok) {
          const match = redirectRes.url.match(/letterboxd\.com\/film\/([^\/]+)/);
          if (match) {
            filmSlug = match[1];
          }
        }
      } catch (err) {
        // Fall back to title slug
      }
    }

    // Fallback: derive slug from title and release year (e.g. oppenheimer-2023 or batman-1989)
    if (!filmSlug && title) {
      const rawSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      filmSlug = releaseYear && /^\d{4}$/.test(releaseYear) ? `${rawSlug}-${releaseYear}` : rawSlug;
    }

    if (!filmSlug) return { reviews: [] };

    let letterboxdScore: { rating: number; count: number } | undefined;

    // 2. Fetch Film Main Page for JSON-LD Aggregate Rating
    try {
      const mainRes = await fetch(`https://letterboxd.com/film/${filmSlug}/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(3500),
      });

      if (mainRes.ok) {
        const mainHtml = await mainRes.text();
        const jsonLdMatch = mainHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
        if (jsonLdMatch) {
          const cleanJson = jsonLdMatch[1]
            .replace(/\/\*\s*<!\[CDATA\[\s*\*\//g, '')
            .replace(/\/\*\s*\]\]>\s*\*\//g, '')
            .replace(/<!\[CDATA\[/g, '')
            .replace(/\]\]>/g, '')
            .trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.aggregateRating?.ratingValue) {
            letterboxdScore = {
              rating: Number(parsed.aggregateRating.ratingValue),
              count: Number(parsed.aggregateRating.ratingCount || parsed.aggregateRating.reviewCount || 0),
            };
          }
        }
      }
    } catch {
      // Quiet fallback
    }

    // 3. Fetch Top Activity Reviews Page
    const reviews: ReviewItem[] = [];
    try {
      const revUrl = `https://letterboxd.com/film/${filmSlug}/reviews/by/activity/`;
      const revRes = await fetch(revUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(4000),
      });

      if (revRes.ok) {
        const revHtml = await revRes.text();
        const regex = /<strong class="displayname">([^<]+)<\/strong>[\s\S]*?(?:<span class="rating rated-(\d+)")?[\s\S]*?<time class="timestamp"[^>]*>([^<]+)<\/time>[\s\S]*?<div class="body-text -prose[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

        let match;
        while ((match = regex.exec(revHtml)) !== null && reviews.length < 8) {
          const author = match[1].trim();
          const rawRated = match[2] ? parseInt(match[2], 10) : null;
          const score = rawRated ? rawRated / 2 : 4;
          const dateStr = match[3] ? match[3].trim() : 'Letterboxd Review';
          const rawBody = match[4] || '';
          const cleanBody = rawBody
            .replace(/<[^>]+>/g, '')
            .replace(/&#039;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();

          const surrounding = revHtml.slice(Math.max(0, match.index - 200), match.index + match[0].length + 100);
          const isSpoiler = cleanBody.includes("This review may contain spoilers") ||
                            rawBody.includes("This review may contain spoilers") ||
                            surrounding.includes("This review may contain spoilers") ||
                            surrounding.includes("contains-spoilers") ||
                            surrounding.includes("has-spoilers");

          // Strictly omit reviews containing spoilers
          if (isSpoiler) continue;

          if (cleanBody && author) {
            reviews.push({
              id: `letterboxd-${filmSlug}-${author}-${reviews.length + 1}`,
              author,
              content: cleanBody,
              score,
              date: dateStr,
              likes: 0,
              source: 'letterboxd',
              publication: 'Letterboxd',
              sourceUrl: `https://letterboxd.com/${encodeURIComponent(author)}/film/${filmSlug}/`,
              hasSpoilers: false,
            });
          }
        }
      }
    } catch {
      // Quiet fallback
    }

    return {
      reviews,
      score: letterboxdScore,
    };
  } catch (err) {
    console.warn("[ReviewsRoute] Letterboxd scrape failed:", err);
    return { reviews: [] };
  }
}

/**
 * Fetch Authentic Critic Scores (Rotten Tomatoes, Metacritic, IMDb) from OMDb
 */
async function fetchOmdbCriticScores(title: string, year?: string, imdbId?: string): Promise<{
  rottenTomatoes?: { criticsScore: number; audienceScore?: number };
  metacritic?: number;
  imdb?: number;
}> {
  const apiKey = process.env.OMDB_API_KEY || "trilogy";
  try {
    let url = `http://www.omdbapi.com/?apikey=${apiKey}`;
    if (imdbId && imdbId.startsWith("tt")) {
      url += `&i=${encodeURIComponent(imdbId)}`;
    } else {
      url += `&t=${encodeURIComponent(title)}`;
      if (year) {
        const y = year.slice(0, 4);
        if (/^\d{4}$/.test(y)) url += `&y=${y}`;
      }
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return {};
    const data = await res.json();
    if (data.Response === "False") return {};

    const scores: any = {};

    // Real IMDb Rating
    if (data.imdbRating && data.imdbRating !== "N/A") {
      const num = parseFloat(data.imdbRating);
      if (!isNaN(num)) scores.imdb = num;
    }

    // Real Metacritic Metascore
    if (data.Metascore && data.Metascore !== "N/A") {
      const num = parseInt(data.Metascore, 10);
      if (!isNaN(num)) scores.metacritic = num;
    }

    // Real Rotten Tomatoes Score
    if (Array.isArray(data.Ratings)) {
      const rt = data.Ratings.find((r: any) => r.Source === "Rotten Tomatoes");
      if (rt && rt.Value) {
        const match = rt.Value.match(/(\d+)%/);
        if (match) {
          scores.rottenTomatoes = {
            criticsScore: parseInt(match[1], 10),
          };
        }
      }
    }

    return scores;
  } catch (err) {
    console.warn("[ReviewsRoute] OMDb fetch failed:", err);
    return {};
  }
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

// Server-side persistent in-memory cache with TTL tracking
const serverReviewsCache = new Map<string, { timestamp: number; ttl: number; data: any }>();

/**
 * Main Unified Reviews Aggregation Endpoint
 * GET /api/reviews/aggregate
 */
router.get("/reviews/aggregate", async (req, res) => {
  const { title, mediaType, tmdbId, author, isbn, useAI, imdbId, releaseYear } = req.query;

  if (!title && !tmdbId && !isbn) {
    return res.status(400).json({ error: "title, tmdbId, or isbn is required" });
  }

  const type = (mediaType as string) || "movie";
  const titleStr = (title as string) || "";
  const authorStr = (author as string) || "";
  const isbnStr = (isbn as string) || "";
  const imdbIdStr = (imdbId as string) || "";
  const releaseYearStr = (releaseYear as string) || "";
  const shouldRunAI = useAI === "true" || useAI === "1";

  // Tiered Dynamic Caching Strategy:
  // Older Catalog Movies (>1 year ago): 30-day cache (reviews are static and stable).
  // New / Current Releases (<=1 year): 48-hour cache (ratings/reviews actively submitted).
  const releaseYearNum = parseInt(releaseYearStr, 10);
  const currentYear = new Date().getFullYear();
  const isOlderCatalog = !isNaN(releaseYearNum) && releaseYearNum < currentYear - 1;

  const cacheTTL = isOlderCatalog
    ? 30 * 24 * 60 * 60 * 1000 // 30 days
    : 48 * 60 * 60 * 1000;      // 48 hours

  const cacheControlHeader = isOlderCatalog
    ? "public, s-maxage=2592000, max-age=604800, stale-while-revalidate=86400"
    : "public, s-maxage=172800, max-age=86400, stale-while-revalidate=43200";

  res.setHeader("Cache-Control", cacheControlHeader);

  const cacheKey = `${type}_${titleStr.toLowerCase()}_${tmdbId || ''}_${imdbIdStr}_${isbnStr || ''}_${shouldRunAI}`;
  if (serverReviewsCache.has(cacheKey)) {
    const entry = serverReviewsCache.get(cacheKey)!;
    if (Date.now() - entry.timestamp < entry.ttl) {
      return res.json(entry.data);
    }
  }

  try {
    const reviews: ReviewItem[] = [];
    let scores: any = {};


    // 1. Movies & TV aggregation
    if (type === "movie" || type === "tv") {
      const [nytReviews, traktReviews, omdbScores, letterboxdData] = await Promise.all([
        fetchNytMovieReviews(titleStr),
        tmdbId ? fetchTraktComments(tmdbId as string, type) : Promise.resolve([]),
        titleStr ? fetchOmdbCriticScores(titleStr, releaseYearStr, imdbIdStr) : Promise.resolve({}),
        type === 'movie' && titleStr ? fetchLetterboxdData(titleStr, releaseYearStr, imdbIdStr) : Promise.resolve({ reviews: [] }),
      ]);

      reviews.push(...nytReviews);
      reviews.push(...(letterboxdData.reviews || []));
      reviews.push(...traktReviews);
      scores = { ...scores, ...omdbScores };

      if (letterboxdData.score) {
        scores.letterboxd = letterboxdData.score;
      }
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
