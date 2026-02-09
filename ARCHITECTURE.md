# Architecture & security guide

Template for small **PWA / shareable web apps** (cards, invitations, micro-sites). Copy the structure and rules when starting a new project.

---

## What kind of app

| Term | Meaning |
|------|--------|
| **Static PWA** | HTML + CSS + JS only. No build step. No server-side rendering. |
| **Shareable link app** | Opened from iMessage / WhatsApp etc.; optional “Add to Home Screen”. |
| **Fullscreen, app-like** | No browser UI, no scroll; feels like a tiny native app on mobile. |
| **Optional serverless** | Can stay 100% static or add a small API (e.g. Vercel) for notifications or other server logic. |

**Tech:** Vanilla JS, one HTML file, one CSS file, one main JS file. Optional: `api/` for serverless functions. No framework.

---

## General architecture

### File layout

```
project/
├── index.html          # Single page, PWA meta, one entry point
├── style.css           # All styles (fullscreen, no scroll)
├── app.js              # All client logic (no secrets)
├── manifest.json       # PWA: display standalone, icons, theme
├── icon-512.png        # App icon 512×512 (Home Screen / manifest)
├── icon.svg            # Source for icon (optional)
├── images/             # Static assets (PNG, etc.)
├── api/                # Optional: serverless (e.g. Vercel)
│   └── handler.js      # Example: validate token, call external service via env vars
├── .nojekyll           # If GitHub Pages: serve static, no Jekyll
├── README.md
└── ARCHITECTURE.md     # This file
```

### Data flow

- **Client:** Reads URL params if needed (e.g. `?t=...` for a token). Calls optional API with **token only**. No API keys or webhook URLs in HTML/JS.
- **Optional API:** Validates token, uses **env vars** for secrets (webhooks, keys), never exposes them to the client.
- **State:** No login. Optional `sessionStorage` for UI state only. No sensitive data in storage.

### Deployment

- **Front end:** GitHub Pages, Vercel, or Netlify. Static hosting only.
- **Back end (if any):** Serverless (e.g. Vercel `api/`). Secrets only in platform env vars.

---

## Security rules

### 1. No secrets in client code

- No API keys, webhook URLs, or secret tokens in `index.html`, `app.js`, or `style.css`.
- No passwords or secrets hardcoded in JS.
- Config like “API base URL” can be empty or a public URL; actual secrets stay on the server.

### 2. Secrets only on the server

- Webhooks, API keys, secret tokens → **environment variables** (e.g. Vercel / Netlify env vars).
- API validates a token from the request; the token can be in the **URL** so only people with the link can trigger the action. The **secret** (e.g. webhook URL) never leaves the server.

### 3. No private data in the repo

- No real names, emails, or phone numbers in code (use placeholders in docs if needed).
- No real tokens or keys in the repo; only “set in env” instructions.
- Public site URLs (e.g. `*.github.io`) are fine; they are not secrets.

### 3b. What never to push (see also SECURITY.md and .gitignore)

- **Never** commit `.env`, `.env.local`, `api/.env`, or any file containing API keys or secret tokens.
- **Never** remove `.gitignore` entries for env and secret files.
- Before pushing, run `git status` and ensure no such files are staged. If you ever commit a secret by mistake, rotate the key immediately and remove it from history (e.g. with `git filter-branch` or BFG).

### 4. Optional “under development” gate

- Full-screen overlay (e.g. “Under development”) so the real app is hidden until you are ready.
- Hide overlay via URL param (e.g. `?live=1`) for testing, or remove the overlay when going live.

### 5. CORS and API

- If you have an API, set `Access-Control-Allow-Origin` to your front-end origin only, not `*` in production.

---

## Quick-start checklist for a new app

1. **Copy** the folder structure: `index.html`, `style.css`, `app.js`, `manifest.json`, `icon-512.png`, `.nojekyll`.
2. **PWA meta in `<head>`:**  
   `viewport`, `apple-mobile-web-app-capable`, `theme-color`, `manifest`, `apple-touch-icon`.
3. **Fullscreen layout:**  
   `body`: `overflow: hidden`, `position: fixed`, `inset: 0`; no scroll.
4. **manifest.json:**  
   `"display": "standalone"`, `theme_color`, `icons` (at least 512×512).
5. **GitHub Pages:**  
   Add `.nojekyll` in root; deploy from branch (e.g. `main`) / root.
6. **Secrets:**  
   If you add an API, put webhooks/tokens in env vars only; client only sends a token (e.g. from URL). Keep `.gitignore` so `.env` and secret files are never pushed; see SECURITY.md.
7. **Optional overlay:**  
   Add an “Under development” overlay; hide with `?live=1` or remove it when going live.
8. **Adjust** README and this file for the new app name and repo.
