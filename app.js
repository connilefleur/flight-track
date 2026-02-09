/**
 * Flight Track — countdown to arrival, flight info, in-flight progress.
 * Set API_BASE to your serverless API URL (e.g. https://your-project.vercel.app).
 * Token from URL ?t= is sent to the API when ALLOWED_TOKEN is set on the server.
 * Polling is adaptive to stay within ~50 requests per flight (100/month allows 2 flights).
 */
(function () {
  const API_BASE = ''; // e.g. 'https://flight-track-api.vercel.app' — replace with your API origin
  const STOP_POLL_AFTER_LANDED_MS = 60 * 60 * 1000; // stop updates 1 hour after landing

  const H = 60 * 60 * 1000;
  const D = 24 * H;
  // Adaptive intervals: far away = once per day; closer = more frequent; in-flight/landed = frequent then stop
  const NEXT_POLL = {
    over7days: 24 * H,   // >7 days until dep: once per day
    oneTo7days: 12 * H,  // 1–7 days: twice per day
    sixTo24h: 1 * H,     // 6h–24h: every hour
    oneTo6h: 30 * 60 * 1000,   // 1h–6h: every 30 min
    under1hOrScheduled: 15 * 60 * 1000, // <1h or still scheduled (delays): every 15 min
    active: 3 * 60 * 1000,     // en route: every 3 min
    landed: 5 * 60 * 1000,    // landed: every 5 min until 1h after
  };

  const CACHE_KEY = 'flight_track_cache';
  const $ = (id) => document.getElementById(id);
  const hide = (el) => el && el.classList.add('hidden');
  const show = (el) => el && el.classList.remove('hidden');

  let flight = null;
  let tickTimer = null;
  let pollTimer = null;
  let landedAt = null;
  let nextFetchAfter = 0; // timestamp; we skip fetch if now < this (unless no cache)

  function getToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('t') || '';
  }

  function apiUrl() {
    const base = (API_BASE || '').replace(/\/$/, '');
    const path = '/api/flight';
    const t = getToken();
    return base + path + (t ? '?t=' + encodeURIComponent(t) : '');
  }

  function parseDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatTime(iso) {
    const d = parseDate(iso);
    if (!d) return '--:--';
    const h = d.getHours();
    const m = d.getMinutes();
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function formatDuration(ms) {
    if (ms < 0 || !isFinite(ms)) return '00:00';
    const totalM = Math.floor(ms / 60000);
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0');
    return '00:' + String(m).padStart(2, '0');
  }

  function renderCountdown(arrivalMs) {
    const now = Date.now();
    const diff = arrivalMs - now;
    const label = $('countdownLabel');
    const el = $('countdown');

    if (diff <= 0) {
      label.textContent = 'LANDED';
      el.textContent = '00:00:00';
      return;
    }

    const sec = Math.floor(diff / 1000) % 60;
    const min = Math.floor(diff / 60000) % 60;
    const hours = Math.floor(diff / 3600000) % 24;
    const days = Math.floor(diff / 86400000);

    if (days > 0) {
      label.textContent = 'LANDING IN';
      el.textContent = days + ' day' + (days !== 1 ? 's' : '');
      return;
    }

    label.textContent = 'LANDING IN';
    el.textContent =
      String(hours).padStart(2, '0') + ':' +
      String(min).padStart(2, '0') + ':' +
      String(sec).padStart(2, '0');
  }

  function renderInFlight(depMs, arrMs) {
    const now = Date.now();
    if (now < depMs) return;
    const elapsed = now - depMs;
    const total = arrMs - depMs;
    const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;

    $('elapsed').textContent = formatDuration(elapsed);
    $('progressBar').style.width = pct.toFixed(1) + '%';
  }

  function tick() {
    if (!flight) return;
    const dep = parseDate(flight.dep && flight.dep.actual);
    const arr = parseDate(flight.arr && flight.arr.actual);
    const depMs = dep ? dep.getTime() : 0;
    const arrMs = arr ? arr.getTime() : 0;
    const now = Date.now();

    if (flight.status === 'landed') {
      landedAt = landedAt || arrMs;
      if (now - landedAt >= STOP_POLL_AFTER_LANDED_MS) {
        stopTimers();
        renderCountdown(arrMs);
        return;
      }
    }

    renderCountdown(arrMs);

    if (flight.status === 'active' && depMs && arrMs && now >= depMs) {
      show($('inFlightSection'));
      renderInFlight(depMs, arrMs);
    } else {
      hide($('inFlightSection'));
    }
  }

  function startTick() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, 1000);
    tick();
  }

  function stopTimers() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  /** Next poll delay in ms from current flight state (scheduled dep/arr, status). Saves API requests. */
  function getNextPollDelay(f) {
    const now = Date.now();
    const depSched = parseDate(f.dep && f.dep.scheduled);
    const arrSched = parseDate(f.arr && f.arr.scheduled);
    const depMs = depSched ? depSched.getTime() : 0;
    const arrMs = arrSched ? arrSched.getTime() : 0;
    const status = (f.status || '').toLowerCase();

    if (status === 'landed') {
      const arrActual = parseDate(f.arr && f.arr.actual);
      const landed = arrActual ? arrActual.getTime() : arrMs;
      if (now - landed >= STOP_POLL_AFTER_LANDED_MS) return null; // stop
      return NEXT_POLL.landed;
    }
    if (status === 'active') return NEXT_POLL.active;

    if (depMs && now < depMs) {
      const daysUntil = (depMs - now) / D;
      if (daysUntil > 7) return NEXT_POLL.over7days;
      if (daysUntil > 1) return NEXT_POLL.oneTo7days;
      const hoursUntil = (depMs - now) / H;
      if (hoursUntil > 6) return NEXT_POLL.sixTo24h;
      if (hoursUntil > 1) return NEXT_POLL.oneTo6h;
      return NEXT_POLL.under1hOrScheduled;
    }

    // Past scheduled dep but still scheduled (delay) or unknown
    return NEXT_POLL.under1hOrScheduled;
  }

  function saveCache(f) {
    try {
      const delay = getNextPollDelay(f);
      nextFetchAfter = delay === null ? 0 : Date.now() + delay;
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        flight: f,
        fetchedAt: Date.now(),
        nextFetchAfter: nextFetchAfter,
      }));
    } catch (_) {}
  }

  function loadCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.flight || !data.nextFetchAfter) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function schedulePoll() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
    if (!flight) return;
    const delay = getNextPollDelay(flight);
    if (delay === null) return; // landed >1h ago, stop
    pollTimer = setTimeout(fetchFlight, delay);
  }

  function render(f) {
    flight = f;
    $('flightNumber').textContent = f.flightNumber || '——';
    $('route').textContent = (f.origin || '—') + ' → ' + (f.destination || '—');
    $('depTime').textContent = formatTime(f.dep && f.dep.actual);
    $('arrTime').textContent = formatTime(f.arr && f.arr.actual);

    const depGate = f.dep && f.dep.gate;
    const depTerm = f.dep && f.dep.terminal;
    $('depGate').textContent = depGate ? 'Gate ' + depGate : '';
    $('depTerminal').textContent = depTerm ? 'T' + depTerm : '';

    const arrGate = f.arr && f.arr.gate;
    const arrTerm = f.arr && f.arr.terminal;
    $('arrGate').textContent = arrGate ? 'Gate ' + arrGate : '';
    $('arrTerminal').textContent = arrTerm ? 'T' + arrTerm : '';

    const statusMap = { scheduled: 'SCHEDULED', active: 'EN ROUTE', landed: 'LANDED', cancelled: 'CANCELLED', incident: 'INCIDENT', diverted: 'DIVERTED' };
    $('status').textContent = statusMap[f.status] || (f.status || '——').toUpperCase();

    hide($('loading'));
    hide($('error'));
    show($('app'));
    startTick();
    saveCache(f);
    schedulePoll();
  }

  function showError(msg) {
    hide($('loading'));
    show($('error'));
    $('error').textContent = msg;
  }

  function fetchFlight() {
    if (!API_BASE) {
      showError('Set API_BASE in app.js to your serverless API URL.');
      return;
    }
    fetch(apiUrl(), { method: 'GET' })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Unauthorized' : r.status === 404 ? 'Flight not found' : 'Network error');
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        render(data);
      })
      .catch((err) => {
        showError(err.message || 'Failed to load flight.');
        stopTimers();
      });
  }

  function init() {
    if (!API_BASE) {
      showError('Set API_BASE in app.js to your serverless API URL.');
      return;
    }
    const cached = loadCache();
    const now = Date.now();
    if (cached && cached.flight && now < cached.nextFetchAfter) {
      nextFetchAfter = cached.nextFetchAfter;
      render(cached.flight);
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(fetchFlight, Math.max(1000, cached.nextFetchAfter - now));
      return;
    }
    fetchFlight();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
