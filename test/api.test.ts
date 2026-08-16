import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.ts'; 

describe('Sequel API Integration Tests', () => {
  it('GET / should return 200 and API status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.name).toContain('Sequel');
  });

  it('GET /api/status should return 200', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
  });

  it('GET /api/invalid-route should return 404 JSON fallback', async () => {
    const res = await request(app).get('/api/invalid-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).toContain('not found');
  });

  it('POST /api/search should include Cache-Control header', async () => {
    const res = await request(app).post('/api/search').send({ query: 'Inception', type: 'movie' });
    expect(res.headers['cache-control']).toBeDefined();
    expect(res.headers['cache-control']).toContain('s-maxage=600');
  });

  it('GET /api/health should include RateLimit headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });
});
