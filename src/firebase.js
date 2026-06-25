// src/firebase.js
// ─── Firebase config and league sync service ──────────────────────────────────

import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, updateDoc, onSnapshot,
  collection, getDoc, serverTimestamp, deleteField, deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4HwvAZZCNwgVMh_h6zsyZ17lzl69_OrM",
  authDomain: "wc-2026-8b41e.firebaseapp.com",
  projectId: "wc-2026-8b41e",
  storageBucket: "wc-2026-8b41e.firebasestorage.app",
  messagingSenderId: "141406397194",
  appId: "1:141406397194:web:a0139af6eb261cc2bf50f3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── League codes ──────────────────────────────────────────────────────────────

const WORDS_A = ["GOLDEN","FIERY","WILD","COSMIC","ROYAL","BRAVE","SILVER","SWIFT","MIGHTY","LUCKY"];
const WORDS_B = ["TIGER","EAGLE","LION","FALCON","WOLF","SHARK","PANDA","BULL","HAWK","DRAGON"];
export function generateLeagueCode() {
  const a = WORDS_A[Math.floor(Math.random() * WORDS_A.length)];
  const b = WORDS_B[Math.floor(Math.random() * WORDS_B.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${a}-${b}-${n}`;
}

// ─── League CRUD ──────────────────────────────────────────────────────────────

export async function createLeague(code, leagueName, creator) {
  const ref = doc(db, "leagues", code);
  const existing = await getDoc(ref);
  if (existing.exists()) throw new Error("League code already taken — try again");
  await setDoc(ref, {
    name: leagueName,
    createdBy: creator,
    createdAt: serverTimestamp(),
    members: {},
  });
  return code;
}

export async function joinLeague(code) {
  const ref = doc(db, "leagues", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("League not found. Check the code.");
  return { code, ...snap.data() };
}

export async function updateMyPicks(code, userId, name, picks, koWinners, extras = {}) {
  const ref = doc(db, "leagues", code);
  // ⚠️ Use per-field (dot-notation) updates instead of overwriting the whole
  // member object, so fields written elsewhere (pic, theme, pendingGifts,
  // topScorerPick, winnerPick…) are NOT wiped out when picks are saved.
  const update = {
    [`members.${userId}.name`]: name,
    [`members.${userId}.picks`]: picks,
    [`members.${userId}.koWinners`]: koWinners,
    [`members.${userId}.updatedAt`]: Date.now(),
  };
  for (const [k, v] of Object.entries(extras || {})) {
    update[`members.${userId}.${k}`] = v;
  }
  await updateDoc(ref, update);
}

export async function renameLeague(code, newName) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, { name: newName });
}

// 👑 Admin: set (or clear) the top-scorer pick for a specific member.
// Used when a member forgot to choose. Pass null to clear.
export async function adminSetMemberTopScorer(code, userId, pick) {
  if (!code || !userId) return;
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    [`members.${userId}.topScorerPick`]: pick || null,
  });
}

// 👑 Admin: set (or clear) the champion (winner) pick for a specific member.
export async function adminSetMemberWinner(code, userId, pick) {
  if (!code || !userId) return;
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    [`members.${userId}.winnerPick`]: pick || null,
  });
}

export async function leaveLeague(code, userId) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    [`members.${userId}`]: deleteField(),
  });
}

export function subscribeLeague(code, onUpdate, onError) {
  const ref = doc(db, "leagues", code);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) onUpdate({ code, ...snap.data() });
      else onError?.(new Error("League no longer exists"));
    },
    (err) => onError?.(err)
  );
}

// ─── Actual results (shared league-wide) ──────────────────────────────────────

export async function updateActualResults(code, actuals, actualKo) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    actuals,
    actualKo,
    resultsUpdatedAt: Date.now(),
  });
}

// ─── 🎁 ADMIN GIFTS (broadcast coins to all members) ──────────────────────────
// Admin sends a gift → it's appended to the league's `gifts` array.
// Each member's app sees the new gift (via subscribeLeague), adds coins locally,
// and remembers it in localStorage so it never applies twice.
//
// Gift shape: { id, amount, reason, sentBy, sentAt }


export async function updateTopScorers(code, topScorers) {
  try {
    const ref = doc(db, "leagues", code);
    await updateDoc(ref, { topScorers, topScorersUpdatedAt: Date.now() });
  } catch(e) { console.warn("updateTopScorers failed:", e); }
}

export async function sendGiftToLeague(code, gift) {
  const ref = doc(db, "leagues", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("League not found");
  const data = snap.data();
  const existingGifts = Array.isArray(data.gifts) ? data.gifts : [];
  // Keep only the last 30 gifts (prevent bloat)
  const trimmed = existingGifts.slice(-29);
  const newGifts = [...trimmed, gift];
  await updateDoc(ref, { gifts: newGifts });
}

// ─── LEAGUE ADS (funny image posts) ─────────────────────────────────────────
// Each ad = { id, imageUrl, caption, author, createdAt }
export async function addLeagueAd(code, ad) {
  const ref = doc(db, "leagues", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("League not found");
  const data = snap.data();
  const existing = Array.isArray(data.ads) ? data.ads : [];
  // Keep only the last 40 ads (prevent bloat)
  const trimmed = existing.slice(-39);
  const newAds = [...trimmed, ad];
  await updateDoc(ref, { ads: newAds });
}

export async function deleteLeagueAd(code, adId) {
  const ref = doc(db, "leagues", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("League not found");
  const data = snap.data();
  const existing = Array.isArray(data.ads) ? data.ads : [];
  const newAds = existing.filter(a => a.id !== adId);
  // If the deleted ad was the active popup, clear it too
  const update = { ads: newAds };
  if (data.activeAd?.id === adId) update.activeAd = null;
  await updateDoc(ref, update);
}

// Push an ad as the "active popup" — every member sees it pop up once.
// Also marks the ad as "pushed" so it appears in the users' history viewer.
// `popupId` is a fresh timestamp so the same ad can be re-pushed later and pop again.
export async function pushAdPopup(code, ad) {
  const ref = doc(db, "leagues", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("League not found");
  const data = snap.data();
  const existing = Array.isArray(data.ads) ? data.ads : [];
  // Mark this ad as pushed (so it shows in users' history) and record the time
  const newAds = existing.map(a => a.id === ad.id ? { ...a, pushed: true, pushedAt: Date.now() } : a);
  await updateDoc(ref, {
    ads: newAds,
    activeAd: { id: ad.id, popupId: `pop_${Date.now()}` },
  });
}

export async function clearAdPopup(code) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, { activeAd: null });
}

// Save a member's customization (theme + profile pic) so the whole league sees it.
export async function updateMyCustom(code, userId, custom) {
  if (!code || !userId) return;
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    [`members.${userId}.theme`]: custom.theme || "green",
    [`members.${userId}.pic`]: custom.pic || "letter",
  });
}

// ─── 🎁 EMOJI GIFTS (buy a profile pic for a friend) ─────────────────────────
// Writes a pending gift onto the recipient's member record. When they open the
// app, they see a popup, the emoji is applied, and it's saved to their bank.
export async function sendEmojiGift(code, toUserId, gift) {
  const ref = doc(db, "leagues", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("League not found");
  const data = snap.data();
  const member = data.members?.[toUserId];
  if (!member) throw new Error("Member not found");
  // Keep a small queue of pending gifts (so multiple gifts don't overwrite)
  const existing = Array.isArray(member.pendingGifts) ? member.pendingGifts : [];
  const newGifts = [...existing.slice(-9), gift]; // keep last 10
  await updateDoc(ref, { [`members.${toUserId}.pendingGifts`]: newGifts });
}

// Clear a pending gift after the recipient has seen it.
export async function clearEmojiGift(code, userId, giftId) {
  const ref = doc(db, "leagues", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const member = data.members?.[userId];
  if (!member) return;
  const existing = Array.isArray(member.pendingGifts) ? member.pendingGifts : [];
  const remaining = existing.filter(g => g.id !== giftId);
  await updateDoc(ref, { [`members.${userId}.pendingGifts`]: remaining });
}

// ─── GLOBAL LEADERBOARD ─────────────────────────────────────────────────────

export async function updateMyGlobalProfile(userId, name, picks, koWinners, extras = {}) {
  const ref = doc(db, "users", userId);
  await setDoc(ref, {
    name,
    picks,
    koWinners,
    ...extras,
    updatedAt: Date.now(),
  }, { merge: true });
}

// Fetch a user's global profile by userId — used for account recovery.
// Returns the saved data (picks, koPicks, koWinners, bonuses, etc.) or null.
export async function fetchMyGlobalProfile(userId) {
  if (!userId) return null;
  try {
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { uid: snap.id, ...snap.data() };
    return null;
  } catch (e) {
    console.warn("Couldn't fetch global profile:", e);
    return null;
  }
}

export async function deleteMyGlobalProfile(userId) {
  if (!userId) return;
  const ref = doc(db, "users", userId);
  try {
    await deleteDoc(ref);
  } catch (e) {
    console.warn("Couldn't delete global profile:", e);
  }
}

import { query, orderBy, limit, getDocs } from "firebase/firestore";

export async function fetchGlobalLeaderboard(topN = 10, myUserId = null) {
  const usersRef = collection(db, "users");
  const topQuery = query(usersRef, orderBy("totalPoints", "desc"), limit(topN * 3 + 20));
  const topSnap = await getDocs(topQuery);
  const isReal = (d) => {
    const data = d.data() || {};
    if (!data.name || !data.name.trim()) return false;
    const hasPicks = data.picks && Object.keys(data.picks).length > 0;
    const hasKoPicks = data.koPicks && Object.keys(data.koPicks).length > 0;
    const hasBonus = data.winnerPick || data.topScorerPick;
    return hasPicks || hasKoPicks || hasBonus;
  };
  const top = topSnap.docs
    .filter(isReal)
    .slice(0, topN)
    .map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() }));

  let totalUsers = 0;
  let myRank = null;
  let myPoints = 0;
  if (myUserId) {
    const allQuery = query(usersRef, orderBy("totalPoints", "desc"), limit(5000));
    const allSnap = await getDocs(allQuery);
    const realDocs = allSnap.docs.filter(isReal);
    totalUsers = realDocs.length;
    realDocs.forEach((d, i) => {
      if (d.id === myUserId) {
        myRank = i + 1;
        myPoints = d.data().totalPoints || 0;
      }
    });
  }

  return { top, myRank, myPoints, totalUsers, fetchedAt: Date.now() };
}

// 🔐 ADMIN: Fetch all users (every user document) — for global admin only.
// Returns full user records, sorted by name. NO points filter — includes empties too.
export async function fetchAllGlobalUsers() {
  const usersRef = collection(db, "users");
  const q = query(usersRef, limit(5000));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// 🔐 ADMIN: Delete a user from the global "users" collection.
export async function deleteGlobalUser(userId) {
  if (!userId) throw new Error("userId required");
  await deleteDoc(doc(db, "users", userId));
}
