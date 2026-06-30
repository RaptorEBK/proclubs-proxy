# FC26 Pro Clubs API Proxy

A tiny Express server that relays requests to EA's undocumented Pro Clubs
API (`proclubs.ea.com`), so the browser-based lookup app can call it without
hitting CORS restrictions.

## Run locally

```bash
npm install
node server.js
```

Server starts on `http://localhost:3001`. Test it:

```
http://localhost:3001/api/fc/clubs/search?platform=common-gen5&clubName=test
```

## Connect it to the web app

In `fc26-clubs-lookup.html`, change this line near the top of the `<script>`:

```js
const API_BASE = 'https://proclubs.ea.com/api/fc';
```

to:

```js
const API_BASE = 'http://localhost:3001/api/fc';
```

(or your deployed proxy URL, once it's hosted somewhere — see below).

## Deploying it

This needs to run somewhere with open outbound internet access — it won't
work in a sandboxed/locked-down environment. Easiest free/cheap options:

- **Render** (render.com) — connect a GitHub repo with these two files, pick
  "Web Service," it auto-detects Node and runs `npm start`.
- **Railway** (railway.app) — same idea, very fast to deploy.
- **Fly.io** — slightly more setup but generous free tier.
- **Your own VPS** — `npm install && node server.js`, put it behind nginx/pm2.

Once deployed, you'll get a public URL like `https://your-app.onrender.com`.
Set `API_BASE` in the web app to `https://your-app.onrender.com/api/fc`.

## Notes / caveats

- **Undocumented API**: EA doesn't officially support or document these
  endpoints. They can change, rate-limit, or block traffic without notice.
- **Caching**: responses are cached in-memory for 60 seconds per query to
  avoid hammering EA's servers. Restarting the server clears the cache.
- **Rate limiting**: there's no outbound rate limit built in yet — if you
  expect real traffic, add one (e.g. `express-rate-limit`) before deploying
  publicly, both to be a good citizen toward EA's servers and to avoid
  getting your proxy's IP blocked.
- **CORS**: currently wide open (`cors()` with no options) so any frontend
  can call it. Lock this down to your actual domain before going live:
  ```js
  app.use(cors({ origin: 'https://your-frontend-domain.com' }));
  ```
