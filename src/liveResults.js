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

// 🛡️ Hard rate-limit: never hit the fixtures endpoint more than once per 30s,
// even when callers pass force=true. This is a safety net against any runaway
// loop accidentally draining the API quota.
const MIN_FETCH_GAP_MS = 30 * 1000;
function liveFetchAllowed() {
  try {
    const last = Number(localStorage.getItem("wc2026_last_live_fetch") || 0);
    return Date.now() - last >= MIN_FETCH_GAP_MS;
  } catch { return true; }
}
function markLiveFetch() {
  try { localStorage.setItem("wc2026_last_live_fetch", String(Date.now())); } catch {}
}

// 📊 Count every real API call so the in-app counter is accurate.
function countApiCall() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const stats = JSON.parse(localStorage.getItem("wc2026_api_stats_v1") || "{}");
    if (stats.date !== today) { stats.date = today; stats.calls = 0; }
    stats.calls = (stats.calls || 0) + 1;
    stats.lastCall = Date.now();
    localStorage.setItem("wc2026_api_stats_v1", JSON.stringify(stats));
  } catch {}
}

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

    // 🛡️ Rate-limit only NON-forced (automatic) refreshes. A user pressing the
    // refresh button (force=true) always gets fresh data so new goals show up.
    if (!liveFetchAllowed()) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) return JSON.parse(raw).data;
      } catch {}
    }
  }

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set");
  }
  markLiveFetch();

  // 📊 Track total API calls today
  countApiCall();

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

    // 🕒 Per-phase scores (API-Football exposes these under fixture.score)
    const sc90 = fixture.score?.fulltime;   // result at 90 min (regulation)
    const scET = fixture.score?.extratime;  // cumulative incl. extra time
    const scPK = fixture.score?.penalty;    // penalty shootout
    const ft90 = (sc90 && sc90.home != null && sc90.away != null) ? { h: sc90.home, a: sc90.away } : null;
    const etRes = (scET && scET.home != null && scET.away != null) ? { h: scET.home, a: scET.away } : null;
    const pkRes = (scPK && scPK.home != null && scPK.away != null) ? { h: scPK.home, a: scPK.away } : null;

    if (isKnockout) {
      const homeWon = fixture.teams?.home?.winner === true;
      const awayWon = fixture.teams?.away?.winner === true;
      const winnerName = homeWon ? home : awayWon ? away : null;
      knockout[`${home}|${away}`] = {
        h: hGoals, a: aGoals, status, round, winnerName, originalHome: home, fixtureId,
        isLive, isFinished, ft90, etRes, pkRes,
      };
    } else {
      byTeamPair[`${home}|${away}`] = {
        h: hGoals, a: aGoals, status, originalHome: home, fixtureId,
        isLive, isFinished, ft90, etRes, pkRes,
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
      out[f.id] = { h: direct.h, a: direct.a, isLive: direct.isLive, isFinished: direct.isFinished, status: direct.status, ft90: direct.ft90, etRes: direct.etRes, pkRes: direct.pkRes };
    } else if (reverse) {
      out[f.id] = { h: reverse.a, a: reverse.h, isLive: reverse.isLive, isFinished: reverse.isFinished, status: reverse.status,
        ft90: reverse.ft90 ? { h: reverse.ft90.a, a: reverse.ft90.h } : null,
        etRes: reverse.etRes ? { h: reverse.etRes.a, a: reverse.etRes.h } : null,
        pkRes: reverse.pkRes ? { h: reverse.pkRes.a, a: reverse.pkRes.h } : null };
    }
  }
  return out;
}

export function getApiFixtureId(liveData, fixture) {
  if (!liveData) return null;
  // Group matches live under byTeamPair
  if (liveData.byTeamPair) {
    const direct = liveData.byTeamPair[`${fixture.home}|${fixture.away}`];
    if (direct?.fixtureId) return direct.fixtureId;
    const reverse = liveData.byTeamPair[`${fixture.away}|${fixture.home}`];
    if (reverse?.fixtureId) return reverse.fixtureId;
  }
  // Knockout matches live under knockout
  if (liveData.knockout) {
    const kDirect = liveData.knockout[`${fixture.home}|${fixture.away}`];
    if (kDirect?.fixtureId) return kDirect.fixtureId;
    const kReverse = liveData.knockout[`${fixture.away}|${fixture.home}`];
    if (kReverse?.fixtureId) return kReverse.fixtureId;
  }
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

    // Carry the 90-minute result through so KO scoring can judge bets on regulation time.
    let ft90 = null, etRes = null, pkRes = null;
    if (result.ft90 && result.ft90.h !== undefined && result.ft90.h !== null) {
      ft90 = swapped
        ? { h: String(result.ft90.a), a: String(result.ft90.h) }
        : { h: String(result.ft90.h), a: String(result.ft90.a) };
    }
    if (result.etRes && result.etRes.h !== undefined && result.etRes.h !== null) {
      etRes = swapped
        ? { h: String(result.etRes.a), a: String(result.etRes.h) }
        : { h: String(result.etRes.h), a: String(result.etRes.a) };
    }
    if (result.pkRes && result.pkRes.h !== undefined && result.pkRes.h !== null) {
      pkRes = swapped
        ? { h: String(result.pkRes.a), a: String(result.pkRes.h) }
        : { h: String(result.pkRes.h), a: String(result.pkRes.a) };
    }

    if (swapped) {
      scores[m.id] = { h: String(result.a), a: String(result.h), isLive: result.isLive === true, isFinished: result.isFinished === true, status: result.status, ft90, etRes, pkRes };
    } else {
      scores[m.id] = { h: String(result.h), a: String(result.a), isLive: result.isLive === true, isFinished: result.isFinished === true, status: result.status, ft90, etRes, pkRes };
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

const MATCH_DETAILS_KEY = "wc2026_match_details_v3";

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

export async function fetchMatchDetails(apiFixtureId, isLive = false) {
  if (!apiFixtureId) return null;

  const cache = getMatchDetailsCache();
  // Only trust the cache for matches that already have events AND aren't live.
  // A live match (or one fetched before goals were logged) must be re-fetched,
  // otherwise an early empty result gets frozen in forever.
  if (cache[apiFixtureId] && !isLive && cache[apiFixtureId].events && cache[apiFixtureId].events.length > 0) {
    return cache[apiFixtureId];
  }

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set");
  }

  countApiCall();
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
    // Keep goals even if the minute is missing.
    if (minute == null && type !== "Goal") continue;
    events.push({ minute: (minute == null ? "" : minute), extra, type, detail, playerName, assistName, teamName });
  }

  const result = {
    events,
    fetchedAt: Date.now(),
  };

  // Only persist to cache once the match is finished and has events —
  // never freeze an empty/partial result from a live or just-started match.
  if (!isLive && events.length > 0) {
    cache[apiFixtureId] = result;
    saveMatchDetailsCache(cache);
  }

  return result;
}

const TOP_SCORERS_CACHE_KEY = "wc2026_topscorers_v3";
const TOP_SCORERS_TTL_MS = 30 * 60 * 1000; // 30 min

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

// ─── BUILD TOP SCORERS FROM MATCH EVENTS ──────────────────────────────────────
// Instead of relying on the slow topscorers API endpoint,
// we aggregate goals from each match's events.

const SCORERS_FROM_EVENTS_KEY = "wc2026_scorers_events_v1";
const SCORERS_FROM_EVENTS_TTL = 10 * 60 * 1000; // 10 min

export async function buildTopScorersFromEvents(liveData) {
  // Check cache
  try {
    const raw = localStorage.getItem(SCORERS_FROM_EVENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.fetchedAt < SCORERS_FROM_EVENTS_TTL) {
        return parsed.data;
      }
    }
  } catch {}

  if (!liveData) return [];

  // Collect all finished fixture IDs
  const allFixtures = [
    ...Object.values(liveData.byTeamPair || {}),
    ...Object.values(liveData.knockout || {}),
  ];

  // Separate finished matches (never change → cache forever) from live ones
  // (still changing → must re-fetch each time).
  const finishedList = allFixtures.filter(f => f.isFinished && f.fixtureId);
  const liveList     = allFixtures.filter(f => !f.isFinished && f.isLive && f.fixtureId);

  if (finishedList.length === 0 && liveList.length === 0) return [];

  // Build a stable key from a player's name so that "Kylian Mbappé",
  // "K. Mbappé" and "Kylian Mbappe" all merge into the SAME scorer.
  const playerKey = (raw) => {
    const clean = (raw || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const parts = clean.split(/\s+/);
    const last = parts[parts.length - 1] || clean;       // last name
    const firstInitial = parts.length > 1 ? parts[0][0] : ""; // first letter of first name
    return `${firstInitial}|${last}`;
  };

  // 💰 Permanent per-fixture goal cache. Once a FINISHED match's goals are
  // stored, we never call the API for it again — finished matches don't change.
  // This is what stops the burst of /fixtures/events calls every refresh.
  let perFixture = {};
  try { perFixture = JSON.parse(localStorage.getItem("wc2026_fixture_goals_v2") || "{}"); } catch {}

  const extractGoals = (json) => {
    const goals = [];
    for (const e of (json.response || [])) {
      if (e.type !== "Goal") continue;
      const detail = (e.detail || "").toLowerCase();
      const comments = (e.comments || "").toLowerCase();
      if (detail === "own goal") continue;            // גול עצמי
      if (detail === "missed penalty") continue;       // פנדל שהוחמץ
      if (comments.includes("disallowed")) continue;   // גול שבוטל (VAR)
      if (comments.includes("penalty shootout")) continue; // דו-קרב פנדלים
      const name = e.player?.name;
      const team = normalizeTeam(e.team?.name || "");
      if (!name) continue;
      goals.push({ name, team });
    }
    return goals;
  };

  // Fetch ONLY: finished matches we haven't cached yet + all live matches.
  const toFetch = [
    ...finishedList.filter(f => !perFixture[f.fixtureId]).map(f => ({ id: f.fixtureId, finished: true })),
    ...liveList.map(f => ({ id: f.fixtureId, finished: false })),
  ];

  for (const { id, finished } of toFetch) {
    try {
      countApiCall();
      const res = await fetch(`${API_URL}/fixtures/events?fixture=${id}`, {
        headers: { "x-apisports-key": API_FOOTBALL_KEY },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const goals = extractGoals(json);
      // Only cache FINISHED matches permanently; live ones stay uncached so
      // they refresh next time.
      if (finished) perFixture[id] = goals;
      else perFixture[`live_${id}`] = goals;
    } catch {}
  }
  // Persist the finished-match cache
  try { localStorage.setItem("wc2026_fixture_goals_v2", JSON.stringify(perFixture)); } catch {}

  // Tally goals from ALL relevant matches using the cache (no API calls here)
  const goalTally = {}; // normalizedKey → { goals, team, displayName }
  const addGoals = (goals) => {
    for (const g of goals) {
      const key = playerKey(g.name);
      if (!goalTally[key]) goalTally[key] = { goals: 0, team: g.team, displayName: g.name };
      goalTally[key].goals++;
      if (g.name.length > goalTally[key].displayName.length) goalTally[key].displayName = g.name;
    }
  };
  for (const f of finishedList) addGoals(perFixture[f.fixtureId] || []);
  for (const f of liveList) addGoals(perFixture[`live_${f.fixtureId}`] || []);

  // Build sorted array
  const out = Object.values(goalTally)
    .map(v => ({ name: v.displayName, team: v.team, goals: v.goals }))
    .filter(s => s.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));

  // Add ranks
  let prevGoals = -1, prevRank = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i].goals !== prevGoals) { prevRank = i + 1; prevGoals = out[i].goals; }
    out[i].rank = prevRank;
  }

  // Cache result
  try {
    localStorage.setItem(SCORERS_FROM_EVENTS_KEY, JSON.stringify({ fetchedAt: Date.now(), data: out }));
  } catch {}

  return out;
}

// ─── TEAM MATCH STATISTICS (shots, possession, fouls, etc.) ───────────────────
// Fetches /fixtures/statistics for each finished match ONCE, caches forever.
// Returns per-team aggregated totals so the app can show averages.
const TEAM_STATS_KEY = "wc2026_team_stats_v3";
const TEAM_STATS_AGG_KEY = "wc2026_team_stats_agg_v3";
const TEAM_STATS_AGG_TTL = 10 * 60 * 1000; // 10 min

function parseStatValue(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  // "56%" → 56
  const n = parseFloat(String(v).replace("%", ""));
  return Number.isNaN(n) ? 0 : n;
}

export async function buildTeamMatchStats(liveData) {
  // Aggregate cache (so we don't recompute every render)
  try {
    const raw = localStorage.getItem(TEAM_STATS_AGG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.fetchedAt < TEAM_STATS_AGG_TTL) return parsed.data;
    }
  } catch {}

  if (!liveData) return {};

  const allFixtures = [
    ...Object.values(liveData.byTeamPair || {}),
    ...Object.values(liveData.knockout || {}),
  ];
  const finishedRaw = allFixtures.filter(f => f.isFinished && f.fixtureId);
  // Deduplicate by fixtureId — the same match can appear in more than one map
  // (byTeamPair / knockout), which would otherwise double-count every stat.
  const seenIds = new Set();
  const finishedList = [];
  for (const f of finishedRaw) {
    if (seenIds.has(f.fixtureId)) continue;
    seenIds.add(f.fixtureId);
    finishedList.push(f);
  }
  if (finishedList.length === 0) return {};

  // Permanent per-fixture cache of raw statistics
  let perFixture = {};
  try { perFixture = JSON.parse(localStorage.getItem(TEAM_STATS_KEY) || "{}"); } catch {}

  // Only fetch matches we haven't cached yet (cap per pass for safety)
  const toFetch = finishedList.filter(f => !perFixture[f.fixtureId]).slice(0, 12);

  for (const f of toFetch) {
    try {
      countApiCall();
      const res = await fetch(`${API_URL}/fixtures/statistics?fixture=${f.fixtureId}`, {
        headers: { "x-apisports-key": API_FOOTBALL_KEY },
      });
      // If the API isn't ready yet (not ok / 204), DON'T cache an empty result —
      // leave it uncached so we retry next time instead of locking in zeros.
      if (!res.ok) continue;
      const json = await res.json();
      const teams = (json.response || []).map(block => {
        const get = (type) => {
          const item = (block.statistics || []).find(s => s.type === type);
          return item ? parseStatValue(item.value) : 0;
        };
        return {
          team: normalizeTeam(block.team?.name || ""),
          shots: get("Total Shots"),
          shotsOnGoal: get("Shots on Goal"),
          fouls: get("Fouls"),
          corners: get("Corner Kicks"),
          offsides: get("Offsides"),
          possession: get("Ball Possession"),
          yellow: get("Yellow Cards"),
          red: get("Red Cards"),
          saves: get("Goalkeeper Saves"),
        };
      });
      // Only cache when we actually got team data; otherwise retry later.
      if (teams.length > 0) perFixture[f.fixtureId] = { teams };
    } catch {
      // network error — leave uncached to retry
    }
  }
  try { localStorage.setItem(TEAM_STATS_KEY, JSON.stringify(perFixture)); } catch {}

  // Aggregate per team across all cached fixtures
  const agg = {}; // teamName → { games, shots, shotsOnGoal, fouls, corners, offsides, possession, yellow, red, saves }
  const ensure = (name) => {
    if (!agg[name]) agg[name] = { games: 0, shots: 0, shotsOnGoal: 0, fouls: 0, corners: 0, offsides: 0, possession: 0, yellow: 0, red: 0, saves: 0 };
    return agg[name];
  };
  for (const f of finishedList) {
    const rec = perFixture[f.fixtureId];
    if (!rec || !rec.teams) continue;
    rec.teams.forEach(ts => {
      if (!ts.team) return;
      const a = ensure(ts.team);
      a.games++;
      a.shots += ts.shots;
      a.shotsOnGoal += ts.shotsOnGoal;
      a.fouls += ts.fouls;
      a.corners += ts.corners;
      a.offsides += ts.offsides;
      a.possession += ts.possession;
      a.yellow += ts.yellow;
      a.red += ts.red;
      a.saves += ts.saves;
    });
  }

  try { localStorage.setItem(TEAM_STATS_AGG_KEY, JSON.stringify({ fetchedAt: Date.now(), data: agg })); } catch {}
  return agg;
}

export function clearTeamMatchStatsCache() {
  try {
    localStorage.removeItem(TEAM_STATS_KEY);
    localStorage.removeItem(TEAM_STATS_AGG_KEY);
  } catch {}
}

export function clearTopScorersFromEventsCache() {
  try { localStorage.removeItem(SCORERS_FROM_EVENTS_KEY); } catch {}
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
    if (goals <= 0) continue; // רק שחקנים שהבקיעו
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
