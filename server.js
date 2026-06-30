// FC26 Pro Clubs API Proxy
// Relays requests to EA's undocumented proclubs.ea.com endpoints so they
// can be called from a browser (EA blocks direct cross-origin requests).
//
// Run:   npm install   then   node server.js
// Then point the web app's API_BASE at http://localhost:3001/api/fc

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const EA_BASE = 'https://proclubs.ea.com/api/fc';

// Allow the web app to call this proxy from any origin.
// Lock this down to your actual frontend's domain in production.
app.use(cors());

// Simple in-memory rate limiter / cache to avoid hammering EA
const cache = new Map(); // key -> { data, expires }
const CACHE_TTL_MS = 60 * 1000; // 1 minute

function getCached(key) {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data;
  cache.delete(key);
  return null;
}
function setCached(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// Generic relay handler
async function relay(req, res, eaPath) {
  const query = new URLSearchParams(req.query).toString();
  const url = `${EA_BASE}${eaPath}?${query}`;
  const cacheKey = url;

  const cached = getCached(cacheKey);
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const eaRes = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        // EA sometimes rejects requests without a browser-like UA
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const text = await eaRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // EA returned non-JSON (HTML error page, empty body, etc.)
      return res.status(502).json({
        error: 'EA returned a non-JSON response',
        status: eaRes.status,
        snippet: text.slice(0, 300)
      });
    }

    if (!eaRes.ok) {
      return res.status(eaRes.status).json({ error: 'EA API error', status: eaRes.status, data });
    }

    setCached(cacheKey, data);
    res.set('X-Cache', 'MISS');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach EA servers', detail: err.message });
  }
}

// --- Routes (mirror EA's path shape under /api/fc) ---

app.get('/api/fc/clubs/search', (req, res) => relay(req, res, '/allTimeLeaderboard/search'));
app.get('/api/fc/clubs/info', (req, res) => relay(req, res, '/clubs/info'));
app.get('/api/fc/clubs/matches', (req, res) => relay(req, res, '/clubs/matches'));
app.get('/api/fc/members/stats', (req, res) => relay(req, res, '/members/stats'));
app.get('/api/fc/members/career/stats', (req, res) => relay(req, res, '/members/career/stats'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.listen(PORT, () => {
  console.log(`FC26 Pro Clubs proxy running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/fc/clubs/search?platform=common-gen5&clubName=test`);
});
