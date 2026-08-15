import { Router } from "express";
import { Type } from "@google/genai";
import { getGeminiClient } from "../config/gemini.js";

const router = Router();

router.post("/diary/generate-insight", async (req, res) => {
  const { title, type, notes } = req.body;
  if (!notes) {
    return res.status(400).json({ error: "User notes/thoughts are required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      enhancedNotes: notes,
      titleSuggestion: `Reflections on ${title}`,
      tags: [type, "Journal"]
    });
  }

  try {
    const prompt = `You are an AI co-pilot inside Sequel, a beautiful personal media journal app.
The user watched/played/read/listened to "${title}" (${type}) and left these raw notes:
"${notes}"
Analyze their notes and generate:
1. 'enhancedNotes': A beautifully polished, coherent, and highly engaging version of their review/journal entry. Keep their core ideas but write them with clean, eloquent film/book/gaming review vocabulary.
2. 'titleSuggestion': A punchy, gorgeous title for this review entry (e.g. "A Masterclass in Tension" or "Atmospheric but Shallow").
3. 'tags': 2-3 custom stylistic tags (e.g. ["Must-Watch", "Heartbreaking", "Masterpiece"]).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedNotes: { type: Type.STRING },
            titleSuggestion: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["enhancedNotes", "titleSuggestion", "tags"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Diary insight generator failed:", error);
    return res.json({
      enhancedNotes: notes,
      titleSuggestion: `Reflections on ${title}`,
      tags: [type]
    });
  }
});

router.post("/generate-cover", async (req, res) => {
  const { title, type } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    const fallbacks: Record<string, { coverUrl: string; backdropUrl: string }> = {
      movie: {
        coverUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80"
      },
      tv: {
        coverUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80"
      },
      book: {
        coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1200&auto=format&fit=crop&q=80"
      },
    };
    return res.json(fallbacks[type] || fallbacks.movie);
  }

  try {
    const prompt = `You are an expert media visual archivist.
We have a media item of type "${type}" titled "${title}".
Suggest a single highly-specific, relevant and high-quality vertical poster Unsplash image URL (coverUrl) and a landscape backdrop Unsplash image URL (backdropUrl) that matches this specific title.
For example, if the item is "Dune", suggest a stunning desert/sci-fi Unsplash image. If it's a specific book like "The Hobbit", suggest a cozy forest/fantasy image.
If there is no specific match, suggest a generic high-quality photo matching the atmosphere of "${title}"'s genre/medium.

Generate a JSON object containing:
- coverUrl: For visual thumbnail/poster cover URLs (image), you must use the following strict rules:
  - For Movies and TV Shows: Use real, verified TMDB poster path CDN URLs if you know them (e.g., "https://image.tmdb.org/t/p/w500/{poster_path}"). If you do not know the exact path, use a highly specific Unsplash photo search URL matching the visual style of the title, or a high-quality movie-theater concept Unsplash image (e.g., "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80").
  - For Books: Use the public OpenLibrary Cover API URL if you can approximate the ISBN (e.g., "https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false") or use a highly thematic Unsplash photo (e.g., "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80").
- backdropUrl: a high-quality relevant wide Unsplash photo URL (w=1200&auto=format&fit=crop&q=80)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coverUrl: { type: Type.STRING },
            backdropUrl: { type: Type.STRING }
          },
          required: ["coverUrl", "backdropUrl"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    if (!parsed.coverUrl) {
      throw new Error("Missing coverUrl");
    }

    return res.json(parsed);
  } catch (error) {
    console.error("Dynamic cover generator failed:", error);
    return res.json({
      coverUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80"
    });
  }
});

export default router;
