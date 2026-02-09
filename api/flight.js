/**
 * Serverless proxy for flight data. Reads flight number from api/flight-number.txt
 * (or FLIGHT_NUMBER env), calls AviationStack with key from env, returns sanitized JSON.
 * Optional: require ?t=ALLOWED_TOKEN for link-only access.
 * Set AVIATIONSTACK_API_KEY and optionally ALLOWED_TOKEN in Vercel/Netlify env.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function getFlightNumber() {
  const envFlight = process.env.FLIGHT_NUMBER && process.env.FLIGHT_NUMBER.trim();
  if (envFlight) return envFlight.trim();
  try {
    const filePath = path.join(process.cwd(), 'api', 'flight-number.txt');
    const raw = fs.readFileSync(filePath, 'utf8');
    const line = raw.split('\n')[0] && raw.split('\n')[0].trim();
    return line || null;
  } catch (_) {
    return null;
  }
}

function fetchAviationStack(apiKey, flightIata) {
  return new Promise((resolve, reject) => {
    const url = `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(flightIata)}&limit=1`;
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // restrict to your origin in production, e.g. https://you.github.io
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function jsonResponse(obj, status = 200) {
  return {
    statusCode: status,
    headers: CORS_HEADERS,
    body: JSON.stringify(obj),
  };
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', CORS_HEADERS['Access-Control-Allow-Origin']);
    res.setHeader('Access-Control-Allow-Methods', CORS_HEADERS['Access-Control-Allow-Methods']);
    res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS['Access-Control-Allow-Headers']);
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).setHeader('Content-Type', 'application/json').end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const allowedToken = process.env.ALLOWED_TOKEN;
  if (allowedToken && allowedToken.length > 0) {
    const t = (req.query && req.query.t) || '';
    if (t !== allowedToken) {
      res.status(401).setHeader('Content-Type', 'application/json').setHeader('Access-Control-Allow-Origin', CORS_HEADERS['Access-Control-Allow-Origin']).end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    res.status(500).setHeader('Content-Type', 'application/json').setHeader('Access-Control-Allow-Origin', CORS_HEADERS['Access-Control-Allow-Origin']).end(JSON.stringify({ error: 'Server misconfiguration: no API key' }));
    return;
  }

  const flightIata = getFlightNumber();
  if (!flightIata) {
    res.status(400).setHeader('Content-Type', 'application/json').setHeader('Access-Control-Allow-Origin', CORS_HEADERS['Access-Control-Allow-Origin']).end(JSON.stringify({ error: 'No flight number configured. Set FLIGHT_NUMBER in env or add api/flight-number.txt' }));
    return;
  }

  try {
    const data = await fetchAviationStack(apiKey, flightIata);
    const out = normalize(data);
    if (!out) {
      res.status(404).setHeader('Content-Type', 'application/json').setHeader('Access-Control-Allow-Origin', CORS_HEADERS['Access-Control-Allow-Origin']).end(JSON.stringify({ error: 'Flight not found' }));
      return;
    }
    res.status(200).setHeader('Content-Type', 'application/json').setHeader('Access-Control-Allow-Origin', CORS_HEADERS['Access-Control-Allow-Origin']).end(JSON.stringify(out));
  } catch (err) {
    res.status(500).setHeader('Content-Type', 'application/json').setHeader('Access-Control-Allow-Origin', CORS_HEADERS['Access-Control-Allow-Origin']).end(JSON.stringify({ error: err.message || 'Failed to fetch flight data' }));
  }
};
