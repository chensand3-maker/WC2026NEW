// src/liveResults.js
// ─── 🔴 LIVE 2026 — pulls real World Cup results from API-Football ────────────

// 🔧 PASTE YOUR API-FOOTBALL KEY HERE
const API_FOOTBALL_KEY = "PASTE_HERE";

const SEASON = 2026;
const API_URL = "https://v3.football.api-sports.io";

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
  "Cote d'Ivoire": "Côte d'Ivoire",
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
  if (!name) return null;
  return TEAM_NAME_MAP[name] || name;
}

// 🆕 Cache key bumped to v3 — any old 2022 cached data will be ignored automatically.
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
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data })); } catch {}
}

// Detect which round a fixture is in (API "round" field varies)
function detectRound(roundStr) {
  if (!roundStr) return null;
  const s = roundStr.toLowerCase();
  if (s.includes("final") && !s.includes("semi") && !s.includes("quarter")) return "FINAL";
  if (s.includes("3rd") || s.includes("third place")) return "THIRD";
  if (s.includes("semi")) return "SF";
  if (s.includes("quarter")) return "QF";
  if (s.includes("round of 16") || s.includes("16th") || s.includes("r16")) return "R16";
  if (s.includes("round of 32") || s.includes("32nd") || s.includes("r32")) return "R32";
  if (s.includes("group")) return "GROUP";
  return null;
}

/**
 * Fetch all 2026 World Cup matches (group + knockout).
 */
export async function fetchLiveResults() {
  const cached = getCache();
  if (cached) {
    console.log("[liveResults] using cached data");
    return cached.data;
  }

  if (!API_FOOTBALL_KEY || API_FOOTBALL_KEY === "PASTE_HERE") {
    throw new Error("API-Football key not set. See SETUP.md step 3.");
  }

  console.log(`[liveResults] fetching season ${SEASON}...`);
  const res = await fetch(`${API_URL}/fixtures?league=1&season=${SEASON}`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  const json = await res.json();
  if (!json.response) throw new Error("Unexpected API response");

  console.log(`[liveResults] API returned ${json.response.length} fixtures`);

  const byTeamPair = {};
  const knockout = { R32: [], R16: [], QF: [], SF: [], FINAL: [] };
  let matched = 0, skipped = 0;
  const unknownTeams = new Set();
  const unknownRounds = new Set();

  for (const fixture of json.response) {
    const status = fixture.fixture?.status?.short;
    if (!["FT", "AET", "PEN"].includes(status)) { skipped++; continue; }

    const rawHome = fixture.teams?.home?.name;
    const rawAway = fixture.teams?.away?.name;
    const home = normalizeTeam(rawHome);
    const away = normalizeTeam(rawAway);

    let hGoals = fixture.goals?.home;
    let aGoals = fixture.goals?.away;

    let winner = null;
    if (fixture.teams?.home?.winner === true) winner = home;
    else if (fixture.teams?.away?.winner === true) winner = away;

    if (home == null || away == null || hGoals == null || aGoals == null) {
      skipped++;
      continue;
    }

    if (!TEAM_NAME_MAP[rawHome]) unknownTeams.add(rawHome);
    if (!TEAM_NAME_MAP[rawAway]) unknownTeams.add(rawAway);

    const round = detectRound(fixture.league?.round);
    if (round === "GROUP" || !round) {
      byTeamPair[`${home}|${away}`] = { h: hGoals, a: aGoals, status };
      if (!round) unknownRounds.add(fixture.league?.round);
    } else if (round === "THIRD") {
      // Skip 3rd-place match (not in our bracket)
    } else {
      knockout[round].push({
        home, away,
        h: hGoals, a: aGoals,
        winner,
        status,
      });
    }
    matched++;
  }

  console.log(`[liveResults] processed: ${matched} completed, ${skipped} skipped`);
  console.log(`[liveResults] knockout counts: R32=${knockout.R32.length}, R16=${knockout.R16.length}, QF=${knockout.QF.length}, SF=${knockout.SF.length}, FINAL=${knockout.FINAL.length}`);
  if (unknownTeams.size > 0) {
    console.log("[liveResults] unknown team names (won't match):", [...unknownTeams]);
  }
  if (unknownRounds.size > 0) {
    console.log("[liveResults] unrecognized round labels:", [...unknownRounds]);
  }

  const data = {
    byTeamPair,
    knockout,
    fetchedAt: Date.now(),
  };
  setCache(data);
  return data;
}

/** Map group-stage results to our FIXTURES array. */
export function mapResultsToFixtures(liveData, FIXTURES) {
  const out = {};
  if (!liveData?.byTeamPair) return out;
  let matched = 0;

  for (const f of FIXTURES) {
    const direct = liveData.byTeamPair[`${f.home}|${f.away}`];
    const reverse = liveData.byTeamPair[`${f.away}|${f.home}`];

    if (direct) {
      out[f.id] = { h: direct.h, a: direct.a };
      matched++;
    } else if (reverse) {
      out[f.id] = { h: reverse.a, a: reverse.h };
      matched++;
    }
  }
  console.log(`[liveResults] mapped ${matched}/${FIXTURES.length} fixtures to real scores`);
  return out;
}

/**
 * Map knockout results to bracket slot IDs (e.g. "R32-1", "R16-3", "FINAL").
 */
export function mapKnockoutToWinners(liveData, realBracket) {
  const koWinners = {};
  if (!liveData?.knockout || !realBracket) return koWinners;

  const matchSlot = (slot, slotId, fixtures) => {
    if (!slot?.a || !slot?.b) return;
    const aName = slot.a.name || slot.a.n;
    const bName = slot.b.name || slot.b.n;
    for (const fx of fixtures) {
      const matches =
        (fx.home === aName && fx.away === bName) ||
        (fx.home === bName && fx.away === aName);
      if (!matches) continue;
      if (fx.winner === aName) koWinners[slotId] = "a";
      else if (fx.winner === bName) koWinners[slotId] = "b";
      else if (fx.h !== fx.a) {
        const winnerName = fx.h > fx.a ? fx.home : fx.away;
        if (winnerName === aName) koWinners[slotId] = "a";
        else if (winnerName === bName) koWinners[slotId] = "b";
      }
      return;
    }
  };

  realBracket.r32?.forEach((m) => matchSlot(m, m.id, liveData.knockout.R32));
  realBracket.r16?.forEach((m) => matchSlot(m, m.id, liveData.knockout.R16));
  realBracket.qf?.forEach((m) => matchSlot(m, m.id, liveData.knockout.QF));
  realBracket.sf?.forEach((m) => matchSlot(m, m.id, liveData.knockout.SF));
  if (realBracket.final) matchSlot(realBracket.final, realBracket.final.id, liveData.knockout.FINAL);

  console.log(`[liveResults] mapped ${Object.keys(koWinners).length} knockout slots to real winners`);
  return koWinners;
}

export async function fetchKnockoutResults() {
  const data = await fetchLiveResults();
  return data.knockout || {};
}
