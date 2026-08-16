import { Router } from "express";
import { getGeminiClient } from "../config/gemini.js";
import { Type } from "@google/genai";

const OFFLINE_SEARCH_RESULTS: Record<string, any[]> = {
  movie: [
    { id: "off-m1", title: "Inception", type: "movie", releaseDate: "2010-07-16", synopsis: "A thief who steals corporate secrets through dream-sharing technology.", genres: ["Sci-Fi", "Action"], creators: ["Christopher Nolan"], platforms: ["Max"], coverUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80", rating: 8.8 },
    { id: "off-m2", title: "Interstellar", type: "movie", releaseDate: "2014-11-07", synopsis: "A team of explorers travel through a wormhole in space.", genres: ["Sci-Fi", "Drama"], creators: ["Christopher Nolan"], platforms: ["Paramount+"], coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80", rating: 8.7 }
  ],
  tv: [
    { id: "off-t1", title: "Stranger Things", type: "tv", releaseDate: "2016-07-15", synopsis: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments.", genres: ["Sci-Fi", "Horror"], creators: ["The Duffer Brothers"], platforms: ["Netflix"], coverUrl: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=80", rating: 8.7 }
  ],
  book: [
    { id: "off-b1", title: "Dune", type: "book", releaseDate: "1965-08-01", synopsis: "Feature-length epic sci-fi story of Paul Atreides on Arrakis.", genres: ["Sci-Fi"], creators: ["Frank Herbert"], platforms: ["Print", "Kindle"], coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80", rating: 9.0 }
  ]
};

const router = Router();

router.post("/search", async (req, res) => {
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  const { query, type, useAI } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Search query is required." });
  }

  console.log(`[Search] query="${query}" type="${type}" useAI=${useAI} TMDB_KEY_PRESENT=${!!process.env.TMDB_API_KEY}`);

  // TMDB Integration for Movies and TV Shows
  if (process.env.TMDB_API_KEY && (!type || type === 'movie' || type === 'tv')) {
    try {
      const rawKey = process.env.TMDB_API_KEY || '';
      const tmdbKey = rawKey.replace(/^Bearer\s+/i, '').trim();
      const isBearer = tmdbKey.length > 40;
      const tmdbType = type === 'tv' ? 'tv' : type === 'movie' ? 'movie' : 'multi';
      const tmdbUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
      
      const headers = {
        accept: 'application/json',
        ...(isBearer && { Authorization: `Bearer ${tmdbKey}` })
      };
      
      const tmdbRes = await fetch(tmdbUrl, { headers });
      console.log(`[TMDB Search] Request: ${tmdbUrl.replace(tmdbKey, 'HIDDEN_KEY')}`);
      console.log(`[TMDB Search] Response Status: ${tmdbRes.status}`);

      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        console.log(`[TMDB Search] Received ${tmdbData.results?.length || 0} results`);
        console.log(`[TMDB Search] Full Response:`, JSON.stringify(tmdbData, null, 2));
        let results = (tmdbData.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv' || tmdbType !== 'multi')
          .slice(0, 5)
          .map((item: any) => {
            const isTV = item.media_type === 'tv' || tmdbType === 'tv';
            const mappedType = isTV ? 'tv' : 'movie';
            
            return {
              id: `tmdb-${item.id}`,
              _originalId: item.id,
              title: item.title || item.name || item.original_name || "Unknown Title",
              type: mappedType,
              releaseDate: item.release_date || item.first_air_date || "",
              synopsis: item.overview || "",
              genres: [],
              creators: [], 
              platforms: [], 
              runtime: "",
              coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
              backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "",
              [isTV ? 'tvSpecifics' : 'movieSpecifics']: isTV ? {
                currentSeason: 1, currentEpisode: 1, totalSeasons: 1, totalEpisodes: 1
              } : {
                director: ""
              }
            };
          });
          
        // Fetch full details for the results to populate creators, runtime, genres, platforms
        results = await Promise.all(results.map(async (res: any) => {
          const detailUrl = `https://api.themoviedb.org/3/${res.type}/${res._originalId}?append_to_response=credits&language=en-US${!isBearer ? `&api_key=${tmdbKey}` : ''}`;
          try {
            const detailRes = await fetch(detailUrl, { headers });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.genres) res.genres = detailData.genres.map((g: any) => g.name);
              
              if (res.type === 'movie' && detailData.credits?.crew) {
                res.creators = detailData.credits.crew.filter((c: any) => c.job === 'Director').map((c: any) => c.name);
              } else if (res.type === 'tv' && detailData.created_by) {
                res.creators = detailData.created_by.map((c: any) => c.name);
              }
              
              if (detailData.networks) res.platforms = detailData.networks.map((n: any) => n.name);
              
              const runtime = detailData.runtime || detailData.episode_run_time?.[0] || 0;
              if (runtime > 0) res.runtime = `${runtime}m`;
              
              if (res.type === 'tv' && res.tvSpecifics) {
                if (detailData.number_of_seasons) res.tvSpecifics.totalSeasons = detailData.number_of_seasons;
                if (detailData.number_of_episodes) res.tvSpecifics.totalEpisodes = detailData.number_of_episodes;
              }
            }
          } catch (e) {
            console.error(`Failed to fetch details for ${res.title}`, e);
          }
          delete res._originalId;
          return res;
        }));
          
        // If we queried TMDB successfully, return the results (even if empty)
        // If useAI is true and TMDB returned 0 results, we might want to let AI try, 
        // but if useAI is false, we should definitively return the empty array from TMDB.
        if (results.length > 0 || useAI === false) {
          return res.json({ results });
        }
      } else {
        const errorText = await tmdbRes.text();
        console.error(`[TMDB Search] Error Response Body: ${errorText}`);
      }
    } catch (error) {
      console.error("TMDB search failed, falling back:", error);
    }
  }


  // Books and Audiobooks Integration (OpenLibrary, iTunes, Google Books fallback)
  if (type === 'book' || type === 'book') {
    try {
      const q = encodeURIComponent(query);
      let results: any[] = [];

      // 1. iTunes for Audiobooks
      if (type === 'book') {
        try {
          const itunesUrl = `https://itunes.apple.com/search?term=${q}&media=audiobook&limit=8`;
          const itunesRes = await fetch(itunesUrl);
          if (itunesRes.ok) {
            const data = await itunesRes.json();
            results = (data.results || []).map((item: any) => ({
              id: `itunes-${item.collectionId}`,
              title: item.collectionName || "Unknown Title",
              type: 'book',
              releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : "",
              synopsis: (item.description || "").replace(/<[^>]*>?/gm, '').replace(/[\r\n]+/g, ' ').trim(),
              genres: item.primaryGenreName ? [item.primaryGenreName] : ["Audiobook"],
              creators: item.artistName ? [item.artistName] : ["Unknown Author"],
              platforms: ["Apple Books", "Audible"],
              runtime: item.trackTimeMillis ? `${Math.round(item.trackTimeMillis / 60000)} mins` : "",
              coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=80",
              backdropUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&auto=format&fit=crop&q=80",
              bookSpecifics: {
                // // currentMinutes: 0,
                // // totalMinutes: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 60000) : 0,
                // narrator: item.artistName || "",
                author: item.artistName || ""
              }
            }));
          }
        } catch (e) {
          console.error("iTunes search failed", e);
        }
      }

      // 2. Try Google Books API first if API key is configured or public endpoint is responsive
      const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_API_KEY;
      if (type === 'book' && results.length === 0) {
        try {
          const keyParam = googleApiKey ? `&key=${googleApiKey}` : '';
          const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=6${keyParam}`;
          const gBooksRes = await fetch(googleBooksUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          if (gBooksRes.ok) {
            const gBooksData = await gBooksRes.json();
            if (gBooksData.items && gBooksData.items.length > 0) {
              results = (gBooksData.items || []).map((item: any) => {
                const vol = item.volumeInfo || {};
                const imgLinks = vol.imageLinks || {};
                let coverUrl = imgLinks.extraLarge || imgLinks.large || imgLinks.medium || imgLinks.thumbnail || imgLinks.smallThumbnail || "";
                if (coverUrl.startsWith("http:")) coverUrl = coverUrl.replace("http:", "https:");
                if (coverUrl) {
                  coverUrl = coverUrl.replace("&edge=curl", "").replace("zoom=1", "zoom=3");
                } else {
                  const isbn = vol.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13' || i.type === 'ISBN_10')?.identifier;
                  if (isbn) {
                    coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
                  }
                }

                return {
                  id: `gbooks-${item.id}`,
                  title: vol.title || "Unknown Title",
                  type: 'book',
                  releaseDate: vol.publishedDate || "",
                  synopsis: (vol.description || "").replace(/<[^>]*>?/gm, '').replace(/[\r\n]+/g, ' ').trim(),
                  genres: vol.categories || ["Fiction"],
                  creators: vol.authors || ["Unknown Author"],
                  platforms: ["Print", "Kindle", "Ebook"],
                  runtime: vol.pageCount ? `${vol.pageCount} pages` : "",
                  coverUrl: coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80",
                  backdropUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80",
                  bookSpecifics: {
                    currentPage: 0,
                    totalPages: vol.pageCount || 0,
                    format: 'Hardcover',
                    author: vol.authors?.[0] || "Unknown Author",
                    publisher: vol.publisher || "",
                    isbn: vol.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13' || i.type === 'ISBN_10')?.identifier || "",
                    averageRating: vol.averageRating ? Number(vol.averageRating.toFixed(1)) : 0,
                    ratingsCount: vol.ratingsCount || 0
                  }
                };
              });
            }
          } else {
            console.warn(`[Google Books API] HTTP ${gBooksRes.status} status. Falling back to OpenLibrary API.`);
          }
        } catch (error) {
          console.warn("Google Books search rate-limited or unavailable. Falling back to OpenLibrary:", error);
        }
      }

      // 3. Supercharged OpenLibrary API for Books
      if (type === 'book' && results.length === 0) {
        try {
          const olUrl = `https://openlibrary.org/search.json?q=${q}&fields=key,title,author_name,first_publish_year,cover_i,cover_edition_key,publisher,isbn,ratings_average,ratings_count,number_of_pages_median,subject,edition_count&limit=8`;
          const olRes = await fetch(olUrl);
          if (olRes.ok) {
            const data = await olRes.json();
            const docs = data.docs || [];

            // Fetch descriptions and metadata in parallel for top works
            const docsWithDesc = await Promise.all(docs.map(async (item: any) => {
              let synopsis = "";
              if (item.key) {
                try {
                  const workRes = await fetch(`https://openlibrary.org${item.key}.json`);
                  if (workRes.ok) {
                    const workData = await workRes.json();
                    if (workData.description) {
                      synopsis = typeof workData.description === 'string' 
                        ? workData.description 
                        : workData.description.value || "";
                    }
                  }
                } catch (e) {
                  synopsis = "";
                }
              }

              // Clean description markdown / html
              synopsis = synopsis
                .replace(/\\r\\n/g, ' ')
                .replace(/\\[.*?\\]\\(.*?\\)/g, '')
                .replace(/<[^>]*>?/gm, '')
                .replace(/[\r\n]+/g, ' ')
                .trim();

              item.fetchedDescription = synopsis;
              return item;
            }));

            results = docsWithDesc.map((item: any) => {
              // Multi-tier cover resolution
              let coverUrl = "";
              if (item.cover_i && item.cover_i > 0) {
                coverUrl = `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg?default=false`;
              } else if (item.cover_edition_key) {
                coverUrl = `https://covers.openlibrary.org/b/olid/${item.cover_edition_key}-L.jpg?default=false`;
              } else if (item.isbn && item.isbn[0]) {
                coverUrl = `https://covers.openlibrary.org/b/isbn/${item.isbn[0]}-L.jpg?default=false`;
              } else {
                coverUrl = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80";
              }

              // Clean subject genres
              const rawSubjects: string[] = item.subject || [];
              const cleanGenres = rawSubjects.filter((s: string) => 
                typeof s === 'string' &&
                !s.includes(':') && 
                !s.includes('Grade') && 
                !s.includes('Translation') && 
                !s.includes('materials') && 
                !s.includes('audience') &&
                s.length < 25
              ).slice(0, 3);

              if (cleanGenres.length === 0) cleanGenres.push("Literature", "Fiction");

              const workKey = item.key ? item.key.replace('/works/', '') : Math.random().toString(36).substring(7);

              return {
                id: `ol-${workKey}`,
                title: item.title || "Unknown Title",
                type: 'book',
                releaseDate: item.first_publish_year ? item.first_publish_year.toString() : "",
                synopsis: item.fetchedDescription || (item.author_name ? `By ${item.author_name.join(', ')}. First published in ${item.first_publish_year || 'recent years'}.` : "Acclaimed book title."),
                genres: cleanGenres,
                creators: item.author_name || ["Unknown Author"],
                platforms: ["Print", "Kindle", "Ebook"],
                runtime: item.number_of_pages_median ? `${item.number_of_pages_median} pages` : "",
                coverUrl: coverUrl,
                backdropUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80",
                bookSpecifics: {
                  currentPage: 0,
                  totalPages: item.number_of_pages_median || 0,
                  format: 'Hardcover',
                  author: item.author_name?.[0] || "Unknown Author",
                  publisher: item.publisher?.[0] || "",
                  isbn: item.isbn?.[0] || "",
                  averageRating: item.ratings_average ? Number(item.ratings_average.toFixed(1)) : 0,
                  ratingsCount: item.ratings_count || 0
                }
              };
            });
          }
        } catch (e) {
          console.error("OpenLibrary search failed", e);
        }
      }

      if (results.length > 0 || useAI === false) {
        return res.json({ results });
      }
    } catch (e) {
      console.error("Book/Audiobook search error:", e);
    }
  }

  // If useAI is false, and TMDB didn't have results (or wasn't queried), fallback to offline
  if (useAI === false) {
    const mediaType = type || "movie";
    const sourceList = OFFLINE_SEARCH_RESULTS[mediaType] || OFFLINE_SEARCH_RESULTS.movie;
    const filtered = sourceList.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) || 
      item.synopsis.toLowerCase().includes(query.toLowerCase())
    );
    return res.json({ results: filtered.length > 0 ? filtered : sourceList.slice(0, 3) });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Offline mode: filter fallback list
    const mediaType = type || "movie";
    const sourceList = OFFLINE_SEARCH_RESULTS[mediaType] || OFFLINE_SEARCH_RESULTS.movie;
    const filtered = sourceList.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) || 
      item.synopsis.toLowerCase().includes(query.toLowerCase())
    );
    // If no results, return some fallbacks
    return res.json({ results: filtered.length > 0 ? filtered : sourceList.slice(0, 3) });
  }

  try {
    const prompt = `You are a universal media database engine. 
Generate 4-5 highly relevant, realistic real-world search results matching the query: "${query}" ${type ? `specifically of type "${type}"` : ""}.
The media type should be one of: 'movie', 'tv', 'movie', 'book', 'book', 'movie'. 
Make sure the structure perfectly fits the media items. Give standard properties. Use standard platform options.
For each item, generate:
- id: a unique short random string (e.g. "gem-1a2b")
- title: string
- type: MediaType ('movie', 'tv', 'book')
- releaseDate: string in YYYY-MM-DD (e.g. "2024-03-15")
- synopsis: string description
- genres: array of strings
- creators: array of strings (directors, authors, creators)
- platforms: array of strings (Netflix, HBO, Apple TV, Amazon, Kindle, etc.)
- runtime: string (e.g. "122 min", "8 episodes", "340 pages")
- coverUrl: For visual thumbnail/poster cover URLs (image), you must use the following strict rules:
  - For Movies and TV Shows: Use real, verified TMDB poster path CDN URLs if you know them (e.g., "https://image.tmdb.org/t/p/w500/{poster_path}"). If you do not know the exact path, use a highly specific Unsplash photo search URL matching the visual style of the title, or a high-quality movie-theater concept Unsplash image (e.g., "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80").
  - For Books: Use the public OpenLibrary Cover API URL if you can approximate the ISBN (e.g., "https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg") or use a highly thematic Unsplash photo (e.g., "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80").
- backdropUrl: a wide high-quality landscape Unsplash photo matching the vibe/atmosphere of the media item with w=1200 (e.g., "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80").
- Specifics block matching the type:
  - 'movie': director (string)
  - 'tv': currentSeason: 1, currentEpisode: 1, totalSeasons: integer, totalEpisodes: integer, episodesPerSeason: { 1: integer, 2: integer }
  - 'book': currentPage: 0, totalPages: integer, format: 'paperback', author: creator name`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  releaseDate: { type: Type.STRING },
                  synopsis: { type: Type.STRING },
                  genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                  creators: { type: Type.ARRAY, items: { type: Type.STRING } },
                  platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  runtime: { type: Type.STRING },
                  coverUrl: { type: Type.STRING },
                  backdropUrl: { type: Type.STRING },
                  // Specific fields
                  movieSpecifics: {
                    type: Type.OBJECT,
                    properties: { director: { type: Type.STRING } }
                  },
                  tvSpecifics: {
                    type: Type.OBJECT,
                    properties: {
                      currentSeason: { type: Type.INTEGER },
                      currentEpisode: { type: Type.INTEGER },
                      totalSeasons: { type: Type.INTEGER },
                      totalEpisodes: { type: Type.INTEGER },
                    }
                  },
                  bookSpecifics: {
                    type: Type.OBJECT,
                    properties: {
                      currentPage: { type: Type.INTEGER },
                      totalPages: { type: Type.INTEGER },
                      format: { type: Type.STRING },
                      author: { type: Type.STRING }
                    }
                  }
                },
                required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "creators", "platforms", "coverUrl", "backdropUrl"]
              }
            }
          },
          required: ["results"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ results: parsed.results || [] });
  } catch (error) {
    console.error("Gemini search failed:", error);
    // Return offline fallback
    const mediaType = type || "movie";
    const fallbackList = OFFLINE_SEARCH_RESULTS[mediaType] || OFFLINE_SEARCH_RESULTS.movie;
    return res.json({ results: fallbackList.slice(0, 3) });
  }
});

// API Endpoint: Intelligent Recommendations
router.post("/recommend", async (req, res) => {
  const { watchlist } = req.body; // Array of items
  const ai = getGeminiClient();

  if (!ai || !watchlist || watchlist.length === 0) {
    // Generate static offline recommendations
    const items = [
      {
        id: "rec-1",
        title: "Interstellar",
        type: "movie",
        releaseDate: "2014-11-07",
        synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        genres: ["Sci-Fi", "Adventure", "Drama"],
        creators: ["Christopher Nolan"],
        platforms: ["Prime Video", "Apple TV"],
        coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
        reason: "Since you love deep Sci-Fi and mind-bending storytelling like Inception."
      },
      {
        id: "rec-2",
        title: "The Witcher 3: Wild Hunt",
        type: "movie",
        releaseDate: "2015-05-19",
        synopsis: "Geralt of Rivia, a monster hunter, searches for his adopted daughter who is on the run from the Wild Hunt.",
        genres: ["RPG", "Adventure", "Open World"],
        creators: ["CD Projekt Red"],
        platforms: ["PC", "PS5", "Xbox Series X/S", "Switch"],
        coverUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80",
        reason: "Because you enjoy expansive fantasy roleplaying and rich character-driven narratives like Zelda."
      },
      {
        id: "rec-3",
        title: "The Martian",
        type: "book",
        releaseDate: "2011-09-27",
        synopsis: "An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal to Earth.",
        genres: ["Sci-Fi", "Adventure"],
        creators: ["Andy Weir"],
        platforms: ["Kindle", "Paperback", "Audible"],
        coverUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200&auto=format&fit=crop&q=80",
        reason: "By the author of Project Hail Mary, matching your love for hard-science space survival stories."
      }
    ];
    return res.json({ recommendations: items });
  }

  try {
    const watchlistSummary = watchlist.map((w: any) => `- ${w.title} (${w.type}): ${w.genres?.join(", ")}. Status: ${w.status}.`).join("\n");
    const prompt = `You are a personalized recommendation advisor for a media tracking app named Sequel.
Based on the user's watchlist below, recommend exactly 3 distinct real-world media items (movies, tv shows, or books) they would absolutely love.
Do not recommend items that are already in their watchlist.

User's watchlist:
${watchlistSummary}

Generate a JSON object containing a 'recommendations' array. For each recommendation, provide:
- id: random short string
- title: string
- type: 'movie' | 'tv' | 'book'
- releaseDate: YYYY-MM-DD
- synopsis: string description
- genres: array of strings
- creators: array of strings
- platforms: array of strings
- coverUrl: For visual thumbnail/poster cover URLs (image), you must use the following strict rules:
  - For Movies and TV Shows: Use real, verified TMDB poster path CDN URLs if you know them (e.g., "https://image.tmdb.org/t/p/w500/{poster_path}"). If you do not know the exact path, use a highly specific Unsplash photo search URL matching the visual style of the title, or a high-quality movie-theater concept Unsplash image (e.g., "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80").
  - For Books: Use the public OpenLibrary Cover API URL if you can approximate the ISBN (e.g., "https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg") or use a highly thematic Unsplash photo (e.g., "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80").
- backdropUrl: a high-quality landscape Unsplash backdrop image URL matching this item's atmosphere (e.g., "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80").
- reason: a short 1-2 sentence personalized explanation of 'why' they will love it based on their watchlist (e.g. "Because you liked 'Inception', Denis Villeneuve's cinematic style will resonate with you.").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  releaseDate: { type: Type.STRING },
                  synopsis: { type: Type.STRING },
                  genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                  creators: { type: Type.ARRAY, items: { type: Type.STRING } },
                  platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  coverUrl: { type: Type.STRING },
                  backdropUrl: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["id", "title", "type", "releaseDate", "synopsis", "genres", "creators", "platforms", "coverUrl", "backdropUrl", "reason"]
              }
            }
          },
          required: ["recommendations"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ recommendations: parsed.recommendations || [] });
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return res.json({ recommendations: [] });
  }
});

// API Endpoint: Diary Co-pilot helper

// API Endpoint: Book/Audiobook Reviews using iTunes RSS


export default router;
