import { Router, Request, Response } from "express";

const router = Router();

// In-memory cache for candidate discovery pools (5 min TTL)
const CANDIDATE_CACHE = new Map<string, { data: CandidateItem[]; timestamp: number }>();
const IN_FLIGHT_PROMISES = new Map<string, Promise<CandidateItem[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CandidateItem {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'book';
  releaseDate: string;
  synopsis: string;
  overview?: string;
  coverUrl: string;
  backdropUrl?: string;
  genres: string[];
  creators: string[];
  platforms: string[];
  voteAverage: number;
  rating?: number;
}

// Fetch TMDB Candidates (Movies & TV) with in-flight deduplication
function fetchTmdbCandidates(type: 'movie' | 'tv'): Promise<CandidateItem[]> {
  const cacheKey = `tmdb_candidates_${type}`;
  const cached = CANDIDATE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  // Deduplicate concurrent in-flight fetches
  if (IN_FLIGHT_PROMISES.has(cacheKey)) {
    return IN_FLIGHT_PROMISES.get(cacheKey)!;
  }

  const rawKey = process.env.TMDB_API_KEY || '';
  if (!rawKey) return Promise.resolve([]);

  const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
  const isBearer = tmdbKey.length > 40;
  const headers = {
    accept: 'application/json',
    ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
  };
  const keyParam = !isBearer ? `&api_key=${tmdbKey}` : '';

  const endpoints = [
    `https://api.themoviedb.org/3/trending/${type}/week?language=en-US${keyParam}`,
    `https://api.themoviedb.org/3/${type}/top_rated?language=en-US&page=1${keyParam}`,
    `https://api.themoviedb.org/3/${type}/popular?language=en-US&page=1${keyParam}`
  ];

  const promise = (async () => {
    try {
      const candidatesMap = new Map<string, CandidateItem>();

      await Promise.all(
        endpoints.map(async (url) => {
          try {
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              const data = await res.json();
              for (const item of data.results || []) {
                const title = item.title || item.name || item.original_name;
                if (!title || !item.poster_path) continue;

                const id = `tmdb-${type}-${item.id}`;
                if (!candidatesMap.has(id)) {
                  candidatesMap.set(id, {
                    id,
                    title,
                    type,
                    releaseDate: item.release_date || item.first_air_date || '',
                    synopsis: item.overview || '',
                    overview: item.overview || '',
                    coverUrl: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
                    genres: (item.genre_ids || []).map((gid: number) => GENRE_ID_MAP[gid] || 'General'),
                    creators: [],
                    platforms: [],
                    voteAverage: item.vote_average || 7.0,
                    rating: item.vote_average || 7.0
                  });
                }
              }
            }
          } catch (err) {
            console.warn(`[Recommendations] Failed fetching ${url}:`, err);
          }
        })
      );

      const results = Array.from(candidatesMap.values());
      CANDIDATE_CACHE.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
    } finally {
      IN_FLIGHT_PROMISES.delete(cacheKey);
    }
  })();

  IN_FLIGHT_PROMISES.set(cacheKey, promise);
  return promise;
}

// Fetch Book Candidates (Apple Books Bestsellers RSS) with in-flight deduplication
function fetchBookCandidates(): Promise<CandidateItem[]> {
  const cacheKey = 'book_candidates';
  const cached = CANDIDATE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  if (IN_FLIGHT_PROMISES.has(cacheKey)) {
    return IN_FLIGHT_PROMISES.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const url = 'https://itunes.apple.com/us/rss/toppaidebooks/limit=60/json';
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const rawEntries = data.feed?.entry || [];
        const books: CandidateItem[] = rawEntries.map((e: any, idx: number) => {
          const rawTitle = e["im:name"]?.label || "";
          const rawAuthor = e["im:artist"]?.label || "";
          const rawCover = e["im:image"]?.[2]?.label || "";
          const coverUrl = rawCover.replace(/\/0x170bb\.png$/i, "/600x600bb.jpg").replace(/\/170x170bb\.png$/i, "/600x600bb.jpg");
          const genre = e.category?.attributes?.label || "Fiction";
          const id = e.id?.attributes?.["im:id"] || `itunes-book-${idx}`;

          return {
            id: `itunes-book-${id}`,
            title: rawTitle,
            type: "book" as const,
            releaseDate: e["im:releaseDate"]?.label?.substring(0, 10) || new Date().toISOString().substring(0, 10),
            synopsis: e.summary?.label || "Bestselling book edition.",
            overview: e.summary?.label || "Bestselling book edition.",
            coverUrl: coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80",
            backdropUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80",
            genres: [genre, "Bestseller"],
            creators: [rawAuthor],
            platforms: ["Print", "Kindle", "Apple Books"],
            voteAverage: 8.5,
            rating: 8.5
          };
        });

        CANDIDATE_CACHE.set(cacheKey, { data: books, timestamp: Date.now() });
        return books;
      }
    } catch (err) {
      console.warn('[Recommendations] Failed fetching book candidates:', err);
    } finally {
      IN_FLIGHT_PROMISES.delete(cacheKey);
    }
    return [];
  })();

  IN_FLIGHT_PROMISES.set(cacheKey, promise);
  return promise;
}

const GENRE_ID_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
};

// ---------------------------------------------------------------------------
// POST /api/recommendations
// ---------------------------------------------------------------------------
router.post("/recommendations", async (req: Request, res: Response) => {
  try {
    const { library = [], mediaType, limit = 30 } = req.body;

    // 1. Gather all candidates across media types with fast concurrent fetching & deduplication
    let candidates: CandidateItem[] = [];
    if (!mediaType || mediaType === 'all') {
      const [movies, tv, books] = await Promise.all([
        fetchTmdbCandidates('movie'),
        fetchTmdbCandidates('tv'),
        fetchBookCandidates()
      ]);
      candidates = [...movies, ...tv, ...books];
    } else if (mediaType === 'movie') {
      candidates = await fetchTmdbCandidates('movie');
    } else if (mediaType === 'tv') {
      candidates = await fetchTmdbCandidates('tv');
    } else if (mediaType === 'book') {
      candidates = await fetchBookCandidates();
    }

    // 2. Build tracked identifiers set for hard exclusions
    const trackedSet = new Set<string>();
    for (const item of library) {
      if (item.id) trackedSet.add(String(item.id).toLowerCase());
      if (item.sourceId) trackedSet.add(String(item.sourceId).toLowerCase());
      if (item.title) trackedSet.add(String(item.title).trim().toLowerCase());
    }

    // 3. Cold Start check (< 2 library items)
    if (!Array.isArray(library) || library.length < 2) {
      const fallback = candidates
        .filter(c => !trackedSet.has(c.id.toLowerCase()) && !trackedSet.has(c.title.trim().toLowerCase()))
        .sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0))
        .slice(0, limit)
        .map(item => ({
          ...item,
          matchScore: 85,
          reason: "Popular & Highly Rated"
        }));

      return res.json({ recommendations: fallback });
    }

    // 4. Build User Taste Profile
    const tasteProfile = {
      genres: {} as Record<string, number>,
      creators: {} as Record<string, number>
    };

    for (const item of library) {
      let weight = 1.0;
      if (item.favorite) weight += 5.0;
      if (item.status === 'completed') weight += 4.0;
      else if (item.status === 'in-progress' || item.status === 'in_progress') weight += 2.0;
      else if (item.status === 'backlog' || item.status === 'planned') weight += 1.0;
      else if (item.status === 'abandoned' || item.status === 'dropped') weight -= 4.0;

      if (typeof item.rating === 'number' && item.rating > 0) {
        const normalized = item.rating > 5 ? item.rating / 2 : item.rating;
        weight += (normalized - 3.0) * 1.5;
      }

      if (Array.isArray(item.genres)) {
        for (const g of item.genres) {
          if (g) tasteProfile.genres[g] = (tasteProfile.genres[g] || 0) + weight;
        }
      }

      if (Array.isArray(item.creators)) {
        for (const c of item.creators) {
          if (c) tasteProfile.creators[c] = (tasteProfile.creators[c] || 0) + weight;
        }
      }
    }

    // 5. Score Candidates
    const scoredList: Array<CandidateItem & { matchScore: number; reason: string }> = [];

    for (const item of candidates) {
      const lowerTitle = item.title.trim().toLowerCase();
      if (trackedSet.has(item.id.toLowerCase()) || trackedSet.has(lowerTitle)) {
        continue;
      }

      let genreScore = 0;
      const matchedGenres: string[] = [];
      for (const g of item.genres || []) {
        const val = tasteProfile.genres[g] || 0;
        if (val > 0) {
          genreScore += val;
          matchedGenres.push(g);
        } else if (val < 0) {
          genreScore += val * 1.2;
        }
      }

      let creatorScore = 0;
      let matchedCreator: string | null = null;
      for (const c of item.creators || []) {
        const val = tasteProfile.creators[c] || 0;
        if (val > 0) {
          creatorScore += val * 2.0;
          if (!matchedCreator) matchedCreator = c;
        }
      }

      const qualityPrior = item.voteAverage || 6.5;
      const totalRaw = genreScore * 0.5 + creatorScore * 0.3 + qualityPrior * 0.2;

      if (totalRaw <= 0) continue;

      const matchScore = Math.min(98, Math.max(65, Math.round(65 + Math.tanh(totalRaw / 12) * 33)));

      let reason = "Trending in your favorite categories";
      if (matchedCreator) {
        reason = `From ${matchedCreator}`;
      } else if (matchedGenres.length > 0) {
        reason = `Top match in ${matchedGenres.slice(0, 2).join(' & ')}`;
      }

      scoredList.push({
        ...item,
        matchScore,
        reason
      });
    }

    scoredList.sort((a, b) => b.matchScore - a.matchScore);

    // 6. Apply Diversity (Max 3 per dominant genre)
    const diverseResults: Array<CandidateItem & { matchScore: number; reason: string }> = [];
    const genreCounts: Record<string, number> = {};

    for (const rec of scoredList) {
      if (diverseResults.length >= limit) break;
      const primaryGenre = rec.genres?.[0] || 'General';
      const count = genreCounts[primaryGenre] || 0;

      if (count < 3 || scoredList.length < limit * 1.5) {
        diverseResults.push(rec);
        genreCounts[primaryGenre] = count + 1;
      }
    }

    return res.json({ recommendations: diverseResults });
  } catch (error) {
    console.error("[Recommendations] Engine execution failed:", error);
    return res.status(500).json({ error: "Failed to compute recommendations" });
  }
});

export default router;
