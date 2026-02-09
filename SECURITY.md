# Security setup for flight-track (and similar apps)

This describes a **secure, common pattern** for a static front end (e.g. GitHub Pages) that needs to call a flight API without exposing API keys.

---

## 1. Never expose API keys

- **Flight APIs (e.g. AviationStack)** require an API key. That key must **never** appear in the front end or in the repo.
- **Pattern:** Browser → **your serverless API** (Vercel / Netlify / Cloudflare Workers) → flight API. Only the serverless function has the key, in **environment variables**.

---

## 2. What never gets pushed to GitHub

These are in `.gitignore`; do **not** remove them or commit the files they exclude:

| Never commit | Reason |
|--------------|--------|
| `.env` | Holds API keys and secrets |
| `.env.local`, `.env.*.local` | Same |
| `api/.env` | Backend secrets |
| `secrets.txt`, `secrets.json` | Obvious secret storage |
| Any file containing real API keys or tokens | Keys would be public forever in history |

- Use **only** platform environment variables (Vercel, Netlify, etc.) for production secrets.
- For local dev, use a local `.env` or `.env.local` (and keep it out of the repo via .gitignore).

---

## 3. Optional “password” / link-only access (GitHub Pages–friendly)

GitHub Pages has **no server-side auth**. Two practical options:

### Option A: Token in the URL (recommended for this app)

- You set an **allowed token** in the **serverless** env (e.g. `ALLOWED_TOKEN=your-secret-string`).
- You share only links that include it:  
  `https://yoursite.github.io/flight-track/?t=your-secret-string`
- The **front end** sends `t` to your API; the **API** checks it against `ALLOWED_TOKEN`. Wrong/missing token → 401.
- The token is **not** in the repo; only “set `ALLOWED_TOKEN` in your serverless dashboard” is in the docs.
- **Caveat:** The token is visible in the URL (and in browser history). So: don’t share the URL publicly; treat it as “link-only” access, not strong security.

### Option B: Host behind a platform that supports password protection

- Deploy the same static site on **Netlify** or **Vercel** and enable their **password protection** (if available on your plan). Then the whole site is behind one password at the edge.
- Or use **Cloudflare Access** (free tier has limits) in front of the site for real auth.

For a personal “share the link with family” flight tracker, **Option A** is usually enough and works with GitHub Pages.

---

## 4. Secure setup checklist

- [ ] API key is set only in **serverless env** (e.g. Vercel → Project → Settings → Environment Variables).
- [ ] `.gitignore` includes `.env`, `.env.local`, `api/.env`, and any file where you might paste keys.
- [ ] No API key, token, or password in `index.html`, `app.js`, `style.css`, or any committed file.
- [ ] If you use a token for link-only access, it’s in serverless env only; the client only sends the token (e.g. from `?t=...`); it is not stored in the repo.
- [ ] Before each push, run `git status` and ensure no `.env` or secret file is staged.

---

## 5. CORS

- Your serverless API should set `Access-Control-Allow-Origin` to your front-end origin (e.g. `https://yourusername.github.io`), not `*`, in production, so only your page can call the API.
