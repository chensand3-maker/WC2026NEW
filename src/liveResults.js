// src/liveResults.js
// ─── Live results fetcher — calls API-Football and maps to our match IDs ──────

// 🔧 PASTE YOUR API-FOOTBALL KEY HERE (see SETUP.md step 3)
const API_FOOTBALL_KEY = "50b86c6e4ce49b2c24362c4947a7e3d5";
const API_URL = "https://v3.football.api-sports.io";

// Team name normalization: API-Football names → our internal names
// You may need to tweak these once tournament starts and you see actual names returned
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
const CACHE_KEY = "wc2026_live_cache_v1";
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

/**
 * Fetch all completed matches for the World Cup 2026 group stage.
 * Returns { byTeamPair: { "TeamA|TeamB": {h, a} }, fetchedAt }
 */
export async function fetchLiveResults() {
  // Check cache first
  const cached = getCache();
  if (cached) return cached.data;

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set. See SETUP.md step 3.");
  }

  // API-Football: league 1 = FIFA World Cup, season 2026
  // Pull all fixtures for the tournament; we'll filter to finished ones
  const res = await fetch(`${API_URL}/fixtures?league=1&season=2026`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  const json = await res.json();
  if (!json.response) throw new Error("Unexpected API response");

  const byTeamPair = {};
  for (const fixture of json.response) {
    const status = fixture.fixture?.status?.short;
    // FT = full time, AET = after extra time, PEN = penalties (all finished)
    if (!["FT", "AET", "PEN"].includes(status)) continue;

    const home = normalizeTeam(fixture.teams?.home?.name);
    const away = normalizeTeam(fixture.teams?.away?.name);
    const hGoals = fixture.goals?.home;
    const aGoals = fixture.goals?.away;
    if (home == null || away == null || hGoals == null || aGoals == null) continue;

    // Store both orderings so we can match regardless of home/away order in our fixtures
    byTeamPair[`${home}|${away}`] = { h: hGoals, a: aGoals, status, originalHome: home };
  }

  const data = { byTeamPair, fetchedAt: Date.now() };
  setCache(data);
  return data;
}

/**
 * Given our FIXTURES array, map live results to our match IDs.
 * Handles home/away order differences.
 */
export function mapResultsToFixtures(liveData, FIXTURES) {
  const out = {};
  if (!liveData?.byTeamPair) return out;

  for (const f of FIXTURES) {
    const direct = liveData.byTeamPair[`${f.home}|${f.away}`];
    const reverse = liveData.byTeamPair[`${f.away}|${f.home}`];

    if (direct) {
      out[f.id] = { h: direct.h, a: direct.a };
    } else if (reverse) {
      // Order was flipped in API response — swap scores
      out[f.id] = { h: reverse.a, a: reverse.h };
    }
  }
  return out;
}

/**
 * Map knockout results to bracket slot IDs (R16-X, QF-X, SF-X, FINAL).
 * Returns map of slot_id → "a" or "b" indicating winner side.
 * Empty object until knockout stage is reached.
 */
export function mapKnockoutToWinners(liveData, realBracket) {
  return {};
}

/**
 * Fetch & return knockout match results (R16 → Final).
 * Returns map of fixture-id-style → winner names.
 * Not used in v1 (group stage only) but stub here for later.
 */
export async function fetchKnockoutResults() {
  // TODO: implement once group stage is done — would map to our R32/R16/QF/SF/FINAL IDs
  return {};
}

// ─── TOP SCORERS ────────────────────────────────────────────────────────────
// Cache top scorers separately. Pulled from /players/topscorers endpoint.
const TOP_SCORERS_CACHE_KEY = "wc2026_topscorers_v1";
const TOP_SCORERS_TTL_MS = 5 * 60 * 1000; // 5 min

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

/**
 * Fetch all top scorers of the 2026 WC.
 * Returns an array of { name, team, goals, rank } sorted by goals desc.
 */
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

  // Each entry has { player: { name, ... }, statistics: [{ goals: { total }, team: { name } }] }
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

  // Sort by goals desc, then by name as tiebreaker
  out.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return a.name.localeCompare(b.name);
  });

  // Assign ranks (handle ties — same goals = same rank)
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

