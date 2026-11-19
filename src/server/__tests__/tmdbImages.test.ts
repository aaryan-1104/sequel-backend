import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../server.js";

describe("TMDB Images Endpoint (/api/tmdb-images)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 if tmdbId is missing", async () => {
    const res = await request(app).get("/api/tmdb-images");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid tmdbId");
  });

  it("fetches and returns posters for valid movie tmdbId", async () => {
    const mockPosters = [
      { file_path: "/test-poster-1.jpg", width: 2000, height: 3000, iso_639_1: "en", vote_average: 8.4, vote_count: 120 },
      { file_path: "/test-poster-2.jpg", width: 1000, height: 1500, iso_639_1: null, vote_average: 7.9, vote_count: 45 },
    ];

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 550,
        posters: mockPosters,
        backdrops: [{ file_path: "/test-backdrop.jpg", width: 3840, height: 2160 }],
      }),
    }));

    const res = await request(app).get("/api/tmdb-images?tmdbId=550&type=movie");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("550");
    expect(res.body.type).toBe("movie");
    expect(Array.isArray(res.body.posters)).toBe(true);
    expect(res.body.posters.length).toBe(2);
    expect(res.body.posters[0].file_path).toBe("/test-poster-1.jpg");
    expect(res.body.posters[0].vote_average).toBe(8.4);
  });

  it("serves cached data for subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 99999,
        posters: [{ file_path: "/cached-poster.jpg", width: 1000, height: 1500 }],
        backdrops: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res1 = await request(app).get("/api/tmdb-images?tmdbId=99999&type=movie");
    expect(res1.status).toBe(200);

    const res2 = await request(app).get("/api/tmdb-images?tmdbId=99999&type=movie");
    expect(res2.status).toBe(200);
    expect(res2.body.posters[0].file_path).toBe("/cached-poster.jpg");

    // Fetch should only be called once due to memory caching
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
