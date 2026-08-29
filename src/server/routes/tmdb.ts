import express, { Router } from "express";
import fs from "fs";
import path from "path";
import { Type } from "@google/genai";
import { getGeminiClient } from "../config/gemini.js";

import { findUserByUsernameOrEmail, getUserIdByToken } from "../services/db.js";

const router = Router();


const nytCache = new Map<string, { data: any, timestamp: number }>();
const nytPendingPromises = new Map<string, Promise<any>>();
const NYT_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// Title Sanitizer & Quality Filters for Books and Audiobooks
export function sanitizeBookTitle(rawTitle: string): string {
  if (!rawTitle) return "Unknown Title";
  return rawTitle
    .replace(/\s*\((?:Unabridged|Abridged|Original Audio Edition|Audible Original)\)/gi, '')
    .replace(/\s*:\s*(?:A Novel|A Memoir|A Thriller|A True Story|A Biography|An Apple Books Classic edition)$/gi, '')
    .replace(/\s*[\.:]?\s*(?:THE|THE #1|#1)?\s*(?:NEW YORK TIMES|SUNDAY TIMES|INTERNATIONAL)?\s*BESTSELLER\b.*/gi, '')
    .replace(/\s*:\s*A GMA Book Club Pick\b.*/gi, '')
    .replace(/\s*:\s*A Reese\'s Book Club Pick\b.*/gi, '')
    .replace(/\s*:\s*A Book Club Pick\b.*/gi, '')
    .trim();
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  if (str === str.toUpperCase() && str.length > 3) {
    return str.toLowerCase().replace(/\b\w+/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1));
  }
  return str;
}

export function isJunkBook(title: string, author: string): boolean {
  if (!title || !author) return true;
  const lowerTitle = title.toLowerCase();
  const lowerAuthor = author.toLowerCase();
  if (lowerAuthor === "n/a" || lowerAuthor === "unknown" || lowerAuthor === "unknown author" || lowerAuthor === "various authors") return true;

  // Generic junk and test preparation filter
  if (
    lowerTitle.includes("workbook for") ||
    lowerTitle.includes("study guide for") ||
    lowerTitle.includes("summary of") ||
    lowerTitle.includes("summary & analysis") ||
    lowerTitle.includes("key takeaways") ||
    lowerTitle.includes("quiz for") ||
    lowerTitle.includes("cliff notes") ||
    lowerTitle.includes("almanac 19") ||
    lowerTitle.includes("calendar 20") ||
    lowerTitle.includes("lesson plan") ||
    lowerTitle.includes("coloring book") ||
    lowerTitle.includes("word search") ||
    lowerTitle.includes("crossword") ||
    lowerTitle.includes("sudoku") ||
    lowerTitle.includes("log book") ||
    lowerTitle.includes("daily planner")
  ) return true;

  // Filter out cooking, recipes, diet guides, and food manuals
  if (
    lowerTitle.includes("cookbook") ||
    lowerTitle.includes("recipes") ||
    lowerTitle.includes("air fryer") ||
    lowerTitle.includes("instant pot") ||
    lowerTitle.includes("keto diet") ||
    lowerTitle.includes("meal prep") ||
    lowerTitle.includes("weight loss diet") ||
    lowerTitle.includes("canning guide") ||
    lowerTitle.includes("baking guide") ||
    lowerTitle.includes("diet plan") ||
    lowerTitle.includes("nutrition guide") ||
    lowerTitle.includes("food & wine")
  ) return true;

  // Filter out magazines and periodicals
  if (
    lowerTitle.includes("magazine") ||
    lowerTitle.includes("periodical") ||
    lowerTitle.includes("journal of") ||
    lowerTitle.includes("issue #") ||
    lowerTitle.includes("vol. ")
  ) return true;

  return false;
}

// Curated top-tier YA literature catalog for authentic fallbacks
const CURATED_YA_TITLES = [
  "A Good Girl's Guide to Murder Holly Jackson",
  "Powerless Lauren Roberts",
  "The Cruel Prince Holly Black",
  "The Inheritance Games Jennifer Lynn Barnes",
  "Better Than the Movies Lynn Painter",
  "Divine Rivals Rebecca Ross",
  "Six of Crows Leigh Bardugo",
  "The Ballad of Songbirds and Snakes Suzanne Collins",
  "They Both Die at the End Adam Silvera",
  "One of Us Is Lying Karen M. McManus",
  "Once Upon a Broken Heart Stephanie Garber",
  "Shatter Me Tahereh Mafi",
  "Legendborn Tracy Deonn",
  "We Were Liars E. Lockhart",
  "Heartless Marissa Meyer",
  "A Court of Thorns and Roses Sarah J. Maas",
  "Fourth Wing Rebecca Yarros",
  "Iron Flame Rebecca Yarros",
  "Heartstopper Alice Oseman",
  "The Summer I Turned Pretty Jenny Han",
  "Five Survive Holly Jackson",
  "Reckless Lauren Roberts"
];

const fetchCuratedYABooks = async (pageNum: number = 1): Promise<any[]> => {
  const pageSize = 12;
  const startIndex = ((pageNum - 1) * pageSize) % CURATED_YA_TITLES.length;
  const slice = CURATED_YA_TITLES.slice(startIndex, startIndex + pageSize);
  if (slice.length === 0) return [];

  const promises = slice.map(async (searchQuery, idx) => {
    try {
      const q = encodeURIComponent(searchQuery);
      const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=ebook&limit=1`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      const item = data.results?.[0];
      if (!item) return null;

      const rawTitle = item.trackName || searchQuery;
      const rawAuthor = item.artistName || "YA Author";
      const cleanTitle = sanitizeBookTitle(toTitleCase(rawTitle));
      const coverUrl = item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "";
      const releaseDate = item.releaseDate ? item.releaseDate.substring(0, 10) : "2023-01-01";
      const synopsis = (item.description || "A bestselling Young Adult novel.").replace(/<[^>]+>/g, '').slice(0, 350);

      let hash = 0;
      for (let i = 0; i < cleanTitle.length; i++) hash = (hash * 31 + cleanTitle.charCodeAt(i)) % 300;
      const pageCount = 280 + (hash % 220);

      return {
        id: `itunes-book-${item.trackId || idx}`,
        title: cleanTitle,
        type: "book",
        releaseDate,
        synopsis,
        overview: synopsis,
        genres: ["Young Adult", "Fiction", "Bestseller"],
        creators: [rawAuthor],
        platforms: ["Print", "Kindle", "Apple Books", "Ebook"],
        coverUrl: coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80",
        rating: 9.2 + (hash % 8) / 10,
        bookSpecifics: {
          author: rawAuthor,
          currentPage: 0,
          totalPages: pageCount,
          pageCount: pageCount,
          format: 'ebook'
        }
      };
    } catch {
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter(Boolean);
};

// Fetch Apple Books Top Ebooks Chart with High-Res Artwork and Quality Filters
const fetchAppleBooksChart = async (genreId?: number | string): Promise<any[]> => {
  try {
    const url = genreId 
      ? `https://itunes.apple.com/us/rss/toppaidebooks/limit=50/genre=${genreId}/json`
      : `https://itunes.apple.com/us/rss/toppaidebooks/limit=50/json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = await res.json();
    const rawEntries = data.feed?.entry || [];

    const cleanBooks = rawEntries.map((e: any, idx: number) => {
      const rawTitle = e["im:name"]?.label || "";
      const rawAuthor = e["im:artist"]?.label || "";
      const cleanTitle = sanitizeBookTitle(toTitleCase(rawTitle));
      const rawCover = e["im:image"]?.[2]?.label || "";
      const coverUrl = rawCover.replace(/\/0x170bb\.png$/i, "/600x600bb.jpg").replace(/\/170x170bb\.png$/i, "/600x600bb.jpg");
      const id = e.id?.attributes?.["im:id"] || `itunes-book-${idx}`;
      const genre = e.category?.attributes?.label || "Fiction";
      const releaseDate = e["im:releaseDate"]?.label?.substring(0, 10) || new Date().toISOString().substring(0, 10);
      const synopsis = e.summary?.label || "Acclaimed bestselling book edition.";
      
      let hash = 0;
      for (let i = 0; i < cleanTitle.length; i++) hash = (hash * 31 + cleanTitle.charCodeAt(i)) % 300;
      const pageCount = 260 + (hash % 240);

      return {
        id: `itunes-book-${id}`,
        title: cleanTitle,
        type: "book",
        releaseDate,
        synopsis: synopsis.replace(/<[^>]+>/g, '').slice(0, 350),
        overview: synopsis.replace(/<[^>]+>/g, '').slice(0, 350),
        genres: [genre, "Bestseller"],
        creators: [rawAuthor],
        platforms: ["Print", "Kindle", "Apple Books", "Ebook"],
        coverUrl: coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80",
        rating: 9.0 + (hash % 10) / 10,
        bookSpecifics: {
          author: rawAuthor,
          currentPage: 0,
          totalPages: pageCount,
          pageCount: pageCount,
          format: 'ebook'
        }
      };
    }).filter((b: any) => !isJunkBook(b.title, b.bookSpecifics.author));

    return cleanBooks;
  } catch (err) {
    console.error("Failed to fetch Apple Books chart:", err);
    return [];
  }
};

// Fetch Apple Audiobooks Top Chart with High-Res Artwork and Quality Filters
const fetchAppleAudiobooksChart = async (genreId?: number | string): Promise<any[]> => {
  try {
    const url = genreId
      ? `https://itunes.apple.com/us/rss/topaudiobooks/limit=50/genre=${genreId}/json`
      : `https://itunes.apple.com/us/rss/topaudiobooks/limit=50/json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = await res.json();
    const rawEntries = data.feed?.entry || [];

    const cleanAudiobooks = rawEntries.map((e: any, idx: number) => {
      const rawTitle = e["im:name"]?.label || "";
      const rawAuthor = e["im:artist"]?.label || "";
      const cleanTitle = sanitizeBookTitle(toTitleCase(rawTitle));
      const rawCover = e["im:image"]?.[2]?.label || "";
      const coverUrl = rawCover.replace(/\/170x170bb\.png$/i, "/600x600bb.jpg").replace(/\/170x170bb\.jpg$/i, "/600x600bb.jpg");
      const id = e.id?.attributes?.["im:id"] || `itunes-audiobook-${idx}`;
      const genre = e.category?.attributes?.label || "Audiobook";
      const releaseDate = e["im:releaseDate"]?.label?.substring(0, 10) || new Date().toISOString().substring(0, 10);
      const synopsis = e.summary?.label || "Acclaimed bestselling audiobook performance.";

      let hash = 0;
      for (let i = 0; i < cleanTitle.length; i++) hash = (hash * 31 + cleanTitle.charCodeAt(i)) % 300;
      const durationMinutes = 360 + (hash % 480);

      return {
        id: `itunes-audiobook-${id}`,
        title: cleanTitle,
        type: "book",
        releaseDate,
        synopsis: synopsis.replace(/<[^>]+>/g, '').slice(0, 350),
        overview: synopsis.replace(/<[^>]+>/g, '').slice(0, 350),
        genres: [genre, "Audiobook", "Bestseller"],
        creators: [rawAuthor],
        narrators: [rawAuthor],
        platforms: ["Audible", "Apple Books", "Audiobook"],
        coverUrl: coverUrl || "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&auto=format&fit=crop&q=80",
        rating: 9.1 + (hash % 9) / 10,
        bookSpecifics: {
          author: rawAuthor,
          narrator: rawAuthor,
          durationMinutes,
          format: 'audiobook'
        }
      };
    }).filter((b: any) => !isJunkBook(b.title, b.bookSpecifics.author));

    return cleanAudiobooks;
  } catch (err) {
    console.error("Failed to fetch Apple Audiobooks chart:", err);
    return [];
  }
};

const fetchNYTBooks = async (pageNum: number = 1, category: string = 'trending') => {
  const nytKey = process.env.NYT_API_KEY || process.env.NYTIMES_API_KEY;
  if (!nytKey) return null;

  const cacheKey = `${category}-${pageNum}`;
  if (nytCache.has(cacheKey)) {
    const cached = nytCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < NYT_CACHE_TTL) {
      return cached.data;
    }
  }

  if (nytPendingPromises.has(cacheKey)) {
    return nytPendingPromises.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      let lists: string[] = [];
      if (category === 'youngAdult' || category === 'youngAdultBooks') {
        lists = ['young-adult-hardcover'];
      } else if (category === 'fiction' || category === 'fictionBooks') {
        lists = ['hardcover-fiction'];
      } else if (category === 'nonfiction' || category === 'nonFictionBooks') {
        lists = ['hardcover-nonfiction', 'paperback-nonfiction-monthly'];
      } else if (category === 'trending' || category === 'trendingBooks') {
        lists = ['trade-fiction-paperback'];
      } else if (category === 'bestseller' || category === 'bestsellerBooks') {
        lists = ['combined-print-and-e-book-fiction'];
      } else if (category === 'audiobook' || category === 'bestsellerAudiobooks' || category === 'trendingAudiobooks') {
        lists = ['audio-fiction', 'audio-nonfiction'];
      } else {
        lists = ['hardcover-fiction', 'trade-fiction-paperback'];
      }
      
      const list = lists[(pageNum - 1) % lists.length];
      const res = await fetch(`https://api.nytimes.com/svc/books/v3/lists/current/${list}.json?api-key=${nytKey}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      
      const mapped = (data.results?.books || []).map((b: any) => {
        const isbn = b.primary_isbn13 || b.primary_isbn10 || "";
        const genreName = list.includes('young-adult') ? "Young Adult" : (list.includes('nonfiction') ? "Non-fiction" : (list.includes('audio') ? "Audiobook" : "Fiction"));
        const author = b.author || "Unknown Author";
        const cleanTitle = sanitizeBookTitle(toTitleCase(b.title || ""));
        let hash = 0;
        for (let i = 0; i < cleanTitle.length; i++) hash = (hash * 31 + cleanTitle.charCodeAt(i)) % 300;
        const pageCount = 240 + (hash % 250);
        
        return {
          id: `nyt-${isbn || cleanTitle.replace(/\s+/g, '-').toLowerCase()}`,
          source: 'manual',
          sourceId: null,
          discoveredVia: 'nyt',
          isbn13: isbn || null,
          title: cleanTitle,
          type: "book",
          releaseDate: b.published_date || new Date().toISOString().substring(0,10),
          synopsis: b.description || "A New York Times Bestseller.",
          overview: b.description || "A New York Times Bestseller.",
          genres: [genreName, "Bestseller"],
          creators: [author],
          platforms: list.includes('audio') ? ["Audible", "Apple Books", "Audiobook"] : ["Print", "Ebook", "Audiobook"],
          coverUrl: b.book_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80",
          backdropUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80",
          rating: 9.0 + (hash % 10) / 10,
          bookSpecifics: {
            author: author,
            totalPages: pageCount,
            currentPage: 0,
            format: list.includes('audio') ? 'audiobook' : 'paperback',
            publisher: b.publisher
          }
        };
      }).filter((b: any) => !isJunkBook(b.title, b.bookSpecifics.author));
      
      if (mapped.length > 0) {
        nytCache.set(cacheKey, { data: mapped, timestamp: Date.now() });
      }
      return mapped;
    } catch (e) {
      console.error("NYT API Error:", e);
      return null;
    } finally {
      nytPendingPromises.delete(cacheKey);
    }
  })();

  nytPendingPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
};

const fetchCategoryBooks = async (category: 'youngAdult' | 'fiction' | 'nonfiction' | 'trending' | 'bestseller', pageNum: number = 1) => {
  // 1. Try NYT Bestsellers first
  const nytBooks = await fetchNYTBooks(pageNum, category);
  if (nytBooks && nytBooks.length > 0) return nytBooks;

  // 2. High-Fidelity Young Adult Curation
  if (category === 'youngAdult') {
    const yaBooks = await fetchCuratedYABooks(pageNum);
    if (yaBooks && yaBooks.length > 0) return yaBooks;
  }

  // 3. Apple Books Charts Fallback for Fiction & Nonfiction
  let genreId: number | undefined;
  if (category === 'fiction' || category === 'trending' || category === 'bestseller') {
    genreId = 9031; // Fiction & Literature
  } else if (category === 'nonfiction') {
    genreId = 9002; // Nonfiction
  }

  const appleBooks = await fetchAppleBooksChart(genreId);
  if (appleBooks && appleBooks.length > 0) {
    const pageSize = 15;
    const startIndex = ((pageNum - 1) * pageSize) % Math.max(1, appleBooks.length);
    const paged = appleBooks.slice(startIndex, startIndex + pageSize);
    if (paged.length > 0) return paged;
    return appleBooks.slice(0, pageSize);
  }

  return [];
};
// API Endpoint: Refresh TMDB Metadata
const REFRESH_CACHE = new Map<string, { timestamp: number; data: any }>();
const REFRESH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

router.post("/tmdb-refresh", async (req, res) => {
  const { title, type, creators, tvdbId, releaseYear, runtime, releaseDate } = req.body;
  if (!title && !tvdbId) {
    return res.status(400).json({ error: "Title or tvdbId is required." });
  }

  // Support Book and Audiobook refresh via iTunes & Google Books APIs
  if (type === 'book' || type === 'book') {
    const mainAuthor = (Array.isArray(creators) && creators[0]) || "";
    const searchTerm = `${title} ${mainAuthor}`.trim();
    const q = encodeURIComponent(searchTerm);
    try {
      let synopsis = "";
      let coverUrl = "";

      const [itunesRes, gbooksRes] = await Promise.all([
        fetch(`https://itunes.apple.com/search?term=${q}&entity=${type === 'book' ? 'book' : 'ebook'}&limit=1`).catch(() => null),
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=1`).catch(() => null)
      ]);

      if (itunesRes && itunesRes.ok) {
        const data = await itunesRes.json();
        const item = data.results?.[0];
        if (item?.description) {
          synopsis = item.description.replace(/<[^>]*>?/gm, '').replace(/[\r\n]+/g, ' ').trim();
        }
        if (item?.artworkUrl100) {
          coverUrl = item.artworkUrl100.replace("100x100bb", "600x600bb");
        }
      }

      if (!synopsis && gbooksRes && gbooksRes.ok) {
        const data = await gbooksRes.json();
        const vol = data.items?.[0]?.volumeInfo;
        if (vol?.description) {
          synopsis = vol.description.replace(/<[^>]*>?/gm, '').replace(/[\r\n]+/g, ' ').trim();
        }
        if (!coverUrl && vol?.imageLinks?.thumbnail) {
          coverUrl = vol.imageLinks.thumbnail.replace("http:", "https:").replace("&edge=curl", "").replace("zoom=1", "zoom=3");
        }
      }

      return res.json({ synopsis, coverUrl });
    } catch (e) {
      console.error("Book refresh error:", e);
      return res.status(500).json({ error: "Failed to refresh book details." });
    }
  }

  if (!process.env.TMDB_API_KEY || (type !== 'movie' && type !== 'tv')) {
    return res.status(400).json({ error: "Invalid request or TMDB API key missing." });
  }

  const cleanTitle = (title || '').toLowerCase().trim();
  const cacheKey = `${type}-${tvdbId || cleanTitle}-${releaseYear || ''}`;
  const now = Date.now();
  if (REFRESH_CACHE.has(cacheKey)) {
    const cached = REFRESH_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < REFRESH_CACHE_TTL) {
      console.log(`[Cache Hit] Serving tmdb-refresh from cache for: ${cacheKey}`);
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const tmdbType = type === 'tv' ? 'tv' : 'movie';
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    // ── 1. TV Shows: Try Direct TheTVDB ID Resolution via TMDB /find ──
    if (tmdbType === 'tv' && tvdbId) {
      const cleanTvdbId = String(tvdbId).replace(/\D/g, '');
      if (cleanTvdbId) {
        const findUrl = `https://api.tmdb.org/3/find/${cleanTvdbId}?external_source=tvdb_id&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
        try {
          const findRes = await fetch(findUrl, { headers, signal: AbortSignal.timeout(8000) });
          if (findRes.ok) {
            const findData = await findRes.json();
            const tvMatch = findData.tv_results?.[0];
            if (tvMatch) {
              const refreshData = {
                tmdbId: `tmdb-${tvMatch.id}`,
                id: tvMatch.id,
                coverUrl: tvMatch.poster_path ? `https://image.tmdb.org/t/p/w500${tvMatch.poster_path}` : null,
                backdropUrl: tvMatch.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tvMatch.backdrop_path}` : null,
                synopsis: tvMatch.overview || null,
              };
              REFRESH_CACHE.set(cacheKey, { timestamp: now, data: refreshData });
              return res.json(refreshData);
            }
          }
        } catch (findErr) {
          console.warn(`[TMDB /find] Failed for TVDB ID ${cleanTvdbId}:`, findErr);
        }
      }
    }

    // ── 2. Movies & Fallback TV: Multi-Level Disambiguated Search ──
    const yearParam = releaseYear ? (tmdbType === 'movie' ? `&primary_release_year=${releaseYear}` : `&first_air_date_year=${releaseYear}`) : '';
    const tmdbUrl = `https://api.tmdb.org/3/search/${tmdbType}?query=${encodeURIComponent(title || '')}&language=en-US&page=1&include_adult=false${yearParam}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const tmdbRes = await fetch(tmdbUrl, { headers, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
    console.log(`[TMDB Refresh] Request: ${tmdbUrl} (Status: ${tmdbRes.status})`);

    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      const results = tmdbData.results || [];
      console.log(`[TMDB Refresh] Received ${results.length} results`);

      let matchedResult = results[0];

      // If multiple candidates exist for a movie and year/runtime is provided
      if (results.length > 1 && releaseYear) {
        const exactYearMatch = results.find((r: any) => {
          const itemDate = r.release_date || r.first_air_date || '';
          return itemDate.startsWith(String(releaseYear));
        });
        if (exactYearMatch) {
          matchedResult = exactYearMatch;
        }
      }

      if (matchedResult) {
        const refreshData = {
          tmdbId: `tmdb-${matchedResult.id}`,
          id: matchedResult.id,
          coverUrl: matchedResult.poster_path ? `https://image.tmdb.org/t/p/w500${matchedResult.poster_path}` : null,
          backdropUrl: matchedResult.backdrop_path ? `https://image.tmdb.org/t/p/w1280${matchedResult.backdrop_path}` : null,
          synopsis: matchedResult.overview || null,
        };
        REFRESH_CACHE.set(cacheKey, { timestamp: now, data: refreshData });
        return res.json(refreshData);
      }
    }

    return res.status(404).json({ error: "No TMDB result found." });
  } catch (error) {
    console.error("TMDB refresh failed:", error);
    return res.status(500).json({ error: "TMDB refresh failed." });
  }
});

const DETAILS_CACHE = new Map<string, { timestamp: number; data: any }>();
const DETAILS_CACHE_TTL = 30 * 60 * 1000;

// API Endpoint: Get Detailed Book & Audiobook Metadata (iTunes API + Google Books)
router.all("/tmdb-details", async (req, res) => {
  const { tmdbId, type } = (req.body && Object.keys(req.body).length > 0) ? req.body : req.query;
  if (!tmdbId || !process.env.TMDB_API_KEY || (type !== 'movie' && type !== 'tv')) {
    return res.status(400).json({ error: "Invalid request or TMDB API key missing." });
  }

  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();
  if (!/^\d+$/.test(cleanId)) {
    return res.status(400).json({ error: "Invalid numeric TMDB ID." });
  }

  const reqProgress = (req.body && req.body.progress) || (req.query && req.query.progress) || '';
  const reqStatus = (req.body && req.body.status) || (req.query && req.query.status) || '';
  const cacheKey = `${type}-${cleanId}-${reqProgress}-${reqStatus}`;
  const now = Date.now();
  if (DETAILS_CACHE.has(cacheKey)) {
    const cached = DETAILS_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < DETAILS_CACHE_TTL) {
      console.log(`[Cache Hit] Serving tmdb-details from cache for: ${cacheKey}`);
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const tmdbType = type === 'tv' ? 'tv' : 'movie';
    const tmdbUrl = `https://api.tmdb.org/3/${tmdbType}/${cleanId}?append_to_response=reviews,credits,videos,similar,recommendations,watch/providers,release_dates,content_ratings,external_ids&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const tmdbRes = await fetch(tmdbUrl, { headers, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
    
    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      
      const usProviders = tmdbData['watch/providers']?.results?.US;
      const streamingProviders = usProviders?.flatrate?.map((p: any) => ({ name: p.provider_name, logo: p.logo_path })) || [];
      const buyProviders = usProviders?.buy?.map((p: any) => ({ name: p.provider_name, logo: p.logo_path })) || [];
      
      let ageRating = null;
      if (tmdbType === 'movie') {
        const usRelease = tmdbData.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
        ageRating = usRelease?.release_dates?.[0]?.certification || null;
      } else {
        const usRating = tmdbData.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
        ageRating = usRating?.rating || null;
      }
      const imdbId = tmdbData.external_ids?.imdb_id || null;
      
      const rawSimilar = tmdbData.similar?.results || [];
      const rawRecommendations = tmdbData.recommendations?.results || [];
      const combinedSimilarMap = new Map();
      [...rawRecommendations, ...rawSimilar].forEach((item: any) => {
        if (item && item.id && !combinedSimilarMap.has(item.id)) {
          combinedSimilarMap.set(item.id, item);
        }
      });
      const combinedSimilar = Array.from(combinedSimilarMap.values());

      let computedStatus: string | null = null;
      let computedTvSpecifics: any = null;

      const userProgress = parseInt(String((req.body && req.body.progress) || (req.query && req.query.progress) || '0'), 10);
      const userStatus = String((req.body && req.body.status) || (req.query && req.query.status) || '').toLowerCase();
      const reqSeason = parseInt(String((req.body && req.body.currentSeason) || (req.query && req.query.currentSeason) || '0'), 10);
      const reqEpisode = parseInt(String((req.body && req.body.currentEpisode) || (req.query && req.query.currentEpisode) || '0'), 10);
      const seasonsList = (tmdbData.seasons || []).filter((s: any) => s.season_number > 0);
      
      const epsMap: Record<number, number> = {};
      seasonsList.forEach((s: any) => {
        if (s.season_number > 0) {
          epsMap[s.season_number] = s.episode_count || 0;
        }
      });

      const totalEps = tmdbData.number_of_episodes || Object.values(epsMap).reduce((a, b) => a + b, 0) || 0;
      const totalSeasons = tmdbData.number_of_seasons || seasonsList.length || 1;

      if (tmdbType === 'tv') {
        const isCompleted = userStatus === 'completed' || (totalEps > 0 && userProgress >= totalEps);
        const watchedMap: Record<string, boolean> = {};

        if (isCompleted) {
          computedStatus = 'completed';
          seasonsList.forEach((s: any) => {
            const epCount = s.episode_count || 0;
            for (let e = 1; e <= epCount; e++) {
              watchedMap[`S${s.season_number}E${e}`] = true;
            }
          });
          const lastSeason = seasonsList[seasonsList.length - 1];
          const finalSeasonNumber = lastSeason ? lastSeason.season_number : totalSeasons;
          const finalEpisodeNumber = lastSeason ? (lastSeason.episode_count || 1) : (epsMap[finalSeasonNumber] || 1);
          computedTvSpecifics = {
            currentSeason: finalSeasonNumber,
            currentEpisode: finalEpisodeNumber,
            totalSeasons,
            totalEpisodes: totalEps,
            episodesPerSeason: epsMap,
            watchedEpisodes: watchedMap,
            nextEpisodeAirDate: tmdbData.next_episode_to_air?.air_date || null,
          };
        } else if (reqSeason > 0 && reqEpisode > 0) {
          computedStatus = 'in-progress';
          for (const s of seasonsList) {
            const epCount = s.episode_count || 0;
            if (s.season_number < reqSeason) {
              for (let e = 1; e <= epCount; e++) {
                watchedMap[`S${s.season_number}E${e}`] = true;
              }
            } else if (s.season_number === reqSeason) {
              for (let e = 1; e <= Math.min(reqEpisode, epCount); e++) {
                watchedMap[`S${s.season_number}E${e}`] = true;
              }
            }
          }
          computedTvSpecifics = {
            currentSeason: reqSeason,
            currentEpisode: reqEpisode,
            totalSeasons,
            totalEpisodes: totalEps,
            episodesPerSeason: epsMap,
            watchedEpisodes: watchedMap,
            nextEpisodeAirDate: tmdbData.next_episode_to_air?.air_date || null,
          };
        } else if (userProgress > 0) {
          computedStatus = 'in-progress';
          let remaining = userProgress;
          let currentSeason = 1;
          let currentEpisode = 1;

          for (let i = 0; i < seasonsList.length; i++) {
            const s = seasonsList[i];
            const count = s.episode_count || 0;
            if (remaining > count) {
              for (let e = 1; e <= count; e++) {
                watchedMap[`S${s.season_number}E${e}`] = true;
              }
              remaining -= count;
            } else {
              for (let e = 1; e <= remaining; e++) {
                watchedMap[`S${s.season_number}E${e}`] = true;
              }
              if (remaining < count) {
                currentSeason = s.season_number;
                currentEpisode = remaining + 1; // Next unwatched episode in this season
              } else {
                // Season finished
                const nextSeason = seasonsList[i + 1];
                if (nextSeason) {
                  currentSeason = nextSeason.season_number;
                  currentEpisode = 1; // Start of next season
                } else {
                  currentSeason = s.season_number;
                  currentEpisode = count;
                  computedStatus = 'completed';
                }
              }
              break;
            }
          }

          computedTvSpecifics = {
            currentSeason,
            currentEpisode,
            totalSeasons,
            totalEpisodes: totalEps,
            episodesPerSeason: epsMap,
            watchedEpisodes: watchedMap,
            nextEpisodeAirDate: tmdbData.next_episode_to_air?.air_date || null,
          };
        } else {
          computedTvSpecifics = {
            currentSeason: 1,
            currentEpisode: 1,
            totalSeasons,
            totalEpisodes: totalEps,
            episodesPerSeason: epsMap,
            watchedEpisodes: {},
            nextEpisodeAirDate: tmdbData.next_episode_to_air?.air_date || null,
          };
        }
      }

      const detailsData = {
        rating: tmdbData.vote_average,
        voteCount: tmdbData.vote_count || 0,
        reviews: tmdbData.reviews?.results || [],
        cast: tmdbData.credits?.cast || [],
        creators: tmdbType === 'movie' 
          ? tmdbData.credits?.crew?.filter((c: any) => c.job === 'Director').map((c: any) => c.name) || []
          : (tmdbData.created_by?.length > 0 
              ? tmdbData.created_by.map((c: any) => c.name) 
              : tmdbData.credits?.crew?.filter((c: any) => c.job === 'Executive Producer').map((c: any) => c.name) || []),
        videos: tmdbData.videos?.results || [],
        similar: combinedSimilar,
        providers: { 
          streaming: streamingProviders, 
          buy: buyProviders, 
          watchLink: usProviders?.link || tmdbData['watch/providers']?.results?.US?.link || null,
          attribution: "Powered by JustWatch via TMDB",
        },
        tmdbId: cleanId,
        title: tmdbData.title || tmdbData.name || "Untitled",
        overview: tmdbData.overview || "",
        posterUrl: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
        backdropUrl: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` : null,
        releaseYear: (tmdbData.release_date || tmdbData.first_air_date || "").substring(0, 4) || null,
        runtime: tmdbData.runtime || tmdbData.episode_run_time?.[0] || 0,
        genres: tmdbData.genres?.map((g: any) => g.name) || [],
        networks: tmdbData.networks?.map((n: any) => n.name) || [],
        numberOfEpisodes: tmdbData.number_of_episodes || null,
        numberOfSeasons: tmdbData.number_of_seasons || null,
        seasons: tmdbData.seasons || [],
        nextEpisodeAirDate: tmdbData.next_episode_to_air?.air_date || null,
        nextEpisode: tmdbData.next_episode_to_air ? {
          seasonNumber: tmdbData.next_episode_to_air.season_number,
          episodeNumber: tmdbData.next_episode_to_air.episode_number,
          name: tmdbData.next_episode_to_air.name,
          airDate: tmdbData.next_episode_to_air.air_date,
        } : null,
        ageRating,
        imdbId,
        computedStatus,
        tvSpecifics: computedTvSpecifics
      };
      
      DETAILS_CACHE.set(cacheKey, { timestamp: now, data: detailsData });
      return res.json(detailsData);
    } else {
      const errorText = await tmdbRes.text();
      console.error(`[TMDB Details] Error Response Body: ${errorText}`);
    }
    return res.status(404).json({ error: "No TMDB details found." });
  } catch (error) {
    console.error("TMDB details failed:", error);
    return res.status(500).json({ error: "TMDB details failed." });
  }
});

// API Endpoint: TMDB Season Details
const SEASON_CACHE = new Map<string, { timestamp: number; data: any }>();
const SEASON_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

router.all("/tmdb-season", async (req, res) => {
  const { tmdbId, seasonNumber } = (req.body && Object.keys(req.body).length > 0) ? req.body : req.query;
  if (!tmdbId || seasonNumber === undefined || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Invalid request" });
  }

  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  const cacheKey = `${tmdbId}-season-${seasonNumber}`;
  const now = Date.now();
  if (SEASON_CACHE.has(cacheKey)) {
    const cached = SEASON_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < SEASON_CACHE_TTL) {
      console.log(`[Cache Hit] Serving tmdb-season from cache for: ${cacheKey}`);
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();
    const tmdbUrl = `https://api.tmdb.org/3/tv/${cleanId}/season/${seasonNumber}?language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };
    
    const tmdbRes = await fetch(tmdbUrl, { headers });
    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      const seasonData = { episodes: data.episodes || [] };
      SEASON_CACHE.set(cacheKey, { timestamp: now, data: seasonData });
      return res.json(seasonData);
    }
    return res.status(404).json({ error: "Season not found" });
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
});

// API Endpoint: TMDB TV Season Account States
router.post("/tmdb-tv/season-account-states", async (req, res) => {
  const { tmdbId, seasonNumber, sessionId } = req.body;
  if (!tmdbId || seasonNumber === undefined || !sessionId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();

    const tmdbUrl = `https://api.tmdb.org/3/tv/${cleanId}/season/${seasonNumber}/account_states?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const tmdbRes = await fetch(tmdbUrl, { headers });
    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json(data);
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Season Account States] Error Response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to fetch season account states from TMDB." });
    }
  } catch (error) {
    console.error("Fetch TMDB season account states failed:", error);
    return res.status(500).json({ error: "Fetch TMDB season account states failed." });
  }
});

// API Endpoint: TMDB TV Episode Rate (Watched Sync)
router.post("/tmdb-tv/episode-rate", async (req, res) => {
  const { tmdbId, seasonNumber, episodeNumber, sessionId, rating } = req.body;
  if (!tmdbId || seasonNumber === undefined || episodeNumber === undefined || !sessionId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();

    const method = rating === null ? 'DELETE' : 'POST';
    const tmdbUrl = `https://api.tmdb.org/3/tv/${cleanId}/season/${seasonNumber}/episode/${episodeNumber}/rating?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const body = rating !== null ? { value: rating } : undefined;

    const tmdbRes = await fetch(tmdbUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json({ success: true, data });
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Episode Rate] Error Response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to update TMDB episode rating." });
    }
  } catch (error) {
    console.error("Update TMDB episode rating failed:", error);
    return res.status(500).json({ error: "Update TMDB episode rating failed." });
  }
});

// API Endpoint: Create TMDB Auth Request Token
router.post("/tmdb-auth/request-token", async (req, res) => {
  const { customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!rawKey) {
    return res.status(400).json({ error: "Backend TMDB API key is missing." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;

    if (isBearer) {
      const url = `https://api.tmdb.org/4/auth/request_token`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tmdbKey}`
      };
  
      const tmdbRes = await fetch(url, { 
        method: 'POST', 
        headers,
        body: JSON.stringify({ redirect_to: req.headers.origin || 'http://localhost:3000' })
      });
      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        if (data.success && data.request_token) {
          return res.json({
            success: true,
            request_token: data.request_token,
            auth_url: `https://www.themoviedb.org/auth/access?request_token=${data.request_token}`
          });
        }
      }
      const errText = await tmdbRes.text();
      console.error("[TMDB Request Token v4] Error:", errText);
      return res.status(500).json({ error: "Failed to generate TMDB v4 request token." });
    } else {
      const url = `https://api.tmdb.org/3/authentication/token/new?api_key=${tmdbKey}`;
      const tmdbRes = await fetch(url);
      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        if (data.success && data.request_token) {
          return res.json({
            success: true,
            request_token: data.request_token,
            auth_url: `https://www.themoviedb.org/authenticate/${data.request_token}`
          });
        }
      }
      const errText = await tmdbRes.text();
      console.error("[TMDB Request Token v3] Error:", errText);
      return res.status(500).json({ error: "Failed to generate TMDB v3 request token." });
    }
  } catch (error) {
    console.error("TMDB Request Token error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// API Endpoint: Convert Request Token to Session ID & Fetch Account Details
router.post("/tmdb-auth/create-session", async (req, res) => {
  const { requestToken, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!requestToken || !rawKey) {
    return res.status(400).json({ error: "Missing request token or TMDB API key." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    
    if (isBearer) {
      // v4 Flow
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tmdbKey}`
      };

      // Step 1: Create v4 Access Token
      const v4AccessUrl = `https://api.tmdb.org/4/auth/access_token`;
      const v4AccessRes = await fetch(v4AccessUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ request_token: requestToken })
      });

      if (!v4AccessRes.ok) {
        const errText = await v4AccessRes.text();
        console.error("[TMDB Create v4 Access Token] Error:", errText);
        return res.status(400).json({ error: "Failed to create TMDB v4 access token. Ensure you approved the token on TMDB." });
      }

      const v4Data = await v4AccessRes.json();
      if (!v4Data.success || !v4Data.access_token) {
        return res.status(400).json({ error: "TMDB v4 access token creation failed." });
      }

      const tmdbAccessToken = v4Data.access_token;
      const accountIdFromV4 = v4Data.account_id;

      // Step 2: Convert v4 Access Token to v3 Session ID
      const convertUrl = `https://api.tmdb.org/3/authentication/session/convert/4`;
      const convertRes = await fetch(convertUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ access_token: tmdbAccessToken })
      });

      if (!convertRes.ok) {
        const errText = await convertRes.text();
        console.error("[TMDB Convert Session] Error:", errText);
        return res.status(400).json({ error: "Failed to convert TMDB v4 token to v3 session." });
      }

      const convertData = await convertRes.json();
      if (!convertData.success || !convertData.session_id) {
        return res.status(400).json({ error: "TMDB session conversion failed." });
      }

      const sessionId = convertData.session_id;

      // Step 3: Fetch Account details to get username
      const accountUrl = `https://api.tmdb.org/3/account?session_id=${sessionId}`;
      const accountRes = await fetch(accountUrl, { headers });

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        return res.json({
          success: true,
          sessionId,
          accountId: accountData.id ? accountData.id.toString() : accountIdFromV4.toString(),
          tmdbAccessToken,
          username: accountData.username || accountData.name || ''
        });
      } else {
        return res.json({
          success: true,
          sessionId,
          accountId: accountIdFromV4 ? accountIdFromV4.toString() : '',
          tmdbAccessToken
        });
      }
    } else {
      // v3 Flow
      const sessionUrl = `https://api.tmdb.org/3/authentication/session/new?api_key=${tmdbKey}`;
      const sessionRes = await fetch(sessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token: requestToken })
      });

      if (!sessionRes.ok) {
        const errText = await sessionRes.text();
        console.error("[TMDB Create Session v3] Error:", errText);
        return res.status(400).json({ error: "Failed to create TMDB session. Ensure you approved the token on TMDB." });
      }

      const sessionData = await sessionRes.json();
      if (!sessionData.success || !sessionData.session_id) {
        return res.status(400).json({ error: "TMDB session creation failed." });
      }

      const sessionId = sessionData.session_id;

      // Fetch Account details
      const accountUrl = `https://api.tmdb.org/3/account?session_id=${sessionId}&api_key=${tmdbKey}`;
      const accountRes = await fetch(accountUrl);

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        return res.json({
          success: true,
          sessionId,
          accountId: accountData.id ? accountData.id.toString() : '',
          tmdbAccessToken: undefined, // no v4 token in v3 flow
          username: accountData.username || accountData.name || ''
        });
      } else {
        return res.json({
          success: true,
          sessionId,
          accountId: '',
          tmdbAccessToken: undefined
        });
      }
    }
  } catch (error) {
    console.error("TMDB Create Session error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Production-grade User Account Cache Maps
const WATCHLIST_CACHE = new Map<string, { timestamp: number; data: any }>();
const FAVORITE_CACHE = new Map<string, { timestamp: number; data: any }>();
const ACCOUNT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// API Endpoint: TMDB Watchlist Get
router.post("/tmdb-watchlist/get", async (req, res) => {
  const { accountId, sessionId } = req.body;
  if (!accountId || !sessionId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required account credentials or backend TMDB API key." });
  }

  const cacheKey = `${accountId}-${sessionId}`;
  const now = Date.now();
  if (WATCHLIST_CACHE.has(cacheKey)) {
    const cached = WATCHLIST_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < ACCOUNT_CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    // Fetch movie watchlist
    const movieUrl = `https://api.tmdb.org/3/account/${accountId}/watchlist/movies?language=en-US&sort_by=created_at.desc&session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const tvUrl = `https://api.tmdb.org/3/account/${accountId}/watchlist/tv?language=en-US&sort_by=created_at.desc&session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const [movieRes, tvRes] = await Promise.all([
      fetch(movieUrl, { headers }),
      fetch(tvUrl, { headers })
    ]);

    if (!movieRes.ok || !tvRes.ok) {
      const errM = await movieRes.text();
      const errT = await tvRes.text();
      console.error("[TMDB Watchlist Get] error response:", errM, errT);
      return res.status(400).json({ error: "Failed to fetch watchlist from TMDB. Please check your TMDB Account ID and Session ID." });
    }

    const movieData = await movieRes.json();
    const tvData = await tvRes.json();

    const movies = (movieData.results || []).map((item: any) => ({
      tmdbId: item.id,
      title: item.title,
      type: 'movie',
      releaseDate: item.release_date || '',
      synopsis: item.overview || '',
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      rating: item.vote_average || null,
      genres: []
    }));

    const tvs = (tvData.results || []).map((item: any) => ({
      tmdbId: item.id,
      title: item.name,
      type: 'tv',
      releaseDate: item.first_air_date || '',
      synopsis: item.overview || '',
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      rating: item.vote_average || null,
      genres: []
    }));

    const responseData = { watchlist: [...movies, ...tvs] };
    WATCHLIST_CACHE.set(cacheKey, { timestamp: now, data: responseData });
    return res.json(responseData);
  } catch (error) {
    console.error("Fetch TMDB watchlist failed:", error);
    return res.status(500).json({ error: "Fetch TMDB watchlist failed." });
  }
});

// API Endpoint: TMDB Favorites Get
router.post("/tmdb-favorite/get", async (req, res) => {
  const { accountId, sessionId } = req.body;
  if (!accountId || !sessionId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required account credentials or backend TMDB API key." });
  }

  const cacheKey = `${accountId}-${sessionId}`;
  const now = Date.now();
  if (FAVORITE_CACHE.has(cacheKey)) {
    const cached = FAVORITE_CACHE.get(cacheKey)!;
    if (now - cached.timestamp < ACCOUNT_CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    // Fetch movie favorites
    const movieUrl = `https://api.tmdb.org/3/account/${accountId}/favorite/movies?language=en-US&sort_by=created_at.desc&session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const tvUrl = `https://api.tmdb.org/3/account/${accountId}/favorite/tv?language=en-US&sort_by=created_at.desc&session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const [movieRes, tvRes] = await Promise.all([
      fetch(movieUrl, { headers }),
      fetch(tvUrl, { headers })
    ]);

    if (!movieRes.ok || !tvRes.ok) {
      const errM = await movieRes.text();
      const errT = await tvRes.text();
      console.error("[TMDB Favorites Get] error response:", errM, errT);
      return res.status(400).json({ error: "Failed to fetch favorites from TMDB. Please check your TMDB Account ID and Session ID." });
    }

    const movieData = await movieRes.json();
    const tvData = await tvRes.json();

    const movies = (movieData.results || []).map((item: any) => ({
      tmdbId: item.id,
      title: item.title,
      type: 'movie',
      releaseDate: item.release_date || '',
      synopsis: item.overview || '',
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      rating: item.vote_average || null,
      genres: []
    }));

    const tvs = (tvData.results || []).map((item: any) => ({
      tmdbId: item.id,
      title: item.name,
      type: 'tv',
      releaseDate: item.first_air_date || '',
      synopsis: item.overview || '',
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      rating: item.vote_average || null,
      genres: []
    }));

    const responseData = { favorites: [...movies, ...tvs] };
    FAVORITE_CACHE.set(cacheKey, { timestamp: now, data: responseData });
    return res.json(responseData);
  } catch (error) {
    console.error("Fetch TMDB favorites failed:", error);
    return res.status(500).json({ error: "Fetch TMDB favorites failed." });
  }
});

// API Endpoint: TMDB Favorite Update
router.post("/tmdb-favorite/update", async (req, res) => {
  const { accountId, sessionId, mediaType, tmdbId, favorite } = req.body;
  if (!accountId || !sessionId || !mediaType || !tmdbId || favorite === undefined || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Invalid request parameters." });
  }

  // Invalidate cache immediately on update
  FAVORITE_CACHE.delete(`${accountId}-${sessionId}`);

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanId = parseInt(tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim(), 10);
    const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';

    const url = `https://api.tmdb.org/3/account/${accountId}/favorite?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const body = {
      media_type: tmdbType,
      media_id: cleanId,
      favorite: favorite
    };

    const tmdbRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json({ success: true, data });
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Favorite Update] error response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to update TMDB favorite.", details: errText });
    }
  } catch (error) {
    console.error("Update TMDB favorite failed:", error);
    return res.status(500).json({ error: "Update TMDB favorite failed." });
  }
});

// API Endpoint: TMDB Rate Show or Movie
router.post("/tmdb-rating/update", async (req, res) => {
  const { accountId, sessionId, mediaType, tmdbId, rating } = req.body;
  if (!sessionId || !mediaType || !tmdbId || rating === undefined || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();
    const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';

    const tmdbUrl = `https://api.tmdb.org/3/${tmdbType}/${cleanId}/rating?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;

    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const tmdbRes = await fetch(tmdbUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ value: rating })
    });

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json({ success: true, data });
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Show/Movie Rate] Error Response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to post rating to TMDB." });
    }
  } catch (error) {
    console.error("Post rating to TMDB failed:", error);
    return res.status(500).json({ error: "Post rating to TMDB failed." });
  }
});

// API Endpoint: TMDB Watchlist Update
router.post("/tmdb-watchlist/update", async (req, res) => {
  const { accountId, sessionId, mediaType, tmdbId, mediaId, watchlist } = req.body;
  const targetId = tmdbId || mediaId;
  if (!accountId || !sessionId || !mediaType || !targetId || watchlist === undefined || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Invalid request parameters." });
  }

  // Invalidate watchlist cache immediately on update
  WATCHLIST_CACHE.delete(`${accountId}-${sessionId}`);

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanId = parseInt(targetId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim(), 10);
    const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';

    const url = `https://api.tmdb.org/3/account/${accountId}/watchlist?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const body = {
      media_type: tmdbType,
      media_id: cleanId,
      watchlist: watchlist
    };

    const tmdbRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json({ success: true, data });
    } else {
      const errText = await tmdbRes.text();
      console.error("[TMDB Watchlist Update] error response:", errText);
      return res.status(tmdbRes.status).json({ error: "Failed to update TMDB watchlist.", details: errText });
    }
  } catch (error) {
    console.error("Update TMDB watchlist failed:", error);
    return res.status(500).json({ error: "Update TMDB watchlist failed." });
  }
});

// API Endpoint: TMDB Lists GetAll
router.post(["/tmdb-lists/get-all", "/tmdb-lists/get"], async (req, res) => {
  const { accountId, sessionId, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!accountId || !sessionId || !rawKey) {
    return res.status(400).json({ error: "Missing required credentials." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const combinedLists: any[] = [];
    const seenIds = new Set<string>();

    // Try v4 account lists first (only works with Bearer Access Token)
    if (isBearer) {
      try {
        const v4Url = `https://api.tmdb.org/4/account/${accountId}/lists?page=1`;
        const v4Res = await fetch(v4Url, { headers, signal: AbortSignal.timeout(10000) });
        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          (v4Data.results || []).forEach((list: any) => {
            const listIdStr = `tmdb-list-${list.id}`;
            if (!seenIds.has(listIdStr)) {
              seenIds.add(listIdStr);
              combinedLists.push({
                id: listIdStr,
                name: list.name,
                description: list.description || '',
                itemCount: list.item_count || list.number_of_items || 0,
                listType: list.list_type || 'v4'
              });
            }
          });
        }
      } catch (e) {
        // Fallback silently
      }
    }

    // Try v3 account lists
    const v3Url = `https://api.tmdb.org/3/account/${accountId}/lists?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Res = await fetch(v3Url, { headers });

    if (v3Res.ok) {
      const v3Data = await v3Res.json();
      (v3Data.results || []).forEach((list: any) => {
        const listIdStr = `tmdb-list-${list.id}`;
        if (!seenIds.has(listIdStr)) {
          seenIds.add(listIdStr);
          combinedLists.push({
            id: listIdStr,
            name: list.name,
            description: list.description || '',
            itemCount: list.item_count,
            listType: list.list_type || 'v3'
          });
        }
      });
    }

    if (combinedLists.length > 0 || v3Res.ok) {
      return res.json({ lists: combinedLists });
    } else {
      const errText = await v3Res.text();
      console.error("[TMDB Lists GetAll] error response:", errText);
      return res.status(400).json({ error: "Failed to fetch TMDB lists." });
    }
  } catch (error) {
    console.error("Fetch TMDB lists failed:", error);
    return res.status(500).json({ error: "Fetch TMDB lists failed." });
  }
});

// API Endpoint: TMDB List Details Get
router.post("/tmdb-lists/get-details", async (req, res) => {
  const { listId, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!listId || !rawKey) {
    return res.status(400).json({ error: "Missing list ID or API key." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanListId = listId.replace('tmdb-list-', '').trim();

    // 1. Try TMDB v4 list details first if Bearer Access Token is available
    if (isBearer) {
      try {
        const v4Url = `https://api.tmdb.org/4/list/${cleanListId}?language=en-US&page=1`;
        const v4Res = await fetch(v4Url, { headers, signal: AbortSignal.timeout(10000) });
        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          const rawItems = v4Data.results || v4Data.items || [];
          const items = rawItems.map((item: any) => ({
            tmdbId: item.id,
            title: item.title || item.name,
            type: item.media_type || (item.title ? 'movie' : 'tv'),
            releaseDate: item.release_date || item.first_air_date || '',
            synopsis: item.overview || '',
            coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
            backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
            rating: item.vote_average || null,
            genres: []
          }));
          return res.json({ items });
        }
      } catch (e) {
        // Fallback to v3
      }
    }

    // 2. Fallback to TMDB v3 list details
    const v3Url = `https://api.tmdb.org/3/list/${cleanListId}?language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Res = await fetch(v3Url, { headers });

    if (v3Res.ok) {
      const data = await v3Res.json();
      const items = (data.items || []).map((item: any) => ({
        tmdbId: item.id,
        title: item.title || item.name,
        type: item.media_type || (item.title ? 'movie' : 'tv'),
        releaseDate: item.release_date || item.first_air_date || '',
        synopsis: item.overview || '',
        coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
        backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
        rating: item.vote_average || null,
        genres: []
      }));
      return res.json({ items });
    } else {
      const errText = await v3Res.text();
      console.error("[TMDB List Details] error response:", errText);
      return res.status(400).json({ error: "Failed to fetch TMDB list details." });
    }
  } catch (error) {
    console.error("Fetch TMDB list details failed:", error);
    return res.status(500).json({ error: "Fetch TMDB list details failed." });
  }
});

// API Endpoint: TMDB List Create
router.post("/tmdb-lists/create", async (req, res) => {
  const { name, description, sessionId, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!name || !rawKey) {
    return res.status(400).json({ error: "Missing parameters." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    // 1. Try TMDB v4 list create first if Bearer Access Token is available
    if (isBearer) {
      try {
        const v4Url = `https://api.tmdb.org/4/list`;
        const v4Body = {
          name,
          description: description || '',
          iso_639_1: 'en',
          public: false
        };
        const v4Res = await fetch(v4Url, {
          method: 'POST',
          headers,
          body: JSON.stringify(v4Body),
          signal: AbortSignal.timeout(10000)
        });

        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          const createdId = v4Data.id || v4Data.list_id;
          if (createdId) {
            return res.json({ id: `tmdb-list-${createdId}`, success: true });
          }
        }
      } catch (e) {
        // Fallback to v3
      }
    }

    // 2. Fallback to TMDB v3 list create
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required for v3 list creation." });
    }

    const v3Url = `https://api.tmdb.org/3/list?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Body = {
      name,
      description: description || '',
      language: 'en'
    };

    const v3Res = await fetch(v3Url, {
      method: 'POST',
      headers,
      body: JSON.stringify(v3Body)
    });

    if (v3Res.ok) {
      const data = await v3Res.json();
      return res.json({ id: `tmdb-list-${data.list_id}`, success: true });
    } else {
      const errText = await v3Res.text();
      console.error("[TMDB List Create] error response:", errText);
      return res.status(400).json({ error: "Failed to create TMDB list." });
    }
  } catch (error) {
    console.error("Create TMDB list failed:", error);
    return res.status(500).json({ error: "Create TMDB list failed." });
  }
});

// API Endpoint: TMDB List Update Item (Add / Remove)
router.post("/tmdb-lists/update-item", async (req, res) => {
  const { listId, mediaId, mediaType, action, sessionId, customApiKey } = req.body; // action: 'add' | 'remove'
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!listId || !mediaId || !action || !rawKey) {
    return res.status(400).json({ error: "Missing parameters." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanListId = listId.toString().replace('tmdb-list-', '').trim();
    const cleanTmdbId = parseInt(mediaId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim(), 10);

    if (isNaN(cleanTmdbId)) {
      return res.status(400).json({ error: "Invalid TMDB media ID." });
    }

    const itemMediaType = mediaType === 'tv' ? 'tv' : 'movie';

    // 1. Try TMDB v4 list item update if Bearer Access Token is available (supports both Movies and TV shows!)
    if (isBearer) {
      try {
        const v4Method = action === 'add' ? 'POST' : 'DELETE';
        const v4Url = `https://api.tmdb.org/4/list/${cleanListId}/items`;
        const v4Body = {
          items: [
            {
              media_type: itemMediaType,
              media_id: cleanTmdbId
            }
          ]
        };

        const v4Res = await fetch(v4Url, {
          method: v4Method,
          headers,
          body: JSON.stringify(v4Body),
          signal: AbortSignal.timeout(10000)
        });

        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          return res.json({ success: true, data: v4Data });
        } else {
          const errText = await v4Res.text();
          console.warn("[TMDB v4 List Update Item] status:", v4Res.status, errText);
        }
      } catch (e) {
        console.warn("[TMDB v4 List Update Item] exception:", e);
      }
    }

    // 2. TMDB v3 lists ONLY support movies!
    if (itemMediaType === 'tv' && action === 'add') {
      return res.status(400).json({
        error: "TMDB v3 lists only support Movies. To add TV shows, you must paste a TMDB v4 Read Access Token in Settings, or use Chronicle's Custom Lists."
      });
    }

    // 3. Fallback to TMDB v3 list item update
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required for v3 list fallback." });
    }

    const tmdbAction = action === 'add' ? 'add_item' : 'remove_item';
    const v3Url = `https://api.tmdb.org/3/list/${cleanListId}/${tmdbAction}?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Body = {
      media_id: cleanTmdbId
    };

    const v3Res = await fetch(v3Url, {
      method: 'POST',
      headers,
      body: JSON.stringify(v3Body)
    });

    if (v3Res.ok) {
      const data = await v3Res.json();
      return res.json({ success: true, data });
    } else {
      const errText = await v3Res.text();
      console.error(`[TMDB List ${action}] error response:`, errText);
      let parsedErr: any = {};
      try { parsedErr = JSON.parse(errText); } catch(e){}

      let userMsg = `Failed to ${action} item on TMDB list.`;
      if (parsedErr.status_code === 11) {
        if (itemMediaType === 'tv') {
          userMsg = "TMDB v3 lists only support Movies. For TV shows, please use Chronicle's Custom Lists or provide a TMDB v4 Read Access Token.";
        } else {
          userMsg = "Item is already in this TMDB list.";
        }
      } else if (parsedErr.status_message) {
        userMsg = parsedErr.status_message;
      }

      return res.status(400).json({ error: userMsg, details: errText, statusCode: parsedErr.status_code });
    }
  } catch (error) {
    console.error(`TMDB List ${action} item failed:`, error);
    return res.status(500).json({ error: `TMDB List ${action} item failed.` });
  }
});

// API Endpoint: TMDB List Delete
router.post("/tmdb-lists/delete", async (req, res) => {
  const { listId, sessionId, customApiKey } = req.body;
  const rawKey = customApiKey || process.env.TMDB_API_KEY || '';
  if (!listId || !rawKey) {
    return res.status(400).json({ error: "Missing parameters." });
  }

  try {
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.startsWith('eyJ') || tmdbKey.length > 60;
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };

    const cleanListId = listId.replace('tmdb-list-', '').trim();

    // 1. Try TMDB v4 list delete first if Bearer Access Token is available
    if (isBearer) {
      try {
        const v4Url = `https://api.tmdb.org/4/list/${cleanListId}`;
        const v4Res = await fetch(v4Url, {
          method: 'DELETE',
          headers,
          signal: AbortSignal.timeout(10000)
        });

        if (v4Res.ok) {
          const v4Data = await v4Res.json();
          return res.json({ success: true, data: v4Data });
        }
      } catch (e) {
        // Fallback to v3
      }
    }

    // 2. Fallback to TMDB v3 list delete
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required for v3 list delete fallback." });
    }

    const v3Url = `https://api.tmdb.org/3/list/${cleanListId}?session_id=${sessionId}${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    const v3Res = await fetch(v3Url, {
      method: 'DELETE',
      headers
    });

    if (v3Res.ok) {
      const data = await v3Res.json();
      return res.json({ success: true, data });
    } else {
      const errText = await v3Res.text();
      console.error("[TMDB List Delete] error response:", errText);
      return res.status(400).json({ error: "Failed to delete TMDB list." });
    }
  } catch (error) {
    console.error("Delete TMDB list failed:", error);
    return res.status(500).json({ error: "Delete TMDB list failed." });
  }
});

const PERSON_CACHE = new Map<string, any>();

// API Endpoint: TMDB Person Details
router.post("/tmdb-person", async (req, res) => {
  const { personId } = req.body;
  if (!personId || !process.env.TMDB_API_KEY) {
    return res.status(400).json({ error: "Invalid request" });
  }
  
  if (PERSON_CACHE.has(personId.toString())) {
    console.log(`[Cache Hit] Person details for ID: ${personId}`);
    return res.json(PERSON_CACHE.get(personId.toString()));
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const tmdbUrl = `https://api.tmdb.org/3/person/${personId}?append_to_response=combined_credits&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };
    
    const tmdbRes = await fetch(tmdbUrl, { headers });
    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      const personData = { 
        biography: data.biography,
        name: data.name,
        profilePath: data.profile_path,
        knownForDepartment: data.known_for_department,
        birthday: data.birthday,
        placeOfBirth: data.place_of_birth,
        credits: data.combined_credits?.cast || []
      };
      PERSON_CACHE.set(personId.toString(), personData);
      return res.json(personData);
    }
    return res.status(404).json({ error: "Person not found" });
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
});



let DISCOVER_CACHE_MAP = new Map<number, { data: any, timestamp: number }>();
const DISCOVER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let TMDB_API_CACHE = new Map<string, { data: any, timestamp: number }>();
const TMDB_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// API Endpoint: Discover Feed (Trending, Top Rated, Upcoming, TV Airing Today, Sci-Fi)
router.get("/tmdb-discover", async (req, res) => {
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  const now = Date.now();
  const forceRefresh = req.query.nocache === 'true' || req.query.refresh === 'true';
  const page = parseInt(req.query.page as string || '1', 10);
  
  const cachedPage = DISCOVER_CACHE_MAP.get(page);
  if (!forceRefresh && cachedPage && (now - cachedPage.timestamp < DISCOVER_CACHE_TTL)) {
    console.log(`[Cache Hit] Serving tmdb-discover feed page ${page} from memory cache`);
    return res.json(cachedPage.data);
  }

  const TMDB_GENRES: Record<number, string> = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
    10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
    10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
  };

  const hasTMDB = !!process.env.TMDB_API_KEY;

  if (hasTMDB) {
    try {
      const rawKey = process.env.TMDB_API_KEY || '';
      const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
      const isBearer = tmdbKey.length > 40;
      const headers = {
        accept: 'application/json',
        ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
      };

      const fetchTMDB = async (endpoint: string, pageNum: number = 1) => {
        const separator = endpoint.includes('?') ? '&' : '?';
        const cacheKey = `${endpoint}${separator}page=${pageNum}`;
        const cached = TMDB_API_CACHE.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < TMDB_CACHE_TTL)) {
          return cached.data;
        }

        const url = `https://api.tmdb.org/3/${endpoint}${separator}page=${pageNum}&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
        const tmdbRes = await fetch(url, { headers });
        if (tmdbRes.ok) {
          const data = await tmdbRes.json();
          const results = data.results || [];
          TMDB_API_CACHE.set(cacheKey, { data: results, timestamp: Date.now() });
          return results;
        }
        return [];
      };

      
      const fetchTrendingBooks = async (pageNum: number = 1) => {
        return fetchCategoryBooks('fiction', pageNum);
      };

      const fetchBestsellerBooks = async (pageNum: number = 1) => {
        return fetchCategoryBooks('bestseller', pageNum);
      };

      const fetchTrendingAudiobooks = async (pageNum: number = 1) => {
        const nytAudio = await fetchNYTBooks(pageNum, "audiobook");
        if (nytAudio && nytAudio.length > 0) return nytAudio;

        const appleAudio = await fetchAppleAudiobooksChart();
        if (appleAudio && appleAudio.length > 0) {
          const pageSize = 15;
          const startIndex = ((pageNum - 1) * pageSize) % Math.max(1, appleAudio.length);
          return appleAudio.slice(startIndex, startIndex + pageSize);
        }
        return [];
      };

      const fetchBestsellerAudiobooks = async (pageNum: number = 1) => {
        const nytAudio = await fetchNYTBooks(pageNum, "audiobook");
        if (nytAudio && nytAudio.length > 0) return nytAudio;

        const appleAudio = await fetchAppleAudiobooksChart();
        if (appleAudio && appleAudio.length > 0) {
          const pageSize = 15;
          const startIndex = ((pageNum - 1) * pageSize) % Math.max(1, appleAudio.length);
          return appleAudio.slice(startIndex, startIndex + pageSize);
        }
        return [];
      };

      const todayISO = new Date().toISOString().split('T')[0];

      const isUpcomingRelease = (item: any) => {
        const dateStr = item?.releaseDate || item?.release_date || '';
        if (!dateStr) return false;
        return dateStr.trim().slice(0, 10) >= todayISO;
      };

      const [
        trendingRaw,
        trendingMoviesRaw,
        trendingTvRaw,
        discoverMoviesRaw,
        nowPlayingMoviesRaw,
        popularMoviesRaw,
        topRatedMoviesRaw,
        upcomingMoviesRaw,
        discoverUpcomingRaw,
        discoverTvRaw,
        airingTodayTvRaw,
        onTheAirTvRaw,
        popularTvRaw,
        topRatedTvRaw,
        sciFiRaw,
        youngAdultBooks,
        fictionBooks,
        nonFictionBooks,
        trendingBooks, 
        bestsellerBooks, 
        trendingAudiobooks, 
        bestsellerAudiobooks
      ] = await Promise.all([
        fetchTMDB('trending/all/week', page),
        fetchTMDB('trending/movie/week', page),
        fetchTMDB('trending/tv/week', page),
        fetchTMDB('discover/movie?sort_by=popularity.desc', page),
        fetchTMDB('movie/now_playing', page),
        fetchTMDB('movie/popular', page),
        fetchTMDB('movie/top_rated', page),
        fetchTMDB(`movie/upcoming?primary_release_date.gte=${todayISO}`, page),
        fetchTMDB(`discover/movie?primary_release_date.gte=${todayISO}&sort_by=popularity.desc`, page),
        fetchTMDB('discover/tv?sort_by=popularity.desc', page),
        fetchTMDB('tv/airing_today', page),
        fetchTMDB('tv/on_the_air', page),
        fetchTMDB('tv/popular', page),
        fetchTMDB('tv/top_rated', page),
        fetchTMDB('discover/movie?with_genres=878&sort_by=vote_average.desc&vote_count.gte=300', page),
        fetchCategoryBooks('youngAdult', page),
        fetchCategoryBooks('fiction', page),
        fetchCategoryBooks('nonfiction', page),
        fetchCategoryBooks('trending', page),
        fetchCategoryBooks('bestseller', page),
        fetchTrendingAudiobooks(page),
        fetchBestsellerAudiobooks(page)
      ]);

      const mapItem = (item: any, defaultType?: 'movie' | 'tv') => {
        const detectedType = item.media_type || defaultType || (item.first_air_date || item.name ? 'tv' : 'movie');
        const isTV = detectedType === 'tv';
        return {
          id: `tmdb-${item.id}`,
          title: item.title || item.name || item.original_name || "Unknown Title",
          type: detectedType,
          releaseDate: item.release_date || item.first_air_date || "",
          synopsis: item.overview || "",
          genres: (item.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean),
          creators: [],
          platforms: [],
          coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
          backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "",
          rating: item.vote_average || null,
          ...(isTV ? {
            tvSpecifics: { currentSeason: 1, currentEpisode: 1, totalSeasons: 1, totalEpisodes: 1 }
          } : {
            movieSpecifics: { director: "" }
          })
        };
      };

      const legacyCombinedBooks = Array.from(
        new Map([...trendingBooks, ...bestsellerBooks, ...trendingAudiobooks, ...bestsellerAudiobooks].map(item => [item.id, item])).values()
      );

      // Combine upcomingMoviesRaw and discoverUpcomingRaw to ensure a complete, rich list of future releases
      const rawCombinedUpcoming = [...(upcomingMoviesRaw.results || upcomingMoviesRaw || []), ...(discoverUpcomingRaw.results || discoverUpcomingRaw || [])];
      const uniqueUpcomingMap = new Map();
      rawCombinedUpcoming.forEach((i: any) => {
        if (i && i.id && !uniqueUpcomingMap.has(i.id)) {
          uniqueUpcomingMap.set(i.id, i);
        }
      });
      const upcomingMoviesMapped = Array.from(uniqueUpcomingMap.values())
        .map((i: any) => mapItem(i, 'movie'))
        .filter((item: any) => isUpcomingRelease(item));

      const payload = {
        trending: trendingRaw.map((i: any) => mapItem(i)),
        trendingMovies: trendingMoviesRaw.map((i: any) => mapItem(i, 'movie')),
        trendingTv: trendingTvRaw.map((i: any) => mapItem(i, 'tv')),
        discoverMovies: discoverMoviesRaw.map((i: any) => mapItem(i, 'movie')),
        nowPlayingMovies: nowPlayingMoviesRaw.map((i: any) => mapItem(i, 'movie')),
        popularMovies: popularMoviesRaw.map((i: any) => mapItem(i, 'movie')),
        topRatedMovies: topRatedMoviesRaw.map((i: any) => mapItem(i, 'movie')),
        upcomingMovies: upcomingMoviesMapped,
        discoverTv: discoverTvRaw.map((i: any) => mapItem(i, 'tv')),
        airingTodayTv: airingTodayTvRaw.map((i: any) => mapItem(i, 'tv')),
        onTheAirTv: onTheAirTvRaw.map((i: any) => mapItem(i, 'tv')),
        popularTv: popularTvRaw.map((i: any) => mapItem(i, 'tv')),
        topRatedTv: topRatedTvRaw.map((i: any) => mapItem(i, 'tv')),
        // Legacy
        topRated: topRatedMoviesRaw.map((i: any) => mapItem(i, 'movie')),
        upcoming: upcomingMoviesMapped,
        airingToday: popularTvRaw.map((i: any) => mapItem(i, 'tv')),
        sciFi: sciFiRaw.map((i: any) => mapItem(i, 'movie')),
        // Books
        youngAdultBooks,
        fictionBooks,
        nonFictionBooks,
        trendingBooks,
        bestsellerBooks,
        trendingAudiobooks,
        bestsellerAudiobooks,
        booksAndAudiobooks: legacyCombinedBooks,
        source: "live"
      };
      DISCOVER_CACHE_MAP.set(page, { data: payload, timestamp: Date.now() });
      return res.json(payload);

    } catch (error) {
      console.error("Failed to fetch discovery feed from TMDB, falling back to Gemini:", error);
    }
  }

  // If TMDB is not available or failed, use Gemini client or high-quality curated fallback list
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are a universal media discovery engine inside a premium media tracking application named Sequel.
Generate a beautiful, realistic, real-time-looking collection of trending and popular movies and TV shows for July 2026.
Ensure the titles and details correspond to actual real-world titles (including blockbusters and acclaimed series released recently or up to 2026, or classic masterpieces).

Generate a JSON object containing exactly 11 arrays of items:
1. 'trending': 8 items representing movies or TV shows trending this week globally.
2. 'discoverMovies': 8 items for general movie discovery.
3. 'nowPlayingMovies': 8 movies currently in theaters.
4. 'popularMovies': 8 current popular movies.
5. 'topRatedMovies': 8 of the highest-rated movies of all time.
6. 'upcomingMovies': 8 upcoming movies.
7. 'discoverTv': 8 items for general TV show discovery.
8. 'airingTodayTv': 8 TV shows airing today.
9. 'onTheAirTv': 8 TV shows currently on the air.
10. 'popularTv': 8 current popular TV shows.
11. 'topRatedTv': 8 of the highest-rated TV shows of all time.
12. 'sciFi': 8 top-rated classic or modern Sci-Fi films.

For each item, generate the following fields:
- id: a string formatted as "tmdb-[random integer]" (e.g., "tmdb-10293") so it looks like a real TMDB ID
- title: string
- type: 'movie' | 'tv'
- releaseDate: YYYY-MM-DD
- synopsis: string description
- genres: array of 2-3 standard genre strings (e.g. ["Sci-Fi", "Action", "Drama"])
- coverUrl: For visual thumbnail/poster cover URLs (image), you must use the following strict rules:
  - For Movies and TV Shows: Use real, verified TMDB poster path CDN URLs if you know them (e.g., "https://image.tmdb.org/t/p/w500/{poster_path}"). If you do not know the exact path, use a highly specific Unsplash photo search URL matching the visual style of the title, or a high-quality movie-theater concept Unsplash image (e.g., "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80").
- backdropUrl: a high-quality landscape Unsplash backdrop image URL matching this item's atmosphere (e.g., "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80").
- rating: a number between 1.0 and 10.0 representing the average user rating (e.g., 8.4)`;

      const mediaSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, type: { type: Type.STRING }, releaseDate: { type: Type.STRING }, synopsis: { type: Type.STRING }, genres: { type: Type.ARRAY, items: { type: Type.STRING } }, coverUrl: { type: Type.STRING }, backdropUrl: { type: Type.STRING }, rating: { type: Type.NUMBER } }, required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "coverUrl", "backdropUrl", "rating"] } };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trending: mediaSchema,
              discoverMovies: mediaSchema,
              nowPlayingMovies: mediaSchema,
              popularMovies: mediaSchema,
              topRatedMovies: mediaSchema,
              upcomingMovies: mediaSchema,
              discoverTv: mediaSchema,
              airingTodayTv: mediaSchema,
              onTheAirTv: mediaSchema,
              popularTv: mediaSchema,
              topRatedTv: mediaSchema,
              sciFi: mediaSchema
            },
            required: ["trending", "discoverMovies", "nowPlayingMovies", "popularMovies", "topRatedMovies", "upcomingMovies", "discoverTv", "airingTodayTv", "onTheAirTv", "popularTv", "topRatedTv", "sciFi"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      const payload = {
        trending: parsed.trending || [],
        trendingMovies: (parsed.discoverMovies || []).filter((i: any) => i.type === 'movie'),
        trendingTv: (parsed.discoverTv || []).filter((i: any) => i.type === 'tv'),
        discoverMovies: parsed.discoverMovies || [],
        nowPlayingMovies: parsed.nowPlayingMovies || [],
        popularMovies: parsed.popularMovies || [],
        topRatedMovies: parsed.topRatedMovies || [],
        upcomingMovies: parsed.upcomingMovies || [],
        discoverTv: parsed.discoverTv || [],
        airingTodayTv: parsed.airingTodayTv || [],
        onTheAirTv: parsed.onTheAirTv || [],
        popularTv: parsed.popularTv || [],
        topRatedTv: parsed.topRatedTv || [],
        
        // legacy compat
        upcoming: parsed.upcomingMovies || [],
        topRated: parsed.topRatedMovies || [],
        airingToday: parsed.popularTv || [],
        
        sciFi: parsed.sciFi || [],
        source: "gemini"
      };
      DISCOVER_CACHE_MAP.set(page, { data: payload, timestamp: Date.now() });
      return res.json(payload);
    } catch (e) {
      console.error("Gemini discover feed generation failed, falling back to static offline:", e);
    }
  }

  // Pure Offline Static Fallbacks
  const fallbackMovies = [
    {
      id: "tmdb-693134",
      title: "Dune: Part Two",
      type: "movie",
      releaseDate: "2024-03-01",
      synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
      genres: ["Sci-Fi", "Adventure", "Drama"],
      coverUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
      rating: 8.3
    },
    {
      id: "tmdb-823464",
      title: "Godzilla x Kong: The New Empire",
      type: "movie",
      releaseDate: "2024-03-27",
      synopsis: "Following their explosive showdown, Godzilla and Kong must reunite against a colossal undiscovered threat hidden within our world.",
      genres: ["Action", "Sci-Fi", "Adventure"],
      coverUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80",
      rating: 7.2
    }
  ];

  const fallbackShows = [
    {
      id: "tmdb-114472",
      title: "Severance",
      type: "tv",
      releaseDate: "2022-02-18",
      synopsis: "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.",
      genres: ["Sci-Fi", "Mystery", "Drama"],
      coverUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
      rating: 8.4
    }
  ];

  const payload = {
    trending: fallbackMovies,
    trendingMovies: fallbackMovies,
    trendingTv: fallbackShows,
    discoverMovies: fallbackMovies,
    nowPlayingMovies: fallbackMovies,
    popularMovies: fallbackMovies,
    topRatedMovies: fallbackMovies,
    upcomingMovies: fallbackMovies,
    discoverTv: fallbackShows,
    airingTodayTv: fallbackShows,
    onTheAirTv: fallbackShows,
    popularTv: fallbackShows,
    topRatedTv: fallbackShows,
    upcoming: fallbackMovies,
    topRated: fallbackMovies,
    airingToday: fallbackShows,
    sciFi: fallbackMovies,
    source: "static"
  };
  DISCOVER_CACHE_MAP.set(page, { data: payload, timestamp: Date.now() });
  return res.json(payload);
});

// API Endpoint: Universal Search




const TMDB_GENRES: { [key: number]: string } = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western", 10759: "Action & Adventure",
  10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics"
};


const CATEGORY_CACHE = new Map<string, { timestamp: number, data: any }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

router.all("/tmdb-category", async (req, res) => {
  const { category, page = 1 } = (req.body && Object.keys(req.body).length > 0) ? req.body : req.query;
  
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  
  const cacheKey = `${category}-${page}`;
  if (CATEGORY_CACHE.has(cacheKey)) {
    const cached = CATEGORY_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  const tmdbKey = process.env.TMDB_API_KEY;

  const mapItem = (item: any, defaultType?: 'movie' | 'tv') => {
    const detectedType = item.media_type || defaultType || (item.first_air_date || item.name ? 'tv' : 'movie');
    const isTV = detectedType === 'tv';
    return {
      id: `tmdb-${item.id}`,
      title: item.title || item.name || item.original_name || "Unknown Title",
      type: detectedType,
      releaseDate: item.release_date || item.first_air_date || "",
      synopsis: item.overview || "",
      genres: (item.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean),
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "",
      rating: item.vote_average || null
    };
  };

  const fetchTMDB = async (endpoint: string) => {
    if (!tmdbKey) return { results: [] };
    const response = await fetch(`https://api.tmdb.org/3/${endpoint}&api_key=${tmdbKey}`);
    if (!response.ok) throw new Error("TMDB Error");
    return response.json();
  };
  
  const fetchBestsellerBooks = async (pageNum: number = 1) => {
    const nytBooks = await fetchNYTBooks(pageNum, 'bestseller');
    if (nytBooks && nytBooks.length > 0) return nytBooks;
    const limit = 20;
    const offset = (pageNum - 1) * limit;
    const response = await fetch(`https://openlibrary.org/search.json?q=first_publish_year:[2023+TO+2026]+AND+subject:(fiction+OR+fantasy+OR+thriller+OR+romance)&sort=editions&limit=${limit}&offset=${offset}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.docs.map((item: any) => ({
      id: `ol-${item.key.replace('/works/', '')}`,
      title: item.title,
      type: "book",
      releaseDate: item.first_publish_year ? item.first_publish_year.toString() : "",
      synopsis: "A widely read and acclaimed bestseller book.",
      genres: (item.subject || []).slice(0, 3),
      coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg?default=false` : "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80",
      rating: 8.5
    }));
  };
  
  const fetchAudiobooks = async (term: string, pageNum: number = 1) => {
    const nytAudio = await fetchNYTBooks(pageNum, "audiobook");
    if (nytAudio && nytAudio.length > 0) return nytAudio;

    const appleAudio = await fetchAppleAudiobooksChart();
    if (appleAudio && appleAudio.length > 0) {
      const pageSize = 15;
      const startIndex = ((pageNum - 1) * pageSize) % Math.max(1, appleAudio.length);
      return appleAudio.slice(startIndex, startIndex + pageSize);
    }
    return [];
  };

  try {
    let data;
    let results;
    switch (category) {
      case 'trendingMovies':
        data = await fetchTMDB(`trending/movie/week?page=${page}`);
        results = data.results.map((i: any) => mapItem(i, 'movie'));
        break;
      case 'nowPlayingMovies':
        data = await fetchTMDB(`movie/now_playing?page=${page}`);
        results = data.results.map((i: any) => mapItem(i, 'movie'));
        break;
      case 'topRatedMovies':
        data = await fetchTMDB(`movie/top_rated?page=${page}`);
        results = data.results.map((i: any) => mapItem(i, 'movie'));
        break;
      case 'upcomingMovies':
        {
          const todayISO = new Date().toISOString().split('T')[0];
          const isUpcoming = (item: any) => {
            const relDate = item?.releaseDate || item?.release_date || '';
            if (!relDate) return false;
            return relDate.trim().slice(0, 10) >= todayISO;
          };

          const upcomingData = await fetchTMDB(`movie/upcoming?primary_release_date.gte=${todayISO}&page=${page}`);
          let itemsList = (upcomingData.results || []).map((i: any) => mapItem(i, 'movie')).filter(isUpcoming);

          if (itemsList.length < 10) {
            const discoverData = await fetchTMDB(`discover/movie?primary_release_date.gte=${todayISO}&sort_by=popularity.desc&page=${page}`);
            const existingIds = new Set(itemsList.map((i: any) => i.id));
            const additional = (discoverData.results || [])
              .map((i: any) => mapItem(i, 'movie'))
              .filter((i: any) => isUpcoming(i) && !existingIds.has(i.id));
            itemsList = [...itemsList, ...additional];
          }

          results = itemsList;
        }
        break;
      case 'trendingTv':
        data = await fetchTMDB(`trending/tv/week?page=${page}`);
        results = data.results.map((i: any) => mapItem(i, 'tv'));
        break;
      case 'onTheAirTv':
        data = await fetchTMDB(`tv/on_the_air?page=${page}`);
        results = data.results.map((i: any) => mapItem(i, 'tv'));
        break;
      case 'topRatedTv':
        data = await fetchTMDB(`tv/top_rated?page=${page}`);
        results = data.results.map((i: any) => mapItem(i, 'tv'));
        break;
      case 'sciFi':
        data = await fetchTMDB(`discover/movie?with_genres=878&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`);
        results = data.results.map((i: any) => mapItem(i, 'movie'));
        break;
      case 'youngAdultBooks':
        results = await fetchCategoryBooks('youngAdult', page);
        break;
      case 'fictionBooks':
        results = await fetchCategoryBooks('fiction', page);
        break;
      case 'nonFictionBooks':
        results = await fetchCategoryBooks('nonfiction', page);
        break;
      case 'trendingBooks':
        results = await fetchCategoryBooks('fiction', page);
        break;
      case 'bestsellerAudiobooks':
        results = await fetchAudiobooks('bestseller', page);
        break;
      default:
        results = [];
    }
    
    CATEGORY_CACHE.set(cacheKey, { timestamp: Date.now(), data: results });
    return res.json(results);
  } catch (error) {
    console.error("TMDB Category Error:", error);
    return res.status(500).json({ error: "Failed" });
  }
});


router.post("/tmdb-reviews", async (req, res) => {
  const { tmdbId, type, page = 1 } = req.body;
  if (!tmdbId || !process.env.TMDB_API_KEY || (type !== 'movie' && type !== 'tv')) {
    return res.status(400).json({ error: "Invalid request or TMDB API key missing." });
  }

  const cleanId = tmdbId.toString().replace(/^(tmdb-tv-|tmdb-movie-|tmdb-|lib-|temp-|custom-|imported-|movie-|tv-)/, '').trim();
  if (!/^\d+$/.test(cleanId)) {
    return res.status(400).json({ error: "Invalid numeric TMDB ID." });
  }

  try {
    const rawKey = process.env.TMDB_API_KEY || '';
    const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const isBearer = tmdbKey.length > 40;
    const tmdbType = type === 'tv' ? 'tv' : 'movie';
    const tmdbUrl = `https://api.tmdb.org/3/${tmdbType}/${cleanId}/reviews?page=${page}&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
    
    const headers = {
      accept: 'application/json',
      ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
    };
    
    const tmdbRes = await fetch(tmdbUrl, { headers });
    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return res.json(data);
    }
    return res.status(tmdbRes.status).json({ error: "Failed to fetch from TMDB" });
  } catch (err) {
    console.error("Reviews fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const STREAMING_CHART_CACHE = new Map<string, { timestamp: number; data: any }>();
const STREAMING_CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours

router.get("/tmdb-streaming", async (req, res) => {
  const { platformId } = req.query;
  
  res.setHeader("Cache-Control", "public, s-maxage=43200, stale-while-revalidate=86400");
  
  const pId = String(platformId || 'netflix');
  const cacheKey = `streaming-${pId}`;
  if (STREAMING_CHART_CACHE.has(cacheKey)) {
    const cached = STREAMING_CHART_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < STREAMING_CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  const rawKey = process.env.TMDB_API_KEY || '';
  const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
  const isBearer = tmdbKey.length > 40;
  const headers = {
    accept: 'application/json',
    ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
  };

  const fetchEndpoint = async (endpoint: string) => {
    if (!tmdbKey) return { results: [] };
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `https://api.tmdb.org/3/${endpoint}${!isBearer ? `${separator}api_key=${tmdbKey}` : ''}`;
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) return { results: [] };
      return await response.json();
    } catch {
      return { results: [] };
    }
  };

  const mapStreamingResult = (item: any, defaultType?: 'movie' | 'tv') => {
    const detectedType = item.media_type || defaultType || (item.first_air_date || item.name ? 'tv' : 'movie');
    return {
      id: `tmdb-${detectedType}-${item.id}`,
      sourceId: String(item.id),
      tmdbId: String(item.id),
      title: item.title || item.name || item.original_name || "Unknown Title",
      type: detectedType,
      releaseDate: item.release_date || item.first_air_date || "",
      releaseYear: (item.release_date || item.first_air_date || "").slice(0, 4),
      synopsis: item.overview || "",
      genres: (item.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean),
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : (item.poster_path ? `https://image.tmdb.org/t/p/w1280${item.poster_path}` : ""),
      rating: item.vote_average || null,
      voteAverage: item.vote_average || null,
    };
  };

  try {
    let items: any[] = [];
    
    if (pId === 'crunchyroll') {
      const [tvData, netData] = await Promise.all([
        fetchEndpoint(`discover/tv?with_watch_providers=283&watch_region=US&with_genres=16&sort_by=popularity.desc`),
        fetchEndpoint(`discover/tv?with_networks=1112&with_genres=16&sort_by=popularity.desc`),
      ]);
      const combined = [...(tvData.results || []), ...(netData.results || [])];
      items = combined.map((i: any) => mapStreamingResult(i, 'tv'));
    } else if (pId === 'mubi') {
      const [movieData, mubiCompany] = await Promise.all([
        fetchEndpoint(`discover/movie?with_watch_providers=11&watch_region=US&sort_by=popularity.desc`),
        fetchEndpoint(`discover/movie?with_companies=3798&sort_by=popularity.desc`),
      ]);
      const combined = [...(movieData.results || []), ...(mubiCompany.results || [])];
      items = combined.map((i: any) => mapStreamingResult(i, 'movie'));
    } else if (pId === 'apple_tv') {
      const [tvData, movieData] = await Promise.all([
        fetchEndpoint(`discover/tv?with_watch_providers=350&watch_region=US&sort_by=popularity.desc`),
        fetchEndpoint(`discover/movie?with_watch_providers=350&watch_region=US&sort_by=popularity.desc`),
      ]);
      const combined = [...(tvData.results || []), ...(movieData.results || [])];
      items = combined.map((i: any) => mapStreamingResult(i));
    } else if (pId === 'disney') {
      const [tvData, movieData] = await Promise.all([
        fetchEndpoint(`discover/tv?with_watch_providers=337&watch_region=US&sort_by=popularity.desc`),
        fetchEndpoint(`discover/movie?with_watch_providers=337&watch_region=US&sort_by=popularity.desc`),
      ]);
      const combined = [...(tvData.results || []), ...(movieData.results || [])];
      items = combined.map((i: any) => mapStreamingResult(i));
    } else if (pId === 'max') {
      const [tvData, movieData] = await Promise.all([
        fetchEndpoint(`discover/tv?with_watch_providers=1899&watch_region=US&sort_by=popularity.desc`),
        fetchEndpoint(`discover/movie?with_watch_providers=1899&watch_region=US&sort_by=popularity.desc`),
      ]);
      const combined = [...(tvData.results || []), ...(movieData.results || [])];
      items = combined.map((i: any) => mapStreamingResult(i));
    } else if (pId === 'prime') {
      const [tvData, movieData] = await Promise.all([
        fetchEndpoint(`discover/tv?with_watch_providers=9&watch_region=US&sort_by=popularity.desc`),
        fetchEndpoint(`discover/movie?with_watch_providers=9&watch_region=US&sort_by=popularity.desc`),
      ]);
      const combined = [...(tvData.results || []), ...(movieData.results || [])];
      items = combined.map((i: any) => mapStreamingResult(i));
    } else {
      const [tvData, movieData] = await Promise.all([
        fetchEndpoint(`discover/tv?with_watch_providers=8&watch_region=US&sort_by=popularity.desc`),
        fetchEndpoint(`discover/movie?with_watch_providers=8&watch_region=US&sort_by=popularity.desc`),
      ]);
      const combined = [...(tvData.results || []), ...(movieData.results || [])];
      items = combined.map((i: any) => mapStreamingResult(i));
    }

    const uniqueMap = new Map<string, any>();
    for (const it of items) {
      if (it.coverUrl && !uniqueMap.has(it.sourceId)) {
        uniqueMap.set(it.sourceId, it);
      }
    }
    const top10 = Array.from(uniqueMap.values()).slice(0, 10);
    
    STREAMING_CHART_CACHE.set(cacheKey, { timestamp: Date.now(), data: top10 });
    return res.json(top10);
  } catch (err: any) {
    console.error("Streaming chart fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch streaming chart" });
  }
});

export default router;