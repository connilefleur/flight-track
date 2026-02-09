# Flight Track

Single-flight countdown PWA: one large countdown to **arrival**, flight info (origin, destination, actual times, gate, terminal), and — once the flight has departed — flight time and a progress bar (0% at departure, 100% at arrival). Stops updating 1 hour after landing.

- **Target:** GitHub Pages (or any static host) + serverless API. Optimized for iPhone touchscreen; pixel-art retro digital clock look.
- **Input:** One flight number, set in the backend (file or env). No user input on the site.

---

## What you need to do outside Cursor (accounts & setup)

You need **two free accounts** and a few one-time setup steps.

### 1. AviationStack (flight data API)

- **Why:** The app gets live flight status from here. The key never goes in your code — only in your server’s env.
- **What to do:**
  1. Go to **[aviationstack.com](https://aviationstack.com)** and sign up (free, no credit card).
  2. Open your **dashboard** and copy your **API access key**.
  3. Keep it somewhere safe; you’ll paste it only into Vercel in step 4.

### 2. GitHub (code + optional hosting)

- **Why:** To store the repo and (optionally) host the site on GitHub Pages.
- **What to do:**
  1. If you don’t have one, create a free account at **[github.com](https://github.com)**.
  2. Create a **new repository** named **`flight-track`** (or any name you like).
  3. Push your project from Cursor to that repo (e.g. from terminal: `git remote add origin https://github.com/YOUR_USERNAME/flight-track.git`, then push).

### 3. Vercel (serverless API that hides your API key)

- **Why:** The browser can’t hold your AviationStack key. Vercel runs the small `api/flight.js` and keeps the key in env.
- **What to do:**
  1. Go to **[vercel.com](https://vercel.com)** and sign up (free; “Continue with GitHub” is easiest).
  2. Click **Add New… → Project** and **import** your `flight-track` repo.
  3. Before deploying, open **Settings → Environment Variables** and add:
     - **Name:** `AVIATIONSTACK_API_KEY`  
       **Value:** paste the key from AviationStack (step 1).  
       **Environment:** Production (and Preview if you want).
     - *(Optional)* **Name:** `ALLOWED_TOKEN`  
       **Value:** a long random string (e.g. from a password generator).  
       Then only links like `https://yoursite.github.io/flight-track/?t=THAT_STRING` will work.
  4. Deploy. Vercel will give you a URL like **`https://flight-track-xxxx.vercel.app`**. Copy that — it’s your **API base URL**.

### 4. In Cursor (one-time edits)

- **Flight number:** Edit **`api/flight-number.txt`** and put **one** flight IATA code on the first line (e.g. `BA123`, `AA1004`). Save and push to GitHub.
- **API URL in front end:** In **`app.js`**, set:
  - `const API_BASE = 'https://flight-track-xxxx.vercel.app';`  
  (use the **exact** URL Vercel gave you, **no** trailing slash). Save and push.

### 5. Host the front end (choose one)

- **Option A — GitHub Pages**
  1. On GitHub: repo → **Settings → Pages**.
  2. Source: **Deploy from a branch**; branch **main** (or **master**), folder **/ (root)**. Save.
  3. After a minute, your site is at **`https://YOUR_USERNAME.github.io/flight-track/`** (or whatever your repo name is).
- **Option B — Same Vercel project**  
  If you imported the full repo on Vercel, it already serves both the static site and `/api/flight`. Open **`https://flight-track-xxxx.vercel.app`** in the browser (no `/api` — that’s just the API).

### 6. Optional: PWA icon

- Add a **512×512 PNG** file named **`icon-512.png`** in the project root (for “Add to Home Screen” on iPhone). You can use any image; the repo doesn’t include one.

---

**Summary:** You need accounts at **AviationStack** (API key), **GitHub** (repo), and **Vercel** (to run the API and keep the key secret). Then: set env vars on Vercel, set the flight in `api/flight-number.txt`, set `API_BASE` in `app.js`, push, and turn on GitHub Pages (or use Vercel’s URL). No API keys or tokens go in the repo.

---

## Setup (reference)

### 1. Flight number (backend)

- **Option A:** Edit `api/flight-number.txt` and put one flight IATA code on the first line (e.g. `AA1004`, `BA123`). Commit and push (this file is not secret).
- **Option B:** Set `FLIGHT_NUMBER` in your serverless environment (e.g. Vercel → Settings → Environment Variables).

### 2. API key (backend, never in repo)

- Sign up at [aviationstack.com](https://aviationstack.com) (free tier: 100 requests/month).
- In your serverless host (e.g. Vercel → Project → Settings → Environment Variables), add:
  - `AVIATIONSTACK_API_KEY` = your key

### 3. Optional link-only access

- In the same env, set `ALLOWED_TOKEN` to a long random string.
- Share only links that include it: `https://yoursite.github.io/flight-track/?t=YOUR_SECRET`
- See [SECURITY.md](SECURITY.md) for details.

### 4. Front-end API URL

- In `app.js`, set `API_BASE` to your serverless API origin, e.g.:
  - `const API_BASE = 'https://your-project.vercel.app';`
- Do **not** put API keys or tokens in `app.js`.

### 5. Deploy

- **Front end:** Push to GitHub and enable GitHub Pages (branch `main`, root or `/docs`). Or deploy the repo to Vercel/Netlify for static hosting.
- **Back end:** Deploy the `api/` as serverless (e.g. Vercel: the repo’s `api/flight.js` becomes `https://your-project.vercel.app/api/flight`).

### 6. PWA icon

- Add a 512×512 PNG as `icon-512.png` in the root (for manifest and Apple Home Screen). The repo does not include this file.

## Repo layout

```
├── index.html
├── style.css
├── app.js
├── manifest.json
├── icon-512.png          ← you add this
├── .nojekyll
├── api/
│   ├── flight-number.txt ← paste your flight IATA here (e.g. AA1004)
│   ├── flight.js         ← serverless proxy (uses env for API key)
│   └── .env.example      ← copy to .env.local for local dev; never commit .env
├── README.md
├── ARCHITECTURE.md
├── SECURITY.md
└── .gitignore            ← keeps .env and secrets out of Git
```

## Security

- API key and optional token live only in **serverless environment variables**. Never commit `.env` or any file containing keys. See [SECURITY.md](SECURITY.md) and [.gitignore](.gitignore).

## Free API note (adaptive polling)

- AviationStack free tier: **100 requests per month**. The app uses **adaptive polling** so you can track **two flights in the same month** (~50 requests per flight):
  - **More than 7 days until departure:** 1 request per day (when you open the app).
  - **1–7 days until departure:** about twice per day.
  - **6–24 hours before:** about once per hour.
  - **1–6 hours before:** every 30 minutes.
  - **Under 1 hour / delays / en route:** every 3–15 minutes.
  - **Landed:** every 5 minutes until 1 hour after landing, then stops.
- Last response is cached in `sessionStorage`; if you reopen the app before the next scheduled fetch, no extra request is made.
