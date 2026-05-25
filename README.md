# World Cup 2026 Predictor 🏆

A real-time match-prediction app for the 2026 FIFA World Cup. Create a league, invite friends with a code, everyone predicts every match, real results auto-fetch from a sports API, the leaderboard updates live.

## Features

- ⚽ Predict every group-stage match score
- 📊 Live group standings calculated from your picks
- 🏆 Full knockout bracket that auto-builds from your group results
- 👥 **Auto-syncing leagues** — create a league code, friends join with it, everyone's picks sync in real time (Firebase)
- 📡 **Live results auto-fetched** every 5 minutes from API-Football — leaderboard updates without manual entry
- 🎯 Scoring system: 5 pts exact, 3 pts goal diff, 2 pts correct result, plus knockout bonuses
- 💾 Auto-saves to device + backup code for cross-device transfer
- 📱 Mobile-first design with auto-advancing inputs, vibration feedback, confetti

## Quick start

```bash
npm install
npm run dev
```

But you'll need to configure Firebase and API-Football first — see **[SETUP.md](./SETUP.md)** for the full guide.

## Files

- `src/App.jsx` — main React app
- `src/firebase.js` — league sync service
- `src/liveResults.js` — live results fetcher
- `SETUP.md` — full setup & deployment guide
