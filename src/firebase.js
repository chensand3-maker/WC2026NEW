// src/firebase.js
// ─── Firebase config and league sync service ──────────────────────────────────

import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, updateDoc, onSnapshot,
  collection, getDoc, serverTimestamp, deleteField,
} from "firebase/firestore";

// 🔧 Firebase config
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

// Updated to accept extras (e.g. winnerPick, topScorerPick) so bonus picks sync
export async function updateMyPicks(code, userId, name, picks, koWinners, extras = {}) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    [`members.${userId}`]: {
      name,
      picks,
      koWinners,
      ...extras,
      updatedAt: Date.now(),
    },
  });
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

export async function updateActualResults(code, actuals, actualKo) {
  const ref = doc(db, "leagues", code);
  await updateDoc(ref, {
    actuals,
    actualKo,
    resultsUpdatedAt: Date.now(),
  });
}
