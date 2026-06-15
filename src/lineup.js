// api/lineup.js — Vercel Serverless Function
// Proxy to SofaScore to avoid CORS. Called by the app as /api/lineup?home=Mexico&away=SouthAfrica

// Map our team names → SofaScore search terms
const TEAM_SEARCH = {
  "México": "Mexico", "Türkiye": "Turkey", "Côte d'Ivoire": "Ivory Coast",
  "Curaçao": "Curacao", "DR Congo": "DR Congo", "Cabo Verde": "Cape Verde",
  "USA": "United States", "South Korea": "South Korea",
};

function sofaName(team) {
  return TEAM_SEARCH[team] || team;
}

export default async function handler(req, res) {
  // CORS headers so the browser can call this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { home, away } = req.query;
  if (!home || !away) {
    return res.status(400).json({ error: "Missing home or away param" });
  }

  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.sofascore.com/",
    "Cache-Control": "no-cache",
  };

  try {
    // Step 1: Search for the event by team names
    const searchTerm = `${sofaName(home)} ${sofaName(away)}`;
    const searchRes = await fetch(
      `https://api.sofascore.com/api/v1/search/events?q=${encodeURIComponent(searchTerm)}&page=0`,
      { headers }
    );
    if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status}`);
    const searchData = await searchRes.json();

    // Find the WC2026 event
    const events = searchData?.events || [];
    let eventId = null;
    for (const e of events) {
      const tName = e?.tournament?.name || "";
      const catName = e?.tournament?.category?.name || "";
      const isWC = tName.includes("World Cup") || catName.includes("World Cup") ||
                   tName.includes("FIFA") || e?.tournament?.uniqueTournament?.id === 16;
      if (isWC) { eventId = e.id; break; }
    }

    // If not found by search, try fetching WC2026 schedule directly
    if (!eventId) {
      // Try scheduled events for today + next 3 days
      for (let d = 0; d <= 3; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().slice(0, 10);
        const schedRes = await fetch(
          `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`,
          { headers }
        );
        if (!schedRes.ok) continue;
        const schedData = await schedRes.json();
        const dayEvents = schedData?.events || [];
        for (const e of dayEvents) {
          const isWC = e?.tournament?.uniqueTournament?.id === 16 ||
                       (e?.tournament?.name || "").includes("World Cup");
          if (!isWC) continue;
          const hName = (e?.homeTeam?.name || "").toLowerCase();
          const aName = (e?.awayTeam?.name || "").toLowerCase();
          const homeQ = sofaName(home).toLowerCase();
          const awayQ = sofaName(away).toLowerCase();
          if ((hName.includes(homeQ) || homeQ.includes(hName)) &&
              (aName.includes(awayQ) || awayQ.includes(aName))) {
            eventId = e.id;
            break;
          }
        }
        if (eventId) break;
      }
    }

    if (!eventId) {
      return res.status(404).json({ error: "match_not_found", home, away });
    }

    // Step 2: Fetch lineups for this event
    const lineupRes = await fetch(
      `https://api.sofascore.com/api/v1/event/${eventId}/lineups`,
      { headers }
    );
    if (!lineupRes.ok) {
      return res.status(404).json({ error: "lineup_not_ready", eventId });
    }
    const lineupData = await lineupRes.json();

    // Step 3: Extract and format
    const extract = (side) => {
      const team = lineupData[side];
      if (!team) return null;
      const players = (team.players || [])
        .filter(p => p.player?.name)
        .map(p => ({
          name: p.player.name,
          position: p.player.position || "M",
          jerseyNumber: p.jerseyNumber,
          substitute: p.substitute || false,
        }));
      return {
        formation: team.formation || null,
        players: players.filter(p => !p.substitute).map(p => p.name),
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
