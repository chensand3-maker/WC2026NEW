import { useState, useMemo, useEffect, useRef } from "react";
import {
  generateLeagueCode, createLeague, joinLeague,
  updateMyPicks, leaveLeague, subscribeLeague, updateActualResults,
} from "./firebase";
import { fetchLiveResults, mapResultsToFixtures, mapKnockoutToWinners } from "./liveResults";

// ─── TEAMS ────────────────────────────────────────────────────────────────────

const GROUPS = {
  A: [{n:"Mexico",f:"🇲🇽"},{n:"South Africa",f:"🇿🇦"},{n:"South Korea",f:"🇰🇷"},{n:"Czechia",f:"🇨🇿"}],
  B: [{n:"Canada",f:"🇨🇦"},{n:"Bosnia",f:"🇧🇦"},{n:"Qatar",f:"🇶🇦"},{n:"Switzerland",f:"🇨🇭"}],
  C: [{n:"Brazil",f:"🇧🇷"},{n:"Morocco",f:"🇲🇦"},{n:"Haiti",f:"🇭🇹"},{n:"Scotland",f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿"}],
  D: [{n:"USA",f:"🇺🇸"},{n:"Paraguay",f:"🇵🇾"},{n:"Australia",f:"🇦🇺"},{n:"Türkiye",f:"🇹🇷"}],
  E: [{n:"Germany",f:"🇩🇪"},{n:"Curaçao",f:"🇨🇼"},{n:"Côte d'Ivoire",f:"🇨🇮"},{n:"Ecuador",f:"🇪🇨"}],
  F: [{n:"Netherlands",f:"🇳🇱"},{n:"Japan",f:"🇯🇵"},{n:"Sweden",f:"🇸🇪"},{n:"Tunisia",f:"🇹🇳"}],
  G: [{n:"Belgium",f:"🇧🇪"},{n:"Egypt",f:"🇪🇬"},{n:"Iran",f:"🇮🇷"},{n:"New Zealand",f:"🇳🇿"}],
  H: [{n:"Spain",f:"🇪🇸"},{n:"Cabo Verde",f:"🇨🇻"},{n:"Saudi Arabia",f:"🇸🇦"},{n:"Uruguay",f:"🇺🇾"}],
  I: [{n:"France",f:"🇫🇷"},{n:"Senegal",f:"🇸🇳"},{n:"Iraq",f:"🇮🇶"},{n:"Norway",f:"🇳🇴"}],
  J: [{n:"Argentina",f:"🇦🇷"},{n:"Algeria",f:"🇩🇿"},{n:"Austria",f:"🇦🇹"},{n:"Jordan",f:"🇯🇴"}],
  K: [{n:"Portugal",f:"🇵🇹"},{n:"DR Congo",f:"🇨🇩"},{n:"Uzbekistan",f:"🇺🇿"},{n:"Colombia",f:"🇨🇴"}],
  L: [{n:"England",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},{n:"Croatia",f:"🇭🇷"},{n:"Ghana",f:"🇬🇭"},{n:"Panama",f:"🇵🇦"}],
};
const GROUP_KEYS = Object.keys(GROUPS);
const ALL_TEAMS = GROUP_KEYS.flatMap(g => GROUPS[g].map(t => ({...t, g})));
const findTeam = (name) => ALL_TEAMS.find(t => t.n === name);

const COLORS = {
  A:"#ef4444",B:"#f97316",C:"#eab308",D:"#22c55e",
  E:"#06b6d4",F:"#3b82f6",G:"#a855f7",H:"#ec4899",
  I:"#f43f5e",J:"#14b8a6",K:"#84cc16",L:"#f59e0b",
};

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

const FIXTURES = [];
GROUP_KEYS.forEach(g => {
  const t = GROUPS[g];
  const pairs = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
  pairs.forEach((p, i) => {
    FIXTURES.push({
      id: `${g}-${i}`, group: g,
      matchday: Math.floor(i/2) + 1,
      home: t[p[0]].n, away: t[p[1]].n,
    });
  });
});

// ─── SCHEDULE: kickoff times (UTC) and venues for every group match ──────────
// Times are given in ET in the published schedule; June 2026 is EDT (UTC−4),
// so we convert: e.g. June 11 3:00 PM ET = June 11 19:00 UTC.
// Key format: "TeamA|TeamB" (matching either direction).

function _utc(year, month, day, hour, minute) {
  // month is 1-12 for readability; Date.UTC expects 0-11
  return new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
}

const SCHEDULE = {
  // ── Group A ──
  "Mexico|South Africa":  { kickoff: _utc(2026,6,11,19, 0), venue: "Estadio Azteca, Mexico City" },
  "South Korea|Czechia":  { kickoff: _utc(2026,6,12, 2, 0), venue: "Estadio Akron, Zapopan" },
  "Czechia|South Africa": { kickoff: _utc(2026,6,18,16, 0), venue: "Mercedes-Benz Stadium, Atlanta" },
  "Mexico|South Korea":   { kickoff: _utc(2026,6,19, 1, 0), venue: "Estadio Akron, Zapopan" },
  "Czechia|Mexico":       { kickoff: _utc(2026,6,25, 1, 0), venue: "Estadio Azteca, Mexico City" },
  "South Africa|South Korea": { kickoff: _utc(2026,6,25, 1, 0), venue: "Estadio BBVA, Guadalupe" },
  // ── Group B ──
  "Canada|Bosnia":        { kickoff: _utc(2026,6,12,19, 0), venue: "BMO Field, Toronto" },
  "Qatar|Switzerland":    { kickoff: _utc(2026,6,13,19, 0), venue: "Levi's Stadium, Santa Clara" },
  "Switzerland|Bosnia":   { kickoff: _utc(2026,6,18,19, 0), venue: "SoFi Stadium, Inglewood" },
  "Canada|Qatar":         { kickoff: _utc(2026,6,18,22, 0), venue: "BC Place, Vancouver" },
  "Switzerland|Canada":   { kickoff: _utc(2026,6,24,19, 0), venue: "BC Place, Vancouver" },
  "Bosnia|Qatar":         { kickoff: _utc(2026,6,24,19, 0), venue: "Lumen Field, Seattle" },
  // ── Group C ──
  "Brazil|Morocco":       { kickoff: _utc(2026,6,13,22, 0), venue: "MetLife Stadium, East Rutherford" },
  "Haiti|Scotland":       { kickoff: _utc(2026,6,14, 1, 0), venue: "Gillette Stadium, Foxborough" },
  "Scotland|Morocco":     { kickoff: _utc(2026,6,19,22, 0), venue: "Gillette Stadium, Foxborough" },
  "Brazil|Haiti":         { kickoff: _utc(2026,6,20, 1, 0), venue: "Lincoln Financial Field, Philadelphia" },
  "Scotland|Brazil":      { kickoff: _utc(2026,6,24,22, 0), venue: "Hard Rock Stadium, Miami Gardens" },
  "Morocco|Haiti":        { kickoff: _utc(2026,6,24,22, 0), venue: "Mercedes-Benz Stadium, Atlanta" },
  // ── Group D ──
  "USA|Paraguay":         { kickoff: _utc(2026,6,13, 1, 0), venue: "SoFi Stadium, Inglewood" },
  "Australia|Türkiye":    { kickoff: _utc(2026,6,13, 4, 0), venue: "BC Place, Vancouver" },
  "Türkiye|Paraguay":     { kickoff: _utc(2026,6,19, 4, 0), venue: "Levi's Stadium, Santa Clara" },
  "USA|Australia":        { kickoff: _utc(2026,6,19,19, 0), venue: "Lumen Field, Seattle" },
  "Türkiye|USA":          { kickoff: _utc(2026,6,26, 2, 0), venue: "SoFi Stadium, Inglewood" },
  "Paraguay|Australia":   { kickoff: _utc(2026,6,26, 2, 0), venue: "Levi's Stadium, Santa Clara" },
  // ── Group E ──
  "Germany|Curaçao":      { kickoff: _utc(2026,6,14,17, 0), venue: "NRG Stadium, Houston" },
  "Côte d'Ivoire|Ecuador":{ kickoff: _utc(2026,6,14,23, 0), venue: "Lincoln Financial Field, Philadelphia" },
  "Germany|Côte d'Ivoire":{ kickoff: _utc(2026,6,20,20, 0), venue: "BMO Field, Toronto" },
  "Ecuador|Curaçao":      { kickoff: _utc(2026,6,21, 0, 0), venue: "Arrowhead Stadium, Kansas City" },
  "Ecuador|Germany":      { kickoff: _utc(2026,6,25,20, 0), venue: "MetLife Stadium, East Rutherford" },
  "Curaçao|Côte d'Ivoire":{ kickoff: _utc(2026,6,25,20, 0), venue: "Lincoln Financial Field, Philadelphia" },
  // ── Group F ──
  "Netherlands|Japan":    { kickoff: _utc(2026,6,14,20, 0), venue: "AT&T Stadium, Arlington" },
  "Sweden|Tunisia":       { kickoff: _utc(2026,6,15, 2, 0), venue: "Estadio BBVA, Guadalupe" },
  "Netherlands|Sweden":   { kickoff: _utc(2026,6,20,17, 0), venue: "NRG Stadium, Houston" },
  "Tunisia|Japan":        { kickoff: _utc(2026,6,20, 4, 0), venue: "Estadio BBVA, Guadalupe" },
  "Tunisia|Netherlands":  { kickoff: _utc(2026,6,25,23, 0), venue: "AT&T Stadium, Arlington" },
  "Japan|Sweden":         { kickoff: _utc(2026,6,25,23, 0), venue: "Arrowhead Stadium, Kansas City" },
  // ── Group G ──
  "Belgium|Egypt":        { kickoff: _utc(2026,6,15,19, 0), venue: "Lumen Field, Seattle" },
  "Iran|New Zealand":     { kickoff: _utc(2026,6,16, 1, 0), venue: "SoFi Stadium, Inglewood" },
  "Belgium|Iran":         { kickoff: _utc(2026,6,21,19, 0), venue: "SoFi Stadium, Inglewood" },
  "New Zealand|Egypt":    { kickoff: _utc(2026,6,22, 1, 0), venue: "BC Place, Vancouver" },
  "New Zealand|Belgium":  { kickoff: _utc(2026,6,27, 3, 0), venue: "BC Place, Vancouver" },
  "Egypt|Iran":           { kickoff: _utc(2026,6,27, 3, 0), venue: "Lumen Field, Seattle" },
  // ── Group H ──
  "Spain|Cabo Verde":     { kickoff: _utc(2026,6,15,16, 0), venue: "Mercedes-Benz Stadium, Atlanta" },
  "Saudi Arabia|Uruguay": { kickoff: _utc(2026,6,15,22, 0), venue: "Hard Rock Stadium, Miami Gardens" },
  "Spain|Saudi Arabia":   { kickoff: _utc(2026,6,21,16, 0), venue: "Mercedes-Benz Stadium, Atlanta" },
  "Uruguay|Cabo Verde":   { kickoff: _utc(2026,6,21,22, 0), venue: "Hard Rock Stadium, Miami Gardens" },
  "Uruguay|Spain":        { kickoff: _utc(2026,6,27, 0, 0), venue: "NRG Stadium, Houston" },
  "Cabo Verde|Saudi Arabia": { kickoff: _utc(2026,6,27, 0, 0), venue: "Estadio Akron, Zapopan" },
  // ── Group I ──
  "France|Senegal":       { kickoff: _utc(2026,6,16,19, 0), venue: "MetLife Stadium, East Rutherford" },
  "Iraq|Norway":          { kickoff: _utc(2026,6,16,22, 0), venue: "Gillette Stadium, Foxborough" },
  "France|Iraq":          { kickoff: _utc(2026,6,22,21, 0), venue: "Lincoln Financial Field, Philadelphia" },
  "Norway|Senegal":       { kickoff: _utc(2026,6,23, 0, 0), venue: "MetLife Stadium, East Rutherford" },
  "Norway|France":        { kickoff: _utc(2026,6,26,19, 0), venue: "Gillette Stadium, Foxborough" },
  "Senegal|Iraq":         { kickoff: _utc(2026,6,26,19, 0), venue: "BMO Field, Toronto" },
  // ── Group J ──
  "Argentina|Algeria":    { kickoff: _utc(2026,6,17, 1, 0), venue: "Arrowhead Stadium, Kansas City" },
  "Austria|Jordan":       { kickoff: _utc(2026,6,17, 4, 0), venue: "Levi's Stadium, Santa Clara" },
  "Argentina|Austria":    { kickoff: _utc(2026,6,22,17, 0), venue: "AT&T Stadium, Arlington" },
  "Jordan|Algeria":       { kickoff: _utc(2026,6,23, 3, 0), venue: "Levi's Stadium, Santa Clara" },
  "Jordan|Argentina":     { kickoff: _utc(2026,6,28, 2, 0), venue: "AT&T Stadium, Arlington" },
  "Algeria|Austria":      { kickoff: _utc(2026,6,28, 2, 0), venue: "Arrowhead Stadium, Kansas City" },
  // ── Group K ──
  "Portugal|DR Congo":    { kickoff: _utc(2026,6,17,17, 0), venue: "NRG Stadium, Houston" },
  "Uzbekistan|Colombia":  { kickoff: _utc(2026,6,18, 2, 0), venue: "Estadio Azteca, Mexico City" },
  "Portugal|Uzbekistan":  { kickoff: _utc(2026,6,23,17, 0), venue: "NRG Stadium, Houston" },
  "Colombia|DR Congo":    { kickoff: _utc(2026,6,24, 2, 0), venue: "Estadio Akron, Zapopan" },
  "Colombia|Portugal":    { kickoff: _utc(2026,6,27,23,30), venue: "Hard Rock Stadium, Miami Gardens" },
  "DR Congo|Uzbekistan":  { kickoff: _utc(2026,6,27,23,30), venue: "Mercedes-Benz Stadium, Atlanta" },
  // ── Group L ──
  "England|Croatia":      { kickoff: _utc(2026,6,17,20, 0), venue: "AT&T Stadium, Arlington" },
  "Ghana|Panama":         { kickoff: _utc(2026,6,17,23, 0), venue: "BMO Field, Toronto" },
  "England|Ghana":        { kickoff: _utc(2026,6,23,20, 0), venue: "Gillette Stadium, Foxborough" },
  "Panama|Croatia":       { kickoff: _utc(2026,6,23,23, 0), venue: "BMO Field, Toronto" },
  "Panama|England":       { kickoff: _utc(2026,6,27,21, 0), venue: "MetLife Stadium, East Rutherford" },
  "Croatia|Ghana":        { kickoff: _utc(2026,6,27,21, 0), venue: "Lincoln Financial Field, Philadelphia" },
};

// Merge schedule info into FIXTURES (lookup by either team-pair direction)
FIXTURES.forEach(f => {
  const a = SCHEDULE[`${f.home}|${f.away}`];
  const b = SCHEDULE[`${f.away}|${f.home}`];
  const s = a || b;
  if (s) {
    f.kickoff = s.kickoff;
    f.venue = s.venue;
  }
});

// Format a kickoff time in the user's local time zone
function formatKickoff(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return { day, time, dateObj: d };
  } catch { return null; }
}


// ─── SCORING ──────────────────────────────────────────────────────────────────

const POINTS = {
  EXACT: 5,         // exact score correct
  GD: 3,            // correct winner + correct goal difference
  RESULT: 2,        // correct result (win/draw/loss) only
  WRONG: 0,
  // Knockout: same scoring as group stage but DOUBLED (per round bonus)
  KO_EXACT: 10,     // exact score in a knockout match
  KO_GD: 6,         // correct goal-diff in a knockout match
  KO_RESULT: 4,     // correct result only in a knockout match
  R16_PICK: 6,      // each correct R16 team
  QF_PICK: 10,      // each correct QF team
  SF_PICK: 16,      // each correct SF team
  FINALIST: 24,     // correct finalist
  CHAMPION: 40,     // correct champion
  WINNER_BET: 50,   // flat bonus for picking the tournament winner correctly
  TOP_SCORER_GOAL: 5, // each goal scored by your top-scorer pick
};

function scoreMatch(predicted, actual) {
  if (!predicted || !actual) return { points: 0, type: "none" };
  if (predicted.h === "" || predicted.a === "" || predicted.h === undefined) return { points: 0, type: "none" };
  if (actual.h === "" || actual.a === "" || actual.h === undefined) return { points: 0, type: "none" };
  
  const ph = parseInt(predicted.h), pa = parseInt(predicted.a);
  const ah = parseInt(actual.h), aa = parseInt(actual.a);
  if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return { points: 0, type: "none" };
  
  // Exact
  if (ph === ah && pa === aa) return { points: POINTS.EXACT, type: "exact" };
  
  const predDiff = ph - pa;
  const actDiff = ah - aa;
  const predResult = predDiff > 0 ? "h" : predDiff < 0 ? "a" : "d";
  const actResult = actDiff > 0 ? "h" : actDiff < 0 ? "a" : "d";
  
  // Correct result + correct goal difference (non-draw)
  if (predResult === actResult && predDiff === actDiff && predResult !== "d") {
    return { points: POINTS.GD, type: "gd" };
  }
  
  // Correct result only
  if (predResult === actResult) {
    return { points: POINTS.RESULT, type: "result" };
  }
  
  return { points: POINTS.WRONG, type: "wrong" };
}

function totalScore(picks, actuals) {
  let total = 0;
  let exact = 0, gd = 0, result = 0, wrong = 0, played = 0;
  FIXTURES.forEach(f => {
    const p = picks[f.id];
    const a = actuals[f.id];
    if (!a || a.h === undefined || a.h === "") return;
    if (!p || p.h === undefined || p.h === "") return;
    played++;
    const s = scoreMatch(p, a);
    total += s.points;
    if (s.type === "exact") exact++;
    else if (s.type === "gd") gd++;
    else if (s.type === "result") result++;
    else if (s.type === "wrong") wrong++;
  });
  return { total, exact, gd, result, wrong, played };
}

// ─── STANDINGS ENGINE ─────────────────────────────────────────────────────────

function computeStandings(group, picks) {
  const teams = GROUPS[group];
  const table = teams.map(t => ({
    name: t.n, flag: t.f, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0,
  }));
  const byName = Object.fromEntries(table.map(r => [r.name, r]));

  FIXTURES.filter(f => f.group === group).forEach(f => {
    const p = picks[f.id];
    if (!p || p.h === "" || p.a === "" || p.h === undefined) return;
    const h = parseInt(p.h), a = parseInt(p.a);
    if (isNaN(h) || isNaN(a)) return;
    const home = byName[f.home], away = byName[f.away];
    home.p++; away.p++;
    home.gf += h; home.ga += a; away.gf += a; away.ga += h;
    if (h > a) { home.w++; away.l++; home.pts += 3; }
    else if (h < a) { away.w++; home.l++; away.pts += 3; }
    else { home.d++; away.d++; home.pts++; away.pts++; }
  });

  table.forEach(r => { r.gd = r.gf - r.ga; });
  table.sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
  return table;
}

const allStandings = (picks) => Object.fromEntries(GROUP_KEYS.map(g => [g, computeStandings(g, picks)]));

const groupComplete = (group, picks) => FIXTURES.filter(f => f.group === group).every(f => {
  const p = picks[f.id]; return p && p.h !== "" && p.a !== "" && p.h !== undefined;
});

function getBestThirds(standings) {
  const thirds = GROUP_KEYS
    .filter(g => standings[g][2].p === 3)
    .map(g => ({ ...standings[g][2], group: g }));
  thirds.sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return thirds.slice(0, 8);
}

const allGroupsComplete = (picks) => GROUP_KEYS.every(g => groupComplete(g, picks));

function buildR32(standings, bestThirds) {
  if (!standings) return null;
  // Only return a team if they've actually played at least one match.
  // Otherwise the alphabetical tiebreaker would put random teams in winner slots.
  const w = g => {
    const t = standings[g]?.[0];
    return (t && t.p > 0) ? t : null;
  };
  const r = g => {
    const t = standings[g]?.[1];
    return (t && t.p > 0) ? t : null;
  };
  const get3 = (i) => {
    const t = bestThirds?.[i];
    return (t && t.p > 0) ? { ...t, isThird: true } : null;
  };
  return [
    { id:"R32-1", a:w("A"), b:get3(7) }, { id:"R32-2", a:w("C"), b:get3(5) },
    { id:"R32-3", a:w("E"), b:get3(3) }, { id:"R32-4", a:w("B"), b:get3(6) },
    { id:"R32-5", a:w("G"), b:get3(2) }, { id:"R32-6", a:w("D"), b:get3(4) },
    { id:"R32-7", a:w("F"), b:r("C") }, { id:"R32-8", a:w("H"), b:r("J") },
    { id:"R32-9", a:w("I"), b:r("L") }, { id:"R32-10", a:w("J"), b:r("H") },
    { id:"R32-11", a:w("L"), b:r("I") }, { id:"R32-12", a:w("K"), b:get3(0) },
    { id:"R32-13", a:r("A"), b:r("E") }, { id:"R32-14", a:r("F"), b:r("G") },
    { id:"R32-15", a:r("B"), b:r("D") }, { id:"R32-16", a:r("K"), b:get3(1) },
  ];
}

// ─── ENCODE / DECODE ──────────────────────────────────────────────────────────

function encodePicks(name, picks, koWinners) {
  const clean = (name || "").replace(/[|]/g, "").slice(0, 20);
  const scoreStr = FIXTURES.map(f => {
    const p = picks[f.id];
    if (!p || p.h === undefined || p.h === "") return "XX";
    return `${Math.min(9, parseInt(p.h)||0)}${Math.min(9, parseInt(p.a)||0)}`;
  }).join("");
  const koStr = btoa(JSON.stringify(koWinners || {}));
  return `WC26P|${clean}|${scoreStr}|${koStr}`;
}

function decodePicks(code) {
  try {
    const c = code.trim();
    if (!c.startsWith("WC26P|")) return null;
    const parts = c.split("|");
    if (parts.length < 3) return null;
    const [, name, scoreStr, ko] = parts;
    if (scoreStr.length !== FIXTURES.length * 2) return null;
    const picks = {};
    FIXTURES.forEach((f, i) => {
      const seg = scoreStr.substr(i*2, 2);
      if (seg !== "XX") picks[f.id] = { h: parseInt(seg[0]), a: parseInt(seg[1]) };
    });
    let koWinners = {};
    try { koWinners = JSON.parse(atob(ko || "")); } catch {}
    return { name: name || "Friend", picks, koWinners };
  } catch { return null; }
}

// ─── KO CHAMPION EXTRACTION ──────────────────────────────────────────────────

function getChampion(standings, bestThirds, koWinners) {
  const r32 = buildR32(standings, bestThirds);
  if (!r32) return null;
  let current = r32.map(m => koWinners[m.id] === "a" ? m.a : koWinners[m.id] === "b" ? m.b : null);
  const rounds = [["R16",16],["QF",8],["SF",4],["FINAL",2]];
  for (const [p, count] of rounds) {
    const next = [];
    for (let i = 0; i < count; i += 2) {
      const id = p === "FINAL" ? "FINAL" : `${p}-${i/2}`;
      const w = koWinners[id];
      next.push(w === "a" ? current[i] : w === "b" ? current[i+1] : null);
    }
    if (p === "FINAL") return next[0];
    current = next;
  }
  return null;
}

function getKnockoutTeams(standings, bestThirds, koWinners) {
  // Returns Set of team names that the user picked to advance at each round
  const r32 = buildR32(standings, bestThirds);
  if (!r32) return { r16:new Set(), qf:new Set(), sf:new Set(), finalists:new Set(), champion:null };
  
  let current = r32.map(m => koWinners[m.id] === "a" ? m.a : koWinners[m.id] === "b" ? m.b : null);
  const r16 = new Set(current.filter(Boolean).map(t => t.name));
  
  const next = (arr, prefix, count) => {
    const result = [];
    for (let i = 0; i < count; i += 2) {
      const id = `${prefix}-${i/2}`;
      const w = koWinners[id];
      result.push(w === "a" ? arr[i] : w === "b" ? arr[i+1] : null);
    }
    return result;
  };
  
  current = next(current, "R16", 16);
  const qf = new Set(current.filter(Boolean).map(t => t.name));
  current = next(current, "QF", 8);
  const sf = new Set(current.filter(Boolean).map(t => t.name));
  current = next(current, "SF", 4);
  const finalists = new Set(current.filter(Boolean).map(t => t.name));
  const w = koWinners["FINAL"];
  const champion = w === "a" ? current[0] : w === "b" ? current[1] : null;
  
  return { r16, qf, sf, finalists, champion };
}

function scoreKnockout(myPick, actualPick) {
  // myPick / actualPick = result from getKnockoutTeams
  let total = 0;
  let breakdown = { r16:0, qf:0, sf:0, finalist:0, champion:0 };
  
  if (actualPick.r16.size > 0) {
    myPick.r16.forEach(t => {
      if (actualPick.r16.has(t)) { total += POINTS.R16_PICK; breakdown.r16++; }
    });
  }
  if (actualPick.qf.size > 0) {
    myPick.qf.forEach(t => {
      if (actualPick.qf.has(t)) { total += POINTS.QF_PICK; breakdown.qf++; }
    });
  }
  if (actualPick.sf.size > 0) {
    myPick.sf.forEach(t => {
      if (actualPick.sf.has(t)) { total += POINTS.SF_PICK; breakdown.sf++; }
    });
  }
  if (actualPick.finalists.size > 0) {
    myPick.finalists.forEach(t => {
      if (actualPick.finalists.has(t)) { total += POINTS.FINALIST; breakdown.finalist++; }
    });
  }
  if (actualPick.champion && myPick.champion && actualPick.champion.name === myPick.champion.name) {
    total += POINTS.CHAMPION;
    breakdown.champion = 1;
  }
  
  return { total, breakdown };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const lbl = {fontSize:11,color:"#fbbf24",letterSpacing:2,display:"block",marginBottom:6};
const inputStyle = {
  width:"100%",boxSizing:"border-box",padding:"11px 14px",
  background:"rgba(15,20,36,0.8)",border:"1px solid rgba(251,191,36,0.3)",
  borderRadius:10,color:"#f1f5f9",fontSize:14,outline:"none",marginBottom:10,fontFamily:"inherit",
};
const errStyle = {color:"#f87171",fontSize:12,marginBottom:8};
const primaryBtn = {
  width:"100%",padding:"12px 18px",
  background:"linear-gradient(135deg,#fbbf24,#d97706)",
  color:"#0a0e1c",border:"none",borderRadius:12,
  fontSize:14,fontWeight:800,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit",
  boxShadow:"0 6px 18px rgba(251,191,36,0.3)",transition:"all 0.2s",
};
const ghostBtn = {
  width:"100%",padding:"11px 16px",
  background:"rgba(30,41,59,0.6)",color:"#cbd5e1",border:"1px solid rgba(71,85,105,0.4)",
  borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
};
const koRoundHeader = {
  fontSize:9,color:"#94a3b8",letterSpacing:2,fontWeight:700,
  textAlign:"center",marginBottom:8,padding:"4px 0",
  borderBottom:"1px solid rgba(71,85,105,0.3)",
};
const menuItemStyle = {
  display:"flex",alignItems:"center",width:"100%",
  padding:"10px 12px",background:"transparent",border:"none",
  color:"#cbd5e1",fontSize:13,cursor:"pointer",fontFamily:"inherit",
  borderRadius:8,textAlign:"left",transition:"background 0.15s",
};

// Robust copy: tries modern clipboard API, falls back to execCommand,
// and returns false if both fail so we can show a manual-copy textarea instead.
async function copyText(text) {
  // Try modern API first
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  // Fallback: hidden textarea + execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

function SoccerIntro({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:50,overflow:"hidden",
      background:"linear-gradient(180deg, #0a0e1c 0%, #1e1b4b 35%, #1e293b 65%, #14532d 65%, #052e16 100%)",
      animation:"introFadeOut 0.4s ease-in 3.8s forwards",
    }}>
      {/* Stadium lights — soft glow at top */}
      <div style={{
        position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
        width:"120%", height:"40%",
        background:"radial-gradient(ellipse at center top, rgba(251,191,36,0.15) 0%, transparent 60%)",
        pointerEvents:"none",
      }}/>

      {/* Crowd silhouette (very subtle, behind everything) */}
      <div style={{
        position:"absolute", left:0, right:0, top:"35%",
        height:"30%", opacity:0.15,
        background:`url("data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 60' preserveAspectRatio='none'>
  <path d='M0,60 ${Array.from({length:80},(_,i)=>{
    const x = i*5;
    const h = 25 + Math.random()*20;
    return `L${x},${60-h} L${x+3},${60-h}`;
  }).join(' ')} L400,60 Z' fill='#0a0e1c'/>
</svg>
        `)}")`,
        backgroundSize:"100% 100%",
        backgroundRepeat:"no-repeat",
      }}/>

      {/* Pitch perspective lines */}
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" style={{
        position:"absolute", inset:0, width:"100%", height:"100%",
        pointerEvents:"none",
      }}>
        <defs>
          <linearGradient id="pitchFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0"/>
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.4"/>
          </linearGradient>
        </defs>
        {/* Pitch grass overlay with stripes */}
        <rect x="0" y="325" width="800" height="175" fill="url(#pitchFade)"/>
        {/* Vanishing-point pitch lines */}
        <g stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.18" fill="none">
          {/* Sidelines converging */}
          <path d="M 50 500 L 380 325"/>
          <path d="M 750 500 L 420 325"/>
          {/* Horizontal lines */}
          <line x1="100" y1="450" x2="700" y2="450"/>
          <line x1="180" y1="395" x2="620" y2="395"/>
          <line x1="240" y1="360" x2="560" y2="360"/>
          {/* Center circle (partial, in perspective) */}
          <ellipse cx="400" cy="450" rx="100" ry="22" strokeOpacity="0.25"/>
          <circle cx="400" cy="450" r="2.5" fill="#ffffff" fillOpacity="0.5" stroke="none"/>
        </g>

        {/* GOAL — sized to vanishing point, prominent at top of pitch */}
        <g style={{
          animation:"introGoalEntry 0.6s ease-out 0.2s both",
        }}>
          {/* Goal net background — diamond mesh */}
          <defs>
            <pattern id="goalNet" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 4 L 4 0 L 8 4 L 4 8 Z" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.5"/>
            </pattern>
          </defs>
          {/* Net area */}
          <rect x="330" y="245" width="140" height="80" fill="url(#goalNet)" stroke="none"/>
          {/* Frame: posts + crossbar */}
          <g stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="square">
            <line x1="330" y1="245" x2="330" y2="325"/>
            <line x1="470" y1="245" x2="470" y2="325"/>
            <line x1="328" y1="245" x2="472" y2="245"/>
          </g>
          {/* Net shake on impact */}
          <rect id="netShake" x="330" y="245" width="140" height="80" fill="url(#goalNet)" stroke="none"
            style={{
              transformOrigin:"400px 245px",
              animation:"introNetShake 0.6s ease-out 3.1s",
              opacity:0,
            }}/>
        </g>

        {/* SHADOW under player + ball trajectory shadow */}
        <ellipse cx="150" cy="475" rx="22" ry="4" fill="#000000" fillOpacity="0.4" style={{
          animation:"introShadowMove 1.6s ease-in 1s both",
        }}/>

        {/* PLAYER (silhouette with proper proportions) - runs in, plants, kicks */}
        <g style={{
          animation:"introPlayerRun 1.6s cubic-bezier(0.4,0,0.2,1) 1s both",
        }}>
          <g id="player" transform="translate(150, 475)">
            {/* Body parts use grouped transforms for the kick animation */}
            {/* Back leg (planted) */}
            <g style={{transformOrigin:"0px -28px",animation:"introBackLeg 0.6s ease-out 2.6s both"}}>
              <rect x="-3" y="-28" width="6" height="22" rx="2" fill="#0a0e1c"/>
              <rect x="-5" y="-8" width="10" height="5" rx="1" fill="#fbbf24"/>
            </g>
            {/* Front leg (kicking) */}
            <g style={{
              transformOrigin:"0px -28px",
              animation:"introKickLeg 0.5s cubic-bezier(0.5,0,0.4,1.2) 2.6s both",
            }}>
              <rect x="-3" y="-28" width="6" height="22" rx="2" fill="#0a0e1c"/>
              <rect x="-5" y="-8" width="10" height="5" rx="1" fill="#fbbf24"/>
            </g>
            {/* Body (jersey) */}
            <path d="M -10 -55 L -8 -28 L 8 -28 L 10 -55 Z" fill="#dc2626"/>
            <path d="M -10 -55 L -16 -45 L -14 -38 L -10 -42 Z" fill="#dc2626"/>
            <path d="M 10 -55 L 16 -45 L 14 -38 L 10 -42 Z" fill="#dc2626"/>
            {/* Number on jersey */}
            <text x="0" y="-40" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="Arial">10</text>
            {/* Head */}
            <circle cx="0" cy="-62" r="8" fill="#fcd34d"/>
            {/* Arms — front arm swung forward */}
            <g style={{transformOrigin:"-10px -55px",animation:"introArmBack 0.5s ease-out 2.6s both"}}>
              <rect x="-22" y="-55" width="6" height="20" rx="2" fill="#fcd34d" transform="rotate(20)"/>
            </g>
            <g style={{transformOrigin:"10px -55px",animation:"introArmFront 0.5s ease-out 2.6s both"}}>
              <rect x="16" y="-55" width="6" height="20" rx="2" fill="#fcd34d" transform="rotate(-30)"/>
            </g>
          </g>
        </g>

        {/* BALL — sits still, then launches toward goal */}
        <g style={{
          animation:"introBallShot 1.0s cubic-bezier(0.3,0.1,0.4,1) 3.05s both",
        }}>
          <g id="ball" transform="translate(195, 475)">
            <g style={{transformOrigin:"0 0", animation:"introBallSpin 1.0s linear 3.05s both"}}>
              <circle cx="0" cy="0" r="9" fill="#ffffff"/>
              <polygon points="0,-5 4.8,-1.5 3,4 -3,4 -4.8,-1.5" fill="#0a0e1c"/>
              <line x1="0" y1="-5" x2="0" y2="-9" stroke="#0a0e1c" strokeWidth="0.8"/>
              <line x1="4.8" y1="-1.5" x2="8.5" y2="-2.8" stroke="#0a0e1c" strokeWidth="0.8"/>
              <line x1="3" y1="4" x2="5.3" y2="7.3" stroke="#0a0e1c" strokeWidth="0.8"/>
              <line x1="-3" y1="4" x2="-5.3" y2="7.3" stroke="#0a0e1c" strokeWidth="0.8"/>
              <line x1="-4.8" y1="-1.5" x2="-8.5" y2="-2.8" stroke="#0a0e1c" strokeWidth="0.8"/>
            </g>
          </g>
        </g>

        {/* Motion-blur streak following the ball */}
        <path d="M 195 475 Q 290 380 400 290" stroke="#ffffff" strokeWidth="2" fill="none"
          strokeLinecap="round" strokeDasharray="2 8" strokeOpacity="0.6"
          style={{
            strokeDashoffset:200,
            animation:"introTrail 1.0s ease-out 3.05s both",
          }}/>

        {/* IMPACT FLASH on net */}
        <circle cx="400" cy="290" r="0" fill="#fbbf24" fillOpacity="0.8"
          style={{ animation:"introImpact 0.5s ease-out 3.95s both" }}/>
      </svg>

      {/* GOAL! text overlay */}
      <div style={{
        position:"absolute", inset:0, display:"flex",
        alignItems:"center", justifyContent:"center",
        pointerEvents:"none",
      }}>
        <div style={{
          fontSize:"clamp(48px, 12vw, 110px)",
          fontWeight:900,
          letterSpacing:6,
          background:"linear-gradient(180deg, #fde68a 0%, #fbbf24 50%, #d97706 100%)",
          WebkitBackgroundClip:"text",
          WebkitTextFillColor:"transparent",
          backgroundClip:"text",
          textShadow:"0 0 40px rgba(251,191,36,0.5)",
          opacity:0,
          transform:"scale(0.5)",
          animation:"introGoalText 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 3.2s forwards",
          fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>GOAL!</div>
      </div>

      {/* Title text at bottom */}
      <div style={{
        position:"absolute", left:0, right:0, bottom:"8%",
        textAlign:"center",
        opacity:0,
        animation:"introTitleSlide 0.8s ease-out 3.3s forwards",
      }}>
        <div style={{
          fontSize:11, letterSpacing:6, color:"#fbbf24",
          textTransform:"uppercase", marginBottom:6, fontWeight:700,
        }}>FIFA World Cup 2026</div>
        <h1 style={{
          fontSize:"clamp(20px, 5vw, 32px)", margin:0,
          color:"#f1f5f9", fontWeight:900, letterSpacing:2,
        }}>PREDICTIONS</h1>
      </div>

      {/* Skip button */}
      <button onClick={onDone} style={{
        position:"absolute", top:20, right:20,
        background:"rgba(15,23,42,0.7)", backdropFilter:"blur(6px)",
        border:"1px solid rgba(148,163,184,0.3)",
        color:"#cbd5e1", padding:"6px 14px", borderRadius:20,
        fontSize:11, cursor:"pointer", letterSpacing:1, fontFamily:"inherit",
        zIndex:60,
      }}>Skip ›</button>

      {/* Animations */}
      <style>{`
        @keyframes introFadeOut {
          to { opacity: 0; }
        }
        @keyframes introGoalEntry {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Player runs in from the left */
        @keyframes introPlayerRun {
          0% { transform: translateX(-220px); }
          85% { transform: translateX(0); }
          100% { transform: translateX(0); }
        }
        @keyframes introShadowMove {
          0% { transform: translateX(-220px); opacity: 0.4; }
          85% { transform: translateX(0); opacity: 0.4; }
          100% { transform: translateX(0); opacity: 0.4; }
        }
        /* Back leg stays planted */
        @keyframes introBackLeg {
          0% { transform: rotate(20deg); }
          100% { transform: rotate(-10deg); }
        }
        /* Front leg swings forward to kick */
        @keyframes introKickLeg {
          0% { transform: rotate(-50deg); }
          100% { transform: rotate(70deg); }
        }
        @keyframes introArmBack {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-30deg); }
        }
        @keyframes introArmFront {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(40deg); }
        }
        /* Ball launches in a parabolic arc to the goal */
        @keyframes introBallShot {
          0%   { transform: translate(0,0); }
          50%  { transform: translate(102px, -110px) scale(0.85); }
          100% { transform: translate(205px, -185px) scale(0.5); }
        }
        @keyframes introBallSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(720deg); }
        }
        @keyframes introTrail {
          0%   { stroke-dashoffset: 200; opacity: 0; }
          15%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes introImpact {
          0%   { r: 0; opacity: 0.9; }
          100% { r: 80; opacity: 0; }
        }
        @keyframes introNetShake {
          0%   { transform: translateY(0) scaleY(1); opacity: 0; }
          10%  { transform: translateY(0) scaleY(1); opacity: 0.7; }
          30%  { transform: translateY(4px) scaleY(1.06); opacity: 0.5; }
          60%  { transform: translateY(-2px) scaleY(0.97); opacity: 0.3; }
          100% { transform: translateY(0) scaleY(1); opacity: 0; }
        }
        @keyframes introGoalText {
          0%   { opacity: 0; transform: scale(0.3) rotate(-8deg); }
          60%  { opacity: 1; transform: scale(1.15) rotate(3deg); }
          80%  { transform: scale(0.95) rotate(-1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes introTitleSlide {
          from { opacity: 0; transform: translateY(15px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── BONUS PICKS: tournament winner + top scorer ──────────────────────────────

// Curated list of top-scorer candidates (favorites at the time of the 2026 draw).
// User can also enter a free-form player name if their pick isn't here.
const TOP_SCORER_CANDIDATES = [
  { name: "Kylian Mbappé", team: "France" },
  { name: "Erling Haaland", team: "Norway" },
  { name: "Lionel Messi", team: "Argentina" },
  { name: "Vinícius Júnior", team: "Brazil" },
  { name: "Harry Kane", team: "England" },
  { name: "Cristiano Ronaldo", team: "Portugal" },
  { name: "Lautaro Martínez", team: "Argentina" },
  { name: "Bukayo Saka", team: "England" },
  { name: "Jude Bellingham", team: "England" },
  { name: "Rodrygo", team: "Brazil" },
  { name: "Mohamed Salah", team: "Egypt" },
  { name: "Lamine Yamal", team: "Spain" },
  { name: "Robert Lewandowski", team: "Poland" }, // unlikely qualifier but icon
  { name: "Cody Gakpo", team: "Netherlands" },
  { name: "Memphis Depay", team: "Netherlands" },
  { name: "Romelu Lukaku", team: "Belgium" },
  { name: "Kevin De Bruyne", team: "Belgium" },
  { name: "Florian Wirtz", team: "Germany" },
  { name: "Jamal Musiala", team: "Germany" },
  { name: "Kai Havertz", team: "Germany" },
  { name: "Bernardo Silva", team: "Portugal" },
  { name: "Bruno Fernandes", team: "Portugal" },
  { name: "Rafael Leão", team: "Portugal" },
  { name: "Khvicha Kvaratskhelia", team: "Georgia" }, // not in 2026
  { name: "Christopher Nkunku", team: "France" },
  { name: "Ousmane Dembélé", team: "France" },
  { name: "Antoine Griezmann", team: "France" },
  { name: "Hakim Ziyech", team: "Morocco" },
  { name: "Achraf Hakimi", team: "Morocco" },
  { name: "Youssef En-Nesyri", team: "Morocco" },
  { name: "Luka Modrić", team: "Croatia" },
  { name: "Andrej Kramarić", team: "Croatia" },
  { name: "Joško Gvardiol", team: "Croatia" },
  { name: "Christian Pulisic", team: "USA" },
  { name: "Tim Weah", team: "USA" },
  { name: "Folarin Balogun", team: "USA" },
  { name: "Hirving Lozano", team: "Mexico" },
  { name: "Raúl Jiménez", team: "Mexico" },
  { name: "Alphonso Davies", team: "Canada" },
  { name: "Jonathan David", team: "Canada" },
  { name: "Kaoru Mitoma", team: "Japan" },
  { name: "Takefusa Kubo", team: "Japan" },
  { name: "Son Heung-min", team: "South Korea" },
  { name: "Sadio Mané", team: "Senegal" },
  { name: "Mehdi Taremi", team: "Iran" },
  { name: "Mitchell Duke", team: "Australia" },
  { name: "Federico Valverde", team: "Uruguay" },
  { name: "Darwin Núñez", team: "Uruguay" },
  { name: "Federico Chiesa", team: "Italy" }, // unlikely
  { name: "Julián Álvarez", team: "Argentina" },
];

function BonusPicks({
  winnerPick, setWinnerPick,
  topScorerPick, setTopScorerPick,
  actualWinner, actualTopScorer,
  isLocked, onBack,
}) {
  const [scorerMode, setScorerMode] = useState("list"); // "list" | "custom"
  const [customPlayer, setCustomPlayer] = useState("");
  const [customTeam, setCustomTeam] = useState("");
  const [scorerFilter, setScorerFilter] = useState("");

  const allTeams = ALL_TEAMS;
  const filteredScorers = TOP_SCORER_CANDIDATES.filter(p =>
    !scorerFilter || p.name.toLowerCase().includes(scorerFilter.toLowerCase()) || p.team.toLowerCase().includes(scorerFilter.toLowerCase())
  );

  const submitCustom = () => {
    if (!customPlayer.trim() || !customTeam.trim()) return;
    setTopScorerPick({ name: customPlayer.trim(), team: customTeam.trim() });
    setCustomPlayer(""); setCustomTeam("");
    setScorerMode("list");
  };

  return (
    <div style={{padding:"16px 14px 60px",maxWidth:560,margin:"0 auto"}}>
      <button onClick={onBack} style={{...ghostBtn,marginBottom:14,padding:"7px 14px",width:"auto"}}>← Back</button>

      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3}}>BONUS PICKS</div>
        <h2 style={{fontSize:24,margin:"4px 0",background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>⭐ Big Bets</h2>
        <p style={{fontSize:12,color:"#94a3b8",margin:0}}>Two big calls for major bonus points.</p>
      </div>

      {isLocked && (
        <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#fca5a5",textAlign:"center"}}>
          🔒 Bonus picks locked — the tournament has started.
        </div>
      )}

      {/* ─── TOURNAMENT WINNER ─── */}
      <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(15,20,36,0.6))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:14,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:"#fbbf24",letterSpacing:2,fontWeight:700}}>🏆 TOURNAMENT WINNER</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Pick one team to lift the trophy</div>
          </div>
          <div style={{background:"#fbbf24",color:"#0a0e1c",fontSize:11,fontWeight:900,padding:"3px 8px",borderRadius:6,letterSpacing:1}}>+50 PTS</div>
        </div>

        {winnerPick ? (
          <div style={{
            background:"linear-gradient(135deg,#fbbf24,#d97706)",
            color:"#0a0e1c",borderRadius:10,padding:"10px 12px",
            display:"flex",alignItems:"center",gap:10,
          }}>
            <span style={{fontSize:28}}>{winnerPick.flag || winnerPick.f}</span>
            <span style={{flex:1,fontSize:16,fontWeight:900}}>{winnerPick.name || winnerPick.n}</span>
            {!isLocked && (
              <button onClick={()=>setWinnerPick(null)} style={{background:"rgba(10,14,28,0.2)",border:"none",borderRadius:6,padding:"4px 10px",color:"#0a0e1c",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Change</button>
            )}
            {actualWinner && (
              <div style={{fontSize:11,fontWeight:900}}>
                {(actualWinner.name||actualWinner.n) === (winnerPick.name||winnerPick.n) ? "✅ +50" : "❌"}
              </div>
            )}
          </div>
        ) : !isLocked ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(94px,1fr))",gap:5}}>
            {allTeams.map(t => (
              <button key={t.n} onClick={()=>setWinnerPick({name:t.n, flag:t.f})} style={{
                background:"rgba(30,41,59,0.6)",border:"1px solid rgba(71,85,105,0.4)",
                borderRadius:8,padding:"7px 4px",color:"#cbd5e1",fontSize:11,
                cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:5,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              }}>
                <span style={{fontSize:14}}>{t.f}</span>
                <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left"}}>{t.n}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{fontSize:11,color:"#64748b",textAlign:"center",padding:"10px 0"}}>No pick made.</div>
        )}
      </div>

      {/* ─── TOP SCORER ─── */}
      <div style={{background:"linear-gradient(135deg,rgba(168,85,247,0.08),rgba(15,20,36,0.6))",border:"1px solid rgba(168,85,247,0.3)",borderRadius:14,padding:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:"#a855f7",letterSpacing:2,fontWeight:700}}>👟 GOLDEN BOOT</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Pick a player — every goal scores you points</div>
          </div>
          <div style={{background:"#a855f7",color:"#0a0e1c",fontSize:11,fontWeight:900,padding:"3px 8px",borderRadius:6,letterSpacing:1}}>+5 PER GOAL</div>
        </div>

        {topScorerPick ? (
          <div style={{
            background:"linear-gradient(135deg,#a855f7,#7c3aed)",
            color:"#fff",borderRadius:10,padding:"10px 12px",
            display:"flex",alignItems:"center",gap:10,
          }}>
            <span style={{fontSize:24}}>👟</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topScorerPick.name}</div>
              <div style={{fontSize:11,opacity:0.85}}>{topScorerPick.team}</div>
            </div>
            {!isLocked && (
              <button onClick={()=>setTopScorerPick(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,padding:"4px 10px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Change</button>
            )}
            {actualTopScorer && (
              <div style={{textAlign:"center",fontSize:10}}>
                <div style={{fontWeight:900,fontSize:13}}>
                  {actualTopScorer.name === topScorerPick.name ? `+${actualTopScorer.goals * 5}` : "❌"}
                </div>
                {actualTopScorer.name === topScorerPick.name && <div style={{opacity:0.85}}>{actualTopScorer.goals} goals</div>}
              </div>
            )}
          </div>
        ) : !isLocked ? (
          <>
            <div style={{display:"flex",background:"rgba(15,20,36,0.6)",borderRadius:8,padding:2,marginBottom:10}}>
              <button onClick={()=>setScorerMode("list")} style={{
                flex:1,padding:"6px 0",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",
                background:scorerMode==="list"?"rgba(168,85,247,0.2)":"transparent",
                color:scorerMode==="list"?"#a855f7":"#94a3b8",
                fontSize:11,fontWeight:700,
              }}>From favorites</button>
              <button onClick={()=>setScorerMode("custom")} style={{
                flex:1,padding:"6px 0",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",
                background:scorerMode==="custom"?"rgba(168,85,247,0.2)":"transparent",
                color:scorerMode==="custom"?"#a855f7":"#94a3b8",
                fontSize:11,fontWeight:700,
              }}>Enter manually</button>
            </div>

            {scorerMode === "list" && (
              <>
                <input value={scorerFilter} onChange={e=>setScorerFilter(e.target.value)} placeholder="Search players or teams..." style={{
                  width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                  background:"#0a0e1c",border:"1px solid rgba(71,85,105,0.4)",
                  color:"#f1f5f9",fontFamily:"inherit",outline:"none",
                  marginBottom:8,boxSizing:"border-box",
                }}/>
                <div style={{maxHeight:280,overflowY:"auto"}}>
                  {filteredScorers.map(p => (
                    <button key={p.name} onClick={()=>setTopScorerPick(p)} style={{
                      width:"100%",display:"flex",alignItems:"center",gap:8,
                      background:"rgba(30,41,59,0.5)",border:"1px solid rgba(71,85,105,0.3)",
                      borderRadius:8,padding:"7px 10px",marginBottom:4,
                      color:"#f1f5f9",fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                    }}>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{p.team}</span>
                    </button>
                  ))}
                  {filteredScorers.length === 0 && (
                    <div style={{fontSize:11,color:"#64748b",textAlign:"center",padding:"10px"}}>No matches — try "Enter manually"</div>
                  )}
                </div>
              </>
            )}

            {scorerMode === "custom" && (
              <div>
                <input value={customPlayer} onChange={e=>setCustomPlayer(e.target.value)} placeholder="Player name" style={{
                  width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                  background:"#0a0e1c",border:"1px solid rgba(71,85,105,0.4)",
                  color:"#f1f5f9",fontFamily:"inherit",outline:"none",
                  marginBottom:6,boxSizing:"border-box",
                }}/>
                <input value={customTeam} onChange={e=>setCustomTeam(e.target.value)} placeholder="Team" style={{
                  width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                  background:"#0a0e1c",border:"1px solid rgba(71,85,105,0.4)",
                  color:"#f1f5f9",fontFamily:"inherit",outline:"none",
                  marginBottom:8,boxSizing:"border-box",
                }}/>
                <button onClick={submitCustom} disabled={!customPlayer.trim()||!customTeam.trim()} style={{
                  ...primaryBtn,opacity:(!customPlayer.trim()||!customTeam.trim())?0.5:1,
                }}>Lock in pick</button>
              </div>
            )}
          </>
        ) : (
          <div style={{fontSize:11,color:"#64748b",textAlign:"center",padding:"10px 0"}}>No pick made.</div>
        )}
      </div>
    </div>
  );
}

function Welcome({ onStart, onImport }) {
  const [name, setName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  // Cycle through fun taglines
  const taglines = [
    "Predict matches → earn points → beat your friends",
    "Who's lifting the trophy in your bracket?",
    "Genius prediction or wild guess — we'll find out.",
    "Your gut vs your friends' gut. May the best gut win.",
    "From group stage drama to the final whistle.",
  ];
  const [tagline] = useState(() => taglines[Math.floor(Math.random() * taglines.length)]);

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{
        background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
        border:"1px solid rgba(251,191,36,0.3)",
        borderRadius:20,padding:"30px 24px",maxWidth:400,width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)",animation:"fadeUp 0.5s ease-out",
      }}>
        <div style={{textAlign:"center",fontSize:54,marginBottom:6,animation:"bounce 2s infinite"}}>⚽</div>
        <h1 style={{fontSize:24,textAlign:"center",margin:"0 0 6px",background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>WORLD CUP 2026</h1>
        <p style={{textAlign:"center",color:"#94a3b8",fontSize:12,margin:"0 0 16px",fontStyle:"italic"}}>{tagline}</p>

        {/* Scoring rules preview */}
        <div style={{background:"rgba(15,20,36,0.6)",border:"1px solid rgba(71,85,105,0.3)",borderRadius:10,padding:"10px 12px",marginBottom:18}}>
          <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:6,textAlign:"center"}}>🎯 SCORING</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:3}}>
            <span>🎯 Exact score</span><span style={{color:"#fbbf24",fontWeight:700}}>+5 pts</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:3}}>
            <span>✓ Result + goal diff</span><span style={{color:"#22c55e",fontWeight:700}}>+3 pts</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:6}}>
            <span>✅ Right result only</span><span style={{color:"#3b82f6",fontWeight:700}}>+2 pts</span>
          </div>
          <div style={{
            borderTop:"1px dashed rgba(71,85,105,0.4)",
            paddingTop:6,marginTop:4,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,color:"#fbbf24",fontWeight:700,letterSpacing:1,marginBottom:4}}>
              <span>🔥 KNOCKOUT — DOUBLE POINTS</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#cbd5e1",marginBottom:2}}>
              <span>R16 pick · QF · SF</span><span style={{color:"#a78bfa",fontWeight:700}}>+6 / +10 / +16</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#cbd5e1",marginBottom:2}}>
              <span>🏟️ Finalist pick</span><span style={{color:"#fbbf24",fontWeight:700}}>+24 pts</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#fde68a",fontWeight:700}}>
              <span>👑 Champion bonus</span><span style={{color:"#fbbf24"}}>+40 pts</span>
            </div>
          </div>
        </div>

        {!showImport ? (
          <div>
            <label style={lbl}>YOUR NAME</label>
            <input autoFocus placeholder="e.g. Alex" value={name}
              onChange={e=>{setName(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&(name.trim()?onStart(name.trim()):setErr("Enter your name"))}
              maxLength={20} style={inputStyle}/>
            {name.trim() && (
              <div style={{fontSize:12,color:"#fbbf24",textAlign:"center",marginBottom:8,animation:"fadeUp 0.3s ease-out"}}>
                👋 Welcome, <strong>{name.trim()}</strong>! Ready to call the tournament?
              </div>
            )}
            {err && <div style={errStyle}>⚠️ {err}</div>}
            <button onClick={()=>name.trim()?onStart(name.trim()):setErr("Enter your name")} style={primaryBtn}>
              {name.trim() ? `Let's go, ${name.trim().split(" ")[0]}! →` : "Let's predict! →"}
            </button>
            <div style={{textAlign:"center",margin:"14px 0 8px",color:"#475569",fontSize:11,letterSpacing:2}}>━━━━━ OR ━━━━━</div>
            <button onClick={()=>setShowImport(true)} style={ghostBtn}>📥 Import code</button>
          </div>
        ) : (
          <div>
            <label style={lbl}>PASTE FRIEND'S CODE</label>
            <textarea autoFocus placeholder="WC26P|..." value={code}
              onChange={e=>{setCode(e.target.value);setErr("");}} rows={3}
              style={{...inputStyle,fontFamily:"monospace",fontSize:11,resize:"vertical"}}/>
            {err && <div style={errStyle}>⚠️ {err}</div>}
            <button onClick={()=>{
              const d = decodePicks(code);
              if (!d) { setErr("Invalid code"); return; }
              onImport(d);
            }} style={primaryBtn}>Import →</button>
            <button onClick={()=>{setShowImport(false);setErr("");}} style={{...ghostBtn,marginTop:10}}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ fixture, pick, actual, onPick, showResults, homeInputId, awayInputId, nextInputId, lockable = true }) {
  const home = findTeam(fixture.home);
  const away = findTeam(fixture.away);
  const h = pick?.h ?? "";
  const a = pick?.a ?? "";
  const hasResult = h !== "" && a !== "";

  // ─── LOCKOUT: matches lock 1 hour before kickoff ──
  const LOCK_MS = 60 * 60 * 1000; // 1 hour
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!lockable) return;
    // Re-check the clock every 30s so we lock automatically as time approaches
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, [lockable]);
  const kickoffMs = fixture.kickoff ? new Date(fixture.kickoff).getTime() : null;
  const msUntilKickoff = kickoffMs != null ? (kickoffMs - now) : null;
  const isLocked = lockable && msUntilKickoff != null && msUntilKickoff < LOCK_MS;
  const isLockingSoon = lockable && msUntilKickoff != null && msUntilKickoff < LOCK_MS + 60*60*1000 && msUntilKickoff >= LOCK_MS;

  let result = null;
  if (hasResult) {
    if (h > a) result = "home";
    else if (a > h) result = "away";
    else result = "draw";
  }

  // Reaction system: pick a fun emoji+label based on the score
  const getReaction = (h, a) => {
    const total = h + a;
    const diff = Math.abs(h - a);
    if (h === 0 && a === 0) return { emoji: "🥱", label: "Snooze-fest!" };
    if (total === 0) return { emoji: "🛡️", label: "Defensive!" };
    if (total >= 7) return { emoji: "🎆", label: "Goal-rush!" };
    if (total >= 5) return { emoji: "⚡", label: "Goal-fest!" };
    if (diff >= 4) return { emoji: "💥", label: "Demolition!" };
    if (diff === 0 && total >= 4) return { emoji: "🤯", label: "Wild draw!" };
    if (h === a) return { emoji: "🤝", label: "Draw!" };
    if (diff === 1 && total >= 3) return { emoji: "🔥", label: "Thriller!" };
    if (diff >= 2) return { emoji: "💪", label: "Comfortable win!" };
    return { emoji: "⚽", label: "Solid pick!" };
  };

  // Track when a match transitions from incomplete → complete to trigger reaction
  const [reaction, setReaction] = useState(null);
  const prevCompleteRef = useRef(false);
  useEffect(() => {
    if (hasResult && !prevCompleteRef.current) {
      // Just completed!
      const r = getReaction(h, a);
      setReaction({ ...r, key: Date.now() });
      // Subtle vibration on mobile devices
      try { navigator.vibrate?.(15); } catch {}
      const t = setTimeout(()=>setReaction(null), 1600);
      prevCompleteRef.current = true;
      return () => clearTimeout(t);
    } else if (!hasResult) {
      prevCompleteRef.current = false;
    }
  }, [hasResult, h, a]);

  const setScore = (side, val) => {
    if (isLocked) return; // hard block
    let n = parseInt(val);
    if (isNaN(n)) n = "";
    else n = Math.max(0, Math.min(9, n));
    onPick({ h: side === "h" ? n : h, a: side === "a" ? n : a });
  };

  // Auto-advance: when a digit is typed, jump to next input
  const handleInput = (side, e) => {
    if (isLocked) return;
    const raw = e.target.value.replace(/\D/g, "").slice(-1); // only last digit typed
    setScore(side, raw);
    if (raw !== "") {
      // Defer to let React update DOM first
      setTimeout(() => {
        if (side === "h") {
          const el = document.getElementById(awayInputId);
          if (el) { el.focus(); el.select(); }
        } else if (side === "a" && nextInputId) {
          const el = document.getElementById(nextInputId);
          if (el) { el.focus(); el.select(); el.scrollIntoView({block:"center", behavior:"smooth"}); }
        }
      }, 0);
    }
  };

  // Backspace from empty away → go back to home
  const handleKeyDown = (side, e) => {
    if (e.key === "Backspace" && e.target.value === "") {
      if (side === "a") {
        const el = document.getElementById(homeInputId);
        if (el) { el.focus(); el.select(); }
        e.preventDefault();
      }
    }
  };

  // Score this match if actuals are present
  const score = actual && actual.h !== undefined && actual.h !== "" && hasResult ? scoreMatch(pick, actual) : null;
  const scoreColors = {
    exact: {bg:"rgba(251,191,36,0.15)", border:"#fbbf24", text:"#fbbf24", label:"🎯 EXACT"},
    gd: {bg:"rgba(34,197,94,0.15)", border:"#22c55e", text:"#22c55e", label:"✓ GD"},
    result: {bg:"rgba(59,130,246,0.15)", border:"#3b82f6", text:"#3b82f6", label:"✅ RESULT"},
    wrong: {bg:"rgba(248,113,113,0.1)", border:"#f87171", text:"#f87171", label:"❌ WRONG"},
    none: null,
  };
  const sc = score && scoreColors[score.type];

  return (
    <div style={{
      background: sc ? sc.bg : (hasResult ? "rgba(34,197,94,0.06)" : "rgba(30,41,59,0.5)"),
      border:`1px solid ${sc ? sc.border : (hasResult ? "rgba(34,197,94,0.3)" : "rgba(71,85,105,0.3)")}`,
      borderRadius:12,padding:"10px 12px",marginBottom:8,transition:"all 0.25s",
      position:"relative",overflow:"visible",
      animation: reaction ? "matchFlash 0.5s ease-out" : "none",
    }}>
      {/* Floating reaction */}
      {reaction && (
        <div key={reaction.key} style={{
          position:"absolute",top:"50%",left:"50%",
          transform:"translate(-50%,-50%)",
          zIndex:10,pointerEvents:"none",
          animation:"reactionFloat 1.6s ease-out forwards",
        }}>
          <div style={{
            display:"flex",alignItems:"center",gap:6,
            background:"linear-gradient(135deg,#fbbf24,#d97706)",
            color:"#0a0e1c",padding:"6px 12px",borderRadius:20,
            fontSize:13,fontWeight:800,whiteSpace:"nowrap",
            boxShadow:"0 6px 20px rgba(251,191,36,0.5)",
          }}>
            <span style={{fontSize:18}}>{reaction.emoji}</span>
            <span>{reaction.label}</span>
          </div>
        </div>
      )}
      <div style={{fontSize:9,color:"#64748b",letterSpacing:2,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
        <span style={{whiteSpace:"nowrap"}}>MD {fixture.matchday}</span>
        {(() => {
          const k = formatKickoff(fixture.kickoff);
          if (!k) return null;
          const isPast = k.dateObj.getTime() < Date.now();
          return (
            <span style={{
              flex:1,textAlign:"center",
              color: isPast ? "#475569" : "#cbd5e1",
              fontWeight: 600, letterSpacing: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              📅 {k.day} · 🕐 {k.time}
            </span>
          );
        })()}
        {isLocked && <span style={{color:"#f87171",fontWeight:700,whiteSpace:"nowrap"}}>🔒 LOCKED</span>}
        {!isLocked && isLockingSoon && <span style={{color:"#fbbf24",fontWeight:700,whiteSpace:"nowrap"}}>⏰ LOCKS SOON</span>}
        {sc && <span style={{color:sc.text,fontWeight:700,whiteSpace:"nowrap"}}>{sc.label} +{score.points}</span>}
        {!sc && !isLocked && hasResult && <span style={{color:"#22c55e"}}>✓</span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end",opacity:result==="away"?0.5:1}}>
          <span style={{fontSize:13,fontWeight:result==="home"?800:500,color:"#f1f5f9",textAlign:"right"}}>{home.n}</span>
          <span style={{fontSize:22}}>{home.f}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <input id={homeInputId} type="text" inputMode="numeric" value={h}
            onChange={e=>handleInput("h", e)}
            onKeyDown={e=>handleKeyDown("h", e)}
            onFocus={e=>e.target.select()}
            readOnly={isLocked}
            placeholder={isLocked?"·":"—"}
            style={{width:36,height:36,textAlign:"center",
              background: isLocked?"rgba(71,85,105,0.2)":"#0a0e1c",
              border:`1px solid ${isLocked?"rgba(71,85,105,0.4)":(result==="home"?"#22c55e":"rgba(71,85,105,0.5)")}`,
              borderRadius:8,
              color: isLocked?"#64748b":(result==="home"?"#22c55e":"#f1f5f9"),
              fontSize:18,fontWeight:800,fontFamily:"inherit",outline:"none",
              cursor: isLocked?"not-allowed":"text",
            }}/>
          <span style={{color:"#475569",fontSize:11}}>:</span>
          <input id={awayInputId} type="text" inputMode="numeric" value={a}
            onChange={e=>handleInput("a", e)}
            onKeyDown={e=>handleKeyDown("a", e)}
            onFocus={e=>e.target.select()}
            readOnly={isLocked}
            placeholder={isLocked?"·":"—"}
            style={{width:36,height:36,textAlign:"center",
              background: isLocked?"rgba(71,85,105,0.2)":"#0a0e1c",
              border:`1px solid ${isLocked?"rgba(71,85,105,0.4)":(result==="away"?"#22c55e":"rgba(71,85,105,0.5)")}`,
              borderRadius:8,
              color: isLocked?"#64748b":(result==="away"?"#22c55e":"#f1f5f9"),
              fontSize:18,fontWeight:800,fontFamily:"inherit",outline:"none",
              cursor: isLocked?"not-allowed":"text",
            }}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,opacity:result==="home"?0.5:1}}>
          <span style={{fontSize:22}}>{away.f}</span>
          <span style={{fontSize:13,fontWeight:result==="away"?800:500,color:"#f1f5f9"}}>{away.n}</span>
        </div>
      </div>
      {actual && actual.h !== undefined && actual.h !== "" && (
        <div style={{
          marginTop:8,paddingTop:8,
          borderTop:"1px solid rgba(71,85,105,0.3)",
        }}>
          <div style={{
            display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:8,
            padding:"6px 4px",
            background: sc?.bg || "rgba(15,20,36,0.5)",
            borderRadius:8,
            border: `1px solid ${sc?.border || "rgba(71,85,105,0.4)"}`,
          }}>
            <div style={{textAlign:"right",fontSize:10,color:"#94a3b8",letterSpacing:1,fontWeight:700}}>FINAL SCORE</div>
            <div style={{
              display:"flex",alignItems:"center",gap:4,
              background:"#0a0e1c",border:`1px solid ${sc?.border || "#22c55e"}`,
              borderRadius:6,padding:"3px 10px",justifyContent:"center",
              color: sc?.text || "#22c55e",fontWeight:900,fontSize:16,
            }}>
              {actual.h} – {actual.a}
            </div>
            <div style={{textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:1}}>
              {hasResult ? (
                score?.points > 0 ? (
                  <span style={{color: sc?.text}}>+{score.points} PTS</span>
                ) : (
                  <span style={{color:"#f87171"}}>0 PTS</span>
                )
              ) : (
                <span style={{color:"#64748b"}}>NO PICK</span>
              )}
            </div>
          </div>
          {hasResult && (
            <div style={{fontSize:9,color:"#64748b",textAlign:"center",marginTop:4,letterSpacing:1}}>
              You picked <strong style={{color:"#cbd5e1"}}>{h}–{a}</strong>
              {score?.type === "exact" && " · perfect call! 🎯"}
              {score?.type === "gd" && " · right margin ✓"}
              {score?.type === "result" && " · right result ✅"}
              {score?.type === "wrong" && " · missed this one"}
            </div>
          )}
        </div>
      )}
      {fixture.venue && (
        <div style={{marginTop:5,fontSize:9,color:"#475569",textAlign:"center",letterSpacing:1}}>
          📍 {fixture.venue}
        </div>
      )}
    </div>
  );
}

function StandingsTable({ group, standings, bestThirds, liveStandings, liveBestThirds, hasActuals }) {
  const color = COLORS[group];
  const [mode, setMode] = useState("predicted"); // "predicted" | "live"
  const showLive = mode === "live" && hasActuals && liveStandings;
  const activeStandings = showLive ? liveStandings : standings;
  const activeThirds = showLive ? (liveBestThirds || []) : (bestThirds || []);
  const thirdsGroups = activeThirds.map(t => t.group);

  return (
    <div style={{background:"rgba(15,20,36,0.6)",border:`1px solid ${color}33`,borderRadius:12,padding:"10px 12px",marginTop:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:10,color,letterSpacing:2,fontWeight:700}}>
          {showLive ? "📡 LIVE STANDINGS" : "🔮 PREDICTED STANDINGS"}
        </div>
        {hasActuals && (
          <div style={{display:"flex",background:"rgba(15,20,36,0.8)",borderRadius:6,padding:2,border:"1px solid rgba(71,85,105,0.4)"}}>
            <button onClick={()=>setMode("predicted")} style={{
              padding:"3px 8px",border:"none",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
              background: mode==="predicted" ? color : "transparent",
              color: mode==="predicted" ? "#0a0e1c" : "#94a3b8",
              fontSize:9,fontWeight:800,letterSpacing:0.5,
            }}>YOURS</button>
            <button onClick={()=>setMode("live")} style={{
              padding:"3px 8px",border:"none",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
              background: mode==="live" ? color : "transparent",
              color: mode==="live" ? "#0a0e1c" : "#94a3b8",
              fontSize:9,fontWeight:800,letterSpacing:0.5,
            }}>LIVE</button>
          </div>
        )}
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr style={{color:"#64748b",fontSize:9,letterSpacing:1}}>
            <th style={{textAlign:"left",padding:"4px 2px",fontWeight:500}}>#</th>
            <th style={{textAlign:"left",padding:"4px 2px",fontWeight:500}}>TEAM</th>
            <th style={{padding:"4px 2px",fontWeight:500}}>P</th>
            <th style={{padding:"4px 2px",fontWeight:500}}>W</th>
            <th style={{padding:"4px 2px",fontWeight:500}}>D</th>
            <th style={{padding:"4px 2px",fontWeight:500}}>L</th>
            <th style={{padding:"4px 2px",fontWeight:500}}>GD</th>
            <th style={{padding:"4px 2px",fontWeight:700,color}}>PTS</th>
          </tr>
        </thead>
        <tbody>
          {activeStandings.map((row, i) => {
            const is3rdQual = i === 2 && thirdsGroups.includes(group);
            let posColor = "#475569", bg = "transparent";
            if (i < 2) { posColor = "#22c55e"; bg = "rgba(34,197,94,0.08)"; }
            else if (i === 2 && is3rdQual) { posColor = "#fbbf24"; bg = "rgba(251,191,36,0.08)"; }
            else if (i === 2) { posColor = "#94a3b8"; }
            return (
              <tr key={row.name} style={{background:bg,borderBottom:"1px solid rgba(71,85,105,0.15)"}}>
                <td style={{padding:"6px 2px",color:posColor,fontWeight:800}}>{i+1}</td>
                <td style={{padding:"6px 2px",color:"#f1f5f9"}}><span style={{marginRight:6}}>{row.flag}</span>{row.name}</td>
                <td style={{textAlign:"center",padding:"6px 2px",color:"#94a3b8"}}>{row.p}</td>
                <td style={{textAlign:"center",padding:"6px 2px",color:"#94a3b8"}}>{row.w}</td>
                <td style={{textAlign:"center",padding:"6px 2px",color:"#94a3b8"}}>{row.d}</td>
                <td style={{textAlign:"center",padding:"6px 2px",color:"#94a3b8"}}>{row.l}</td>
                <td style={{textAlign:"center",padding:"6px 2px",color:row.gd>0?"#22c55e":row.gd<0?"#f87171":"#94a3b8"}}>{row.gd>0?"+":""}{row.gd}</td>
                <td style={{textAlign:"center",padding:"6px 2px",color,fontWeight:800,fontSize:13}}>{row.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupView({ group, picks, actuals, standings, bestThirds, liveStandings, liveBestThirds, hasActuals, onPick, onNext, onPrev, onJump, isFirst, isLast, showResults, scope = "p" }) {
  const fixtures = FIXTURES.filter(f => f.group === group);
  const color = COLORS[group];

  // Build ordered list of fixture ids (for auto-advance to next match)
  const orderedIds = [];
  [1,2,3].forEach(md => fixtures.filter(f => f.matchday === md).forEach(f => orderedIds.push(f.id)));
  const inputId = (mid, side) => `${scope}-${mid}-${side}`;

  // Per-group completion for the pill bar
  const groupCompletion = (g) => {
    const fs = FIXTURES.filter(f => f.group === g);
    const done = fs.filter(f => {
      const p = picks[f.id];
      return p && p.h !== undefined && p.h !== "" && p.a !== undefined && p.a !== "";
    }).length;
    return { done, total: fs.length };
  };

  return (
    <div style={{padding:"16px 14px 100px",maxWidth:560,margin:"0 auto"}}>
      {/* Group selector pills */}
      <div style={{
        display:"grid",gridTemplateColumns:"repeat(6, 1fr)",
        gap:6,marginBottom:14,
      }}>
        {GROUP_KEYS.map(g => {
          const isCurrent = g === group;
          const c = COLORS[g];
          const { done, total } = groupCompletion(g);
          const complete = done === total;
          return (
            <button
              key={g}
              onClick={() => onJump && onJump(g)}
              style={{
                position:"relative",
                background: isCurrent ? c : "rgba(30,41,59,0.6)",
                color: isCurrent ? "#0a0e1c" : "#cbd5e1",
                border: `1px solid ${isCurrent ? c : "rgba(71,85,105,0.4)"}`,
                borderRadius: 10,
                padding: "10px 0",
                fontSize: 18,
                fontWeight: 900,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                transform: isCurrent ? "scale(1.05)" : "scale(1)",
                boxShadow: isCurrent ? `0 4px 14px ${c}66` : "none",
              }}
            >
              {g}
              {/* Completion dot */}
              <span style={{
                position:"absolute",
                top: 3, right: 4,
                width: 7, height: 7, borderRadius: "50%",
                background: complete ? "#22c55e" : (done > 0 ? "#fbbf24" : "rgba(71,85,105,0.5)"),
                boxShadow: complete ? "0 0 4px #22c55e" : "none",
              }}/>
            </button>
          );
        })}
      </div>

      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3,marginBottom:4}}>GROUP STAGE</div>
        <div style={{
          display:"inline-block",
          background: color,
          color: "#0a0e1c",
          fontSize: 38,
          fontWeight: 900,
          lineHeight: 1,
          padding: "8px 20px",
          borderRadius: 14,
          letterSpacing: 1,
          boxShadow: `0 6px 20px ${color}55`,
        }}>GROUP {group}</div>
        <div style={{fontSize:10,color:"#475569",letterSpacing:2,marginTop:8}}>⚡ TYPE TO AUTO-ADVANCE</div>
      </div>

      {[1,2,3].map(md => (
        <div key={md} style={{marginBottom:14}}>
          <div style={{fontSize:10,color:"#64748b",letterSpacing:3,marginBottom:6,paddingLeft:4}}>━━ MATCHDAY {md}</div>
          {fixtures.filter(f => f.matchday === md).map(f => {
            const idx = orderedIds.indexOf(f.id);
            const nextId = idx >= 0 && idx < orderedIds.length - 1 ? orderedIds[idx + 1] : null;
            return (
              <MatchCard
                key={f.id} fixture={f} pick={picks[f.id]} actual={actuals[f.id]}
                onPick={p => onPick(f.id, p)} showResults={showResults}
                homeInputId={inputId(f.id, "h")}
                awayInputId={inputId(f.id, "a")}
                nextInputId={nextId ? inputId(nextId, "h") : null}
                lockable={scope === "p"}
              />
            );
          })}
        </div>
      ))}

      <StandingsTable group={group} standings={standings} bestThirds={bestThirds} liveStandings={liveStandings} liveBestThirds={liveBestThirds} hasActuals={hasActuals} />

      <div style={{display:"flex",gap:10,marginTop:18}}>
        <button onClick={onPrev} disabled={isFirst} style={{...ghostBtn,flex:1,opacity:isFirst?0.4:1,cursor:isFirst?"not-allowed":"pointer"}}>← Previous</button>
        <button onClick={onNext} style={{...primaryBtn,flex:2}}>{isLast?"🏆 To Knockouts →":`Group ${GROUP_KEYS[GROUP_KEYS.indexOf(group)+1]} →`}</button>
      </div>
    </div>
  );
}

// ─── KNOCKOUT BRACKET ─────────────────────────────────────────────────────────

function KnockoutBracket({ standings, bestThirds, koWinners, setKoWinners, onBack, onShare, complete, onChampionPicked }) {
  const r32 = useMemo(() => buildR32(standings, bestThirds), [standings, bestThirds]);
  const [confettiKey, setConfettiKey] = useState(0);

  // Responsive: stack vertically on narrow phones
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 720);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 720);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Bracket renders even when incomplete — TBD slots fill in as group standings settle.
  if (!r32) {
    return (
      <div style={{padding:"40px 20px",maxWidth:420,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:14}}>⏳</div>
        <h2 style={{color:"#fbbf24",margin:"0 0 8px"}}>Bracket loading...</h2>
        <p style={{color:"#94a3b8",fontSize:14,marginBottom:20}}>Predict some matches first to see the bracket take shape.</p>
        <button onClick={onBack} style={primaryBtn}>← Back to groups</button>
      </div>
    );
  }

  const r32Winners = r32.map(m => koWinners[m.id] === "a" ? m.a : koWinners[m.id] === "b" ? m.b : null);
  const r16 = []; for (let i=0;i<16;i+=2) r16.push({id:`R16-${i/2}`,a:r32Winners[i],b:r32Winners[i+1]});
  const r16Winners = r16.map(m => koWinners[m.id] === "a" ? m.a : koWinners[m.id] === "b" ? m.b : null);
  const qf = []; for (let i=0;i<8;i+=2) qf.push({id:`QF-${i/2}`,a:r16Winners[i],b:r16Winners[i+1]});
  const qfWinners = qf.map(m => koWinners[m.id] === "a" ? m.a : koWinners[m.id] === "b" ? m.b : null);
  const sf = []; for (let i=0;i<4;i+=2) sf.push({id:`SF-${i/2}`,a:qfWinners[i],b:qfWinners[i+1]});
  const sfWinners = sf.map(m => koWinners[m.id] === "a" ? m.a : koWinners[m.id] === "b" ? m.b : null);
  const final = { id:"FINAL", a:sfWinners[0], b:sfWinners[1] };
  const champion = koWinners[final.id]==="a"?final.a:koWinners[final.id]==="b"?final.b:null;

  const pickWinner = (id, side) => {
    setKoWinners(prev => {
      const next = { ...prev };
      const wasSelected = next[id] === side;
      if (wasSelected) {
        delete next[id];
      } else {
        next[id] = side;
        // Haptic feedback
        try { navigator.vibrate?.(15); } catch {}
        // Champion celebration!
        if (id === "FINAL") {
          setConfettiKey(k => k + 1);
          try { navigator.vibrate?.([15, 50, 30, 50, 80]); } catch {}
          if (onChampionPicked) {
            // Pass back the winner via callback after a frame
            setTimeout(() => {
              const r32x = buildR32(standings, bestThirds);
              if (!r32x) return;
              let cur = r32x.map(m => next[m.id]==="a"?m.a:next[m.id]==="b"?m.b:null);
              const advance = (arr, prefix, count) => {
                const out = [];
                for (let i = 0; i < count; i += 2) {
                  const mid = `${prefix}-${i/2}`;
                  const w = next[mid];
                  out.push(w==="a"?arr[i]:w==="b"?arr[i+1]:null);
                }
                return out;
              };
              cur = advance(cur, "R16", 16);
              cur = advance(cur, "QF", 8);
              cur = advance(cur, "SF", 4);
              const w = next["FINAL"];
              const champ = w==="a"?cur[0]:w==="b"?cur[1]:null;
              if (champ) onChampionPicked(champ);
            }, 0);
          }
        }
      }
      return next;
    });
  };

  const renderMatch = (m) => {
    const ready = m.a && m.b;
    const winner = koWinners[m.id];
    return (
      <div key={m.id} style={{background:ready?"rgba(30,41,59,0.6)":"rgba(15,20,36,0.4)",border:`1px solid ${winner?"rgba(251,191,36,0.4)":"rgba(71,85,105,0.3)"}`,borderRadius:10,padding:"7px 9px",marginBottom:6,opacity:ready?1:0.5}}>
        {[m.a,m.b].map((team,idx) => {
          const side = idx === 0 ? "a" : "b";
          const selected = winner === side;
          const otherSelected = winner && winner !== side;
          return (
            <button key={idx} onClick={()=>ready&&pickWinner(m.id,side)} disabled={!ready}
              style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"5px 7px",marginBottom:idx===0?3:0,background:selected?"rgba(251,191,36,0.18)":"transparent",border:`1px solid ${selected?"#fbbf24":"transparent"}`,borderRadius:6,cursor:ready?"pointer":"not-allowed",fontFamily:"inherit",opacity:otherSelected?0.4:1}}>
              <span style={{fontSize:16}}>{team?.flag||team?.f||"?"}</span>
              <span style={{flex:1,textAlign:"left",fontSize:12,color:selected?"#fbbf24":"#f1f5f9",fontWeight:selected?700:500}}>{team?.name||team?.n||"TBD"}</span>
              {selected && <span style={{fontSize:12,color:"#fbbf24"}}>✓</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{padding:"16px 14px 100px",maxWidth:920,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3}}>KNOCKOUT STAGE</div>
        <h2 style={{fontSize:24,margin:"4px 0",background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>🏆 The Bracket</h2>
        <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 10px"}}>Tap a team to advance them.</p>
        <div style={{
          display:"inline-flex",alignItems:"center",gap:8,
          background:"linear-gradient(135deg,#fbbf24,#d97706)",
          color:"#0a0e1c",
          padding:"5px 14px",borderRadius:20,
          fontSize:11,fontWeight:900,letterSpacing:1,
          boxShadow:"0 4px 12px rgba(251,191,36,0.4)",
        }}>
          <span style={{fontSize:14}}>🔥</span>
          DOUBLE POINTS · UP TO 40 PTS PER PICK
        </div>
      </div>

      {/* Point values per round */}
      <div style={{
        display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:6,marginBottom:14,
      }}>
        {[
          {label:"R16",pts:6,color:"#a855f7"},
          {label:"QF",pts:10,color:"#ec4899"},
          {label:"SF",pts:16,color:"#f97316"},
          {label:"Finalist",pts:24,color:"#fbbf24"},
          {label:"Champion",pts:40,color:"#fbbf24",glow:true},
        ].map(r => (
          <div key={r.label} style={{
            background: r.glow
              ? "linear-gradient(135deg,rgba(251,191,36,0.18),rgba(217,119,6,0.08))"
              : "rgba(15,20,36,0.6)",
            border: `1px solid ${r.glow ? "#fbbf24" : `${r.color}55`}`,
            borderRadius:10,padding:"6px 4px",textAlign:"center",
            boxShadow: r.glow ? "0 2px 10px rgba(251,191,36,0.25)" : "none",
          }}>
            <div style={{fontSize:9,color:r.color,letterSpacing:1,fontWeight:700,marginBottom:1}}>
              {r.label === "Champion" ? "👑" : ""} {r.label.toUpperCase()}
            </div>
            <div style={{fontSize:15,color:r.color,fontWeight:900,lineHeight:1}}>+{r.pts}</div>
          </div>
        ))}
      </div>

      {/* Status banner if bracket isn't fully ready */}
      {!complete && (() => {
        const filledSlots = r32.filter(m => m.a && m.b).length;
        return (
          <div style={{
            background:"linear-gradient(135deg,rgba(59,130,246,0.1),rgba(99,102,241,0.05))",
            border:"1px solid rgba(59,130,246,0.4)",
            borderRadius:12,padding:"10px 14px",marginBottom:14,
            display:"flex",alignItems:"center",gap:10,
          }}>
            <span style={{fontSize:20}}>🔮</span>
            <div style={{flex:1,fontSize:11,color:"#cbd5e1",lineHeight:1.5}}>
              <strong style={{color:"#93c5fd"}}>Bracket preview.</strong> {filledSlots}/16 R32 matchups confirmed from group standings. Finish predicting all 72 group matches to lock in the full bracket — TBD slots will fill in as you do.
            </div>
          </div>
        );
      })()}

      {champion && (
        <div key={`champ-${champion.name}`} style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",borderRadius:14,padding:16,marginBottom:18,textAlign:"center",animation:"championPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",boxShadow:"0 10px 30px rgba(251,191,36,0.4)"}}>
          <div style={{fontSize:10,letterSpacing:3,color:"#0a0e1c",fontWeight:800,marginBottom:4}}>🏆 YOUR CHAMPION 🏆</div>
          <div style={{fontSize:38,marginBottom:2}}>{champion.flag||champion.f}</div>
          <div style={{fontSize:22,color:"#0a0e1c",fontWeight:900}}>{champion.name||champion.n}</div>
        </div>
      )}

      {/* Confetti burst when champion picked */}
      {confettiKey > 0 && (
        <div key={confettiKey} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:50,overflow:"hidden"}}>
          {Array.from({length:40}).map((_, i) => {
            const colors = ["#fbbf24","#ef4444","#22c55e","#3b82f6","#a855f7","#ec4899","#06b6d4","#fde68a"];
            const c = colors[i % colors.length];
            const left = Math.random() * 100;
            const delay = Math.random() * 0.4;
            const duration = 2 + Math.random() * 1.5;
            const size = 8 + Math.random() * 8;
            const shape = i % 3;
            return (
              <div key={i} style={{
                position:"absolute",left:`${left}%`,top:-20,
                width:size,height:shape===0?size:size*0.4,
                background:c,
                borderRadius:shape===2?"50%":shape===1?2:0,
                animation:`confettiFall ${duration}s ${delay}s ease-in forwards`,
                transform:`rotate(${Math.random()*360}deg)`,
              }}/>
            );
          })}
        </div>
      )}

      {/* Two-sided tournament bracket */}
      {isNarrow ? (
        // ─── MOBILE LAYOUT: vertical with section headers ───
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Final at top with trophy */}
          <div style={{
            background:"linear-gradient(135deg, rgba(251,191,36,0.08), rgba(217,119,6,0.04))",
            border:"1px solid rgba(251,191,36,0.4)",
            borderRadius:14,padding:"12px 14px",
          }}>
            <div style={{textAlign:"center",marginBottom:8}}>
              <div style={{fontSize:28,filter:"drop-shadow(0 0 8px rgba(251,191,36,0.7))",marginBottom:2}}>🏆</div>
              <div style={{fontSize:11,color:"#fbbf24",letterSpacing:3,fontWeight:800}}>FINAL</div>
            </div>
            {renderMatch(final)}
          </div>
          {/* Semis */}
          <div>
            <div style={{fontSize:10,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:6}}>SEMI-FINALS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {renderMatch(sf[0])}
              {renderMatch(sf[1])}
            </div>
          </div>
          {/* Quarters */}
          <div>
            <div style={{fontSize:10,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:6}}>QUARTER-FINALS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {qf.map(m => renderMatch(m))}
            </div>
          </div>
          {/* R16 */}
          <div>
            <div style={{fontSize:10,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:6}}>ROUND OF 16</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {r16.map(m => renderMatch(m))}
            </div>
          </div>
          {/* R32 */}
          <div>
            <div style={{fontSize:10,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:6}}>ROUND OF 32</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {r32.map(m => renderMatch(m))}
            </div>
          </div>
        </div>
      ) : (
        // ─── DESKTOP LAYOUT: two-sided 9-column bracket ───
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(9, minmax(0, 1fr))",
          gap:6,
        }}>
          {/* LEFT SIDE: R32 (8) → R16 (4) → QF (2) → SF (1) */}
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
            <div style={koRoundHeader}>R32</div>
            {r32.slice(0, 8).map(m => renderMatch(m))}
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
            <div style={koRoundHeader}>R16</div>
            {r16.slice(0, 4).map(m => renderMatch(m))}
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
            <div style={koRoundHeader}>QF</div>
            {qf.slice(0, 2).map(m => renderMatch(m))}
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
            <div style={koRoundHeader}>SF</div>
            {renderMatch(sf[0])}
          </div>

          {/* CENTER: Final + trophy */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{...koRoundHeader, color:"#fbbf24"}}>FINAL</div>
            <div style={{fontSize:32,marginBottom:4,filter:"drop-shadow(0 0 6px rgba(251,191,36,0.6))"}}>🏆</div>
            {renderMatch(final)}
          </div>

          {/* RIGHT SIDE: SF (1) ← QF (2) ← R16 (4) ← R32 (8) */}
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
            <div style={koRoundHeader}>SF</div>
            {renderMatch(sf[1])}
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
            <div style={koRoundHeader}>QF</div>
            {qf.slice(2, 4).map(m => renderMatch(m))}
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
            <div style={koRoundHeader}>R16</div>
            {r16.slice(4, 8).map(m => renderMatch(m))}
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
            <div style={koRoundHeader}>R32</div>
            {r32.slice(8, 16).map(m => renderMatch(m))}
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:18}}>
        <button onClick={onBack} style={{...ghostBtn,flex:1}}>← Groups</button>
        <button onClick={onShare} style={{...primaryBtn,flex:2}}>📤 Share & Score</button>
      </div>
    </div>
  );
}

// ─── ACTUAL RESULTS ENTRY ─────────────────────────────────────────────────────

function ActualResults({ actuals, setActuals, actualKo, setActualKo, onClose }) {
  const [groupIdx, setGroupIdx] = useState(0);
  const [showBracket, setShowBracket] = useState(false);
  const group = GROUP_KEYS[groupIdx];
  const standings = useMemo(() => allStandings(actuals), [actuals]);
  const bestThirds = useMemo(() => getBestThirds(standings), [standings]);
  const complete = allGroupsComplete(actuals);
  
  const setActual = (id, p) => setActuals(prev => ({ ...prev, [id]: p }));
  
  if (showBracket) {
    return (
      <div style={{padding:"16px 14px"}}>
        <div style={{background:"rgba(220,38,38,0.15)",border:"1px solid #ef4444",borderRadius:10,padding:"10px 14px",marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:11,color:"#ef4444",fontWeight:700,letterSpacing:2}}>📝 ENTERING ACTUAL RESULTS</div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Pick the real knockout winners</div>
        </div>
        <KnockoutBracket
          standings={standings}
          bestThirds={bestThirds}
          koWinners={actualKo}
          setKoWinners={setActualKo}
          onBack={()=>setShowBracket(false)}
          onShare={onClose}
          complete={complete}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{background:"rgba(220,38,38,0.15)",border:"1px solid #ef4444",borderRadius:10,padding:"10px 14px",margin:"16px 14px",textAlign:"center"}}>
        <div style={{fontSize:11,color:"#ef4444",fontWeight:700,letterSpacing:2}}>📝 ENTERING ACTUAL RESULTS</div>
        <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Type the real scores as matches happen</div>
      </div>
      <GroupView
        group={group}
        picks={actuals}
        actuals={{}}
        standings={standings[group]}
        bestThirds={bestThirds}
        onPick={setActual}
        showResults={false}
        scope="a"
        onNext={()=>{
          if (groupIdx === GROUP_KEYS.length - 1) {
            if (complete) setShowBracket(true);
            else onClose();
          } else setGroupIdx(groupIdx+1);
        }}
        onPrev={()=>{
          if (groupIdx === 0) onClose();
          else setGroupIdx(groupIdx-1);
        }}
        isFirst={groupIdx === 0}
        isLast={groupIdx === GROUP_KEYS.length - 1}
      />
      <div style={{padding:"0 14px 30px",maxWidth:560,margin:"0 auto"}}>
        <button onClick={onClose} style={ghostBtn}>← Back to my predictions</button>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

function Leaderboard({ name, picks, koWinners, friends, actuals, actualKo, hasActuals }) {
  const actualStandings = useMemo(() => allStandings(actuals), [actuals]);
  const actualBestThirds = useMemo(() => getBestThirds(actualStandings), [actualStandings]);
  const actualKnockout = useMemo(() => getKnockoutTeams(actualStandings, actualBestThirds, actualKo), [actualStandings, actualBestThirds, actualKo]);
  
  const myStandings = useMemo(() => allStandings(picks), [picks]);
  const myBestThirds = useMemo(() => getBestThirds(myStandings), [myStandings]);
  const myKnockout = useMemo(() => getKnockoutTeams(myStandings, myBestThirds, koWinners), [myStandings, myBestThirds, koWinners]);
  
  const myMatchScore = totalScore(picks, actuals);
  const myKoScore = hasActuals ? scoreKnockout(myKnockout, actualKnockout) : { total:0, breakdown:{r16:0,qf:0,sf:0,finalist:0,champion:0}};
  
  const everyone = [
    { name, isMe:true, picks, koWinners, matchScore:myMatchScore, koScore:myKoScore },
    ...friends.map(f => {
      const fStandings = allStandings(f.picks);
      const fBestThirds = getBestThirds(fStandings);
      const fKnockout = getKnockoutTeams(fStandings, fBestThirds, f.koWinners);
      const ms = totalScore(f.picks, actuals);
      const ks = hasActuals ? scoreKnockout(fKnockout, actualKnockout) : { total:0, breakdown:{r16:0,qf:0,sf:0,finalist:0,champion:0}};
      return { name:f.name, isMe:false, picks:f.picks, koWinners:f.koWinners, matchScore:ms, koScore:ks };
    })
  ];
  
  everyone.forEach(p => { p.totalPoints = p.matchScore.total + p.koScore.total; });
  everyone.sort((a,b) => b.totalPoints - a.totalPoints);

  if (!hasActuals) {
    return (
      <div style={{padding:"30px 20px",textAlign:"center",maxWidth:420,margin:"0 auto"}}>
        <div style={{fontSize:48,marginBottom:12}}>📊</div>
        <h2 style={{color:"#fbbf24",margin:"0 0 8px"}}>No results yet</h2>
        <p style={{color:"#94a3b8",fontSize:13,lineHeight:1.5}}>Tap "📝 Enter actual results" to log real match scores. Then everyone's points will appear here!</p>
      </div>
    );
  }

  return (
    <div style={{padding:"16px 14px 40px",maxWidth:600,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3}}>SCOREBOARD</div>
        <h2 style={{fontSize:24,margin:"4px 0",background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>🏅 LEADERBOARD</h2>
      </div>

      {everyone.map((p, i) => {
        const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`;
        return (
          <div key={p.name} style={{
            background: p.isMe ? "linear-gradient(135deg,rgba(251,191,36,0.1),rgba(217,119,6,0.05))" : "rgba(30,41,59,0.5)",
            border: p.isMe ? "1px solid #fbbf24" : "1px solid rgba(71,85,105,0.3)",
            borderRadius:14, padding:14, marginBottom:10,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <span style={{fontSize:22,minWidth:32}}>{medal}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:15,color:"#f1f5f9",fontWeight:800}}>{p.isMe ? `${p.name} (you)` : p.name}</div>
                <div style={{fontSize:10,color:"#64748b",letterSpacing:1,marginTop:2}}>
                  {p.matchScore.played}/{FIXTURES.length} group matches scored
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:24,fontWeight:900,color:"#fbbf24",lineHeight:1}}>{p.totalPoints}</div>
                <div style={{fontSize:9,color:"#94a3b8",letterSpacing:1}}>POINTS</div>
              </div>
            </div>
            
            {/* Breakdown */}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8,paddingTop:8,borderTop:"1px dashed rgba(71,85,105,0.3)"}}>
              {p.matchScore.exact > 0 && <Badge color="#fbbf24">🎯 {p.matchScore.exact} exact</Badge>}
              {p.matchScore.gd > 0 && <Badge color="#22c55e">✓ {p.matchScore.gd} GD</Badge>}
              {p.matchScore.result > 0 && <Badge color="#3b82f6">✅ {p.matchScore.result} result</Badge>}
              {p.matchScore.wrong > 0 && <Badge color="#f87171">❌ {p.matchScore.wrong} miss</Badge>}
              {p.koScore.breakdown.r16 > 0 && <Badge color="#a855f7">R16 ×{p.koScore.breakdown.r16}</Badge>}
              {p.koScore.breakdown.qf > 0 && <Badge color="#ec4899">QF ×{p.koScore.breakdown.qf}</Badge>}
              {p.koScore.breakdown.sf > 0 && <Badge color="#f97316">SF ×{p.koScore.breakdown.sf}</Badge>}
              {p.koScore.breakdown.finalist > 0 && <Badge color="#fbbf24">🏟️ Finalist ×{p.koScore.breakdown.finalist}</Badge>}
              {p.koScore.breakdown.champion > 0 && <Badge color="#fbbf24">👑 CHAMPION!</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      fontSize:10,padding:"3px 8px",borderRadius:20,
      background:`${color}20`,border:`1px solid ${color}60`,
      color, fontWeight:700,letterSpacing:0.5,
    }}>{children}</span>
  );
}

// ─── LEAGUE HUB (Firebase-powered) ────────────────────────────────────────────

function LeagueHub({
  name, userId, picks, koWinners,
  leagueCode, setLeagueCode, leagueData, leagueError,
  actuals, hasActuals,
  liveFetchAt, liveError, onFetchLive,
}) {
  const [mode, setMode] = useState("home"); // home | creating | joining | active
  const [draftName, setDraftName] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [viewTab, setViewTab] = useState("matches");
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 720);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 720);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setMode(leagueCode ? "active" : "home");
  }, [leagueCode]);

  // ─── Create league ──
  const handleCreate = async () => {
    if (!draftName.trim()) { setErr("Give your league a name"); return; }
    setBusy(true); setErr("");
    try {
      let attempts = 0, code;
      while (attempts < 5) {
        code = generateLeagueCode();
        try {
          await createLeague(code, draftName.trim(), name);
          break;
        } catch (e) {
          if (e.message?.includes("already taken")) { attempts++; continue; }
          throw e;
        }
      }
      // Push our picks immediately
      await updateMyPicks(code, userId, name, picks, koWinners);
      setLeagueCode(code);
      setDraftName("");
    } catch (e) {
      setErr(e.message || "Couldn't create league. Check Firebase setup.");
    }
    setBusy(false);
  };

  // ─── Join league ──
  const handleJoin = async () => {
    const code = draftCode.trim().toUpperCase();
    if (!code) { setErr("Enter a league code"); return; }
    setBusy(true); setErr("");
    try {
      await joinLeague(code);
      // Push our picks
      await updateMyPicks(code, userId, name, picks, koWinners);
      setLeagueCode(code);
      setDraftCode("");
    } catch (e) {
      setErr(e.message || "Couldn't join. Check the code.");
    }
    setBusy(false);
  };

  // ─── Leave league ──
  const handleLeave = async () => {
    if (!leagueCode) return;
    try { await leaveLeague(leagueCode, userId); } catch {}
    setLeagueCode("");
    setMode("home");
  };

  const copy = async () => {
    const ok = await copyText(leagueCode);
    if (ok) { setCopied(true); setTimeout(()=>setCopied(false), 2000); }
  };

  const AVATAR_COLORS = ["#fbbf24","#ef4444","#3b82f6","#22c55e","#a855f7","#ec4899","#14b8a6","#f97316"];
  const colorFor = (n) => {
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[h];
  };

  // ─── HOME (no league yet) ──
  if (mode === "home") {
    return (
      <div style={{padding:"16px 14px 40px",maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,marginBottom:6}}>🏆</div>
          <h2 style={{margin:"0 0 4px",fontSize:22,background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>Play With Friends</h2>
          <p style={{color:"#94a3b8",fontSize:13,margin:0,lineHeight:1.5}}>Create a league or join one. Everyone's picks sync live, and real match results update automatically.</p>
        </div>

        {/* CREATE */}
        <div style={{background:"linear-gradient(145deg,#1e293b,#0f172a)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:24}}>✨</span>
            <span style={{fontSize:15,fontWeight:800,color:"#fbbf24"}}>Create a league</span>
          </div>
          <input value={draftName} onChange={e=>{setDraftName(e.target.value);setErr("");}} maxLength={30}
            placeholder="e.g. Mike's Crew" style={inputStyle}/>
          <button onClick={handleCreate} disabled={busy} style={{...primaryBtn,opacity:busy?0.5:1}}>
            {busy ? "Creating..." : "✨ Create league"}
          </button>
        </div>

        {/* JOIN */}
        <div style={{background:"linear-gradient(145deg,#1e293b,#0f172a)",border:"1px solid rgba(71,85,105,0.4)",borderRadius:14,padding:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:24}}>🤝</span>
            <span style={{fontSize:15,fontWeight:800,color:"#cbd5e1"}}>Join a league</span>
          </div>
          <input value={draftCode} onChange={e=>{setDraftCode(e.target.value.toUpperCase());setErr("");}}
            placeholder="e.g. GOLDEN-TIGER-123" maxLength={30}
            style={{...inputStyle,fontFamily:"monospace",letterSpacing:1}}/>
          <button onClick={handleJoin} disabled={busy} style={{...ghostBtn,opacity:busy?0.5:1}}>
            {busy ? "Joining..." : "🤝 Join league"}
          </button>
        </div>

        {err && (
          <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:8,padding:"10px 12px",marginTop:14,fontSize:12,color:"#fca5a5"}}>
            ⚠️ {err}
          </div>
        )}
      </div>
    );
  }

  // ─── ACTIVE LEAGUE ──
  if (mode === "active") {
    if (leagueError) {
      return (
        <div style={{padding:"30px 20px",textAlign:"center",maxWidth:420,margin:"0 auto"}}>
          <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
          <h2 style={{color:"#fca5a5",margin:"0 0 8px",fontSize:18}}>League connection error</h2>
          <p style={{color:"#94a3b8",fontSize:13,marginBottom:16}}>{leagueError}</p>
          <button onClick={handleLeave} style={ghostBtn}>← Back to league menu</button>
        </div>
      );
    }
    if (!leagueData) {
      return (
        <div style={{padding:"30px 20px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8,animation:"pulse 1.5s infinite"}}>⏳</div>
          <p style={{color:"#94a3b8",fontSize:13}}>Connecting to league...</p>
        </div>
      );
    }

    // Build leaderboard from league members
    const actualStandings = allStandings(actuals);
    const actualBestThirds = getBestThirds(actualStandings);
    const actualKnockout = getKnockoutTeams(actualStandings, actualBestThirds, leagueData.actualKo || {});

    const members = Object.entries(leagueData.members || {}).map(([uid, m]) => {
      const st = allStandings(m.picks || {});
      const bt = getBestThirds(st);
      const kt = getKnockoutTeams(st, bt, m.koWinners || {});
      const ms = totalScore(m.picks || {}, actuals);
      const ks = hasActuals ? scoreKnockout(kt, actualKnockout) : { total:0, breakdown:{r16:0,qf:0,sf:0,finalist:0,champion:0}};
      const predictedCount = Object.keys(m.picks || {}).filter(k => m.picks[k]?.h !== undefined && m.picks[k]?.h !== "").length;
      return {
        uid, name: m.name, isMe: uid === userId,
        picks: m.picks, koWinners: m.koWinners, standings: st, bestThirds: bt, knockout: kt,
        matchScore: ms, koScore: ks, totalPoints: ms.total + ks.total,
        predictedCount,
        updatedAt: m.updatedAt,
      };
    }).sort((a,b) => b.totalPoints - a.totalPoints);

    // Drill into one member
    if (viewing) {
      const m = members.find(x => x.uid === viewing);
      if (!m) { setViewing(null); return null; }
      const champ = m.knockout?.champion;

      // Show predicted match results, grouped by group + matchday
      const renderMatchRow = (f) => {
        const pick = m.picks?.[f.id];
        const home = findTeam(f.home);
        const away = findTeam(f.away);
        const hasPick = pick && pick.h !== undefined && pick.h !== "" && pick.a !== undefined && pick.a !== "";
        const actual = actuals?.[f.id];
        const hasActual = actual && actual.h !== undefined && actual.h !== "";
        const score = hasActual && hasPick ? scoreMatch(pick, actual) : null;
        const scoreColor = score?.type === "exact" ? "#fbbf24"
                         : score?.type === "gd" ? "#22c55e"
                         : score?.type === "result" ? "#3b82f6"
                         : score?.type === "wrong" ? "#f87171"
                         : "#475569";
        return (
          <div key={f.id} style={{
            display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:6,
            padding:"6px 8px",fontSize:12,
            background: hasPick ? "rgba(30,41,59,0.4)" : "transparent",
            borderRadius:8, marginBottom:4,
          }}>
            <div style={{textAlign:"right",color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {home?.f} {home?.n}
            </div>
            <div style={{
              display:"flex",alignItems:"center",gap:3,
              background:hasPick?"#0a0e1c":"transparent",border:`1px solid ${hasPick?scoreColor:"rgba(71,85,105,0.3)"}`,
              borderRadius:6,padding:"3px 8px",minWidth:48,justifyContent:"center",
              color:hasPick?(score?scoreColor:"#f1f5f9"):"#64748b",fontWeight:800,fontSize:13,
            }}>
              {hasPick ? `${pick.h} - ${pick.a}` : "—"}
            </div>
            <div style={{color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {away?.f} {away?.n}
            </div>
            {hasActual && (
              <div style={{gridColumn:"1 / -1",textAlign:"center",fontSize:9,color:"#64748b",marginTop:2}}>
                Actual: <span style={{color:"#f1f5f9"}}>{actual.h}–{actual.a}</span>
                {score && <span style={{color:scoreColor,marginLeft:6,fontWeight:700}}>+{score.points}</span>}
              </div>
            )}
            {f.kickoff && (() => {
              const k = formatKickoff(f.kickoff);
              return k ? (
                <div style={{gridColumn:"1 / -1",textAlign:"center",fontSize:9,color:"#475569",marginTop:2,letterSpacing:1}}>
                  📅 {k.day} · 🕐 {k.time}
                </div>
              ) : null;
            })()}
          </div>
        );
      };

      // Build bracket for member: their R32 → R16 → QF → SF → Final
      const memberR32 = buildR32(m.standings, m.bestThirds);
      const buildMemberBracket = () => {
        if (!memberR32) return null;
        const ko = m.koWinners || {};
        const r32Winners = memberR32.map(mt => ko[mt.id] === "a" ? mt.a : ko[mt.id] === "b" ? mt.b : null);
        const r16 = [];
        for (let i=0;i<16;i+=2) r16.push({id:`R16-${i/2}`,a:r32Winners[i],b:r32Winners[i+1]});
        const r16Winners = r16.map(mt => ko[mt.id]==="a"?mt.a:ko[mt.id]==="b"?mt.b:null);
        const qf = [];
        for (let i=0;i<8;i+=2) qf.push({id:`QF-${i/2}`,a:r16Winners[i],b:r16Winners[i+1]});
        const qfWinners = qf.map(mt => ko[mt.id]==="a"?mt.a:ko[mt.id]==="b"?mt.b:null);
        const sf = [];
        for (let i=0;i<4;i+=2) sf.push({id:`SF-${i/2}`,a:qfWinners[i],b:qfWinners[i+1]});
        const sfWinners = sf.map(mt => ko[mt.id]==="a"?mt.a:ko[mt.id]==="b"?mt.b:null);
        const finalM = { id:"FINAL", a:sfWinners[0], b:sfWinners[1] };
        return { r32: memberR32, r16, qf, sf, final: finalM };
      };
      const memberBracket = buildMemberBracket();

      const renderKoMatch = (mt, koWinners) => {
        const winner = koWinners[mt.id];
        const aSel = winner === "a", bSel = winner === "b";
        return (
          <div key={mt.id} style={{
            background:mt.a&&mt.b?"rgba(30,41,59,0.6)":"rgba(15,20,36,0.4)",
            border:`1px solid ${winner?"rgba(251,191,36,0.4)":"rgba(71,85,105,0.3)"}`,
            borderRadius:8,padding:"5px 7px",marginBottom:5,
            opacity:mt.a&&mt.b?1:0.5,fontSize:11,
          }}>
            {[mt.a, mt.b].map((team, idx) => {
              const sel = idx === 0 ? aSel : bSel;
              const dim = winner && ((idx===0&&!aSel) || (idx===1&&!bSel));
              return (
                <div key={idx} style={{
                  display:"flex",alignItems:"center",gap:6,padding:"3px 4px",
                  background:sel?"rgba(251,191,36,0.18)":"transparent",
                  borderRadius:4,marginBottom:idx===0?2:0,
                  opacity:dim?0.4:1,
                  color:sel?"#fbbf24":"#cbd5e1",fontWeight:sel?700:500,
                }}>
                  <span>{team?.flag || team?.f || "?"}</span>
                  <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team?.name || team?.n || "TBD"}</span>
                  {sel && <span style={{fontSize:10}}>✓</span>}
                </div>
              );
            })}
          </div>
        );
      };

      return (
        <div style={{padding:"16px 14px 40px",maxWidth:920,margin:"0 auto"}}>
          <button onClick={()=>{setViewing(null);setViewTab("matches");}} style={{...ghostBtn,marginBottom:14,padding:"7px 14px",width:"auto"}}>← Back to league</button>

          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${colorFor(m.name)},${colorFor(m.name)}aa)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff"}}>
              {m.name[0]?.toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <h2 style={{margin:0,fontSize:18,color:"#f1f5f9"}}>{m.name}{m.isMe?" (you)":""}</h2>
              {hasActuals && <div style={{fontSize:12,color:"#fbbf24",fontWeight:700,marginTop:2}}>🏅 {m.totalPoints} pts</div>}
              <div style={{fontSize:10,color:"#64748b",marginTop:1}}>{m.predictedCount}/{FIXTURES.length} matches predicted</div>
            </div>
          </div>

          {/* Champion banner — always at top */}
          {champ && (
            <div style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",borderRadius:12,padding:12,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:10,letterSpacing:3,color:"#0a0e1c",fontWeight:800}}>🏆 PREDICTED CHAMPION</div>
              <div style={{fontSize:26,margin:"2px 0"}}>{champ.flag||champ.f}</div>
              <div style={{fontSize:15,color:"#0a0e1c",fontWeight:900}}>{champ.name||champ.n}</div>
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex",background:"rgba(15,20,36,0.6)",borderRadius:10,padding:3,marginBottom:12}}>
            {[
              ["matches","⚽ Matches"],
              ["standings","📊 Standings"],
              ["bracket","🏆 Bracket"],
            ].map(([t,lbl]) => (
              <button key={t} onClick={()=>setViewTab(t)} style={{
                flex:1,padding:"7px 0",border:"none",borderRadius:7,cursor:"pointer",fontFamily:"inherit",
                background: viewTab===t?"rgba(251,191,36,0.15)":"transparent",
                color: viewTab===t?"#fbbf24":"#94a3b8",
                fontSize:11,fontWeight:700,letterSpacing:1,
              }}>{lbl}</button>
            ))}
          </div>

          {/* TAB: MATCHES — all 72 group-stage predictions */}
          {viewTab === "matches" && (
            <div>
              {GROUP_KEYS.map(g => {
                const fs = FIXTURES.filter(f => f.group === g);
                return (
                  <div key={g} style={{background:"rgba(15,20,36,0.6)",border:`1px solid ${COLORS[g]}33`,borderRadius:10,padding:"10px 10px",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{background:COLORS[g],color:"#0f1424",width:24,height:24,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900}}>{g}</div>
                      <span style={{fontSize:11,color:"#94a3b8",letterSpacing:1,fontWeight:700}}>GROUP {g}</span>
                    </div>
                    {[1,2,3].map(md => (
                      <div key={md} style={{marginBottom:6}}>
                        <div style={{fontSize:9,color:"#475569",letterSpacing:2,marginBottom:3,paddingLeft:2}}>━ MATCHDAY {md}</div>
                        {fs.filter(f => f.matchday === md).map(renderMatchRow)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: STANDINGS — calculated group standings */}
          {viewTab === "standings" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:8}}>
              {GROUP_KEYS.map(g => {
                const tbl = m.standings[g];
                return (
                  <div key={g} style={{background:"rgba(15,20,36,0.6)",border:`1px solid ${COLORS[g]}33`,borderRadius:10,padding:"8px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <div style={{background:COLORS[g],color:"#0f1424",width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900}}>{g}</div>
                    </div>
                    {tbl.map((row, i) => {
                      const color = i < 2 ? "#22c55e" : i === 2 ? "#fbbf24" : "#64748b";
                      return (
                        <div key={row.name} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"2px 0"}}>
                          <span style={{color,fontWeight:800,minWidth:10}}>{i+1}</span>
                          <span style={{flex:1,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.flag} {row.name}</span>
                          <span style={{color:COLORS[g],fontWeight:800,minWidth:18,textAlign:"right"}}>{row.pts}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: BRACKET — knockout view */}
          {viewTab === "bracket" && memberBracket && (() => {
            const koH = {fontSize:9,color:"#94a3b8",letterSpacing:2,fontWeight:700,textAlign:"center",marginBottom:6,padding:"3px 0",borderBottom:"1px solid rgba(71,85,105,0.3)"};
            const koHFinal = {...koH, color:"#fbbf24"};
            const ko = m.koWinners || {};
            if (isNarrow) {
              return (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {/* Final on top */}
                  <div style={{background:"linear-gradient(135deg, rgba(251,191,36,0.08), rgba(217,119,6,0.04))",border:"1px solid rgba(251,191,36,0.4)",borderRadius:12,padding:"10px 12px"}}>
                    <div style={{textAlign:"center",marginBottom:6}}>
                      <div style={{fontSize:22,filter:"drop-shadow(0 0 6px rgba(251,191,36,0.6))"}}>🏆</div>
                      <div style={{fontSize:10,color:"#fbbf24",letterSpacing:3,fontWeight:800}}>FINAL</div>
                    </div>
                    {renderKoMatch(memberBracket.final, ko)}
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:5}}>SEMI-FINALS</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      {memberBracket.sf.map(mt => renderKoMatch(mt, ko))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:5}}>QUARTER-FINALS</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      {memberBracket.qf.map(mt => renderKoMatch(mt, ko))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:5}}>ROUND OF 16</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      {memberBracket.r16.map(mt => renderKoMatch(mt, ko))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:5}}>ROUND OF 32</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      {memberBracket.r32.map(mt => renderKoMatch(mt, ko))}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(9, minmax(0, 1fr))",
                gap:5,
              }}>
                {/* LEFT SIDE */}
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>R32</div>
                  {memberBracket.r32.slice(0, 8).map(mt => renderKoMatch(mt, ko))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>R16</div>
                  {memberBracket.r16.slice(0, 4).map(mt => renderKoMatch(mt, ko))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>QF</div>
                  {memberBracket.qf.slice(0, 2).map(mt => renderKoMatch(mt, ko))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>SF</div>
                  {renderKoMatch(memberBracket.sf[0], ko)}
                </div>

                {/* CENTER: FINAL */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={koHFinal}>FINAL</div>
                  <div style={{fontSize:24,marginBottom:3,filter:"drop-shadow(0 0 6px rgba(251,191,36,0.6))"}}>🏆</div>
                  {renderKoMatch(memberBracket.final, ko)}
                </div>

                {/* RIGHT SIDE */}
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>SF</div>
                  {renderKoMatch(memberBracket.sf[1], ko)}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>QF</div>
                  {memberBracket.qf.slice(2, 4).map(mt => renderKoMatch(mt, ko))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>R16</div>
                  {memberBracket.r16.slice(4, 8).map(mt => renderKoMatch(mt, ko))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>R32</div>
                  {memberBracket.r32.slice(8, 16).map(mt => renderKoMatch(mt, ko))}
                </div>
              </div>
            );
          })()}
          {viewTab === "bracket" && !memberBracket && (
            <div style={{background:"rgba(30,41,59,0.4)",border:"1px dashed rgba(71,85,105,0.4)",borderRadius:10,padding:"20px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>
              {m.isMe?"You haven't":"They haven't"} finished the group stage yet, so the bracket isn't built.
            </div>
          )}
        </div>
      );
    }

    const sinceFetch = liveFetchAt ? Math.round((Date.now() - liveFetchAt) / 1000) : null;
    const fetchedLabel = sinceFetch == null ? "Never fetched"
      : sinceFetch < 60 ? `Updated ${sinceFetch}s ago`
      : sinceFetch < 3600 ? `Updated ${Math.floor(sinceFetch/60)}m ago`
      : `Updated ${Math.floor(sinceFetch/3600)}h ago`;

    return (
      <div style={{padding:"16px 14px 40px",maxWidth:600,margin:"0 auto"}}>
        {/* League header */}
        <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(217,119,6,0.05))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:14,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{fontSize:32}}>🏆</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:2}}>YOUR LEAGUE</div>
              <h2 style={{margin:0,fontSize:17,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{leagueData.name}</h2>
              <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>
                <span style={{color:"#22c55e"}}>●</span> Live sync · {members.length} {members.length===1?"member":"members"}
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"#0a0e1c",borderRadius:8,padding:"8px 10px",border:"1px dashed rgba(71,85,105,0.5)"}}>
            <span style={{fontSize:10,color:"#64748b",letterSpacing:1}}>CODE</span>
            <span style={{flex:1,fontFamily:"monospace",fontSize:13,color:"#fbbf24",letterSpacing:1,fontWeight:700,wordBreak:"break-all"}}>{leagueCode}</span>
            <button onClick={copy} style={{background:copied?"#22c55e":"#fbbf24",color:"#0a0e1c",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
              {copied ? "✓" : "📋"}
            </button>
          </div>
          <p style={{fontSize:11,color:"#64748b",margin:"6px 0 0",textAlign:"center"}}>Share this code so friends can join.</p>
        </div>

        {/* Live results status */}
        <div style={{background:"rgba(30,41,59,0.5)",border:"1px solid rgba(71,85,105,0.3)",borderRadius:10,padding:"10px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>📡</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:"#f1f5f9",fontWeight:600}}>Live results auto-fetch</div>
            <div style={{fontSize:10,color:liveError?"#fca5a5":"#94a3b8"}}>{liveError || fetchedLabel}</div>
          </div>
          <button onClick={onFetchLive} style={{background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.4)",color:"#fbbf24",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Refresh
          </button>
        </div>

        {/* Leaderboard */}
        <div style={{fontSize:11,color:"#94a3b8",letterSpacing:3,marginBottom:8,textAlign:"center"}}>
          🏅 STANDINGS
        </div>
        {!hasActuals && (
          <div style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:11,color:"#93c5fd",lineHeight:1.5,textAlign:"center"}}>
            💡 Points will fill in once real match results arrive. Tap <strong>Refresh</strong> above to pull the latest, or wait — it auto-fetches every 5 min.
          </div>
        )}
        {members.length === 0 && (
          <div style={{background:"rgba(30,41,59,0.4)",border:"1px dashed rgba(71,85,105,0.4)",borderRadius:10,padding:"16px 12px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>
            No members yet. Share your league code so friends can join.
          </div>
        )}
        {members.map((p, i) => {
          const showPoints = hasActuals;
          // Top 3 get medals; everyone below gets 🗑️
          const isPodium = i < 3;
          const icon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🗑️";
          // Subtle podium bg color: gold, silver, bronze
          const podiumGlow = i === 0 ? "rgba(251,191,36,0.18)"
                           : i === 1 ? "rgba(203,213,225,0.15)"
                           : i === 2 ? "rgba(180,83,9,0.18)"
                           : null;
          const podiumBorder = i === 0 ? "#fbbf24"
                             : i === 1 ? "#cbd5e1"
                             : i === 2 ? "#b45309"
                             : null;
          // Background: podium colors for top 3, "trash" gray for the rest
          const rowBg = isPodium && showPoints
            ? `linear-gradient(135deg, ${podiumGlow}, rgba(15,20,36,0.4))`
            : p.isMe ? "linear-gradient(135deg,rgba(251,191,36,0.1),rgba(217,119,6,0.05))"
            : "rgba(30,41,59,0.5)";
          const rowBorder = isPodium && showPoints
            ? `1px solid ${podiumBorder}`
            : p.isMe ? "1px solid #fbbf24"
            : "1px solid rgba(71,85,105,0.3)";
          // Below-podium rows get a slightly dimmer look when results exist
          const rowOpacity = !isPodium && showPoints ? 0.75 : 1;

          return (
            <button key={p.uid} onClick={()=>setViewing(p.uid)} style={{
              width:"100%",display:"flex",alignItems:"center",gap:12,
              background: rowBg,
              border: rowBorder,
              borderRadius: isPodium && showPoints ? 14 : 12,
              padding: isPodium && showPoints ? "14px 14px" : "12px 14px",
              marginBottom:8,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
              opacity: rowOpacity,
              transition: "all 0.2s",
              boxShadow: isPodium && showPoints ? `0 4px 14px ${podiumGlow}` : "none",
            }}>
              {/* Rank icon */}
              <div style={{
                minWidth: isPodium && showPoints ? 40 : 32,
                display:"flex",flexDirection:"column",alignItems:"center",gap:1,
              }}>
                <span style={{fontSize: isPodium && showPoints ? 26 : 20, lineHeight:1}}>{showPoints ? icon : `${i+1}`}</span>
                {showPoints && isPodium && (
                  <span style={{fontSize:9,color:podiumBorder,fontWeight:800,letterSpacing:1}}>
                    {i===0?"1ST":i===1?"2ND":"3RD"}
                  </span>
                )}
              </div>
              {/* Avatar */}
              <div style={{
                width: isPodium && showPoints ? 38 : 34,
                height: isPodium && showPoints ? 38 : 34,
                borderRadius:"50%",
                background:`linear-gradient(135deg,${colorFor(p.name)},${colorFor(p.name)}aa)`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize: isPodium && showPoints ? 16 : 14,
                fontWeight:900,color:"#fff",flexShrink:0,
              }}>{p.name[0]?.toUpperCase()}</div>
              {/* Name + breakdown */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{
                  fontSize: isPodium && showPoints ? 15 : 14,
                  color:"#f1f5f9",fontWeight:700,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                }}>{p.name}{p.isMe?" (you)":""}</div>
                <div style={{fontSize:10,color:"#64748b",marginTop:1}}>
                  {p.predictedCount}/{FIXTURES.length} predicted
                  {showPoints && p.matchScore.exact>0 && ` · 🎯${p.matchScore.exact} exact`}
                  {showPoints && p.matchScore.gd>0 && ` · ✓${p.matchScore.gd} GD`}
                  {showPoints && p.matchScore.result>0 && ` · ✅${p.matchScore.result}`}
                  {showPoints && p.koScore.breakdown.champion>0 && " · 👑"}
                </div>
              </div>
              {/* Points */}
              <div style={{textAlign:"right"}}>
                <div style={{
                  fontSize: isPodium && showPoints ? 24 : 20,
                  fontWeight:900,
                  color: showPoints ? (isPodium ? podiumBorder : "#94a3b8") : "#475569",
                  lineHeight:1,
                }}>{p.totalPoints}</div>
                <div style={{fontSize:9,color:"#94a3b8",letterSpacing:1}}>PTS</div>
              </div>
            </button>
          );
        })}

        {/* Leave league */}
        <div style={{marginTop:24,textAlign:"center"}}>
          <button onClick={handleLeave} style={{background:"transparent",border:"none",color:"#64748b",fontSize:12,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Leave this league</button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── LEGACY: kept for fallback (not used when leagues are active) ─────────────

function LeagueView({ name, picks, koWinners, friends, setFriends, leagueName, setLeagueName, onEnterResults, hasActuals, actuals, actualKo }) {
  const [tab, setTab] = useState(hasActuals ? "table" : "members"); // table | members | picks
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLeague, setEditingLeague] = useState(false);
  const [leagueDraft, setLeagueDraft] = useState(leagueName || "");
  const [viewing, setViewing] = useState(null); // which member's picks we're viewing
  const [showManualCopy, setShowManualCopy] = useState(false);

  const myCode = useMemo(() => encodePicks(name, picks, koWinners), [name, picks, koWinners]);

  const copy = async () => {
    const ok = await copyText(myCode);
    if (ok) {
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    } else {
      // Both methods failed — show the manual copy box
      setShowManualCopy(true);
    }
  };

  const handleAdd = () => {
    const d = decodePicks(code);
    if (!d) { setErr("That code doesn't look right"); return; }
    if (d.name === name) { setErr("That's your own code!"); return; }
    // If exists, update instead
    const existing = friends.findIndex(f => f.name === d.name);
    if (existing >= 0) {
      const updated = [...friends];
      updated[existing] = { name: d.name, picks: d.picks, koWinners: d.koWinners };
      setFriends(updated);
    } else {
      setFriends([...friends, { name: d.name, picks: d.picks, koWinners: d.koWinners }]);
    }
    setCode(""); setShowAdd(false); setErr("");
  };

  // Compute scores for everyone
  const actualStandings = useMemo(() => allStandings(actuals), [actuals]);
  const actualBestThirds = useMemo(() => getBestThirds(actualStandings), [actualStandings]);
  const actualKnockout = useMemo(() => getKnockoutTeams(actualStandings, actualBestThirds, actualKo), [actualStandings, actualBestThirds, actualKo]);

  const everyone = useMemo(() => {
    const buildEntry = (n, p, ko, isMe) => {
      const st = allStandings(p);
      const bt = getBestThirds(st);
      const kt = getKnockoutTeams(st, bt, ko);
      const ms = totalScore(p, actuals);
      const ks = hasActuals ? scoreKnockout(kt, actualKnockout) : { total:0, breakdown:{r16:0,qf:0,sf:0,finalist:0,champion:0}};
      return { name:n, isMe, picks:p, koWinners:ko, standings:st, bestThirds:bt, knockout:kt, matchScore:ms, koScore:ks, totalPoints: ms.total + ks.total };
    };
    const list = [
      buildEntry(name, picks, koWinners, true),
      ...friends.map(f => buildEntry(f.name, f.picks, f.koWinners, false)),
    ];
    list.sort((a,b) => b.totalPoints - a.totalPoints);
    return list;
  }, [name, picks, koWinners, friends, actuals, actualKnockout, hasActuals]);

  const AVATAR_COLORS = ["#fbbf24","#ef4444","#3b82f6","#22c55e","#a855f7","#ec4899","#14b8a6","#f97316"];
  const colorFor = (n) => {
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[h];
  };

  // ─── PICKS VIEW (drill-in to one member) ──
  if (viewing) {
    const member = everyone.find(p => p.name === viewing);
    if (!member) { setViewing(null); return null; }
    const champ = member.knockout.champion;
    return (
      <div style={{padding:"16px 14px 40px",maxWidth:600,margin:"0 auto"}}>
        <button onClick={()=>setViewing(null)} style={{...ghostBtn,marginBottom:14,padding:"7px 14px",width:"auto"}}>← Back to league</button>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${colorFor(member.name)},${colorFor(member.name)}aa)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff"}}>
            {member.name[0]?.toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <h2 style={{margin:0,fontSize:18,color:"#f1f5f9"}}>{member.name}{member.isMe?" (you)":""}'s picks</h2>
            {hasActuals && <div style={{fontSize:12,color:"#fbbf24",fontWeight:700,marginTop:2}}>🏅 {member.totalPoints} pts</div>}
          </div>
        </div>

        {champ && (
          <div style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",borderRadius:12,padding:14,marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:10,letterSpacing:3,color:"#0a0e1c",fontWeight:800}}>🏆 PREDICTED CHAMPION</div>
            <div style={{fontSize:30,margin:"4px 0"}}>{champ.flag||champ.f}</div>
            <div style={{fontSize:16,color:"#0a0e1c",fontWeight:900}}>{champ.name||champ.n}</div>
          </div>
        )}

        <div style={{fontSize:11,color:"#94a3b8",letterSpacing:3,marginBottom:8,textAlign:"center"}}>GROUP STANDINGS</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
          {GROUP_KEYS.map(g => {
            const winner = member.standings[g][0];
            const runner = member.standings[g][1];
            return (
              <div key={g} style={{background:"rgba(15,20,36,0.6)",border:`1px solid ${COLORS[g]}33`,borderRadius:10,padding:"8px 10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div style={{background:COLORS[g],color:"#0f1424",width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900}}>{g}</div>
                </div>
                <div style={{fontSize:11,color:"#f1f5f9",marginBottom:2}}>🥇 {winner.p>0?`${winner.flag} ${winner.name}`:"—"}</div>
                <div style={{fontSize:11,color:"#94a3b8"}}>🥈 {runner.p>0?`${runner.flag} ${runner.name}`:"—"}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"16px 14px 40px",maxWidth:600,margin:"0 auto"}}>
      {/* League header */}
      <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(217,119,6,0.05))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:32}}>🏆</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:2}}>YOUR LEAGUE</div>
          {editingLeague ? (
            <div style={{display:"flex",gap:6}}>
              <input autoFocus value={leagueDraft} onChange={e=>setLeagueDraft(e.target.value)} maxLength={30}
                onKeyDown={e=>{if(e.key==="Enter"){setLeagueName(leagueDraft.trim()||"My Crew");setEditingLeague(false);}}}
                style={{flex:1,padding:"5px 8px",background:"rgba(15,20,36,0.8)",border:"1px solid rgba(251,191,36,0.5)",borderRadius:6,color:"#f1f5f9",fontSize:15,fontFamily:"inherit",outline:"none"}}/>
              <button onClick={()=>{setLeagueName(leagueDraft.trim()||"My Crew");setEditingLeague(false);}} style={{background:"#fbbf24",color:"#0a0e1c",border:"none",borderRadius:6,padding:"0 10px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>OK</button>
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <h2 style={{margin:0,fontSize:17,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{leagueName || "My Crew"}</h2>
              <button onClick={()=>{setLeagueDraft(leagueName||"My Crew");setEditingLeague(true);}} style={{background:"transparent",border:"none",color:"#94a3b8",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✎</button>
            </div>
          )}
          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{everyone.length} {everyone.length===1?"member":"members"}{hasActuals?" · results in":""}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"rgba(15,20,36,0.6)",borderRadius:10,padding:3,marginBottom:14}}>
        {[
          ["table","🏅 Standings"],
          ["members","👥 Members"],
        ].map(([t,lbl]) => (
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1,padding:"8px 0",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",
            background:tab===t?"rgba(251,191,36,0.15)":"transparent",
            color:tab===t?"#fbbf24":"#94a3b8",
            fontSize:12,fontWeight:700,letterSpacing:1,
          }}>{lbl}</button>
        ))}
      </div>

      {/* ─── TABLE TAB ─── */}
      {tab === "table" && (
        <>
          {!hasActuals ? (
            <div style={{background:"rgba(30,41,59,0.4)",border:"1px dashed rgba(71,85,105,0.4)",borderRadius:12,padding:"20px 16px",textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:32,marginBottom:8}}>📊</div>
              <div style={{fontSize:13,color:"#cbd5e1",marginBottom:4,fontWeight:600}}>No scores yet</div>
              <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.5}}>Once you enter real match results, points will appear here for everyone.</div>
            </div>
          ) : (
            <div style={{marginBottom:14}}>
              {everyone.map((p, i) => {
                const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`;
                return (
                  <button key={p.name} onClick={()=>setViewing(p.name)} style={{
                    width:"100%",display:"flex",alignItems:"center",gap:12,
                    background: p.isMe?"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(217,119,6,0.05))":"rgba(30,41,59,0.5)",
                    border: p.isMe?"1px solid #fbbf24":"1px solid rgba(71,85,105,0.3)",
                    borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                  }}>
                    <span style={{fontSize:18,minWidth:28,fontWeight:900,color:i<3?"#fbbf24":"#94a3b8",textAlign:"center"}}>{medal}</span>
                    <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${colorFor(p.name)},${colorFor(p.name)}aa)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",flexShrink:0}}>{p.name[0]?.toUpperCase()}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,color:"#f1f5f9",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}{p.isMe?" (you)":""}</div>
                      <div style={{fontSize:10,color:"#64748b",marginTop:1}}>
                        {p.matchScore.exact>0 && `🎯${p.matchScore.exact} `}
                        {p.matchScore.gd>0 && `✓${p.matchScore.gd} `}
                        {p.matchScore.result>0 && `✅${p.matchScore.result} `}
                        {p.koScore.breakdown.champion>0 && "👑"}
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:22,fontWeight:900,color:"#fbbf24",lineHeight:1}}>{p.totalPoints}</div>
                      <div style={{fontSize:9,color:"#94a3b8",letterSpacing:1}}>PTS</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Results banner */}
          <div style={{background:hasActuals?"rgba(30,41,59,0.4)":"linear-gradient(135deg,rgba(239,68,68,0.1),rgba(220,38,38,0.05))",border:hasActuals?"1px solid rgba(71,85,105,0.4)":"1px solid rgba(239,68,68,0.4)",borderRadius:12,padding:14}}>
            <div style={{fontSize:10,color:hasActuals?"#94a3b8":"#ef4444",letterSpacing:2,marginBottom:4,fontWeight:700}}>📝 ACTUAL RESULTS</div>
            <p style={{fontSize:12,color:"#cbd5e1",margin:"0 0 10px",lineHeight:1.5}}>
              {hasActuals ? "Update results as more matches finish." : "Pick one person in the league to enter scores as games happen — everyone gets scored against them."}
            </p>
            <button onClick={onEnterResults} style={{...primaryBtn,background:hasActuals?"rgba(30,41,59,0.6)":"linear-gradient(135deg,#ef4444,#dc2626)",color:hasActuals?"#cbd5e1":"#fff",boxShadow:hasActuals?"none":"0 6px 18px rgba(239,68,68,0.3)",border:hasActuals?"1px solid rgba(71,85,105,0.4)":"none"}}>
              {hasActuals ? "📝 Update results" : "📝 Enter actual results"}
            </button>
          </div>
        </>
      )}

      {/* ─── MEMBERS TAB ─── */}
      {tab === "members" && (
        <>
          {/* My code (share) */}
          <div style={{background:"linear-gradient(145deg,#1e293b,#0f172a)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:14,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${colorFor(name)},${colorFor(name)}aa)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff"}}>{name[0]?.toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:"#f1f5f9",fontWeight:700}}>{name} (you)</div>
                <div style={{fontSize:10,color:"#94a3b8",letterSpacing:1}}>SHARE YOUR CODE WITH FRIENDS</div>
              </div>
              <button onClick={()=>setShowManualCopy(s=>!s)} title="Show code to copy manually" style={{background:"transparent",border:"1px solid rgba(71,85,105,0.4)",color:"#94a3b8",cursor:"pointer",fontSize:11,fontFamily:"inherit",padding:"4px 8px",borderRadius:6}}>
                {showManualCopy ? "Hide" : "Show"}
              </button>
            </div>
            {!showManualCopy && (
              <button onClick={copy} style={{...primaryBtn,background:copied?"linear-gradient(135deg,#22c55e,#16a34a)":primaryBtn.background}}>
                {copied ? "✓ Copied! Send to your friends" : "📤 Copy my code"}
              </button>
            )}
            {showManualCopy && (
              <>
                <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:6}}>SELECT ALL & COPY</div>
                <textarea
                  readOnly
                  value={myCode}
                  onClick={e=>{e.target.select();e.target.setSelectionRange(0, myCode.length);}}
                  onFocus={e=>{e.target.select();e.target.setSelectionRange(0, myCode.length);}}
                  rows={4}
                  style={{
                    width:"100%",boxSizing:"border-box",padding:"10px 12px",
                    background:"#0a0e1c",border:"1px dashed rgba(251,191,36,0.4)",
                    borderRadius:8,color:"#94a3b8",fontSize:10,fontFamily:"monospace",
                    outline:"none",resize:"vertical",wordBreak:"break-all",whiteSpace:"pre-wrap",
                  }}
                />
                <p style={{fontSize:11,color:"#64748b",margin:"8px 0 0",lineHeight:1.5,textAlign:"center"}}>
                  💡 Tap inside, then long-press → Select All → Copy.
                </p>
              </>
            )}
          </div>

          {/* Friend list */}
          {friends.length > 0 && friends.map(f => (
            <div key={f.name} style={{background:"rgba(30,41,59,0.5)",border:"1px solid rgba(71,85,105,0.3)",borderRadius:12,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${colorFor(f.name)},${colorFor(f.name)}aa)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#fff",flexShrink:0}}>{f.name[0]?.toUpperCase()}</div>
              <span style={{flex:1,fontSize:13,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
              <button onClick={()=>setViewing(f.name)} style={{background:"transparent",border:"1px solid rgba(71,85,105,0.4)",color:"#cbd5e1",cursor:"pointer",fontSize:11,fontFamily:"inherit",padding:"4px 10px",borderRadius:6}}>View</button>
              <button onClick={()=>setFriends(friends.filter(x=>x.name!==f.name))} style={{background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontSize:14,fontFamily:"inherit",padding:"4px"}}>✕</button>
            </div>
          ))}

          {/* Add friend */}
          {!showAdd ? (
            <button onClick={()=>setShowAdd(true)} style={{...ghostBtn,marginTop:6}}>
              + Add a friend's code
            </button>
          ) : (
            <div style={{background:"linear-gradient(145deg,#1e293b,#0f172a)",border:"1px solid rgba(251,191,36,0.4)",borderRadius:14,padding:14,marginTop:6}}>
              <div style={{fontSize:11,color:"#fbbf24",letterSpacing:2,marginBottom:8}}>PASTE FRIEND'S CODE</div>
              <textarea autoFocus value={code} onChange={e=>{setCode(e.target.value);setErr("");}} rows={3}
                placeholder="WC26P|..." style={{...inputStyle,fontFamily:"monospace",fontSize:11,marginBottom:8}}/>
              {err && <div style={errStyle}>⚠️ {err}</div>}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowAdd(false);setErr("");setCode("");}} style={{...ghostBtn,flex:1,padding:"9px"}}>Cancel</button>
                <button onClick={handleAdd} style={{...primaryBtn,flex:2,padding:"9px"}}>Add to league</button>
              </div>
              <p style={{fontSize:11,color:"#64748b",margin:"10px 0 0",lineHeight:1.5,textAlign:"center"}}>
                💡 Pasting an existing member's new code will update their picks.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Keep old function name as alias for backward compat in App body
function ShareCompare(props) { return <LeagueView {...props} />; }

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "wc2026_state_v1";

function loadState() {
  try {
    const raw = typeof window !== "undefined" && window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

function clearState() {
  try { window.localStorage?.removeItem(STORAGE_KEY); } catch {}
}

function encodeBackup(state) {
  try { return "WC26B|" + btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
  catch { return null; }
}

function decodeBackup(code) {
  try {
    const c = code.trim();
    if (!c.startsWith("WC26B|")) return null;
    return JSON.parse(decodeURIComponent(escape(atob(c.slice(6)))));
  } catch { return null; }
}

// ─── BACKUP MODAL ─────────────────────────────────────────────────────────────

function ConfirmModal({ action, onClose }) {
  if (!action) return null;
  const handleConfirm = () => {
    onClose();
    setTimeout(()=>action.onConfirm?.(), 0);
  };
  const handleSecondary = () => {
    onClose();
    setTimeout(()=>action.onSecondary?.(), 0);
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
      <div style={{
        background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
        border:`1px solid ${action.danger?"rgba(239,68,68,0.5)":"rgba(251,191,36,0.4)"}`,
        borderRadius:18,padding:"24px 22px",maxWidth:380,width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
        animation:"fadeUp 0.2s ease-out",
      }}>
        <div style={{fontSize:34,textAlign:"center",marginBottom:8}}>
          {action.danger ? "⚠️" : "🤔"}
        </div>
        <h2 style={{margin:"0 0 10px",fontSize:18,textAlign:"center",color:action.danger?"#fca5a5":"#fbbf24"}}>
          {action.title}
        </h2>
        <p style={{fontSize:13,color:"#cbd5e1",lineHeight:1.5,textAlign:"center",margin:"0 0 18px"}}>
          {action.message}
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {action.secondaryLabel && (
            <button onClick={handleSecondary} style={{...primaryBtn}}>
              {action.secondaryLabel}
            </button>
          )}
          <button onClick={handleConfirm} style={{
            ...primaryBtn,
            background: action.danger ? "linear-gradient(135deg,#ef4444,#dc2626)" : (action.secondaryLabel ? "rgba(30,41,59,0.6)" : primaryBtn.background),
            color: action.secondaryLabel && !action.danger ? "#cbd5e1" : (action.danger ? "#fff" : primaryBtn.color),
            boxShadow: action.danger ? "0 6px 18px rgba(239,68,68,0.3)" : (action.secondaryLabel ? "none" : primaryBtn.boxShadow),
            border: action.secondaryLabel && !action.danger ? "1px solid rgba(71,85,105,0.4)" : "none",
          }}>
            {action.confirmLabel}
          </button>
          <button onClick={onClose} style={{
            background:"transparent",border:"none",color:"#94a3b8",
            fontSize:12,padding:"8px 0",cursor:"pointer",fontFamily:"inherit",
            marginTop:2,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function BackupPanel({ state, onRestore, onClose }) {
  const [tab, setTab] = useState("export");
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);

  const backupCode = useMemo(() => encodeBackup(state) || "", [state]);
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = async () => {
    const ok = await copyText(backupCode);
    if (ok) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(()=>setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  };

  const handleRestore = () => {
    const restored = decodeBackup(code);
    if (!restored) { setErr("That backup code looks invalid"); return; }
    if (!confirm) { setConfirm(true); return; }
    onRestore(restored);
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}}>
      <div style={{background:"linear-gradient(145deg,#1a1f3a,#0f1424)",border:"1px solid rgba(251,191,36,0.4)",borderRadius:18,padding:"22px 20px",maxWidth:440,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{margin:0,fontSize:18,color:"#fbbf24"}}>💾 Backup & Restore</h2>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#94a3b8",fontSize:22,cursor:"pointer",fontFamily:"inherit",lineHeight:1}}>✕</button>
        </div>

        <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 14px",lineHeight:1.5}}>
          Your progress auto-saves on this device. For extra safety, or to move to another device, copy your backup code somewhere safe (notes, email yourself).
        </p>

        <div style={{display:"flex",background:"rgba(15,20,36,0.6)",borderRadius:10,padding:3,marginBottom:14}}>
          {[["export","📤 Export"],["import","📥 Restore"]].map(([t,lbl]) => (
            <button key={t} onClick={()=>{setTab(t);setErr("");setConfirm(false);}} style={{
              flex:1,padding:"8px 0",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",
              background:tab===t?"rgba(251,191,36,0.15)":"transparent",
              color:tab===t?"#fbbf24":"#94a3b8",
              fontSize:12,fontWeight:700,letterSpacing:1,
            }}>{lbl}</button>
          ))}
        </div>

        {tab === "export" ? (
          <>
            <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:6}}>YOUR BACKUP CODE</div>
            <textarea
              readOnly
              value={backupCode}
              onClick={e=>{e.target.select();e.target.setSelectionRange(0, backupCode.length);}}
              onFocus={e=>{e.target.select();e.target.setSelectionRange(0, backupCode.length);}}
              rows={5}
              style={{
                width:"100%",boxSizing:"border-box",padding:"10px 12px",
                background:"#0a0e1c",border:"1px dashed rgba(71,85,105,0.4)",
                borderRadius:8,color:"#94a3b8",fontSize:10,fontFamily:"monospace",
                marginBottom:10,outline:"none",resize:"vertical",wordBreak:"break-all",whiteSpace:"pre-wrap",
              }}
            />
            <button onClick={copy} style={{...primaryBtn,background:copied?"linear-gradient(135deg,#22c55e,#16a34a)":primaryBtn.background}}>
              {copied ? "✓ Copied! Paste it somewhere safe." : "📋 Copy backup code"}
            </button>
            {copyFailed && (
              <div style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.4)",borderRadius:8,padding:"8px 10px",marginTop:10,fontSize:11,color:"#fde68a"}}>
                💡 Copy didn't work automatically. Tap inside the code above, then long-press → Select All → Copy.
              </div>
            )}
            <p style={{fontSize:11,color:"#64748b",margin:"10px 0 0",lineHeight:1.5,textAlign:"center"}}>
              Paste it into a note, email it to yourself, or text it. Use Restore on any device to load it.
            </p>
          </>
        ) : (
          <>
            <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:6}}>PASTE BACKUP CODE</div>
            <textarea autoFocus value={code} onChange={e=>{setCode(e.target.value);setErr("");setConfirm(false);}} rows={5}
              placeholder="WC26B|..." style={{...inputStyle,fontFamily:"monospace",fontSize:11,resize:"vertical"}}/>
            {err && <div style={errStyle}>⚠️ {err}</div>}
            {confirm && (
              <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:11,color:"#fca5a5"}}>
                ⚠️ This will replace your current progress. Tap again to confirm.
              </div>
            )}
            <button onClick={handleRestore} style={{...primaryBtn,background:confirm?"linear-gradient(135deg,#ef4444,#dc2626)":primaryBtn.background}}>
              {confirm ? "⚠️ Yes, replace my progress" : "📥 Restore from code"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const saved = useMemo(() => loadState(), []);
  
  const [screen, setScreen] = useState(saved?.name ? "group" : "welcome");
  const [name, setName] = useState(saved?.name || "");
  const [picks, setPicks] = useState(saved?.picks || {});
  const [koWinners, setKoWinners] = useState(saved?.koWinners || {});
  const [groupIdx, setGroupIdx] = useState(saved?.groupIdx || 0);
  const [friends, setFriends] = useState(saved?.friends || []);
  const [actuals, setActuals] = useState(saved?.actuals || {});
  const [actualKo, setActualKo] = useState(saved?.actualKo || {});
  const [winnerPick, setWinnerPick] = useState(saved?.winnerPick || null); // {name, flag} of team you bet wins it all
  const [topScorerPick, setTopScorerPick] = useState(saved?.topScorerPick || null); // {name, team}
  const [actualWinner, setActualWinner] = useState(saved?.actualWinner || null);
  const [actualTopScorer, setActualTopScorer] = useState(saved?.actualTopScorer || null); // {name, team, goals}
  const [leagueName, setLeagueName] = useState(saved?.leagueName || "");
  const [leagueCode, setLeagueCode] = useState(saved?.leagueCode || ""); // joined league code
  const [userId] = useState(() => saved?.userId || `u_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
  const [leagueData, setLeagueData] = useState(null); // live data from Firebase
  const [leagueError, setLeagueError] = useState("");
  const [liveFetchAt, setLiveFetchAt] = useState(null); // timestamp of last successful fetch
  const [liveError, setLiveError] = useState("");
  const [showBackup, setShowBackup] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showIntro, setShowIntro] = useState(!saved?.name);
  const [justSaved, setJustSaved] = useState(false);
  const [toast, setToast] = useState(null); // {emoji, title, sub}
  const [welcomedBack, setWelcomedBack] = useState(false);

  // Show "welcome back" toast for returning users (once per session)
  useEffect(() => {
    if (saved?.name && !welcomedBack) {
      const greetings = [
        { emoji: "👋", title: `Welcome back, ${saved.name}!`, sub: "Your predictions are right where you left them." },
        { emoji: "⚽", title: `Hey ${saved.name}, ready for more?`, sub: "Let's see those predictions." },
        { emoji: "🏆", title: `Back in the game, ${saved.name}!`, sub: "Time to make some bold calls." },
        { emoji: "🔥", title: `${saved.name}, the league missed you!`, sub: "Keep those picks coming." },
      ];
      const g = greetings[Math.floor(Math.random() * greetings.length)];
      setTimeout(() => {
        setToast(g);
        setWelcomedBack(true);
      }, 400);
    }
  }, [saved, welcomedBack]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Auto-save on any change
  useEffect(() => {
    if (!name) return;
    const ok = saveState({ name, picks, koWinners, groupIdx, friends, actuals, actualKo, leagueName, leagueCode, userId, winnerPick, topScorerPick, actualWinner, actualTopScorer });
    if (ok) {
      setJustSaved(true);
      const t = setTimeout(()=>setJustSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [name, picks, koWinners, groupIdx, friends, actuals, actualKo, leagueName, leagueCode, winnerPick, topScorerPick, actualWinner, actualTopScorer]);

  // ─── FIREBASE LEAGUE SYNC ──────────────────────────────────────────────────
  // When we're in a league, subscribe to real-time updates and push our picks
  useEffect(() => {
    if (!leagueCode) { setLeagueData(null); return; }
    const unsub = subscribeLeague(
      leagueCode,
      (data) => {
        setLeagueData(data);
        setLeagueError("");
        // Pull shared actuals from league (so league commissioner can broadcast)
        if (data.actuals) setActuals(data.actuals);
        if (data.actualKo) setActualKo(data.actualKo);
      },
      (err) => {
        console.error("League sync error:", err);
        setLeagueError(err.message || "Couldn't sync league");
      }
    );
    return () => unsub?.();
  }, [leagueCode]);

  // Push our picks to the league whenever they change (debounced)
  useEffect(() => {
    if (!leagueCode || !name) return;
    const handle = setTimeout(() => {
      updateMyPicks(leagueCode, userId, name, picks, koWinners, { winnerPick, topScorerPick })
        .catch(err => console.error("Failed to push picks:", err));
    }, 800);
    return () => clearTimeout(handle);
  }, [leagueCode, userId, name, picks, koWinners, winnerPick, topScorerPick]);

  // ─── LIVE RESULTS AUTO-FETCH ───────────────────────────────────────────────
  // Poll API-Football every 5 min for new match results
  const fetchAndApplyLive = async () => {
    try {
      const data = await fetchLiveResults();
      const mapped = mapResultsToFixtures(data, FIXTURES);
      const newActuals = Object.keys(mapped).length > 0
        ? { ...mapped, ...actuals } // existing actuals (manual entries) win over auto
        : actuals;

      if (Object.keys(mapped).length > 0) {
        setActuals(newActuals);
      }

      // Now compute REAL-WORLD bracket from newActuals → map knockout winners
      let newActualKo = actualKo;
      try {
        const realStandings = allStandings(newActuals);
        const realBestThirds = getBestThirds(realStandings);
        const realR32 = buildR32(realStandings, realBestThirds);
        if (realR32 && data.knockout) {
          // Build full real bracket structure (without picks yet — we're going to derive them from API)
          // For R16/QF/SF/Final, the slots get filled progressively as winners are determined
          const buildRealBracket = (currentKo) => {
            const r32Winners = realR32.map(m => currentKo[m.id] === "a" ? m.a : currentKo[m.id] === "b" ? m.b : null);
            const r16 = []; for (let i=0;i<16;i+=2) r16.push({id:`R16-${i/2}`, a:r32Winners[i], b:r32Winners[i+1]});
            const r16Winners = r16.map(m => currentKo[m.id] === "a" ? m.a : currentKo[m.id] === "b" ? m.b : null);
            const qf = []; for (let i=0;i<8;i+=2) qf.push({id:`QF-${i/2}`, a:r16Winners[i], b:r16Winners[i+1]});
            const qfWinners = qf.map(m => currentKo[m.id] === "a" ? m.a : currentKo[m.id] === "b" ? m.b : null);
            const sf = []; for (let i=0;i<4;i+=2) sf.push({id:`SF-${i/2}`, a:qfWinners[i], b:qfWinners[i+1]});
            const sfWinners = sf.map(m => currentKo[m.id] === "a" ? m.a : currentKo[m.id] === "b" ? m.b : null);
            const final = { id:"FINAL", a:sfWinners[0], b:sfWinners[1] };
            return { r32: realR32, r16, qf, sf, final };
          };

          // Iteratively resolve: each round needs the previous round's winners filled in
          let workingKo = { ...actualKo };
          for (let pass = 0; pass < 5; pass++) {
            const realBracket = buildRealBracket(workingKo);
            const fromApi = mapKnockoutToWinners(data, realBracket);
            const merged = { ...workingKo, ...fromApi };
            if (JSON.stringify(merged) === JSON.stringify(workingKo)) break;
            workingKo = merged;
          }
          if (JSON.stringify(workingKo) !== JSON.stringify(actualKo)) {
            newActualKo = workingKo;
            setActualKo(workingKo);
          }
        }
      } catch (e) {
        console.warn("Knockout mapping failed:", e);
      }

      // Push to Firebase so everyone in the league gets it
      if (leagueCode && (Object.keys(mapped).length > 0 || newActualKo !== actualKo)) {
        updateActualResults(leagueCode, newActuals, newActualKo).catch(()=>{});
      }

      setLiveFetchAt(Date.now());
      setLiveError("");
    } catch (err) {
      console.error("Live fetch failed:", err);
      setLiveError(err.message || "Couldn't fetch live results");
    }
  };

  useEffect(() => {
    if (!name) return;
    // Initial fetch shortly after load
    const initial = setTimeout(fetchAndApplyLive, 3000);
    // Then every 5 minutes
    const interval = setInterval(fetchAndApplyLive, 5 * 60 * 1000);
    return () => { clearTimeout(initial); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, leagueCode]);

  const standings = useMemo(() => allStandings(picks), [picks]);
  const bestThirds = useMemo(() => getBestThirds(standings), [standings]);
  const liveStandings = useMemo(() => allStandings(actuals), [actuals]);
  const liveBestThirds = useMemo(() => getBestThirds(liveStandings), [liveStandings]);
  const complete = useMemo(() => allGroupsComplete(picks), [picks]);
  const totalPredicted = Object.keys(picks).filter(k => picks[k]?.h !== undefined && picks[k]?.h !== "").length;
  const hasActuals = Object.keys(actuals).some(k => actuals[k]?.h !== undefined && actuals[k]?.h !== "");
  // Bonus picks (winner + top scorer) lock once the first match has kicked off
  const bonusLocked = (() => {
    const firstKick = Math.min(...FIXTURES.filter(f => f.kickoff).map(f => new Date(f.kickoff).getTime()));
    return Number.isFinite(firstKick) && Date.now() >= firstKick;
  })();

  const handleStart = (n) => { setName(n); setScreen("group"); };
  const handleImport = (d) => {
    setName(d.name + "'s copy");
    setPicks(d.picks);
    setKoWinners(d.koWinners);
    setScreen("group");
  };
  const handleRestore = (restored) => {
    setName(restored.name || "");
    setPicks(restored.picks || {});
    setKoWinners(restored.koWinners || {});
    setGroupIdx(restored.groupIdx || 0);
    setFriends(restored.friends || []);
    setActuals(restored.actuals || {});
    setActualKo(restored.actualKo || {});
    setLeagueName(restored.leagueName || "");
    setLeagueCode(restored.leagueCode || "");
    setWinnerPick(restored.winnerPick || null);
    setTopScorerPick(restored.topScorerPick || null);
    setScreen("group");
  };
  const handleReset = () => {
    setConfirmAction({
      title: "Delete everything?",
      message: "This wipes all your predictions, friends, and results from this device. There's no undo. Copy your backup code first if you want to keep your progress.",
      confirmLabel: "🗑️ Yes, delete everything",
      danger: true,
      onConfirm: () => {
        clearState();
        setName(""); setPicks({}); setKoWinners({}); setGroupIdx(0);
        setFriends([]); setActuals({}); setActualKo({}); setLeagueName(""); setLeagueCode(""); setWinnerPick(null); setTopScorerPick(null);
        setScreen("welcome");
        setShowIntro(false);
      },
    });
  };
  const handleLogout = () => {
    const hasData = totalPredicted > 0 || friends.length > 0;
    if (!hasData) {
      // No data to worry about, just log out
      clearState();
      setName(""); setPicks({}); setKoWinners({}); setGroupIdx(0);
      setFriends([]); setActuals({}); setActualKo({}); setLeagueName(""); setLeagueCode(""); setWinnerPick(null); setTopScorerPick(null);
      setScreen("welcome");
      setShowIntro(false);
      return;
    }
    setConfirmAction({
      title: "Log out of this device?",
      message: "Your progress will be cleared from this browser. If you want to come back later, copy your backup code first.",
      confirmLabel: "🚪 Log out",
      secondaryLabel: "💾 Backup first",
      onSecondary: () => setShowBackup(true),
      onConfirm: () => {
        clearState();
        setName(""); setPicks({}); setKoWinners({}); setGroupIdx(0);
        setFriends([]); setActuals({}); setActualKo({}); setLeagueName(""); setLeagueCode(""); setWinnerPick(null); setTopScorerPick(null);
        setScreen("welcome");
        setShowIntro(false);
      },
    });
  };
  const setPick = (id, p) => setPicks(prev => ({ ...prev, [id]: p }));

  const currentGroup = GROUP_KEYS[groupIdx];

  const fullState = { name, picks, koWinners, groupIdx, friends, actuals, actualKo, leagueName, leagueCode, userId };

  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at top,#1e1b4b 0%,#0a0e1c 70%)",color:"#f1f5f9",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",position:"relative",overflow:"hidden"}}>
      {/* Big World Cup trophy backdrop */}
      <div aria-hidden="true" style={{
        position:"fixed", inset:0, pointerEvents:"none",
        zIndex:0,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <svg viewBox="0 0 200 280" style={{
          width:"min(70vw, 520px)",
          height:"auto",
          opacity:0.07,
        }}>
          <defs>
            <linearGradient id="trophyGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a"/>
              <stop offset="50%" stopColor="#fbbf24"/>
              <stop offset="100%" stopColor="#b45309"/>
            </linearGradient>
          </defs>
          <g fill="url(#trophyGold)" stroke="#fbbf24" strokeWidth="0.5" strokeOpacity="0.6">
            {/* Globe at top */}
            <ellipse cx="100" cy="60" rx="32" ry="38"/>
            {/* Globe latitude/longitude lines */}
            <g fill="none" stroke="#92400e" strokeWidth="0.8" strokeOpacity="0.5">
              <ellipse cx="100" cy="60" rx="32" ry="38"/>
              <ellipse cx="100" cy="60" rx="16" ry="38"/>
              <ellipse cx="100" cy="60" rx="32" ry="12"/>
              <line x1="68" y1="60" x2="132" y2="60"/>
            </g>
            {/* Two figures holding up the globe — twisted/spiral form */}
            <path d="
              M 75 95
              C 70 110, 72 130, 82 145
              C 88 155, 88 165, 84 175
              L 86 180
              L 114 180
              L 116 175
              C 112 165, 112 155, 118 145
              C 128 130, 130 110, 125 95
              C 118 100, 110 102, 100 102
              C 90 102, 82 100, 75 95
              Z
            "/>
            {/* Base top plate */}
            <rect x="78" y="178" width="44" height="6" rx="1"/>
            {/* Main cylindrical base */}
            <path d="
              M 72 184
              L 128 184
              L 132 208
              L 68 208
              Z
            "/>
            {/* Base bottom plate */}
            <rect x="62" y="208" width="76" height="8" rx="1"/>
            {/* Decorative ring on base */}
            <rect x="74" y="190" width="52" height="3" fill="#92400e" fillOpacity="0.3" stroke="none"/>
            <rect x="74" y="200" width="52" height="2" fill="#92400e" fillOpacity="0.3" stroke="none"/>
          </g>
        </svg>
      </div>
      {/* Wrap children in relative container so they sit above the background */}
      <div style={{position:"relative", zIndex:1}}>
      <style>{`
        @keyframes fadeUp { from {opacity:0;transform:translateY(20px)} to {opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pop { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes reactionFloat {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          25% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          40% { opacity: 1; transform: translate(-50%, -75%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -120%) scale(0.95); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(0.85); }
        }
        @keyframes matchFlash {
          0% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
          30% { box-shadow: 0 0 0 4px rgba(251,191,36,0.4); }
          100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
        }
        @keyframes championPop {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(10deg); opacity: 1; }
          80% { transform: scale(0.95) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.6; }
        }
      `}</style>

      {/* Top bar */}
      {screen !== "welcome" && screen !== "results" && (
        <div style={{position:"sticky",top:0,zIndex:20,background:"rgba(10,14,28,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(71,85,105,0.3)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,maxWidth:560,margin:"0 auto",padding:"8px 14px",position:"relative"}}>
            <button onClick={()=>setShowUserMenu(s=>!s)} style={{
              display:"flex",alignItems:"center",gap:6,
              background:showUserMenu?"rgba(251,191,36,0.15)":"transparent",
              border:`1px solid ${showUserMenu?"rgba(251,191,36,0.4)":"transparent"}`,
              borderRadius:8,padding:"4px 8px",cursor:"pointer",fontFamily:"inherit",
              minWidth:0,maxWidth:130,
            }}>
              <span style={{
                width:22,height:22,borderRadius:"50%",
                background:"linear-gradient(135deg,#fbbf24,#d97706)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:900,color:"#0a0e1c",flexShrink:0,
              }}>{name[0]?.toUpperCase()||"?"}</span>
              <span style={{fontSize:11,color:"#94a3b8",letterSpacing:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
              <span style={{fontSize:8,color:"#64748b"}}>▼</span>
            </button>
            <div style={{flex:1,height:6,background:"rgba(71,85,105,0.3)",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${Math.round((totalPredicted/FIXTURES.length)*100)}%`,height:"100%",background:"linear-gradient(90deg,#fbbf24,#f59e0b)",borderRadius:3,transition:"width 0.4s"}}/>
            </div>
            <span style={{fontSize:10,color:"#fbbf24",fontWeight:700,minWidth:40,textAlign:"right"}}>{totalPredicted}/{FIXTURES.length}</span>
            <button onClick={()=>setShowBackup(true)} title="Backup & Restore" style={{
              background:justSaved?"rgba(34,197,94,0.15)":"rgba(30,41,59,0.6)",
              border:`1px solid ${justSaved?"#22c55e":"rgba(71,85,105,0.4)"}`,
              borderRadius:8,padding:"5px 8px",cursor:"pointer",fontFamily:"inherit",
              fontSize:11,color:justSaved?"#22c55e":"#cbd5e1",transition:"all 0.3s",
              minWidth:38,
            }}>{justSaved ? "✓" : "💾"}</button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <>
                <div onClick={()=>setShowUserMenu(false)} style={{position:"fixed",inset:0,zIndex:25}}/>
                <div style={{
                  position:"absolute",top:"calc(100% + 4px)",left:14,zIndex:26,
                  background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
                  border:"1px solid rgba(251,191,36,0.3)",
                  borderRadius:12,padding:6,minWidth:220,
                  boxShadow:"0 10px 30px rgba(0,0,0,0.6)",
                  animation:"fadeUp 0.2s ease-out",
                }}>
                  <div style={{padding:"8px 12px 10px",borderBottom:"1px solid rgba(71,85,105,0.3)",marginBottom:4}}>
                    <div style={{fontSize:9,color:"#64748b",letterSpacing:2,marginBottom:2}}>SIGNED IN AS</div>
                    <div style={{fontSize:14,color:"#fbbf24",fontWeight:700}}>{name}</div>
                  </div>
                  <button onClick={()=>{setShowUserMenu(false);setShowBackup(true);}} style={menuItemStyle}>
                    <span style={{fontSize:14,marginRight:8}}>💾</span> Backup my progress
                  </button>
                  <button onClick={()=>{setShowUserMenu(false);handleLogout();}} style={menuItemStyle}>
                    <span style={{fontSize:14,marginRight:8}}>🚪</span> Log out
                  </button>
                  <button onClick={()=>{setShowUserMenu(false);handleReset();}} style={{...menuItemStyle,color:"#f87171"}}>
                    <span style={{fontSize:14,marginRight:8}}>🗑️</span> Delete all & start over
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Bottom nav */}
          {(screen === "group" || screen === "bracket" || screen === "bonus" || screen === "league") && (
            <div style={{display:"flex",justifyContent:"center",borderTop:"1px solid rgba(71,85,105,0.3)"}}>
              {[
                ["group", "⚽ Predict"],
                ["bracket", "🏆 Bracket"],
                ["bonus", "⭐ Bonus"],
                ["league", "🏅 League"],
              ].map(([s, label]) => (
                <button key={s} onClick={()=>setScreen(s)} style={{
                  flex:1,padding:"8px 4px",background:screen===s?"rgba(251,191,36,0.1)":"transparent",
                  border:"none",borderBottom:screen===s?"2px solid #fbbf24":"2px solid transparent",
                  color:screen===s?"#fbbf24":"#94a3b8",fontSize:11,cursor:"pointer",fontFamily:"inherit",
                  letterSpacing:1,
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {screen === "welcome" && showIntro && <SoccerIntro onDone={()=>setShowIntro(false)} />}
      {screen === "welcome" && !showIntro && <Welcome onStart={handleStart} onImport={handleImport} />}

      {screen === "group" && (
        <GroupView
          group={currentGroup}
          picks={picks}
          actuals={actuals}
          standings={standings[currentGroup]}
          bestThirds={bestThirds}
          liveStandings={liveStandings[currentGroup]}
          liveBestThirds={liveBestThirds}
          hasActuals={hasActuals}
          onPick={setPick}
          showResults={hasActuals}
          onNext={()=>{
            if (groupIdx === GROUP_KEYS.length - 1) setScreen("bracket");
            else setGroupIdx(groupIdx+1);
          }}
          onPrev={()=>{
            if (groupIdx === 0) setScreen("welcome");
            else setGroupIdx(groupIdx-1);
          }}
          onJump={(g)=>{
            const idx = GROUP_KEYS.indexOf(g);
            if (idx >= 0) setGroupIdx(idx);
            window.scrollTo({top:0, behavior:"smooth"});
          }}
          isFirst={groupIdx === 0}
          isLast={groupIdx === GROUP_KEYS.length - 1}
        />
      )}

      {screen === "bracket" && (
        <KnockoutBracket
          standings={standings}
          bestThirds={bestThirds}
          koWinners={koWinners}
          setKoWinners={setKoWinners}
          onBack={()=>setScreen("group")}
          onShare={()=>setScreen("league")}
          complete={complete}
        />
      )}

      {screen === "bonus" && (
        <BonusPicks
          winnerPick={winnerPick} setWinnerPick={setWinnerPick}
          topScorerPick={topScorerPick} setTopScorerPick={setTopScorerPick}
          actualWinner={actualWinner} actualTopScorer={actualTopScorer}
          isLocked={bonusLocked}
          onBack={()=>setScreen("group")}
        />
      )}

      {screen === "league" && (
        <LeagueHub
          name={name} userId={userId}
          picks={picks} koWinners={koWinners}
          leagueCode={leagueCode} setLeagueCode={setLeagueCode}
          leagueData={leagueData} leagueError={leagueError}
          actuals={actuals} hasActuals={hasActuals}
          liveFetchAt={liveFetchAt} liveError={liveError}
          onFetchLive={fetchAndApplyLive}
        />
      )}

      {screen === "results" && (
        <ActualResults
          actuals={actuals} setActuals={setActuals}
          actualKo={actualKo} setActualKo={setActualKo}
          onClose={()=>setScreen("league")}
        />
      )}

      {/* Backup modal */}
      {showBackup && (
        <BackupPanel
          state={fullState}
          onRestore={handleRestore}
          onClose={()=>setShowBackup(false)}
        />
      )}

      {/* Confirm modal */}
      <ConfirmModal action={confirmAction} onClose={()=>setConfirmAction(null)} />
      </div>
    </div>
  );
}
