// src/liveResults.js
// ─── Live results fetcher — calls API-Football and maps to our match IDs ──────

// 🔧 PASTE YOUR API-FOOTBALL KEY HERE (see SETUP.md step 3)
const API_FOOTBALL_KEY = "PASTE_HERE";
const API_URL = "https://v3.football.api-sports.io";

// Team name normalization: API-Football names → our internal names
const TEAM_NAME_MAP = {
  "USA": "USA",
  "United States": "USA",
  "Mexico": "Mexico",
  "Canada": "Canada",
  "South Africa": "South Africa",
  "South Korea": "South Korea",
  "Korea Republic": "South Korea",
  "Czech Republic": "Czechia",
  "Czechia": "Czechia",
  "Bosnia and Herzegovina": "Bosnia",
  "Qatar": "Qatar",
  "Switzerland": "Switzerland",
  "Brazil": "Brazil",
  "Morocco": "Morocco",
  "Haiti": "Haiti",
  "Scotland": "Scotland",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Türkiye",
  "Türkiye": "Türkiye",
  "Germany": "Germany",
  "Curaçao": "Curaçao",
  "Curacao": "Curaçao",
  "Ivory Coast": "Côte d'Ivoire",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Ecuador": "Ecuador",
  "Netherlands": "Netherlands",
  "Japan": "Japan",
  "Sweden": "Sweden",
  "Tunisia": "Tunisia",
  "Belgium": "Belgium",
  "Egypt": "Egypt",
  "Iran": "Iran",
  "IR Iran": "Iran",
  "New Zealand": "New Zealand",
  "Spain": "Spain",
  "Cape Verde": "Cabo Verde",
  "Cabo Verde": "Cabo Verde",
  "Saudi Arabia": "Saudi Arabia",
  "Uruguay": "Uruguay",
  "France": "France",
  "Senegal": "Senegal",
  "Iraq": "Iraq",
  "Norway": "Norway",
  "Argentina": "Argentina",
  "Algeria": "Algeria",
  "Austria": "Austria",
  "Jordan": "Jordan",
  "Portugal": "Portugal",
  "DR Congo": "DR Congo",
  "Congo DR": "DR Congo",
  "Uzbekistan": "Uzbekistan",
  "Colombia": "Colombia",
  "England": "England",
  "Croatia": "Croatia",
  "Ghana": "Ghana",
  "Panama": "Panama",
};

function normalizeTeam(name) {
  return TEAM_NAME_MAP[name] || name;
}

// In-memory cache to avoid hammering the API (free tier: 100 req/day)
const CACHE_KEY = "wc2026_live_cache_v3";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data }));
  } catch {}
}

export async function fetchLiveResults() {
  const cached = getCache();
  if (cached) return cached.data;

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set. See SETUP.md step 3.");
  }

  const res = await fetch(`${API_URL}/fixtures?league=1&season=2026`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  const json = await res.json();
  if (!json.response) throw new Error("Unexpected API response");

  const byTeamPair = {};
  const knockout = {};

  const KO_KEYWORDS = ["Round of 32", "Round of 16", "Quarter", "Semi", "3rd Place", "Final"];

  for (const fixture of json.response) {
    const status = fixture.fixture?.status?.short;
    const fixtureId = fixture.fixture?.id;
    if (!["FT", "AET", "PEN"].includes(status)) continue;

    const home = normalizeTeam(fixture.teams?.home?.name);
    const away = normalizeTeam(fixture.teams?.away?.name);
    const hGoals = fixture.goals?.home;
    const aGoals = fixture.goals?.away;
    if (home == null || away == null || hGoals == null || aGoals == null) continue;

    const round = fixture.league?.round || "";
    const isKnockout = KO_KEYWORDS.some(k => round.includes(k));

    if (isKnockout) {
      const homeWon = fixture.teams?.home?.winner === true;
      const awayWon = fixture.teams?.away?.winner === true;
      const winnerName = homeWon ? home : awayWon ? away : null;
      knockout[`${home}|${away}`] = {
        h: hGoals, a: aGoals, status, round, winnerName, originalHome: home, fixtureId,
      };
    } else {
      byTeamPair[`${home}|${away}`] = { h: hGoals, a: aGoals, status, originalHome: home, fixtureId };
    }
  }

  const data = { byTeamPair, knockout, fetchedAt: Date.now() };
  setCache(data);
  return data;
}

export function mapResultsToFixtures(liveData, FIXTURES) {
  const out = {};
  if (!liveData?.byTeamPair) return out;

  for (const f of FIXTURES) {
    const direct = liveData.byTeamPair[`${f.home}|${f.away}`];
    const reverse = liveData.byTeamPair[`${f.away}|${f.home}`];

    if (direct) {
      out[f.id] = { h: direct.h, a: direct.a };
    } else if (reverse) {
      out[f.id] = { h: reverse.a, a: reverse.h };
    }
  }
  return out;
}

/**
 * Look up the API fixture ID for our internal fixture (by team names).
 * Returns null if not found.
 */
export function getApiFixtureId(liveData, fixture) {
  if (!liveData?.byTeamPair) return null;
  const direct = liveData.byTeamPair[`${fixture.home}|${fixture.away}`];
  if (direct?.fixtureId) return direct.fixtureId;
  const reverse = liveData.byTeamPair[`${fixture.away}|${fixture.home}`];
  if (reverse?.fixtureId) return reverse.fixtureId;
  return null;
}

export function mapKnockoutToBracket(liveData, bracketMatches) {
  const winners = {};
  const scores = {};
  if (!liveData?.knockout || !bracketMatches) return { winners, scores };

  for (const m of bracketMatches) {
    if (!m.a || !m.b) continue;
    const aName = m.a.name || m.a.n;
    const bName = m.b.name || m.b.n;
    const direct = liveData.knockout[`${aName}|${bName}`];
    const reverse = liveData.knockout[`${bName}|${aName}`];
    let result = null;
    let swapped = false;
    if (direct) {
      result = direct;
    } else if (reverse) {
      result = reverse;
      swapped = true;
    }
    if (!result) continue;

    if (swapped) {
      scores[m.id] = { h: String(result.a), a: String(result.h) };
    } else {
      scores[m.id] = { h: String(result.h), a: String(result.a) };
    }

    if (result.winnerName) {
      if (result.winnerName === aName) winners[m.id] = "a";
      else if (result.winnerName === bName) winners[m.id] = "b";
    }
  }
  return { winners, scores };
}

export function mapKnockoutToWinners(liveData, realBracket) {
  if (!realBracket) return {};
  const { winners } = mapKnockoutToBracket(liveData, realBracket);
  return winners;
}

export async function fetchKnockoutResults() {
  return {};
}

// ─── MATCH DETAILS (events + statistics) ────────────────────────────────────
// Fetched on-demand when user taps a finished match. Cached forever in localStorage
// — finished match stats never change, so we save the API quota.

const MATCH_DETAILS_KEY = "wc2026_match_details_v1";

function getMatchDetailsCache() {
  try {
    const raw = localStorage.getItem(MATCH_DETAILS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveMatchDetailsCache(cache) {
  try {
    localStorage.setItem(MATCH_DETAILS_KEY, JSON.stringify(cache));
  } catch {}
}

/**
 * Fetch detailed events + statistics for a single match.
 *   apiFixtureId: ID from API-Football (use getApiFixtureId to find it)
 * Returns:
 *   {
 *     events: [{ minute, extra, type, detail, playerName, assistName, teamName }],
 *     homeTeam, awayTeam,
 *     homeStats: { "Ball Possession": "58%", "Shots on Goal": 8, ... },
 *     awayStats: { ... },
 *     fetchedAt
 *   }
 */
export async function fetchMatchDetails(apiFixtureId) {
  if (!apiFixtureId) return null;

  // Check cache (cached forever for finished matches)
  const cache = getMatchDetailsCache();
  if (cache[apiFixtureId]) return cache[apiFixtureId];

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set");
  }

  // Fetch only events (goals, cards, subs) — NOT statistics, to save quota
  const eventsRes = await fetch(`${API_URL}/fixtures/events?fixture=${apiFixtureId}`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });

  if (!eventsRes.ok) {
    throw new Error(`Match details fetch failed`);
  }

  const eventsJson = await eventsRes.json();

  // Parse events
  const events = [];
  for (const e of (eventsJson.response || [])) {
    const minute = e.time?.elapsed;
    const extra = e.time?.extra ? `+${e.time.extra}` : "";
    const type = e.type;
    const detail = e.detail;
    const playerName = e.player?.name || "";
    const assistName = e.assist?.name || "";
    const teamName = normalizeTeam(e.team?.name || "");
    if (minute == null) continue;
    events.push({ minute, extra, type, detail, playerName, assistName, teamName });
  }

  // Determine which team in API is "home" — first goal-scoring team helps
  // (we infer from events; saves a stats API call)
  let homeTeam = "";
  let awayTeam = "";
  for (const e of events) {
    if (e.type === "Goal" && e.teamName) {
      if (!homeTeam) homeTeam = e.teamName;
      else if (e.teamName !== homeTeam && !awayTeam) awayTeam = e.teamName;
      if (homeTeam && awayTeam) break;
    }
  }

  const result = {
    events, homeTeam, awayTeam,
    fetchedAt: Date.now(),
  };

  // Cache forever (finished match goals never change)
  cache[apiFixtureId] = result;
  saveMatchDetailsCache(cache);

  return result;
}

// ─── TOP SCORERS ────────────────────────────────────────────────────────────
const TOP_SCORERS_CACHE_KEY = "wc2026_topscorers_v1";
const TOP_SCORERS_TTL_MS = 5 * 60 * 1000;

function getTopScorersCache() {
  try {
    const raw = localStorage.getItem(TOP_SCORERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > TOP_SCORERS_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function setTopScorersCache(data) {
  try { localStorage.setItem(TOP_SCORERS_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data })); } catch {}
}

export async function fetchTopScorers() {
  const cached = getTopScorersCache();
  if (cached) {
    console.log("[topScorers] using cached data");
    return cached.data;
  }

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set");
  }

  console.log("[topScorers] fetching from API...");
  const res = await fetch(`${API_URL}/players/topscorers?league=1&season=2026`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  const json = await res.json();
  if (!json.response) throw new Error("Unexpected API response");

  const out = [];
  for (const item of json.response) {
    const name = item.player?.name;
    const stat = item.statistics?.[0];
    const goals = stat?.goals?.total ?? 0;
    const rawTeam = stat?.team?.name;
    const team = TEAM_NAME_MAP[rawTeam] || rawTeam || "";
    if (!name) continue;
    out.push({ name, team, goals });
  }

  out.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return a.name.localeCompare(b.name);
  });

  let prevGoals = -1, prevRank = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i].goals !== prevGoals) {
      prevRank = i + 1;
      prevGoals = out[i].goals;
    }
    out[i].rank = prevRank;
  }

  console.log(`[topScorers] got ${out.length} scorers`);
  setTopScorersCache(out);
  return out;
}
