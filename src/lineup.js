// api/lineup.js — Vercel Serverless Function
// Returns SofaScore match URL for WC2026 matches

const SOFA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.sofascore.com/",
  "Origin": "https://www.sofascore.com",
  "Cache-Control": "no-cache",
};

function norm(s) {
  return (s || "").toLowerCase()
    .replace(/[áàä]/g, "a").replace(/[éèê]/g, "e").replace(/[íì]/g, "i")
    .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/[ñ]/g, "n")
    .replace(/[ç]/g, "c").replace(/[žź]/g, "z").replace(/[šś]/g, "s")
    .replace(/[ćč]/g, "c").replace(/[đ]/g, "d").replace(/[ø]/g, "o")
    .replace(/[å]/g, "a").replace(/[æ]/g, "ae").replace(/[ő]/g, "o")
    .replace(/\s+/g, " ").trim();
}

function teamsMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const aliases = {
    "usa": ["united states", "us"],
    "south korea": ["korea republic"],
    "cape verde": ["cabo verde"],
    "turkey": ["turkiye", "turkiye"],
    "ivory coast": ["cote d'ivoire", "côte d'ivoire"],
    "curacao": ["curacao"],
    "dr congo": ["congo dr", "democratic republic of congo"],
    "bosnia": ["bosnia and herzegovina", "bosnia & herzegovina"],
  };
  for (const [key, vals] of Object.entries(aliases)) {
    const all = [key, ...vals];
    if (all.some(v => norm(v) === na) && all.some(v => norm(v) === nb)) return true;
  }
  return false;
}

async function findEvent(home, away) {
  // Try tournament schedule pages (last + next)
  for (const page of ["last/0", "next/0", "next/1"]) {
    try {
      const res = await fetch(
        `https://api.sofascore.com/api/v1/unique-tournament/16/season/58210/events/${page}`,
        { headers: SOFA_HEADERS }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const e of (data?.events || [])) {
        const h = e?.homeTeam?.name || "";
        const a = e?.awayTeam?.name || "";
        const slug = e?.slug || "";
        if ((teamsMatch(h, home) && teamsMatch(a, away)) ||
            (teamsMatch(h, away) && teamsMatch(a, home))) {
          return { id: e.id, slug };
        }
      }
    } catch {}
  }

  // Try scheduled events by date
  for (let d = 0; d <= 3; d++) {
    try {
      const date = new Date();
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);
      const res = await fetch(
        `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`,
        { headers: SOFA_HEADERS }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const e of (data?.events || [])) {
        const isWC = e?.tournament?.uniqueTournament?.id === 16;
        if (!isWC) continue;
        const h = e?.homeTeam?.name || "";
        const a = e?.awayTeam?.name || "";
        const slug = e?.slug || "";
        if ((teamsMatch(h, home) && teamsMatch(a, away)) ||
            (teamsMatch(h, away) && teamsMatch(a, home))) {
          return { id: e.id, slug };
        }
      }
    } catch {}
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { home, away } = req.query;
  if (!home || !away) return res.status(400).json({ error: "Missing home/away" });

  try {
    const event = await findEvent(home, away);

    if (!event) {
      // Fallback: WC2026 tournament page
      return res.status(200).json({
        url: "https://www.sofascore.com/football/tournament/world/world-championship/16#id:58210",
        found: false,
      });
    }

    const url = `https://www.sofascore.com/football/match/${event.slug}#id:${event.id},tab:lineups`;
    return res.status(200).json({ url, id: event.id, found: true });

  } catch (err) {
    return res.status(200).json({
      url: "https://www.sofascore.com/football/tournament/world/world-championship/16#id:58210",
      found: false,
      error: err.message,
    });
  }
}
