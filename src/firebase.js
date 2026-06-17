// src/firebase.js
// ─── Firebase config and league sync service ──────────────────────────────────

import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, updateDoc, onSnapshot,
  collection, getDoc, serverTimestamp, deleteField, deleteDoc,
} from "firebase/firestore";

// 🔧 PASTE YOUR FIREBASE CONFIG HERE (see SETUP.md step 2)
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

// ─── League codes: short, memorable, easy to share ────────────────────────────

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
    members: {}, // { userId: { name, picks, koWinners, updatedAt } }
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
  await updateDoc(ref, {
    [`members.${userId}`]: {
      name,
      picks,
      koWinners,
      ...extras, // e.g. winnerPick, topScorerPick
      updatedAt: Date.now(),
    },
  });
}

export async function renameLeague(code, newName) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, { name: newName });
}

export async function leaveLeague(code, userId) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    [`members.${userId}`]: deleteField(),
  });
}

// Real-time subscription: calls onUpdate whenever any member changes their picks
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

export async function updateActualResults(code, actuals, actualKo, extras = {}) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    actuals,
    actualKo,
    resultsUpdatedAt: Date.now(),
    ...extras,
  });
}

// ─── GLOBAL LEADERBOARD: every user across the whole world ─────────────────
// Each user has a doc in /users/{userId} with their picks + total points.
// This is updated every time the user makes a pick (debounced via the App).

export async function updateMyGlobalProfile(userId, name, picks, koWinners, extras = {}) {
  const ref = doc(db, "users", userId);
  await setDoc(ref, {
    name,
    picks,
    koWinners,
    ...extras, // winnerPick, topScorerPick, totalPoints
    updatedAt: Date.now(),
  }, { merge: true });
}

// Delete this user's profile entirely — used when the user resets their account.
// Removes them from the global leaderboard.
export async function deleteMyGlobalProfile(userId) {
  if (!userId) return;
  const ref = doc(db, "users", userId);
  try {
    await deleteDoc(ref);
  } catch (e) {
    console.warn("Couldn't delete global profile:", e);
  }
}

// Fetch the top N users by total points + the requesting user's rank
// Returns: { top: [...users], myRank, totalUsers, fetchedAt }
import { query, orderBy, limit, getDocs } from "firebase/firestore";

export async function fetchGlobalLeaderboard(topN = 10, myUserId = null) {
  const usersRef = collection(db, "users");
  // Get top N by totalPoints. Over-fetch to allow for filtering out ghost profiles
  // (users who deleted their account but old docs still exist).
  const topQuery = query(usersRef, orderBy("totalPoints", "desc"), limit(topN * 3 + 20));
  const topSnap = await getDocs(topQuery);
  const isReal = (d) => {
    const data = d.data() || {};
    // Filter out profiles with no name OR no actual activity
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

  // Get total user count + my rank — also filter ghosts
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
