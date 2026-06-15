// api/lineup.js — fetches all WC2026 events once and returns the SofaScore URL

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Referer": "https://www.sofascore.com/",
  "Origin": "https://www.sofascore.com",
};

function norm(s) {
  return (s||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}

function match(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const map = { "usa":"united states","turkey":"turkiye","ivory coast":"cote d ivoire",
    "cape verde":"cabo verde","dr congo":"congo dr","bosnia":"bosnia and herzegovina" };
  const ra = map[na]||na, rb = map[nb]||nb;
  return ra===rb || ra.includes(rb) || rb.includes(ra);
}

// Cache results in memory (Vercel keeps functions warm for a while)
let cache = null;
let cacheTime = 0;

async function getAllEvents() {
  if (cache && Date.now() - cacheTime < 5 * 60 * 1000) return cache;

  const all = [];
  for (const page of ["last/0","last/1","next/0","next/1","next/2","next/3"]) {
    try {
      const r = await fetch(
        `https://api.sofascore.com/api/v1/unique-tournament/16/season/58210/events/${page}`,
        { headers: HEADERS }
      );
      if (!r.ok) continue;
      const d = await r.json();
      all.push(...(d.events||[]));
    } catch {}
  }

  cache = all;
  cacheTime = Date.now();
  return all;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { home, away } = req.query;
  if (!home || !away) return res.status(400).json({ error: "Missing home/away" });

  const fallback = "https://www.sofascore.com/football/tournament/world/world-championship/16#id:58210";

  try {
    const events = await getAllEvents();
    let found = null;

    for (const e of events) {
      const h = e?.homeTeam?.name||"", a = e?.awayTeam?.name||"";
      if ((match(h,home) && match(a,away)) || (match(h,away) && match(a,home))) {
        found = e; break;
      }
    }

    if (!found) return res.status(200).json({ url: fallback, found: false });

    const slug = found.slug || "";
    const id = found.id;
    const url = slug
      ? `https://www.sofascore.com/football/match/${slug}#id:${id},tab:lineups`
      : fallback;

    return res.status(200).json({ url, id, found: true });
  } catch (err) {
    return res.status(200).json({ url: fallback, found: false, error: err.message });
  }
}
