// api/lineup.js — Vercel Serverless Function
// Proxy to SofaScore to avoid CORS. Called as /api/lineup?home=Spain&away=Cabo+Verde

const SOFA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.sofascore.com/",
  "Origin": "https://www.sofascore.com",
  "Cache-Control": "no-cache",
};

// Normalize team name for fuzzy matching
function norm(s) {
  return (s || "").toLowerCase()
    .replace(/[áàä]/g, "a").replace(/[éèê]/g, "e").replace(/[íì]/g, "i")
    .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/[ñ]/g, "n")
    .replace(/[ç]/g, "c").replace(/[ž]/g, "z").replace(/[š]/g, "s")
    .replace(/[ć]/g, "c").replace(/[đ]/g, "d").replace(/[ø]/g, "o")
    .replace(/[å]/g, "a").replace(/[æ]/g, "ae")
    .replace(/\s+/g, " ").trim();
}

// Check if two team names match
function teamsMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Special cases
  const aliases = {
    "usa": ["united states", "us"],
    "south korea": ["korea republic", "korea south"],
    "cape verde": ["cabo verde"],
    "turkey": ["turkiye", "türkiye"],
    "ivory coast": ["cote d'ivoire", "côte d'ivoire"],
    "curacao": ["curaçao"],
    "dr congo": ["congo dr", "democratic republic of congo"],
    "bosnia": ["bosnia and herzegovina", "bosnia & herzegovina"],
  };
  for (const [key, vals] of Object.entries(aliases)) {
    const all = [key, ...vals];
    if (all.some(v => norm(v) === na) && all.some(v => norm(v) === nb)) return true;
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { home, away } = req.query;
  if (!home || !away) return res.status(400).json({ error: "Missing home/away" });

  try {
    // Step 1: Fetch all WC2026 events from tournament 16
    // SofaScore tournament seasons — WC2026 season ID 58210
    const tourRes = await fetch(
      "https://api.sofascore.com/api/v1/unique-tournament/16/season/58210/events/last/0",
      { headers: SOFA_HEADERS }
    );

    let eventId = null;

    if (tourRes.ok) {
      const tourData = await tourRes.json();
      const events = tourData?.events || [];
      for (const e of events) {
        const h = e?.homeTeam?.name || "";
        const a2 = e?.awayTeam?.name || "";
        if (teamsMatch(h, home) && teamsMatch(a2, away)) { eventId = e.id; break; }
        if (teamsMatch(h, away) && teamsMatch(a2, home)) { eventId = e.id; break; }
      }
    }

    // Step 2: If not found, try next page
    if (!eventId) {
      const tourRes2 = await fetch(
        "https://api.sofascore.com/api/v1/unique-tournament/16/season/58210/events/next/0",
        { headers: SOFA_HEADERS }
      );
      if (tourRes2.ok) {
        const tourData2 = await tourRes2.json();
        const events2 = tourData2?.events || [];
        for (const e of events2) {
          const h = e?.homeTeam?.name || "";
          const a2 = e?.awayTeam?.name || "";
          if (teamsMatch(h, home) && teamsMatch(a2, away)) { eventId = e.id; break; }
          if (teamsMatch(h, away) && teamsMatch(a2, home)) { eventId = e.id; break; }
        }
      }
    }

    // Step 3: Try scheduled events by date (today + next 2 days)
    if (!eventId) {
      for (let d = 0; d <= 2 && !eventId; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().slice(0, 10);
        const schedRes = await fetch(
          `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`,
          { headers: SOFA_HEADERS }
        );
        if (!schedRes.ok) continue;
        const schedData = await schedRes.json();
        for (const e of (schedData?.events || [])) {
          const isWC = e?.tournament?.uniqueTournament?.id === 16 ||
                       (e?.tournament?.name || "").includes("World Cup");
          if (!isWC) continue;
          const h = e?.homeTeam?.name || "";
          const a2 = e?.awayTeam?.name || "";
          if (teamsMatch(h, home) && teamsMatch(a2, away)) { eventId = e.id; break; }
          if (teamsMatch(h, away) && teamsMatch(a2, home)) { eventId = e.id; break; }
        }
      }
    }

    if (!eventId) {
      return res.status(404).json({ error: "match_not_found", home, away });
    }

    // Step 4: Fetch lineups
    const lineupRes = await fetch(
      `https://api.sofascore.com/api/v1/event/${eventId}/lineups`,
      { headers: SOFA_HEADERS }
    );

    if (!lineupRes.ok) {
      return res.status(404).json({ error: "lineup_not_ready", eventId });
    }

    const lineupData = await lineupRes.json();

    const extract = (side) => {
      const team = lineupData[side];
      if (!team) return null;
      const starters = (team.players || [])
        .filter(p => !p.substitute && p.player?.name)
        .map(p => p.player.name);
      return {
        formation: team.formation || null,
        players: starters,
        confirmed: team.confirmed || false,
      };
    };

    const homeLineup = extract("home");
    const awayLineup = extract("away");

    if (!homeLineup?.players?.length && !awayLineup?.players?.length) {
      return res.status(404).json({ error: "lineup_empty", eventId });
    }

    return res.status(200).json({
      eventId,
      home: homeLineup,
      away: awayLineup,
      source: "sofascore",
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
