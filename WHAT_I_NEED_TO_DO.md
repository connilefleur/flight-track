# What I need to do

Your checklist to get Flight Track working. Do these **outside** (and once **inside**) Cursor, in order.

---

## 1. Accounts (all free)

- [ ] **AviationStack** — [aviationstack.com](https://aviationstack.com)  
  Sign up, no credit card. Then open the **dashboard** and copy your **API access key**. You’ll use it only in Vercel (step 4).

- [ ] **GitHub** — [github.com](https://github.com)  
  Create an account if you don’t have one. Create a new repo (e.g. **`flight-track`**). Push this project from Cursor to that repo.

- [ ] **Vercel** — [vercel.com](https://vercel.com)  
  Sign up (e.g. “Continue with GitHub”). You’ll use it to run the API and keep your AviationStack key secret.

---

## 2. Push the project to GitHub

- [ ] In Cursor (or terminal):  
  `git init` (if needed), add files, commit, then:
  - `git remote add origin https://github.com/YOUR_USERNAME/flight-track.git`
  - `git push -u origin main`  
  (Use your real GitHub username and repo name.)

---

## 3. Deploy the API on Vercel

- [ ] On Vercel: **Add New… → Project** → **Import** your `flight-track` repo.
- [ ] Before or right after first deploy: go to **Settings → Environment Variables**.
- [ ] Add:
  - **Name:** `AVIATIONSTACK_API_KEY`  
    **Value:** your key from AviationStack (step 1).  
    **Environments:** Production (and Preview if you want).
- [ ] *(Optional)* Add:
  - **Name:** `ALLOWED_TOKEN`  
    **Value:** a long random string (e.g. from a password generator).  
    Then only links with `?t=THAT_STRING` will work.
- [ ] Deploy. Copy the URL Vercel gives you (e.g. `https://flight-track-xxxx.vercel.app`). This is your **API base URL** — no trailing slash.

---

## 4. In Cursor: two one-time edits

- [ ] **Set the flight number**  
  Edit **`api/flight-number.txt`**. Put **one** flight IATA code on the first line (e.g. `BA123`, `AA1004`). Save.

- [ ] **Set the API URL in the front end**  
  Edit **`app.js`**. Find the line with `API_BASE = ''` and set it to your Vercel URL, e.g.:
  ```js
  const API_BASE = 'https://flight-track-xxxx.vercel.app';
  ```
  (Use your real Vercel URL, no slash at the end.) Save.

- [ ] Commit and push to GitHub so Vercel and (if you use it) GitHub Pages get the updates.

---

## 5. Host the front end (choose one)

- [ ] **Option A — GitHub Pages**  
  1. On GitHub: your repo → **Settings → Pages**.  
  2. Source: **Deploy from a branch**. Branch: **main** (or **master**), folder: **/ (root)**. Save.  
  3. After a minute, the site is at **`https://YOUR_USERNAME.github.io/flight-track/`** (or your repo name).

- [ ] **Option B — Vercel only**  
  If you imported the full repo on Vercel, the same project already serves the site and the API. Open **`https://flight-track-xxxx.vercel.app`** in the browser (that’s the app; `/api/flight` is just the API).

---

## 6. Optional

- [ ] **PWA icon** — Add a **512×512 PNG** named **`icon-512.png`** in the project root for “Add to Home Screen” on iPhone.
- [ ] **Link-only access** — If you set `ALLOWED_TOKEN` on Vercel, share only:  
  `https://yoursite.github.io/flight-track/?t=YOUR_SECRET`

---

## Quick reference

| What | Where |
|------|--------|
| API key | Only in **Vercel** → Settings → Environment Variables. Never in code or repo. |
| Flight number | **`api/flight-number.txt`** (one line, e.g. `BA123`) or env `FLIGHT_NUMBER` on Vercel. |
| API base URL | **`app.js`** → `API_BASE = 'https://your-vercel-url.vercel.app'` |
| Full setup details | [README.md](README.md) |
| What the app does | [GOALS.md](GOALS.md) |
| Security | [SECURITY.md](SECURITY.md) |
