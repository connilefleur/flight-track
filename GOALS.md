# What we want the app to do

This document describes the **goals, behavior, and constraints** of Flight Track.

---

## Product idea

- **Repo name:** `flight-track`
- **What it is:** A small website / mini app for **iPhones (touchscreen)** that tracks **one flight** and shows a **countdown to arrival** plus public flight info.
- **No user input on the site:** The flight number is set by you in the backend (a file or env var). You paste it once; visitors just open the link.

---

## What the app shows

1. **One large countdown** to **arrival** (always arrival, not departure).
   - **More than 1 day left:** Display as `X days` (e.g. `3 days`). At 0 days we switch to time.
   - **Less than 1 day:** Display as **hh:mm:ss** (e.g. `12:34:56`), updating every second.
   - Countdown uses **actual** arrival time when there are delays (so “landing in” reflects reality).
   - Countdown is the **stable** element that’s always there.

2. **Public flight info** (from the free API):
   - Flight number  
   - Origin and destination (airport codes / names)  
   - **Actual** times for departure and arrival (or scheduled when not late)  
   - Gate and terminal for **departure** and **arrival**  
   - Status (scheduled, en route, landed, etc.)  
   - “Landing in X” must reflect the **actual** ETA when delayed.

3. **When the flight has departed** (status = en route):
   - Show **flight time** (elapsed since departure).
   - Show a **progress bar** for the flight: **0%** at departure, **100%** at arrival.  
     So the bar is “flight duration progress,” not position on the map.

4. **When the flight has landed:**
   - Show “LANDED” and stop the countdown.
   - **Stop all updates 1 hour after landing** (no more API calls, no more timers). The app then just shows the final state.

---

## Look and feel

- **Pixel-art / retro digital clock** style: chunky digits, dark background, high-contrast (e.g. green on dark green/black), like an old digital display.
- **Touch-friendly:** Big tap targets; no hover-only behavior. Works well on iPhone.
- **PWA:** Can be “Add to Home Screen”; fullscreen, app-like. Optional 512×512 icon.

---

## Technical constraints

- **Free API only:** Use a free flight API (e.g. AviationStack free tier: 100 requests/month).
- **Smart use of requests:** Don’t poll every minute. Poll **less often when the flight is far away**, **more often as it gets close** and during/after flight, so we can track **two flights in the same month** within the limit.
- **Security:** No API keys or secrets in the repo or in the browser. Key lives only in serverless env. Optional “password” = link-only access via a token in the URL (see SECURITY.md).

---

## Deployment

- **Front end:** Static (e.g. GitHub Pages or Vercel). One HTML, one CSS, one JS file.
- **Back end:** Small serverless function that reads the flight number (from file or env), calls the flight API with the key from env, and returns only the data the front end needs.

---

## Summary

| Goal | Detail |
|------|--------|
| **One flight** | Track a single flight; number set in backend, not by the user on the site. |
| **Countdown** | Always to **arrival**; days then hh:mm:ss; uses actual time when delayed. |
| **Progress bar** | Only when departed; 0% at departure, 100% at arrival. |
| **Stop updates** | 1 hour after landing. |
| **Style** | Pixel-art, retro digital clock. |
| **Platform** | Web PWA, aimed at iPhone touchscreen. |
| **API** | Free tier; adaptive polling so ~50 requests per flight, 2 flights per month. |
| **Secrets** | Never in repo or client; optional token-in-URL for link-only access. |
