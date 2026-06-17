// src/liveResults.js
// ─── Live results fetcher — calls API-Football and maps to our match IDs ──────

const API_FOOTBALL_KEY = "50b86c6e4ce49b2c24362c4947a7e3d5";
const API_URL = "https://v3.football.api-sports.io";

const TEAM_NAME_MAP = {
  // Group A
  "Mexico": "Mexico",
  "South Africa": "South Africa",
  "South Korea": "South Korea",
  "Korea Republic": "South Korea",
  "Korea South": "South Korea",
  "Czech Republic": "Czechia",
  "Czechia": "Czechia",
  // Group B
  "Canada": "Canada",
  "Bosnia and Herzegovina": "Bosnia",
  "Bosnia & Herzegovina": "Bosnia",
  "Bosnia": "Bosnia",
  "BiH": "Bosnia",
  "Qatar": "Qatar",
  "Switzerland": "Switzerland",
  // Group C
  "Brazil": "Brazil",
  "Morocco": "Morocco",
  "Haiti": "Haiti",
  "Scotland": "Scotland",
  // Group D
  "USA": "USA",
  "United States": "USA",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Türkiye",
  "Türkiye": "Türkiye",
  "Turkiye": "Türkiye",
  // Group E
  "Germany": "Germany",
  "Curaçao": "Curaçao",
  "Curacao": "Curaçao",
  "Ivory Coast": "Côte d'Ivoire",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Cote d'Ivoire": "Côte d'Ivoire",
  "Ecuador": "Ecuador",
  // Group F
  "Netherlands": "Netherlands",
  "Japan": "Japan",
  "Sweden": "Sweden",
  "Tunisia": "Tunisia",
  // Group G
  "Belgium": "Belgium",
  "Egypt": "Egypt",
  "Iran": "Iran",
  "IR Iran": "Iran",
  "New Zealand": "New Zealand",
  // Group H
  "Spain": "Spain",
  "Cape Verde": "Cabo Verde",
  "Cape Verde Islands": "Cabo Verde",
  "Cabo Verde": "Cabo Verde",
  "Saudi Arabia": "Saudi Arabia",
  "Uruguay": "Uruguay",
  // Group I
  "France": "France",
  "Senegal": "Senegal",
  "Iraq": "Iraq",
  "Norway": "Norway",
  // Group J
  "Argentina": "Argentina",
  "Algeria": "Algeria",
  "Austria": "Austria",
  "Jordan": "Jordan",
  // Group K
  "Portugal": "Portugal",
  "DR Congo": "DR Congo",
  "Congo DR": "DR Congo",
  "Democratic Republic of Congo": "DR Congo",
  "Congo": "DR Congo",
  "Uzbekistan": "Uzbekistan",
  "Colombia": "Colombia",
  // Group L
  "England": "England",
  "Croatia": "Croatia",
  "Ghana": "Ghana",
  "Panama": "Panama",
};

function normalizeTeam(name) {
  return TEAM_NAME_MAP[name] || name;
}

const CACHE_KEY = "wc2026_live_cache_v5";
const CACHE_TTL = 60 * 1000; // 1 minute

export function clearLiveCache() {
  try {
    // Clear all versions
    for (let v = 1; v <= 5; v++) {
      localStorage.removeItem(`wc2026_live_cache_v${v}`);
    }
  } catch {}
}

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

// 🔴 Include both LIVE in-progress AND finished matches
const ACTIVE_STATUSES = ["FT", "AET", "PEN", "1H", "HT", "2H", "ET", "BT", "P", "LIVE"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

export async function fetchLiveResults(force = false) {
  if (!force) {
    const cached = getCache();
    if (cached) return cached.data;
  }

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set");
  }

  // 📊 Track total API calls today
  try {
    const today = new Date().toISOString().slice(0, 10);
    const stats = JSON.parse(localStorage.getItem("wc2026_api_stats_v1") || "{}");
    if (stats.date !== today) {
      stats.date = today;
      stats.calls = 0;
    }
    stats.calls = (stats.calls || 0) + 1;
    stats.lastCall = Date.now();
    localStorage.setItem("wc2026_api_stats_v1", JSON.stringify(stats));
  } catch {}

  const res = await fetch(`${API_URL}/fixtures?league=1&season=2026`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  const json = await res.json();
  if (!json.response) throw new Error("Unexpected API response");

  // 🐛 Debug: track all statuses returned by the API
  const statusCounts = {};
  const teamPairsRaw = [];
  const allTeamNames = new Set();
  const activeMatches = [];
  for (const fx of json.response) {
    const s = fx.fixture?.status?.short || "UNKNOWN";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
    allTeamNames.add(fx.teams?.home?.name);
    allTeamNames.add(fx.teams?.away?.name);
    // Save ALL active/finished matches (not NS)
    if (s !== "NS" && s !== "TBD" && s !== "PST") {
      activeMatches.push({
        home: fx.teams?.home?.name,
        away: fx.teams?.away?.name,
        homeNorm: normalizeTeam(fx.teams?.home?.name),
        awayNorm: normalizeTeam(fx.teams?.away?.name),
        status: s,
        score: `${fx.goals?.home ?? "?"}-${fx.goals?.away ?? "?"}`,
        round: fx.league?.round,
        elapsed: fx.fixture?.status?.elapsed,
      });
    }
  }
  try {
    localStorage.setItem("wc2026_api_debug2_v1", JSON.stringify({
      ts: Date.now(),
      totalReturned: json.response.length,
      statusCounts,
      sample: activeMatches,
      allTeams: [...allTeamNames].sort(),
      errors: json.errors,
      results: json.results,
    }));
  } catch {}

  const byTeamPair = {};
  const knockout = {};

  const KO_KEYWORDS = ["Round of 32", "Round of 16", "Quarter", "Semi", "3rd Place", "Final"];

  for (const fixture of json.response) {
    const status = fixture.fixture?.status?.short;
    const fixtureId = fixture.fixture?.id;
    if (!ACTIVE_STATUSES.includes(status)) continue;

    const home = normalizeTeam(fixture.teams?.home?.name);
    const away = normalizeTeam(fixture.teams?.away?.name);
    const hGoals = fixture.goals?.home;
    const aGoals = fixture.goals?.away;
    if (home == null || away == null || hGoals == null || aGoals == null) continue;

    const round = fixture.league?.round || "";
    const isKnockout = KO_KEYWORDS.some(k => round.includes(k));
    const isFinished = FINISHED_STATUSES.includes(status);
    const isLive = !isFinished;

    if (isKnockout) {
      const homeWon = fixture.teams?.home?.winner === true;
      const awayWon = fixture.teams?.away?.winner === true;
      const winnerName = homeWon ? home : awayWon ? away : null;
      knockout[`${home}|${away}`] = {
        h: hGoals, a: aGoals, status, round, winnerName, originalHome: home, fixtureId,
        isLive, isFinished,
      };
    } else {
      byTeamPair[`${home}|${away}`] = {
        h: hGoals, a: aGoals, status, originalHome: home, fixtureId,
        isLive, isFinished,
      };
    }
  }

  // Also expose 'group' alias for debug screens that check it
  const data = { byTeamPair, knockout, group: byTeamPair, fetchedAt: Date.now() };
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
      out[f.id] = { h: direct.h, a: direct.a, isLive: direct.isLive, isFinished: direct.isFinished, status: direct.status };
    } else if (reverse) {
      out[f.id] = { h: reverse.a, a: reverse.h, isLive: reverse.isLive, isFinished: reverse.isFinished, status: reverse.status };
    }
  }
  return out;
}

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

export async function fetchMatchDetails(apiFixtureId) {
  if (!apiFixtureId) return null;

  const cache = getMatchDetailsCache();
  if (cache[apiFixtureId]) return cache[apiFixtureId];

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set");
  }

  const eventsRes = await fetch(`${API_URL}/fixtures/events?fixture=${apiFixtureId}`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });

  if (!eventsRes.ok) {
    throw new Error(`Match details fetch failed`);
  }

  const eventsJson = await eventsRes.json();

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

  cache[apiFixtureId] = result;
  saveMatchDetailsCache(cache);

  return result;
}

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
  if (cached) return cached.data;

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set");
  }

  // 📊 Track API calls
  try {
    const today = new Date().toISOString().slice(0, 10);
    const stats = JSON.parse(localStorage.getItem("wc2026_api_stats_v1") || "{}");
    if (stats.date !== today) {
      stats.date = today;
      stats.calls = 0;
    }
    stats.calls = (stats.calls || 0) + 1;
    stats.lastCall = Date.now();
    localStorage.setItem("wc2026_api_stats_v1", JSON.stringify(stats));
  } catch {}

  const res = await fetch(`${API_URL}/players/topscorers?league=1&season=2026`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  if (!json.response) throw new Error(`אין response מה-API: ${JSON.stringify(json.errors || {})}`);
  if (json.response.length === 0) throw new Error(`API החזיר 0 שחקנים (league=1, season=2026)`);

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

  setTopScorersCache(out);
  return out;
}
