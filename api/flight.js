/**
 * Serverless proxy for flight data. Reads flight number from api/flight-number.txt
 * (or FLIGHT_NUMBER env), calls AviationStack with key from env, returns sanitized JSON.
 * Optional: require ?t=ALLOWED_TOKEN for link-only access.
 * Set AVIATIONSTACK_API_KEY and optionally ALLOWED_TOKEN in Vercel/Netlify env.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Only allow requests from these front-end origins
const ALLOWED_ORIGINS = [
  'https://flight-track-blond.vercel.app',
  'https://connilefleur.github.io',
];

function getAllowedOrigin(req) {
  const origin = (req.headers && req.headers.origin) || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Fallback for same-origin serverless calls (no Origin header) – use primary frontend
  return ALLOWED_ORIGINS[0];
}

function getFlightConfig() {
  let flightIata = (process.env.FLIGHT_NUMBER && process.env.FLIGHT_NUMBER.trim()) || null;
  let flightDate = (process.env.FLIGHT_DATE && process.env.FLIGHT_DATE.trim()) || null;
  try {
    const filePath = path.join(process.cwd(), 'api', 'flight-number.txt');
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines[0]) flightIata = flightIata || lines[0];
    if (lines[1]) flightDate = flightDate || lines[1];
  } catch (_) {}
  if (flightDate && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(flightDate)) {
    const [d, m, y] = flightDate.split('.');
    flightDate = y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
  }
  return { flightIata: flightIata || null, flightDate: flightDate || null };
}

function fetchAviationStack(apiKey, flightIata, flightDate) {
  return new Promise((resolve, reject) => {
    let url = `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(flightIata)}&limit=1`;
    if (flightDate) url += '&flight_date=' + encodeURIComponent(flightDate);
    https.get(url, (res) => {
      let body = '';
      res.on('data', (ch) => { body += ch; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error) {
            reject(new Error(data.error.message || 'API error'));
            return;
          }
          resolve(data);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/** Normalize to our front-end shape: actual times (fallback scheduled), gate, terminal, etc. */
function normalize(aviationData) {
  const raw = aviationData.data && aviationData.data[0];
  if (!raw) return null;

  const dep = raw.departure || {};
  const arr = raw.arrival || {};
  const use = (actual, estimated, scheduled) => actual || estimated || scheduled || null;

  return {
    flightNumber: raw.flight && (raw.flight.iata || raw.flight.number) ? (raw.flight.iata || raw.flight.number) : null,
    status: raw.flight_status || null,
    origin: dep.iata || null,
    originAirport: dep.airport || null,
    destination: arr.iata || null,
    destinationAirport: arr.airport || null,
    dep: {
      scheduled: dep.scheduled || null,
      actual: use(dep.actual, dep.estimated, dep.scheduled),
      gate: dep.gate || null,
      terminal: dep.terminal || null,
    },
    arr: {
      scheduled: arr.scheduled || null,
      actual: use(arr.actual, arr.estimated, arr.scheduled),
      gate: arr.gate || null,
      terminal: arr.terminal || null,
    },
    airline: raw.airline && raw.airline.name ? raw.airline.name : null,
  };
}

module.exports = async (req, res) => {
  const allowOrigin = getAllowedOrigin(req);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res
      .status(405)
      .setHeader('Access-Control-Allow-Origin', allowOrigin)
      .setHeader('Content-Type', 'application/json')
      .end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Token check: allow if (1) same-origin request from our app, or (2) ?t= matches ALLOWED_TOKEN
  const allowedToken = process.env.ALLOWED_TOKEN && process.env.ALLOWED_TOKEN.trim();
  if (allowedToken && allowedToken.length > 0) {
    const t = ((req.query && req.query.t) || '').trim();
    const origin = (req.headers && (req.headers.origin || req.headers.referer)) || '';
    const isSameOrigin = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
    const tokenOk = t === allowedToken;
    if (!tokenOk && !isSameOrigin) {
      res
        .status(401)
        .setHeader('Access-Control-Allow-Origin', allowOrigin)
        .setHeader('Content-Type', 'application/json')
        .end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    res
      .status(500)
      .setHeader('Access-Control-Allow-Origin', allowOrigin)
      .setHeader('Content-Type', 'application/json')
      .end(JSON.stringify({ error: 'Server misconfiguration: no API key' }));
    return;
  }

  const { flightIata, flightDate } = getFlightConfig();
  if (!flightIata) {
    res
      .status(400)
      .setHeader('Access-Control-Allow-Origin', allowOrigin)
      .setHeader('Content-Type', 'application/json')
      .end(JSON.stringify({ error: 'No flight number configured. Set FLIGHT_NUMBER in env or add api/flight-number.txt' }));
    return;
  }

  try {
    const data = await fetchAviationStack(apiKey, flightIata, flightDate);
    const out = normalize(data);
    if (!out) {
      res
        .status(404)
        .setHeader('Access-Control-Allow-Origin', allowOrigin)
        .setHeader('Content-Type', 'application/json')
        .end(JSON.stringify({ error: 'Flight not found' }));
      return;
    }
    res
      .status(200)
      .setHeader('Access-Control-Allow-Origin', allowOrigin)
      .setHeader('Content-Type', 'application/json')
      .end(JSON.stringify(out));
  } catch (err) {
    res
      .status(500)
      .setHeader('Access-Control-Allow-Origin', allowOrigin)
      .setHeader('Content-Type', 'application/json')
      .end(JSON.stringify({ error: err.message || 'Failed to fetch flight data' }));
  }
};
