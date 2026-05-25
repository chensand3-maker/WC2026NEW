# World Cup 2026 Predictor — Setup & Deployment Guide

This is your complete guide to getting the app live with **auto-syncing leagues** (via Firebase) and **automatic live match results** (via API-Football). Estimated time: **~30 minutes** for the first setup.

---

## What you're building

- A web app where friends create/join shared **leagues** using a code like `GOLDEN-TIGER-123`
- Everyone's predictions **sync in real time** — when a friend changes their picks, everyone sees it
- **Real match results** are pulled automatically from a sports API every 5 minutes
- The leaderboard recalculates points for everyone automatically as matches finish

---

## Step 1 — Install Node.js (skip if you have it)

1. Go to [nodejs.org](https://nodejs.org) → download the **LTS version**
2. Install it
3. Open a terminal (Mac: `Terminal` app; Windows: `Command Prompt`) and check:
   ```bash
   node --version
   ```
   You should see something like `v20.x.x`.

---

## Step 2 — Set up Firebase (for league sync)

This gives you a free real-time database.

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Sign in with your Google account
3. Click **"Add project"** → name it `wc2026` (or whatever) → next → disable Google Analytics → create
4. Once your project loads, in the left sidebar click **"Build" → "Firestore Database"**
5. Click **"Create database"**
   - Choose any location near you
   - Start in **production mode** (we'll loosen rules in a sec)
   - Click **Enable**
6. Go to the **"Rules"** tab inside Firestore. Replace the rules with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /leagues/{leagueCode} {
         allow read, write: if true;
       }
     }
   }
   ```
   Click **Publish**.
   > ⚠️ This makes any league readable/writable by anyone with the code. That's fine for friend groups. For a public app you'd want stricter auth — ask me if you want that.

7. Now get your config: in the left sidebar click the **⚙️ gear → Project settings**
8. Scroll to **"Your apps"** → click the `</>` web icon
9. Give it a nickname (e.g. "WC2026 Web") → **don't** check Firebase Hosting → **Register app**
10. You'll see a snippet like this — **copy it**:
    ```js
    const firebaseConfig = {
      apiKey: "AIzaSy...",
      authDomain: "wc2026.firebaseapp.com",
      projectId: "wc2026",
      storageBucket: "wc2026.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abc123"
    };
    ```
11. Open `src/firebase.js` in this project, find `firebaseConfig`, and **replace each `"PASTE_HERE"`** with your actual values.

✅ Firebase is set up.

---

## Step 3 — Set up API-Football (for live results)

1. Go to [api-football.com](https://www.api-football.com)
2. Click **"Get started for free"** → sign up
3. Once logged in, go to your **Dashboard**
4. Look for **"API Key"** (or "x-rapidapi-key" — same thing) — copy it
5. Open `src/liveResults.js` in this project, find `API_FOOTBALL_KEY = "PASTE_HERE"`, and **paste your key**

> 📊 Free tier = 100 requests/day. The app caches for 5 min, so during match days you'll use ~5–10 requests/hour — well within limits.

> 🔍 If team names from the API don't match ours (e.g. "Republic of Ireland" vs "Ireland"), edit the `TEAM_NAME_MAP` in `liveResults.js`. The mapping is already populated with likely values, but you may need tweaks once the tournament starts.

✅ Live results are set up.

---

## Step 4 — Install dependencies and run locally

In a terminal, inside the `wc2026` folder:

```bash
npm install
npm run dev
```

You should see a message like `Local: http://localhost:5173`. Open that URL in your browser. **The app should work locally with full live sync!** Try it:

- Predict a few matches
- Go to the 🏅 League tab
- Create a league → you should see a code like `GOLDEN-TIGER-123`
- Open the same URL in a private/incognito window (acts like a 2nd "friend"), enter a different name, then join the league with that code
- Predictions should sync in real time between the two windows 🎉

---

## Step 5 — Deploy to the internet (free)

The easiest free hosting is **Vercel**. Other options: Netlify, Cloudflare Pages — any of them work.

### Option A: Vercel (recommended)

1. Push your project to GitHub:
   ```bash
   cd wc2026
   git init
   git add .
   git commit -m "initial"
   ```
   Create a free GitHub account → create a new empty repo on github.com → it'll show you 2 commands to push (something like):
   ```bash
   git remote add origin https://github.com/YOUR_NAME/wc2026.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → sign in with GitHub → click **"Add New Project"**
3. Pick your `wc2026` repo → click **Deploy** (defaults are fine, Vite is auto-detected)
4. ~30 seconds later you'll get a URL like `wc2026-yourname.vercel.app` 🎉

Send that link to all your friends. Done.

### Option B: Netlify Drop (no GitHub needed)

1. In the terminal: `npm run build` (creates a `dist/` folder)
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist/` folder onto the page
4. Get your URL (e.g. `wonderful-cup.netlify.app`)

---

## How it works in practice

### Sharing with friends

1. You open the app → make your predictions
2. Go to 🏅 League → **Create a league** → name it
3. Share the code (e.g. `GOLDEN-TIGER-123`) on WhatsApp
4. Friends open the same link → make their predictions → 🏅 League → **Join a league** → paste your code
5. Everyone now sees everyone else's picks update live

### Tracking real results

- **Automatic**: every 5 minutes the app checks API-Football for completed matches and updates the leaderboard for everyone in the league
- **Manual override**: the old "Enter actual results" screen still works as a backup if the API has issues

### Pre-tournament testing

If you want to test the scoring before June 2026, you can manually enter "actual results" from the **🏅 League → Refresh** button (or fall back to the old manual entry if you set it up that way).

---

## Common issues

**"League not found" when joining:**
- Codes are case-sensitive — make sure they match exactly. The app auto-uppercases as you type.

**"Couldn't sync league" error:**
- Open the browser's Developer Tools → Console tab — there'll be a specific Firebase error
- Most common: Firestore rules not published, or wrong projectId in `firebase.js`

**Live results not updating:**
- Check your API-Football quota in their dashboard. If you've hit 100 requests today, wait until tomorrow or upgrade.
- Tournament hasn't started yet? The API will return no completed matches — that's normal.

**Team names don't match:**
- Look at the browser console — log messages will show what the API returned
- Add aliases to `TEAM_NAME_MAP` in `liveResults.js`, rebuild and redeploy

---

## Costs (honest summary)

For a friend group of 10–20 people across the tournament (~6 weeks):

- **Firebase**: free (~50,000 reads/day on free tier, we'll use a few thousand max)
- **API-Football**: free tier should be enough; if your league is very active you might want their $10/mo plan (7,500 req/day)
- **Vercel/Netlify**: free

**Total realistic cost: $0–$10.**

---

## Want help?

If anything's confusing, share the exact error message (browser console or terminal) and I can walk you through it.

Good luck! 🏆⚽
