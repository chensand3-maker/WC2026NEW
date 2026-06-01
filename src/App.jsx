import { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import {
  generateLeagueCode, createLeague, joinLeague,
  updateMyPicks, leaveLeague, subscribeLeague, updateActualResults,
  updateMyGlobalProfile, deleteMyGlobalProfile, fetchGlobalLeaderboard, renameLeague,
} from "./firebase";
import { fetchLiveResults, mapResultsToFixtures, mapKnockoutToWinners, mapKnockoutToBracket, fetchTopScorers } from "./liveResults";

// ─── APP VERSION ──────────────────────────────────────────────────────────────
// Bump this manually before each deploy. Shown in the sidebar footer.
const APP_VERSION = "1.6.5.1";

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
// Bilingual support: English (default) + Hebrew (RTL).
// Use t("key") inside components — falls back to English if a Hebrew key is missing.

const TRANSLATIONS = {
  en: {
    // Nav
    "nav.predict": "⚽ Predict",
    "nav.today": "📅 Today",
    "nav.bracket": "🏆 Bracket",
    "nav.bonus": "⭐ Bonus",
    "nav.league": "🏅 League",
    // Welcome
    "welcome.title": "FIFA World Cup 2026 Predictions",
    "welcome.subtitle": "Predict every match, pick your champion, beat your friends.",
    "welcome.yourName": "YOUR NAME",
    "welcome.namePlaceholder": "e.g. Alex",
    "welcome.welcomeGreeting": "👋 Welcome,",
    "welcome.welcomeQuestion": "Ready to call the tournament?",
    "welcome.enterName": "Enter your name",
    "welcome.letsGo": "Let's go,",
    "welcome.letsPredict": "Let's predict! →",
    "welcome.or": "━━━━━ OR ━━━━━",
    "welcome.importCode": "📥 Import code",
    "welcome.pasteCode": "PASTE FRIEND'S CODE",
    "welcome.import": "Import →",
    "welcome.back": "← Back",
    "welcome.invalidCode": "Invalid code",
    // Scoring section
    "welcome.scoring": "🎯 SCORING",
    "welcome.exactScore": "🎯 Exact score",
    "welcome.resultGd": "✓ Right winner (deprecated)",
    "welcome.rightResultOnly": "✅ Correct winner",
    "welcome.knockoutDouble": "🔥 KNOCKOUT — DOUBLE POINTS",
    "welcome.r16Qfsf": "R16 pick · QF · SF",
    "welcome.finalistPick": "🏟️ Finalist pick",
    "welcome.championBonus": "👑 Champion bonus",
    "welcome.pts": "pts",
    // Group view
    "group.groupStage": "GROUP STAGE",
    "group.typeAuto": "⚡ TYPE TO AUTO-ADVANCE",
    "group.group": "GROUP",
    "group.previous": "← Previous",
    "group.next": "Next →",
    "group.toBracket": "To bracket →",
    // Match card
    "match.matchday": "MD",
    "match.locked": "🔒 LOCKED",
    "match.locksSoon": "⏰ LOCKS SOON",
    "match.finalScore": "FINAL SCORE",
    "match.noPick": "NO PICK",
    "match.youPicked": "You picked",
    "match.perfectCall": "perfect call! 🎯",
    "match.rightMargin": "right margin ✓",
    "match.rightResult": "right result ✅",
    "match.missed": "missed this one",
    // Standings
    "standings.predicted": "🔮 PREDICTED STANDINGS",
    "standings.live": "📡 LIVE STANDINGS",
    "standings.yours": "YOURS",
    "standings.liveBtn": "LIVE",
    "standings.team": "TEAM",
    "standings.pts": "PTS",
    // Bracket
    "bracket.knockoutStage": "KNOCKOUT STAGE",
    "bracket.title": "🏆 The Bracket",
    "bracket.tapToAdvance": "Type your score predictions. Teams advance based on real results.",
    "bracket.doublePoints": "🔥 DOUBLE POINTS PER MATCH",
    "bracket.r16": "R16",
    "bracket.qf": "QF",
    "bracket.sf": "SF",
    "bracket.finalist": "Finalist",
    "bracket.champion": "Champion",
    "bracket.final": "FINAL",
    "bracket.roundOf32": "ROUND OF 32",
    "bracket.roundOf16": "ROUND OF 16",
    "bracket.quarterFinals": "QUARTER-FINALS",
    "bracket.semiFinals": "SEMI-FINALS",
    "bracket.r32": "R32",
    "bracket.tbd": "TBD",
    "bracket.yourChampion": "🏆 YOUR CHAMPION 🏆",
    "bracket.bracketLoading": "Bracket loading...",
    "bracket.predictFirst": "Predict some matches first to see the bracket take shape.",
    "bracket.backToGroups": "← Back to groups",
    "bracket.bracketPreview": "Bracket preview.",
    "bracket.r32Confirmed": "R32 matchups confirmed from group standings. Finish predicting all 72 group matches to lock in the full bracket — TBD slots will fill in as you do.",
    // Bonus
    "bonus.title": "⭐ Big Bets",
    "bonus.subtitle": "Two big calls for major bonus points.",
    "bonus.locked": "🔒 Bonus picks locked — the tournament has started.",
    "bonus.tournamentWinner": "🏆 TOURNAMENT WINNER",
    "bonus.pickOneTeam": "Pick one team to lift the trophy",
    "bonus.fiftyPts": "+20 PTS",
    "bonus.change": "Change",
    "bonus.goldenBoot": "👟 GOLDEN BOOT",
    "bonus.pickPlayer": "Pick a player — every goal scores you points",
    "bonus.fivePerGoal": "+2 PER GOAL",
    "bonus.fromFavorites": "From favorites",
    "bonus.enterManually": "Enter manually",
    "bonus.searchPlaceholder": "Search players or teams...",
    "bonus.noMatches": "No matches — try \"Enter manually\"",
    "bonus.playerName": "Player name",
    "bonus.team": "Team",
    "bonus.lockIn": "Lock in pick",
    "bonus.bonusPicks": "BONUS PICKS",
    "bonus.noPickMade": "No pick made.",
    "bonus.topScorersLive": "TOP SCORERS · LIVE",
    "bonus.updated": "updated",
    "bonus.minAgo": "ago",
    "bonus.loadingScorers": "Loading...",
    "bonus.noScorersYet": "No goals scored yet — the tournament hasn't started!",
    "bonus.yourPick": "YOUR PICK",
    "bonus.notScoredYet": "Hasn't scored yet",
    "bonus.goals": "goals",
    // League
    "league.playWithFriends": "Play With Friends",
    "league.intro": "Create a league or join one. Everyone's picks sync live, and real match results update automatically.",
    "league.createLeague": "Create a league",
    "league.createPlaceholder": "e.g. Mike's Crew",
    "league.creating": "Creating...",
    "league.createBtn": "✨ Create league",
    "league.joinLeague": "Join a league",
    "league.joinPlaceholder": "e.g. GOLDEN-TIGER-123",
    "league.joining": "Joining...",
    "league.joinBtn": "🤝 Join league",
    "league.joinHint": "Got a code from a friend? Paste it here.",
    "league.orCreate": "OR",
    "league.previewHit": "Most exact predictions will be shown here when matches start",
    "league.previewMiss": "Most wrong predictions will be shown here when matches start",
    "league.nameRequired": "Give your league a name",
    "league.codeRequired": "Enter a league code",
    "league.couldntCreate": "Couldn't create league. Check Firebase setup.",
    "league.couldntJoin": "Couldn't join. Check the code.",
    "league.yourLeague": "YOUR LEAGUE",
    "league.liveSync": "Live sync",
    "league.member": "member",
    "league.members": "members",
    "league.code": "CODE",
    "league.shareCode": "Share this code so friends can join.",
    "league.liveResults": "Live results auto-fetch",
    "league.refresh": "Refresh",
    "league.never": "Never fetched",
    "league.updatedAgo": "Updated",
    "league.standings": "🏅 STANDINGS",
    "league.pointsFillIn": "💡 Points will fill in once real match results arrive. Tap",
    "league.pointsFillInRest": "above to pull the latest, or wait — it auto-fetches every 5 min.",
    "league.noMembers": "No members yet. Share your league code so friends can join.",
    "league.you": " (you)",
    "league.predicted": "predicted",
    "league.exact": "exact",
    "league.leaveLeague": "Leave this league",
    "league.connectionError": "League connection error",
    "league.backToMenu": "← Back to league menu",
    "league.connecting": "Connecting to league...",
    "league.hitsMisses": "🎯 HITS & MISSES",
    "league.topHit": "TOP HIT",
    "league.topMiss": "TOP MISS",
    "league.exactScoreOne": "exact score",
    "league.exactScoresMany": "exact scores",
    "league.nailedIt": "nailed it 🎯",
    "league.wrongPickOne": "wrong pick",
    "league.wrongPicksMany": "wrong picks",
    "league.oof": "oof 💀",
    "league.noExactYet": "No exact picks yet",
    "league.noMissesYet": "No misses yet!",
    // Drill-in tabs
    "drill.backToLeague": "← Back to league",
    "drill.predictedChampion": "🏆 PREDICTED CHAMPION",
    "drill.matchesTab": "⚽ Matches",
    "drill.standingsTab": "📊 Standings",
    "drill.bracketTab": "🏆 Bracket",
    "drill.matchday": "━ MATCHDAY",
    "drill.bracketNotBuilt": "haven't finished the group stage yet, so the bracket isn't built.",
    "drill.youHaventBracket": "You haven't",
    "drill.theyHaventBracket": "They haven't",
    "drill.actual": "Actual:",
    // Misc
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.skip": "Skip ›",
    "common.goal": "GOAL!",
    "common.matches": "matches",
    // Goal Celebration
    "celebration.exactScore": "EXACT SCORE PREDICTED",
    "celebration.tapToDismiss": "tap anywhere to dismiss",
    "celebration.topScorerScored": "YOUR PLAYER SCORED!",
    "celebration.totalGoals": "TOTAL GOALS",
    // Recap modal
    "recap.title": "Match Recap",
    "recap.subtitle": "{n} matches finished since you were last here",
    "recap.youEarned": "YOU EARNED",
    "recap.youPicked": "Your pick",
    "recap.noPickMade": "You didn't predict this one",
    "recap.gotIt": "Got it! →",
    // Today screen
    "today.title": "Match Day",
    "today.upcoming": "UPCOMING MATCHES",
    "today.subtitle": "All matches happening today and tomorrow",
    "today.today": "TODAY",
    "today.tomorrow": "TOMORROW",
    "today.liveNow": "LIVE / JUST FINISHED",
    "today.noMatchesToday": "No matches today",
    "today.noMatchesTomorrow": "No matches tomorrow",
    "today.matchNoPick": "match needs your prediction",
    "today.matchesNoPick": "matches need your prediction",
    "today.dontMissOut": "Lock them in before they kick off!",
    "today.openBracket": "Open in Bracket →",
    // Onboarding
    "onboarding.skip": "SKIP",
    "onboarding.next": "Next →",
    "onboarding.back": "← Back",
    "onboarding.letsGo": "Let's go! 🚀",
    "onboarding.slide1Title": "Predict every match",
    "onboarding.slide2Title": "Big bets",
    "onboarding.slide3Title": "Leagues & friends",
    "onboarding.exact": "Exact score",
    "onboarding.winner": "Correct winner",
    "onboarding.wrong": "Wrong",
    "onboarding.koDouble": "Double points in the knockout stage (+10 / +6)",
    "onboarding.lockHour": "Each match locks 1 hour before kickoff",
    "onboarding.champion": "TOURNAMENT CHAMPION",
    "onboarding.topScorer": "TOP SCORER",
    "onboarding.goal": "goal",
    "onboarding.lockAtKickoff": "Both lock when the first match kicks off",
    "onboarding.findInBonus": "Find them in the ⭐ Bonus tab",
    "onboarding.step1": "Create a league",
    "onboarding.step2": "Share the code with friends",
    "onboarding.step3": "Watch who nails the predictions",
    "onboarding.whatsappTip": "One-tap WhatsApp share to invite friends",
    "onboarding.worldTip": "There's a worldwide leaderboard too!",
    // Toast notifications
    "toast.codeCopied": "League code copied! 📋",
    "toast.refreshing": "Refreshing results...",
    "toast.leagueCreated": "League created! 🎉",
    "toast.leagueJoined": "You're in! Welcome to the league 🏆",
    // League insights (% pick distribution after kickoff)
    "insights.yourLeague": "YOUR LEAGUE PICKED",
    "insights.pick": "pick",
    "insights.picks": "picks",
    "insights.draw": "🤝",
    // Multi-league
    "leagues.myLeagues": "My Leagues",
    "leagues.activeLeague": "active league",
    "leagues.activeLeagues": "active leagues",
    "leagues.maxOf": "max of",
    "leagues.yourRank": "YOUR RANK",
    "leagues.leader": "Leader",
    "leagues.noActivity": "No activity yet",
    "leagues.open": "Open",
    "leagues.addNew": "Create / Join another league",
    "leagues.maxReached": "You've reached the max number of leagues",
    "leagues.alreadyJoined": "You're already in this league",
    "leagues.allLeagues": "All my leagues",
    // Leave league confirmation
    "leagueConfirm.title": "Leave this league?",
    "leagueConfirm.message": "You'll lose access to \"{name}\" and stop seeing its standings. You can always rejoin with the league code later.",
    "leagueConfirm.confirm": "Yes, leave league",
    "leagueConfirm.cancel": "Stay",
    "league.editName": "Edit league name",
    "league.renameTitle": "Rename League",
    "league.renameSubtitle": "Choose a new name for your league. All members will see it.",
    "league.renameConfirm": "Save",
    "league.nameRequired": "Please enter a name",
    "league.nameTooLong": "Name is too long (max 40 chars)",
    "toast.leagueRenamed": "League renamed! 🎉",
    "league.hiddenPick": "PICK HIDDEN",
    "league.hiddenUntilKickoff": "Revealed when the match starts",
    "league.bracketHidden": "Bracket hidden until kickoff",
    "league.standingsHidden": "Standings hidden until kickoff",
    "league.shareWhatsapp": "Share via WhatsApp",
    "league.inviteFriends": "INVITE FRIENDS",
    "league.shareMessage": "Hey! 🏆⚽ I started a 2026 World Cup prediction league called \"{name}\".\n\nJoin with this code: {code}\n\n{url}",
    "league.copyTooltip": "Copy code",
    "toast.invitationCopied": "Invitation copied to clipboard! 📋",
    // Worldwide leaderboard
    "world.openButton": "World Leaderboard",
    "world.title": "World Leaderboard",
    "world.subtitle": "Where do you stand globally?",
    "world.back": "Back",
    "world.loading": "Loading the world...",
    "world.tryAgain": "Try again",
    "world.yourRank": "YOUR RANK",
    "world.outOf": "of",
    "world.topPercent": "Top {p}% worldwide",
    "world.topTen": "TOP 10 GLOBALLY",
    "world.notRankedYet": "You're not ranked yet — start predicting to appear on the world board!",
    "world.noPlayersYet": "No players yet. Be the first!",
    "world.updatedEvery": "Updates every 5 minutes",
    // Sidebar (hamburger menu)
    "sidebar.myStats": "My Stats",
    "sidebar.achievements": "Achievements",
    "sidebar.tutorial": "How to Play",
    "sidebar.scoringRules": "Scoring Rules",
    "sidebar.backup": "Backup My Progress",
    "sidebar.language": "LANGUAGE",
    "sidebar.logOut": "Log Out",
    "sidebar.deleteAll": "Delete Everything",
    "sidebar.footer": "World Cup 2026 Predictions",
    // Countdown to kickoff
    "countdown.title": "WORLD CUP STARTS IN",
    "countdown.days": "DAYS",
    "countdown.hours": "HRS",
    "countdown.minutes": "MIN",
    "countdown.seconds": "SEC",
    // Achievements
    "achv.title": "Achievements",
    "achv.subtitle": "Unlock badges as you predict",
    "achv.unlocked": "Unlocked",
    "achv.locked": "Locked",
    "achv.newBadge": "🎉 New Badge!",
    "achv.first_exact.name": "First Bullseye",
    "achv.first_exact.desc": "Predict your first exact score",
    "achv.sniper.name": "Sniper",
    "achv.sniper.desc": "3 exact predictions in a row",
    "achv.on_fire.name": "On Fire",
    "achv.on_fire.desc": "5 exact predictions in a row",
    "achv.legend.name": "Legend",
    "achv.legend.desc": "10 exact predictions in the tournament",
    "achv.solid.name": "Solid",
    "achv.solid.desc": "20 correct winners",
    "achv.long_shot.name": "Long Shot",
    "achv.long_shot.desc": "Predict a high-scoring match exactly (4+ goals)",
    "achv.oracle.name": "Oracle",
    "achv.oracle.desc": "Predict the tournament champion",
    "achv.scorer_king.name": "Golden Boot",
    "achv.scorer_king.desc": "Predict the top scorer",
    "achv.half_way.name": "Halfway There",
    "achv.half_way.desc": "Predict half the group matches",
    "achv.committed.name": "Committed",
    "achv.committed.desc": "Predict every group-stage match",
    "achv.bracket_filled.name": "Bracket Master",
    "achv.bracket_filled.desc": "Fill out the round of 16",
    "achv.full_bracket.name": "Full Bracket",
    "achv.full_bracket.desc": "Pick all the way to the final",
    "achv.first_blood.name": "First Points",
    "achv.first_blood.desc": "Score your first points",
    "achv.ten_points.name": "On the Board",
    "achv.ten_points.desc": "Earn 10 points",
    "achv.fifty_points.name": "Climbing",
    "achv.fifty_points.desc": "Earn 50 points",
    "achv.centurion.name": "Centurion",
    "achv.centurion.desc": "Earn 100 points",
    "achv.double_century.name": "Elite",
    "achv.double_century.desc": "Earn 200 points",
    "achv.organizer.name": "Organizer",
    "achv.organizer.desc": "Create or join a league",
    "achv.connector.name": "Connector",
    "achv.connector.desc": "Join 3 leagues",
    "achv.global.name": "Worldwide",
    "achv.global.desc": "Appear on the world leaderboard",
    "achv.all_in.name": "All In",
    "achv.all_in.desc": "Place both bonus bets (champion + top scorer)",
    "achv.first_place.name": "Champion",
    "achv.first_place.desc": "Reach #1 in any league",
    "achv.perfectionist.name": "Perfectionist",
    "achv.perfectionist.desc": "15 exact predictions in the tournament",
    "achv.diamond.name": "Diamond",
    "achv.diamond.desc": "25 exact predictions in the tournament",
    "achv.jackpot.name": "Jackpot",
    "achv.jackpot.desc": "Predict exact score with 3+ goal difference (e.g. 4-1)",
    "achv.drama.name": "Drama King",
    "achv.drama.desc": "Predict an exact score with 6+ total goals",
    "achv.goalfest.name": "Goalfest",
    "achv.goalfest.desc": "Predict an exact score with 7+ total goals",
    "achv.goalkeeper.name": "Goalkeeper",
    "achv.goalkeeper.desc": "Predict 3 matches as 0-0 correctly",
    "achv.bold.name": "Bold",
    "achv.bold.desc": "Predict a 4+ goal margin win — and your winner was right",
    "achv.ko_sniper.name": "Knockout Sniper",
    "achv.ko_sniper.desc": "3 exact predictions in the knockout stage",
    "achv.bracket_genius.name": "Bracket Genius",
    "achv.bracket_genius.desc": "5 exact predictions in the knockout stage",
    "achv.final_predictor.name": "Final Oracle",
    "achv.final_predictor.desc": "Predict the exact score of the World Cup Final",
    "achv.strong.name": "Strong",
    "achv.strong.desc": "Earn 75 points",
    "achv.star.name": "Star",
    "achv.star.desc": "Earn 150 points",
    "achv.king.name": "King",
    "achv.king.desc": "Earn 300 points",
    "achv.night_owl.name": "Night Owl",
    "achv.night_owl.desc": "Made a pick after 1:00 AM",
    "achv.early_bird.name": "Early Bird",
    "achv.early_bird.desc": "Made a pick before 7:00 AM",
    "achv.last_place.name": "Rock Bottom",
    "achv.last_place.desc": "Finish last in a league (3+ players)",
    "achv.hall_of_fame.name": "Hall of Fame",
    "achv.hall_of_fame.desc": "Reach #1 in the world leaderboard",
    "achv.lucky_7.name": "Lucky 7",
    "achv.lucky_7.desc": "Have exactly 7 exact predictions",
    "achv.clown.name": "The Clown",
    "achv.clown.desc": "5 wrong predictions in a row 🤡",
    // Profile / Stats
    "profile.yourStats": "YOUR STATS",
    "profile.totalPoints": "TOTAL POINTS",
    "profile.fromMatches": "matches scored",
    "profile.accuracy": "ACCURACY",
    "profile.anyHit": "Any correct pick",
    "profile.exactHits": "Exact-score hits",
    "profile.exactPicks": "EXACT",
    "profile.goalDiff": "GOAL DIFF",
    "profile.rightWinner": "WINNER",
    "profile.wrongPicks": "WRONG",
    "profile.predictions": "PREDICTIONS",
    "profile.groupMatches": "Group matches",
    "profile.knockoutPicks": "Knockout picks",
    "profile.championBet": "Champion bet",
    "profile.topScorerBet": "Top scorer bet",
    "profile.funFacts": "FUN FACTS",
    "profile.goalsPredicted": "Total goals predicted",
    "profile.boldestPrediction": "Wildest prediction",
    "profile.close": "Close",
    "profile.menuItem": "📊 My stats",
    // Scoring rules modal
    "rules.groupStage": "GROUP STAGE",
    "rules.knockoutDouble": "KNOCKOUT — DOUBLE POINTS",
    "rules.advancement": "BRACKET ADVANCEMENT BONUSES",
    "rules.r16Team": "Team in Round of 16",
    "rules.qfTeam": "Team in Quarter-final",
    "rules.sfTeam": "Team in Semi-final",
    "rules.finalistTeam": "Team in Final",
    "rules.champion": "Pick the champion",
    "rules.bonusBets": "BIG BETS",
    "rules.tournamentWinner": "Tournament Winner (correct)",
    "rules.topScorerGoal": "Top Scorer — per goal",
    "rules.tooltip": "Scoring rules",
  },
  he: {
    // Nav
    "nav.predict": "⚽ ניחושים",
    "nav.today": "📅 היום",
    "nav.bracket": "🏆 שלב הנוקאאוט",
    "nav.bonus": "⭐ בונוס",
    "nav.league": "🏅 ליגה",
    // Welcome
    "welcome.title": "ניחושי מונדיאל 2026",
    "welcome.subtitle": "נחשו כל משחק, בחרו אלוף, נצחו את חבריכם.",
    "welcome.yourName": "השם שלך",
    "welcome.namePlaceholder": "למשל אלכס",
    "welcome.welcomeGreeting": "👋 ברוך הבא,",
    "welcome.welcomeQuestion": "מוכן לנחש את הטורניר?",
    "welcome.enterName": "הזן את שמך",
    "welcome.letsGo": "קדימה,",
    "welcome.letsPredict": "בואו ננחש! ←",
    "welcome.or": "━━━━━ או ━━━━━",
    "welcome.importCode": "📥 ייבוא קוד",
    "welcome.pasteCode": "הדבק קוד חבר",
    "welcome.import": "ייבוא ←",
    "welcome.back": "→ חזרה",
    "welcome.invalidCode": "קוד לא תקין",
    // Scoring
    "welcome.scoring": "🎯 ניקוד",
    "welcome.exactScore": "🎯 תוצאה מדויקת",
    "welcome.resultGd": "✓ מנצח נכון (deprecated)",
    "welcome.rightResultOnly": "✅ מנצח נכון",
    "welcome.knockoutDouble": "🔥 נוקאאוט — נקודות כפולות",
    "welcome.r16Qfsf": "שמינית · רבע · חצי",
    "welcome.finalistPick": "🏟️ ניחוש פיינליסט",
    "welcome.championBonus": "👑 בונוס אלוף",
    "welcome.pts": "נק'",
    // Group view
    "group.groupStage": "שלב הבתים",
    "group.typeAuto": "⚡ הקלידו למעבר אוטומטי",
    "group.group": "בית",
    "group.previous": "→ הקודם",
    "group.next": "הבא ←",
    "group.toBracket": "לשלב הנוקאאוט ←",
    // Match card
    "match.matchday": "מ\"מ",
    "match.locked": "🔒 נעול",
    "match.locksSoon": "⏰ ננעל בקרוב",
    "match.finalScore": "תוצאה סופית",
    "match.noPick": "אין ניחוש",
    "match.youPicked": "ניחשת",
    "match.perfectCall": "ניחוש מושלם! 🎯",
    "match.rightMargin": "הפרש נכון ✓",
    "match.rightResult": "מנצח נכון ✅",
    "match.missed": "פספסת בגדול",
    // Standings
    "standings.predicted": "🔮 דירוג חזוי",
    "standings.live": "📡 דירוג בזמן אמת",
    "standings.yours": "שלי",
    "standings.liveBtn": "אמת",
    "standings.team": "קבוצה",
    "standings.pts": "נק'",
    // Bracket
    "bracket.knockoutStage": "שלב הנוקאאוט",
    "bracket.title": "🏆 העץ",
    "bracket.tapToAdvance": "הקלד תוצאות. הקבוצות עולות לפי התוצאות האמיתיות.",
    "bracket.doublePoints": "🔥 נקודות כפולות · עד 40 נק' לבחירה",
    "bracket.r16": "שמינית",
    "bracket.qf": "רבע",
    "bracket.sf": "חצי",
    "bracket.finalist": "פיינליסט",
    "bracket.champion": "אלוף",
    "bracket.final": "גמר",
    "bracket.roundOf32": "שלב 32 הקבוצות",
    "bracket.roundOf16": "שמינית הגמר",
    "bracket.quarterFinals": "רבע הגמר",
    "bracket.semiFinals": "חצי הגמר",
    "bracket.r32": "32",
    "bracket.tbd": "טרם נקבע",
    "bracket.yourChampion": "🏆 האלוף שלך 🏆",
    "bracket.bracketLoading": "העץ נטען...",
    "bracket.predictFirst": "נחש כמה משחקים קודם כדי לראות את העץ מתעצב.",
    "bracket.backToGroups": "→ חזרה לבתים",
    "bracket.bracketPreview": "תצוגה מקדימה של העץ.",
    "bracket.r32Confirmed": "צמדי שלב 32 שנקבעו מהבתים. השלם את כל 72 משחקי הבתים כדי לנעול את העץ המלא — משבצות טרם נקבעו ימולאו תוך כדי.",
    // Bonus
    "bonus.title": "⭐ הימורים גדולים",
    "bonus.subtitle": "שני ניחושים גדולים לנקודות בונוס משמעותיות.",
    "bonus.locked": "🔒 ניחושי הבונוס נעולים — הטורניר התחיל.",
    "bonus.tournamentWinner": "🏆 אלוף הטורניר",
    "bonus.pickOneTeam": "בחר קבוצה אחת שתרים את הגביע",
    "bonus.fiftyPts": "+20 נק'",
    "bonus.change": "שינוי",
    "bonus.goldenBoot": "👟 הנעל הזהובה",
    "bonus.pickPlayer": "בחר שחקן — כל שער שלו = נקודות",
    "bonus.fivePerGoal": "+2 לכל שער",
    "bonus.fromFavorites": "מהמועדפים",
    "bonus.enterManually": "הזנה ידנית",
    "bonus.searchPlaceholder": "חיפוש שחקנים או קבוצות...",
    "bonus.noMatches": "אין התאמות — נסה \"הזנה ידנית\"",
    "bonus.playerName": "שם השחקן",
    "bonus.team": "קבוצה",
    "bonus.lockIn": "נעל ניחוש",
    "bonus.bonusPicks": "ניחושי בונוס",
    "bonus.noPickMade": "לא נעשה ניחוש.",
    "bonus.topScorersLive": "מלכי השערים · חי",
    "bonus.updated": "עודכן לפני",
    "bonus.minAgo": "דקות",
    "bonus.loadingScorers": "טוען...",
    "bonus.noScorersYet": "עדיין לא נרשמו שערים — הטורניר טרם החל!",
    "bonus.yourPick": "הניחוש שלך",
    "bonus.notScoredYet": "טרם בקיע",
    "bonus.goals": "שערים",
    // League
    "league.playWithFriends": "שחק עם חברים",
    "league.intro": "צור ליגה או הצטרף לאחת. הניחושים של כולם מסתנכרנים בזמן אמת, ותוצאות אמיתיות מתעדכנות אוטומטית.",
    "league.createLeague": "צור ליגה",
    "league.createPlaceholder": "למשל החבר'ה של מייק",
    "league.creating": "יוצר...",
    "league.createBtn": "✨ צור ליגה",
    "league.joinLeague": "הצטרף לליגה",
    "league.joinPlaceholder": "למשל GOLDEN-TIGER-123",
    "league.joining": "מצטרף...",
    "league.joinBtn": "🤝 הצטרף לליגה",
    "league.joinHint": "קיבלת קוד מחבר? הדבק אותו כאן.",
    "league.orCreate": "או",
    "league.previewHit": "מי שיניחש הכי הרבה תוצאות מדויקות יוצג כאן כשמשחקים יתחילו",
    "league.previewMiss": "מי שיפספס הכי הרבה יוצג כאן כשמשחקים יתחילו",
    "league.nameRequired": "תן שם לליגה",
    "league.codeRequired": "הזן קוד ליגה",
    "league.couldntCreate": "לא ניתן ליצור ליגה. בדוק את הגדרות Firebase.",
    "league.couldntJoin": "לא ניתן להצטרף. בדוק את הקוד.",
    "league.yourLeague": "הליגה שלך",
    "league.liveSync": "סנכרון חי",
    "league.member": "חבר",
    "league.members": "חברים",
    "league.code": "קוד",
    "league.shareCode": "שתף את הקוד הזה כדי שחברים יוכלו להצטרף.",
    "league.liveResults": "תוצאות חיות (אוטומטי)",
    "league.refresh": "רענון",
    "league.never": "לא נטען",
    "league.updatedAgo": "עודכן",
    "league.standings": "🏅 דירוג",
    "league.pointsFillIn": "💡 הנקודות יתעדכנו כשיגיעו תוצאות אמיתיות. הקש",
    "league.pointsFillInRest": "למעלה כדי לטעון, או חכה — מתעדכן אוטומטית כל 5 דקות.",
    "league.noMembers": "אין עדיין חברים. שתף את קוד הליגה כדי שחברים יצטרפו.",
    "league.you": " (אתה)",
    "league.predicted": "נוחשו",
    "league.exact": "מדויק",
    "league.leaveLeague": "עזוב את הליגה",
    "league.connectionError": "שגיאת חיבור לליגה",
    "league.backToMenu": "→ חזרה לתפריט הליגה",
    "league.connecting": "מתחבר לליגה...",
    "league.hitsMisses": "🎯 פגיעות והחמצות",
    "league.topHit": "פגיעה מובילה",
    "league.topMiss": "החמצה מובילה",
    "league.exactScoreOne": "תוצאה מדויקת",
    "league.exactScoresMany": "תוצאות מדויקות",
    "league.nailedIt": "פגע! 🎯",
    "league.wrongPickOne": "ניחוש שגוי",
    "league.wrongPicksMany": "ניחושים שגויים",
    "league.oof": "אאוץ' 💀",
    "league.noExactYet": "אין עדיין ניחושים מדויקים",
    "league.noMissesYet": "אין עדיין החמצות!",
    // Drill-in
    "drill.backToLeague": "→ חזרה לליגה",
    "drill.predictedChampion": "🏆 אלוף חזוי",
    "drill.matchesTab": "⚽ משחקים",
    "drill.standingsTab": "📊 דירוג",
    "drill.bracketTab": "🏆 עץ",
    "drill.matchday": "━ מחזור",
    "drill.bracketNotBuilt": "טרם סיים את שלב הבתים, אז העץ לא נבנה.",
    "drill.youHaventBracket": "עוד לא",
    "drill.theyHaventBracket": "הוא עוד לא",
    "drill.actual": "תוצאה:",
    // Misc
    "common.cancel": "ביטול",
    "common.confirm": "אישור",
    "common.skip": "דלג ›",
    "common.goal": "גול!",
    "common.matches": "משחקים",
    // Goal Celebration
    "celebration.exactScore": "ניחוש מדויק!",
    "celebration.tapToDismiss": "הקש לסגירה",
    "celebration.topScorerScored": "השחקן שלך הבקיע!",
    "celebration.totalGoals": "סך הגולים",
    // Recap modal
    "recap.title": "סיכום משחקים",
    "recap.subtitle": "{n} משחקים נגמרו מאז ביקרת",
    "recap.youEarned": "צברת",
    "recap.youPicked": "הניחוש שלך",
    "recap.noPickMade": "לא ניחשת את המשחק הזה",
    "recap.gotIt": "הבנתי! →",
    // Today screen
    "today.title": "המשחקים של היום",
    "today.upcoming": "משחקים קרובים",
    "today.subtitle": "כל המשחקים של היום ומחר",
    "today.today": "היום",
    "today.tomorrow": "מחר",
    "today.liveNow": "חי / זה עתה הסתיים",
    "today.noMatchesToday": "אין משחקים היום",
    "today.noMatchesTomorrow": "אין משחקים מחר",
    "today.matchNoPick": "משחק מחכה לניחוש שלך",
    "today.matchesNoPick": "משחקים מחכים לניחוש שלך",
    "today.dontMissOut": "אל תפספס — נעל אותם לפני שריקת הפתיחה!",
    "today.openBracket": "פתח בברקט →",
    // Onboarding
    "onboarding.skip": "דלג",
    "onboarding.next": "הבא →",
    "onboarding.back": "→ חזור",
    "onboarding.letsGo": "יאללה! 🚀",
    "onboarding.slide1Title": "נחש כל משחק",
    "onboarding.slide2Title": "הימורים גדולים",
    "onboarding.slide3Title": "ליגות וחברים",
    "onboarding.exact": "תוצאה מדויקת",
    "onboarding.winner": "מנצח נכון",
    "onboarding.wrong": "פספסת",
    "onboarding.koDouble": "בנוקאאוט הנקודות כפולות (+10 / +6)",
    "onboarding.lockHour": "כל משחק ננעל שעה לפני שריקת הפתיחה",
    "onboarding.champion": "אלוף הטורניר",
    "onboarding.topScorer": "מלך השערים",
    "onboarding.goal": "שער",
    "onboarding.lockAtKickoff": "שניהם ננעלים בשריקת הפתיחה הראשונה",
    "onboarding.findInBonus": "תמצא אותם בטאב ⭐ בונוס",
    "onboarding.step1": "צור ליגה",
    "onboarding.step2": "שתף את הקוד עם חברים",
    "onboarding.step3": "תראה מי קולע הכי טוב",
    "onboarding.whatsappTip": "כפתור שיתוף ישיר בוואטסאפ",
    "onboarding.worldTip": "יש גם דירוג עולמי לכל המשתמשים!",
    // Toast notifications
    "toast.codeCopied": "קוד הליגה הועתק! 📋",
    "toast.refreshing": "מרענן תוצאות...",
    "toast.leagueCreated": "הליגה נוצרה! 🎉",
    "toast.leagueJoined": "הצטרפת! ברוך הבא לליגה 🏆",
    // League insights (% pick distribution after kickoff)
    "insights.yourLeague": "הליגה שלך ניחשה",
    "insights.pick": "ניחוש",
    "insights.picks": "ניחושים",
    "insights.draw": "🤝",
    // Multi-league
    "leagues.myLeagues": "הליגות שלי",
    "leagues.activeLeague": "ליגה פעילה",
    "leagues.activeLeagues": "ליגות פעילות",
    "leagues.maxOf": "מקסימום",
    "leagues.yourRank": "המיקום שלך",
    "leagues.leader": "מוביל",
    "leagues.noActivity": "אין פעילות עדיין",
    "leagues.open": "פתח",
    "leagues.addNew": "צור / הצטרף לליגה נוספת",
    "leagues.maxReached": "הגעת למקסימום הליגות",
    "leagues.alreadyJoined": "אתה כבר בליגה הזו",
    "leagues.allLeagues": "כל הליגות שלי",
    // Leave league confirmation
    "leagueConfirm.title": "לעזוב את הליגה?",
    "leagueConfirm.message": "תאבד גישה ל\"{name}\" ולא תראה יותר את הדירוג שלה. תמיד אפשר להצטרף שוב עם קוד הליגה בעתיד.",
    "leagueConfirm.confirm": "כן, עזוב את הליגה",
    "leagueConfirm.cancel": "תישאר",
    "league.editName": "ערוך שם ליגה",
    "league.renameTitle": "שינוי שם הליגה",
    "league.renameSubtitle": "בחר שם חדש לליגה שלך. כל החברים יראו אותו.",
    "league.renameConfirm": "שמור",
    "league.nameRequired": "אנא הזן שם",
    "league.nameTooLong": "השם ארוך מדי (עד 40 תווים)",
    "toast.leagueRenamed": "שם הליגה שונה! 🎉",
    "league.hiddenPick": "ניחוש מוסתר",
    "league.hiddenUntilKickoff": "ייחשף כשהמשחק יתחיל",
    "league.bracketHidden": "הברקט מוסתר עד תחילת המונדיאל",
    "league.standingsHidden": "הטבלאות מוסתרות עד תחילת המונדיאל",
    "league.shareWhatsapp": "שלח בוואטסאפ",
    "league.inviteFriends": "הזמן חברים",
    "league.shareMessage": "היי! 🏆⚽ פתחתי ליגת ניחושים למונדיאל 2026 בשם \"{name}\".\n\nהצטרפו עם הקוד הזה: {code}\n\n{url}",
    "league.copyTooltip": "העתק קוד",
    "toast.invitationCopied": "ההזמנה הועתקה ללוח! 📋",
    // Worldwide leaderboard
    "world.openButton": "דירוג עולמי",
    "world.title": "דירוג עולמי",
    "world.subtitle": "איפה אתה ביחס לעולם?",
    "world.back": "חזור",
    "world.loading": "טוען את העולם...",
    "world.tryAgain": "נסה שוב",
    "world.yourRank": "המיקום שלך",
    "world.outOf": "מתוך",
    "world.topPercent": "ב-{p}% העליונים בעולם",
    "world.topTen": "טופ 10 עולמי",
    "world.notRankedYet": "אתה עדיין לא בדירוג — תתחיל לנחש כדי להופיע בלוח העולמי!",
    "world.noPlayersYet": "אין שחקנים עדיין. תהיה הראשון!",
    "world.updatedEvery": "מתעדכן כל 5 דקות",
    // Sidebar (hamburger menu)
    "sidebar.myStats": "הסטטיסטיקה שלי",
    "sidebar.achievements": "הישגים",
    "sidebar.tutorial": "איך משחקים?",
    "sidebar.scoringRules": "כללי הניקוד",
    "sidebar.backup": "גיבוי הנתונים",
    "sidebar.language": "שפה",
    "sidebar.logOut": "התנתק",
    "sidebar.deleteAll": "מחק הכל",
    "sidebar.footer": "ניחושי מונדיאל 2026",
    // Countdown to kickoff
    "countdown.title": "המונדיאל מתחיל בעוד",
    "countdown.days": "ימים",
    "countdown.hours": "שעות",
    "countdown.minutes": "דק'",
    "countdown.seconds": "שנ'",
    // Achievements
    "achv.title": "הישגים",
    "achv.subtitle": "פתח באדג'ים תוך כדי הניחושים",
    "achv.unlocked": "פתוח",
    "achv.locked": "נעול",
    "achv.newBadge": "🎉 הישג חדש!",
    "achv.first_exact.name": "פגיעה ראשונה",
    "achv.first_exact.desc": "נחש את התוצאה המדויקת הראשונה שלך",
    "achv.sniper.name": "צלף",
    "achv.sniper.desc": "3 ניחושים מדויקים ברצף",
    "achv.on_fire.name": "באש",
    "achv.on_fire.desc": "5 ניחושים מדויקים ברצף",
    "achv.legend.name": "אגדה",
    "achv.legend.desc": "10 ניחושים מדויקים בכל הטורניר",
    "achv.solid.name": "יציב",
    "achv.solid.desc": "20 ניחושי מנצח נכונים",
    "achv.long_shot.name": "ירייה רחוקה",
    "achv.long_shot.desc": "ניחוש מדויק של משחק עתיר שערים (4+)",
    "achv.oracle.name": "אורקל",
    "achv.oracle.desc": "ניחשת את אלוף הטורניר",
    "achv.scorer_king.name": "מלך השערים",
    "achv.scorer_king.desc": "ניחשת את מלך השערים",
    "achv.half_way.name": "חצי הדרך",
    "achv.half_way.desc": "נחש את חצי ממשחקי שלב הבתים",
    "achv.committed.name": "מחויב",
    "achv.committed.desc": "נחש את כל משחקי שלב הבתים",
    "achv.bracket_filled.name": "מאסטר ברקט",
    "achv.bracket_filled.desc": "מלא את כל שלב 16",
    "achv.full_bracket.name": "ברקט מלא",
    "achv.full_bracket.desc": "ניחשת עד הגמר",
    "achv.first_blood.name": "נקודות ראשונות",
    "achv.first_blood.desc": "צבור את הנקודות הראשונות שלך",
    "achv.ten_points.name": "על הלוח",
    "achv.ten_points.desc": "צבור 10 נקודות",
    "achv.fifty_points.name": "מטפס",
    "achv.fifty_points.desc": "צבור 50 נקודות",
    "achv.centurion.name": "סנטוריון",
    "achv.centurion.desc": "צבור 100 נקודות",
    "achv.double_century.name": "אליטה",
    "achv.double_century.desc": "צבור 200 נקודות",
    "achv.organizer.name": "מארגן",
    "achv.organizer.desc": "צור או הצטרף לליגה",
    "achv.connector.name": "מקשר",
    "achv.connector.desc": "הצטרף ל-3 ליגות",
    "achv.global.name": "עולמי",
    "achv.global.desc": "הופע בדירוג העולמי",
    "achv.all_in.name": "הכל על הקופה",
    "achv.all_in.desc": "הנח את שני הימורי הבונוס (אלוף + מלך השערים)",
    "achv.first_place.name": "אלוף",
    "achv.first_place.desc": "הגע למקום ראשון בכל ליגה",
    "achv.perfectionist.name": "פרפקציוניסט",
    "achv.perfectionist.desc": "15 ניחושים מדויקים בכל הטורניר",
    "achv.diamond.name": "יהלום",
    "achv.diamond.desc": "25 ניחושים מדויקים בכל הטורניר",
    "achv.jackpot.name": "ג'קפוט",
    "achv.jackpot.desc": "נחש תוצאה מדויקת עם הפרש 3+ שערים (למשל 4-1)",
    "achv.drama.name": "מלך הדרמה",
    "achv.drama.desc": "נחש תוצאה מדויקת עם 6+ שערים בסה\"כ",
    "achv.goalfest.name": "חגיגת שערים",
    "achv.goalfest.desc": "נחש תוצאה מדויקת עם 7+ שערים בסה\"כ",
    "achv.goalkeeper.name": "שוער",
    "achv.goalkeeper.desc": "נחש 3 משחקי 0-0 נכון",
    "achv.bold.name": "אמיץ",
    "achv.bold.desc": "ניחשת ניצחון בהפרש 4+ שערים — והמנצח היה נכון",
    "achv.ko_sniper.name": "צלף נוקאאוט",
    "achv.ko_sniper.desc": "3 ניחושים מדויקים בשלב הנוקאאוט",
    "achv.bracket_genius.name": "גאון הברקט",
    "achv.bracket_genius.desc": "5 ניחושים מדויקים בשלב הנוקאאוט",
    "achv.final_predictor.name": "אורקל הגמר",
    "achv.final_predictor.desc": "נחש את התוצאה המדויקת של גמר המונדיאל",
    "achv.strong.name": "חזק",
    "achv.strong.desc": "צבור 75 נקודות",
    "achv.star.name": "כוכב",
    "achv.star.desc": "צבור 150 נקודות",
    "achv.king.name": "מלך",
    "achv.king.desc": "צבור 300 נקודות",
    "achv.night_owl.name": "ינשוף לילה",
    "achv.night_owl.desc": "ניחשת אחרי 1:00 בלילה",
    "achv.early_bird.name": "ציפור השחר",
    "achv.early_bird.desc": "ניחשת לפני 7:00 בבוקר",
    "achv.last_place.name": "תחתית",
    "achv.last_place.desc": "סיים במקום אחרון בליגה (3+ שחקנים)",
    "achv.hall_of_fame.name": "אגדה",
    "achv.hall_of_fame.desc": "הגע למקום #1 בדירוג העולמי",
    "achv.lucky_7.name": "מספר 7 ברכה",
    "achv.lucky_7.desc": "ניחשת בדיוק 7 ניחושים מדויקים",
    "achv.clown.name": "הליצן",
    "achv.clown.desc": "5 פספוסים ברצף 🤡",
    // Profile / Stats
    "profile.yourStats": "הסטטיסטיקה שלך",
    "profile.totalPoints": "סך הנקודות",
    "profile.fromMatches": "משחקים זכו בנקודות",
    "profile.accuracy": "דיוק",
    "profile.anyHit": "ניחוש נכון כלשהו",
    "profile.exactHits": "ניחוש מדויק",
    "profile.exactPicks": "מדויקים",
    "profile.goalDiff": "הפרש שערים",
    "profile.rightWinner": "מנצח נכון",
    "profile.wrongPicks": "פספוסים",
    "profile.predictions": "ניחושים",
    "profile.groupMatches": "משחקי בתים",
    "profile.knockoutPicks": "ניחושי נוקאאוט",
    "profile.championBet": "אלוף שהמרת עליו",
    "profile.topScorerBet": "מלך השערים שלך",
    "profile.funFacts": "עובדות מעניינות",
    "profile.goalsPredicted": "סך השערים שניחשת",
    "profile.boldestPrediction": "הניחוש הכי פרוע",
    "profile.close": "סגור",
    "profile.menuItem": "📊 הסטטיסטיקה שלי",
    // Scoring rules modal
    "rules.groupStage": "שלב הבתים",
    "rules.knockoutDouble": "נוקאאוט — נקודות כפול",
    "rules.advancement": "בונוסים על העברת קבוצות",
    "rules.r16Team": "קבוצה ב-1/8 הגמר",
    "rules.qfTeam": "קבוצה ברבע גמר",
    "rules.sfTeam": "קבוצה בחצי גמר",
    "rules.finalistTeam": "קבוצה בגמר",
    "rules.champion": "ניחוש אלוף הגביע",
    "rules.bonusBets": "הימורים גדולים",
    "rules.tournamentWinner": "אלוף הטורניר (נכון)",
    "rules.topScorerGoal": "מלך השערים — לכל שער",
    "rules.tooltip": "כללי הניקוד",
  },
};

const LangContext = createContext({ lang: "en", setLang: () => {} });
function useT() {
  const { lang } = useContext(LangContext);
  return (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}
function useLang() { return useContext(LangContext); }

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

// FIFA World Rankings — official, 1 April 2026 update
// Next official update is 11 June 2026 (after the World Cup starts)
const FIFA_RANK = {
  // Top 20 (verified from FIFA.com / Wikipedia / ESPN)
  "France": 1, "Spain": 2, "Argentina": 3, "England": 4, "Portugal": 5,
  "Brazil": 6, "Netherlands": 7, "Morocco": 8, "Belgium": 9, "Germany": 10,
  "Croatia": 11, "Italy": 12, "Colombia": 13, "Senegal": 14, "Mexico": 15,
  "USA": 16, "Uruguay": 17, "Japan": 18, "Switzerland": 19, "Denmark": 20,
  // 21-50 (from ESPN late-Dec 2025 list; minor shifts possible but close)
  "South Korea": 22, "Ecuador": 23, "Austria": 24, "Türkiye": 25,
  "Australia": 26, "Canada": 27, "Norway": 29,
  "Panama": 30, "Algeria": 34, "Egypt": 35, "Scotland": 36,
  "Paraguay": 39, "Tunisia": 41, "Côte d'Ivoire": 42, "Czechia": 44,
  "Uzbekistan": 50,
  // Honorable mentions (all WC qualifiers below top 50)
  "Qatar": 53, "Saudi Arabia": 60, "South Africa": 61, "Jordan": 64,
  "Iran": 20, "Iraq": 59, "Bosnia": 71, "DR Congo": 65,
  "Cabo Verde": 67, "Ghana": 72, "Curaçao": 82, "Haiti": 84,
  "New Zealand": 87,
};
const fifaRank = (teamName) => FIFA_RANK[teamName] || null;

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

// ─── KNOCKOUT SCHEDULE: kickoff and venue for each bracket slot ──────────────
// All times in UTC. June/July 2026 ET = UTC-4 (EDT).
// Source: FIFA official fixture list.
const KO_SCHEDULE = {
  // Round of 32 (16 matches, Jun 28 – Jul 3)
  "R32-1":  { kickoff: _utc(2026,6,28,19, 0), venue: "SoFi Stadium, Los Angeles" },          // Jun 28 3 PM EDT
  "R32-2":  { kickoff: _utc(2026,6,29,17, 0), venue: "Gillette Stadium, Boston" },           // Jun 29 1 PM EDT
  "R32-3":  { kickoff: _utc(2026,6,29,20, 0), venue: "Gillette Stadium, Boston" },           // Jun 29 4 PM EDT
  "R32-4":  { kickoff: _utc(2026,6,30, 1, 0), venue: "Estadio BBVA, Monterrey" },            // Jun 29 9 PM EDT
  "R32-5":  { kickoff: _utc(2026,6,30,17, 0), venue: "AT&T Stadium, Dallas" },               // Jun 30 1 PM EDT
  "R32-6":  { kickoff: _utc(2026,6,30,21, 0), venue: "MetLife Stadium, East Rutherford" },   // Jun 30 5 PM EDT
  "R32-7":  { kickoff: _utc(2026,7, 1, 1, 0), venue: "Estadio Azteca, Mexico City" },        // Jun 30 9 PM EDT
  "R32-8":  { kickoff: _utc(2026,7, 1,16, 0), venue: "Mercedes-Benz Stadium, Atlanta" },     // Jul 1 12 PM EDT
  "R32-9":  { kickoff: _utc(2026,7, 1,20, 0), venue: "Lumen Field, Seattle" },               // Jul 1 4 PM EDT
  "R32-10": { kickoff: _utc(2026,7, 2, 0, 0), venue: "Levi's Stadium, Santa Clara" },        // Jul 1 8 PM EDT
  "R32-11": { kickoff: _utc(2026,7, 2,19, 0), venue: "SoFi Stadium, Los Angeles" },          // Jul 2 3 PM EDT
  "R32-12": { kickoff: _utc(2026,7, 2,23, 0), venue: "BMO Field, Toronto" },                 // Jul 2 7 PM EDT
  "R32-13": { kickoff: _utc(2026,7, 3, 1, 0), venue: "BC Place, Vancouver" },                // Jul 2 9 PM EDT
  "R32-14": { kickoff: _utc(2026,7, 3,18, 0), venue: "AT&T Stadium, Dallas" },               // Jul 3 2 PM EDT
  "R32-15": { kickoff: _utc(2026,7, 3,22, 0), venue: "Hard Rock Stadium, Miami Gardens" },   // Jul 3 6 PM EDT
  "R32-16": { kickoff: _utc(2026,7, 4, 1,30), venue: "Arrowhead Stadium, Kansas City" },     // Jul 3 9:30 PM EDT

  // Round of 16 (8 matches, Jul 4–7)
  "R16-0": { kickoff: _utc(2026,7, 4,17, 0), venue: "NRG Stadium, Houston" },                // Jul 4 1 PM EDT
  "R16-1": { kickoff: _utc(2026,7, 4,21, 0), venue: "Lincoln Financial Field, Philadelphia" }, // Jul 4 5 PM EDT
  "R16-2": { kickoff: _utc(2026,7, 5,20, 0), venue: "MetLife Stadium, East Rutherford" },    // Jul 5 4 PM EDT
  "R16-3": { kickoff: _utc(2026,7, 6, 0, 0), venue: "Estadio Azteca, Mexico City" },         // Jul 5 8 PM EDT
  "R16-4": { kickoff: _utc(2026,7, 6,16, 0), venue: "Mercedes-Benz Stadium, Atlanta" },      // Jul 6 12 PM EDT
  "R16-5": { kickoff: _utc(2026,7, 6,19, 0), venue: "AT&T Stadium, Dallas" },                // Jul 6 3 PM EDT
  "R16-6": { kickoff: _utc(2026,7, 7, 0, 0), venue: "Lumen Field, Seattle" },                // Jul 6 8 PM EDT
  "R16-7": { kickoff: _utc(2026,7, 7,20, 0), venue: "BC Place, Vancouver" },                 // Jul 7 4 PM EDT

  // Quarter-finals (4 matches, Jul 9–11)
  "QF-0": { kickoff: _utc(2026,7, 9,20, 0), venue: "Gillette Stadium, Boston" },             // Jul 9 4 PM EDT
  "QF-1": { kickoff: _utc(2026,7,10,19, 0), venue: "SoFi Stadium, Los Angeles" },            // Jul 10 3 PM EDT
  "QF-2": { kickoff: _utc(2026,7,11,21, 0), venue: "Hard Rock Stadium, Miami Gardens" },     // Jul 11 5 PM EDT
  "QF-3": { kickoff: _utc(2026,7,12, 1, 0), venue: "Arrowhead Stadium, Kansas City" },       // Jul 11 9 PM EDT

  // Semi-finals (Jul 14 & 15)
  "SF-0": { kickoff: _utc(2026,7,14,19, 0), venue: "AT&T Stadium, Dallas" },                 // Jul 14 3 PM EDT
  "SF-1": { kickoff: _utc(2026,7,15,19, 0), venue: "Mercedes-Benz Stadium, Atlanta" },       // Jul 15 3 PM EDT

  // Final
  "FINAL": { kickoff: _utc(2026,7,19,19, 0), venue: "MetLife Stadium, East Rutherford" },    // Jul 19 3 PM EDT
};

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
  EXACT: 5,         // exact score correct (group stage)
  RESULT: 3,        // correct winner only (group stage)
  WRONG: 0,
  // Knockout: per-match scoring (DOUBLED vs group stage)
  KO_EXACT: 10,     // exact score in a knockout match
  KO_RESULT: 6,     // correct winner only in a knockout match
  // Advancement bonuses — DISABLED (per user request). Per-match scoring is the only way to earn knockout points now.
  R16_PICK: 0,
  QF_PICK: 0,
  SF_PICK: 0,
  FINALIST: 0,
  CHAMPION: 0,
  // Bonus bets (in ⭐ Bonus tab)
  WINNER_BET: 20,   // flat bonus for picking the tournament winner correctly
  TOP_SCORER_GOAL: 2, // each goal scored by your top-scorer pick — celebrated in real-time
};

// ─── ACHIEVEMENTS ────────────────────────────────────────────────────────────
// 20+ badges users can unlock. Each has an id, icon, color, and a `check(ctx)`
// function returning true when the badge is unlocked.
// ctx = { picks, actuals, koWinners, winnerPick, topScorerPick,
//         actualWinner, actualTopScorer, totalPoints, leagueCodes, myRank }

const ACHIEVEMENTS = [
  // Accuracy
  { id: "first_exact", icon: "🎯", color: "#fbbf24",
    check: ({ picks, actuals }) => FIXTURES.some(f => {
      const p = picks[f.id], a = actuals[f.id];
      return p && a && p.h !== "" && p.h !== undefined && p.h === a.h && p.a === a.a;
    }) },
  { id: "sniper", icon: "🎯", color: "#fbbf24",
    check: ({ picks, actuals }) => {
      let streak = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (!a || a.h === "" || a.h === undefined) continue;
        if (p && p.h === a.h && p.a === a.a) { streak++; if (streak >= 3) return true; }
        else streak = 0;
      }
      return false;
    } },
  { id: "on_fire", icon: "🔥", color: "#ef4444",
    check: ({ picks, actuals }) => {
      let streak = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (!a || a.h === "" || a.h === undefined) continue;
        if (p && p.h === a.h && p.a === a.a) { streak++; if (streak >= 5) return true; }
        else streak = 0;
      }
      return false;
    } },
  { id: "legend", icon: "💎", color: "#3b82f6",
    check: ({ picks, actuals }) => {
      let count = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (p && a && p.h !== "" && p.h !== undefined && p.h === a.h && p.a === a.a) count++;
      }
      return count >= 10;
    } },
  { id: "solid", icon: "✅", color: "#22c55e",
    check: ({ picks, actuals }) => {
      let count = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (!p || !a || p.h === "" || p.h === undefined || a.h === "" || a.h === undefined) continue;
        const ph = parseInt(p.h), pa = parseInt(p.a), ah = parseInt(a.h), aa = parseInt(a.a);
        const pw = ph > pa ? "h" : ph < pa ? "a" : "d";
        const aw = ah > aa ? "h" : ah < aa ? "a" : "d";
        if (pw === aw) count++;
      }
      return count >= 20;
    } },

  // Rarity
  { id: "long_shot", icon: "🎰", color: "#a855f7",
    check: ({ picks, actuals }) => FIXTURES.some(f => {
      const p = picks[f.id], a = actuals[f.id];
      if (!p || !a) return false;
      const ph = parseInt(p.h), pa = parseInt(p.a), ah = parseInt(a.h), aa = parseInt(a.a);
      if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return false;
      return ph === ah && pa === aa && (ah + aa) >= 4;
    }) },
  { id: "oracle", icon: "🔮", color: "#a855f7",
    check: ({ winnerPick, actualWinner }) => {
      if (!winnerPick || !actualWinner) return false;
      const w = actualWinner.name || actualWinner.n;
      const p = winnerPick.name || winnerPick.n;
      return w && p && w === p;
    } },
  { id: "scorer_king", icon: "👟", color: "#a855f7",
    check: ({ topScorerPick, actualTopScorer }) => {
      return topScorerPick && actualTopScorer && topScorerPick.name === actualTopScorer.name;
    } },

  // Completion
  { id: "half_way", icon: "📈", color: "#fbbf24",
    check: ({ picks }) => Object.values(picks).filter(p => p?.h !== "" && p?.h !== undefined).length >= Math.floor(FIXTURES.length / 2) },
  { id: "committed", icon: "💪", color: "#22c55e",
    check: ({ picks }) => Object.values(picks).filter(p => p?.h !== "" && p?.h !== undefined).length >= FIXTURES.length },
  { id: "bracket_filled", icon: "🏆", color: "#fbbf24",
    check: ({ koWinners }) => Object.keys(koWinners || {}).filter(k => k.startsWith("R16-")).length >= 8 },
  { id: "full_bracket", icon: "🥇", color: "#fbbf24",
    check: ({ koWinners }) => koWinners && koWinners["FINAL"] !== undefined },

  // Points milestones
  { id: "first_blood", icon: "🩸", color: "#ef4444",
    check: ({ totalPoints }) => totalPoints > 0 },
  { id: "ten_points", icon: "🔟", color: "#22c55e",
    check: ({ totalPoints }) => totalPoints >= 10 },
  { id: "fifty_points", icon: "🚀", color: "#3b82f6",
    check: ({ totalPoints }) => totalPoints >= 50 },
  { id: "centurion", icon: "💯", color: "#fbbf24",
    check: ({ totalPoints }) => totalPoints >= 100 },
  { id: "double_century", icon: "🏅", color: "#a855f7",
    check: ({ totalPoints }) => totalPoints >= 200 },

  // Social / leagues
  { id: "organizer", icon: "👋", color: "#3b82f6",
    check: ({ leagueCodes }) => (leagueCodes?.length || 0) >= 1 },
  { id: "connector", icon: "👥", color: "#3b82f6",
    check: ({ leagueCodes }) => (leagueCodes?.length || 0) >= 3 },
  { id: "global", icon: "🌍", color: "#22c55e",
    check: ({ myRank }) => myRank !== null && myRank !== undefined },

  // Bonus picks
  { id: "all_in", icon: "⭐", color: "#a855f7",
    check: ({ winnerPick, topScorerPick }) => Boolean(winnerPick && topScorerPick) },

  // Champion
  { id: "first_place", icon: "👑", color: "#fbbf24",
    check: ({ myRank }) => myRank === 1 },

  // ─── NEW: Advanced accuracy ──
  { id: "perfectionist", icon: "🏹", color: "#fbbf24",
    check: ({ picks, actuals }) => {
      let count = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (p && a && p.h !== "" && p.h !== undefined && p.h === a.h && p.a === a.a) count++;
      }
      return count >= 15;
    } },
  { id: "diamond", icon: "💎", color: "#3b82f6",
    check: ({ picks, actuals }) => {
      let count = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (p && a && p.h !== "" && p.h !== undefined && p.h === a.h && p.a === a.a) count++;
      }
      return count >= 25;
    } },

  // ─── NEW: Lucky / unique ──
  { id: "jackpot", icon: "🎰", color: "#a855f7",
    check: ({ picks, actuals }) => FIXTURES.some(f => {
      const p = picks[f.id], a = actuals[f.id];
      if (!p || !a) return false;
      const ph = parseInt(p.h), pa = parseInt(p.a), ah = parseInt(a.h), aa = parseInt(a.a);
      if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return false;
      return ph === ah && pa === aa && Math.abs(ah - aa) >= 3;
    }) },
  { id: "drama", icon: "🎭", color: "#ef4444",
    check: ({ picks, actuals }) => FIXTURES.some(f => {
      const p = picks[f.id], a = actuals[f.id];
      if (!p || !a) return false;
      const ph = parseInt(p.h), pa = parseInt(p.a), ah = parseInt(a.h), aa = parseInt(a.a);
      if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return false;
      return ph === ah && pa === aa && (ah + aa) >= 6;
    }) },
  { id: "goalfest", icon: "⚽", color: "#a855f7",
    check: ({ picks, actuals }) => FIXTURES.some(f => {
      const p = picks[f.id], a = actuals[f.id];
      if (!p || !a) return false;
      const ph = parseInt(p.h), pa = parseInt(p.a), ah = parseInt(a.h), aa = parseInt(a.a);
      if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return false;
      return ph === ah && pa === aa && (ah + aa) >= 7;
    }) },
  { id: "goalkeeper", icon: "🥅", color: "#22c55e",
    check: ({ picks, actuals }) => {
      let count = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (!p || !a) continue;
        if (p.h === "0" && p.a === "0" && a.h === "0" && a.a === "0") count++;
      }
      return count >= 3;
    } },
  { id: "bold", icon: "🎲", color: "#ef4444",
    check: ({ picks, actuals }) => FIXTURES.some(f => {
      const p = picks[f.id], a = actuals[f.id];
      if (!p || !a) return false;
      const ph = parseInt(p.h), pa = parseInt(p.a), ah = parseInt(a.h), aa = parseInt(a.a);
      if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return false;
      // Predicted a one-sided win (4+ goal diff, scoreless other side) and got the winner right
      const predDiff = Math.abs(ph - pa);
      const actDiff = Math.abs(ah - aa);
      const predWinner = ph > pa ? "h" : ph < pa ? "a" : "d";
      const actWinner = ah > aa ? "h" : ah < aa ? "a" : "d";
      return predDiff >= 4 && actDiff >= 1 && predWinner === actWinner && predWinner !== "d";
    }) },

  // ─── NEW: Knockout specialists ──
  { id: "ko_sniper", icon: "🎯", color: "#fbbf24",
    check: ({ koPicks, actualKoScores }) => {
      let count = 0;
      Object.keys(actualKoScores || {}).forEach(id => {
        const p = koPicks?.[id], a = actualKoScores[id];
        if (p && a && p.h !== "" && p.h !== undefined && p.h === a.h && p.a === a.a) count++;
      });
      return count >= 3;
    } },
  { id: "bracket_genius", icon: "🔥", color: "#ef4444",
    check: ({ koPicks, actualKoScores }) => {
      let count = 0;
      Object.keys(actualKoScores || {}).forEach(id => {
        const p = koPicks?.[id], a = actualKoScores[id];
        if (p && a && p.h !== "" && p.h !== undefined && p.h === a.h && p.a === a.a) count++;
      });
      return count >= 5;
    } },
  { id: "final_predictor", icon: "👑", color: "#fbbf24",
    check: ({ koPicks, actualKoScores }) => {
      const p = koPicks?.["FINAL"], a = actualKoScores?.["FINAL"];
      return p && a && p.h !== "" && p.h !== undefined && p.h === a.h && p.a === a.a;
    } },

  // ─── NEW: Points milestones ──
  { id: "strong", icon: "💪", color: "#22c55e",
    check: ({ totalPoints }) => totalPoints >= 75 },
  { id: "star", icon: "🌟", color: "#fbbf24",
    check: ({ totalPoints }) => totalPoints >= 150 },
  { id: "king", icon: "👑", color: "#a855f7",
    check: ({ totalPoints }) => totalPoints >= 300 },

  // ─── NEW (v2.3): Fun / quirky ──
  { id: "night_owl", icon: "🌙", color: "#3b82f6",
    check: ({ pickedAtHours }) => pickedAtHours?.some?.(h => h >= 1 && h < 5) },
  { id: "early_bird", icon: "☀️", color: "#fbbf24",
    check: ({ pickedAtHours }) => pickedAtHours?.some?.(h => h >= 5 && h < 7) },
  { id: "last_place", icon: "☠️", color: "#64748b",
    check: ({ myRank, leagueSize }) => myRank && leagueSize && myRank === leagueSize && leagueSize >= 3 },
  { id: "hall_of_fame", icon: "🎖️", color: "#fbbf24",
    check: ({ globalRank }) => globalRank === 1 },
  { id: "lucky_7", icon: "🍀", color: "#22c55e",
    check: ({ picks, actuals }) => {
      let count = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (p && a && p.h !== "" && p.h !== undefined && p.h === a.h && p.a === a.a) count++;
      }
      return count === 7;
    } },
  { id: "clown", icon: "🤡", color: "#ef4444",
    check: ({ picks, actuals }) => {
      // 5 wrong predictions in a row (predicted, real result exists, but wrong winner)
      let streak = 0;
      for (const f of FIXTURES) {
        const p = picks[f.id], a = actuals[f.id];
        if (!a || a.h === "" || a.h === undefined) continue;
        if (!p || p.h === "" || p.h === undefined) continue;
        const s = scoreMatch(p, a);
        if (s.type === "wrong") { streak++; if (streak >= 5) return true; }
        else streak = 0;
      }
      return false;
    } },
];

function checkAchievements(ctx) {
  const unlocked = new Set();
  for (const a of ACHIEVEMENTS) {
    try {
      if (a.check(ctx)) unlocked.add(a.id);
    } catch {}
  }
  return unlocked;
}

function scoreMatch(predicted, actual) {
  if (!predicted || !actual) return { points: 0, type: "none" };
  if (predicted.h === "" || predicted.a === "" || predicted.h === undefined) return { points: 0, type: "none" };
  if (actual.h === "" || actual.a === "" || actual.h === undefined) return { points: 0, type: "none" };
  
  const ph = parseInt(predicted.h), pa = parseInt(predicted.a);
  const ah = parseInt(actual.h), aa = parseInt(actual.a);
  if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return { points: 0, type: "none" };
  
  // Exact
  if (ph === ah && pa === aa) return { points: POINTS.EXACT, type: "exact" };
  
  const predResult = ph > pa ? "h" : ph < pa ? "a" : "d";
  const actResult = ah > aa ? "h" : ah < aa ? "a" : "d";
  
  // Correct result (winner/draw)
  if (predResult === actResult) {
    return { points: POINTS.RESULT, type: "result" };
  }
  
  return { points: POINTS.WRONG, type: "wrong" };
}

function scoreKoMatch(predicted, actual) {
  // Same logic as scoreMatch but with KO_EXACT / KO_RESULT (doubled points)
  if (!predicted || !actual) return { points: 0, type: "none" };
  if (predicted.h === "" || predicted.a === "" || predicted.h === undefined) return { points: 0, type: "none" };
  if (actual.h === "" || actual.a === "" || actual.h === undefined) return { points: 0, type: "none" };
  const ph = parseInt(predicted.h), pa = parseInt(predicted.a);
  const ah = parseInt(actual.h), aa = parseInt(actual.a);
  if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return { points: 0, type: "none" };
  if (ph === ah && pa === aa) return { points: POINTS.KO_EXACT, type: "exact" };
  const predResult = ph > pa ? "h" : ph < pa ? "a" : "d";
  const actResult = ah > aa ? "h" : ah < aa ? "a" : "d";
  if (predResult === actResult && predResult !== "d") {
    // Correct winner. (Draws don't qualify here — if you predicted draw and it was draw, that's "exact".)
    return { points: POINTS.KO_RESULT, type: "result" };
  }
  return { points: POINTS.WRONG, type: "wrong" };
}

// Score all KO predictions given the user's koPicks and the actualKoScores.
// actualKoScores format: { "R32-1": { h: 2, a: 1 }, ... }
function totalKoScore(koPicks, actualKoScores) {
  let total = 0, exact = 0, result = 0, wrong = 0, played = 0;
  Object.keys(actualKoScores || {}).forEach(matchId => {
    const a = actualKoScores[matchId];
    const p = koPicks?.[matchId];
    if (!a || a.h === undefined || a.h === "") return;
    if (!p || p.h === undefined || p.h === "") return;
    played++;
    const s = scoreKoMatch(p, a);
    total += s.points;
    if (s.type === "exact") exact++;
    else if (s.type === "result") result++;
    else if (s.type === "wrong") wrong++;
  });
  return { total, exact, result, wrong, played };
}

function totalScore(picks, actuals) {
  let total = 0;
  let exact = 0, result = 0, wrong = 0, played = 0;
  FIXTURES.forEach(f => {
    const p = picks[f.id];
    const a = actuals[f.id];
    if (!a || a.h === undefined || a.h === "") return;
    if (!p || p.h === undefined || p.h === "") return;
    played++;
    const s = scoreMatch(p, a);
    total += s.points;
    if (s.type === "exact") exact++;
    else if (s.type === "result") result++;
    else if (s.type === "wrong") wrong++;
  });
  return { total, exact, gd: 0, result, wrong, played }; // gd kept as 0 for backward compatibility
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
// Curated top-scorer candidates — only from teams in the 2026 World Cup.
// Auto-filtered at runtime against ALL_TEAMS so any non-qualifier slip-ups are hidden.
const TOP_SCORER_CANDIDATES_RAW = [
  // Argentina
  { name: "Lionel Messi", team: "Argentina" },
  { name: "Lautaro Martínez", team: "Argentina" },
  { name: "Julián Álvarez", team: "Argentina" },
  // France
  { name: "Kylian Mbappé", team: "France" },
  { name: "Ousmane Dembélé", team: "France" },
  { name: "Antoine Griezmann", team: "France" },
  { name: "Christopher Nkunku", team: "France" },
  // Brazil
  { name: "Vinícius Júnior", team: "Brazil" },
  { name: "Rodrygo", team: "Brazil" },
  { name: "Raphinha", team: "Brazil" },
  // England
  { name: "Harry Kane", team: "England" },
  { name: "Bukayo Saka", team: "England" },
  { name: "Jude Bellingham", team: "England" },
  { name: "Phil Foden", team: "England" },
  // Spain
  { name: "Lamine Yamal", team: "Spain" },
  { name: "Álvaro Morata", team: "Spain" },
  { name: "Nico Williams", team: "Spain" },
  // Portugal
  { name: "Cristiano Ronaldo", team: "Portugal" },
  { name: "Bernardo Silva", team: "Portugal" },
  { name: "Bruno Fernandes", team: "Portugal" },
  { name: "Rafael Leão", team: "Portugal" },
  // Germany
  { name: "Florian Wirtz", team: "Germany" },
  { name: "Jamal Musiala", team: "Germany" },
  { name: "Kai Havertz", team: "Germany" },
  // Netherlands
  { name: "Cody Gakpo", team: "Netherlands" },
  { name: "Memphis Depay", team: "Netherlands" },
  { name: "Xavi Simons", team: "Netherlands" },
  // Belgium
  { name: "Romelu Lukaku", team: "Belgium" },
  { name: "Kevin De Bruyne", team: "Belgium" },
  // Norway
  { name: "Erling Haaland", team: "Norway" },
  { name: "Martin Ødegaard", team: "Norway" },
  // Croatia
  { name: "Luka Modrić", team: "Croatia" },
  { name: "Andrej Kramarić", team: "Croatia" },
  // Morocco
  { name: "Hakim Ziyech", team: "Morocco" },
  { name: "Achraf Hakimi", team: "Morocco" },
  { name: "Youssef En-Nesyri", team: "Morocco" },
  // Egypt
  { name: "Mohamed Salah", team: "Egypt" },
  // Senegal
  { name: "Sadio Mané", team: "Senegal" },
  { name: "Nicolas Jackson", team: "Senegal" },
  // Côte d'Ivoire
  { name: "Sébastien Haller", team: "Côte d'Ivoire" },
  { name: "Simon Adingra", team: "Côte d'Ivoire" },
  // Ghana
  { name: "Mohammed Kudus", team: "Ghana" },
  { name: "Iñaki Williams", team: "Ghana" },
  // DR Congo
  { name: "Cédric Bakambu", team: "DR Congo" },
  // Cabo Verde
  { name: "Ryan Mendes", team: "Cabo Verde" },
  // South Africa
  { name: "Lyle Foster", team: "South Africa" },
  // Tunisia
  { name: "Wahbi Khazri", team: "Tunisia" },
  // Algeria
  { name: "Riyad Mahrez", team: "Algeria" },
  { name: "Islam Slimani", team: "Algeria" },
  // USA
  { name: "Christian Pulisic", team: "USA" },
  { name: "Folarin Balogun", team: "USA" },
  { name: "Tim Weah", team: "USA" },
  // Mexico
  { name: "Hirving Lozano", team: "Mexico" },
  { name: "Raúl Jiménez", team: "Mexico" },
  { name: "Santiago Giménez", team: "Mexico" },
  // Canada
  { name: "Alphonso Davies", team: "Canada" },
  { name: "Jonathan David", team: "Canada" },
  { name: "Cyle Larin", team: "Canada" },
  // Uruguay
  { name: "Darwin Núñez", team: "Uruguay" },
  { name: "Federico Valverde", team: "Uruguay" },
  // Colombia
  { name: "Luis Díaz", team: "Colombia" },
  { name: "James Rodríguez", team: "Colombia" },
  // Paraguay
  { name: "Miguel Almirón", team: "Paraguay" },
  // Ecuador
  { name: "Enner Valencia", team: "Ecuador" },
  // Haiti
  { name: "Duckens Nazon", team: "Haiti" },
  // Curaçao
  { name: "Tahith Chong", team: "Curaçao" },
  // Japan
  { name: "Kaoru Mitoma", team: "Japan" },
  { name: "Takefusa Kubo", team: "Japan" },
  { name: "Daichi Kamada", team: "Japan" },
  // South Korea
  { name: "Son Heung-min", team: "South Korea" },
  // Iran
  { name: "Mehdi Taremi", team: "Iran" },
  { name: "Sardar Azmoun", team: "Iran" },
  // Saudi Arabia
  { name: "Salem Al-Dawsari", team: "Saudi Arabia" },
  // Uzbekistan
  { name: "Eldor Shomurodov", team: "Uzbekistan" },
  // Iraq
  { name: "Ali Al-Hamadi", team: "Iraq" },
  // Jordan
  { name: "Mousa Al-Tamari", team: "Jordan" },
  // Qatar
  { name: "Akram Afif", team: "Qatar" },
  // Australia
  { name: "Mitchell Duke", team: "Australia" },
  { name: "Mat Leckie", team: "Australia" },
  // New Zealand
  { name: "Chris Wood", team: "New Zealand" },
  // Switzerland
  { name: "Granit Xhaka", team: "Switzerland" },
  { name: "Breel Embolo", team: "Switzerland" },
  // Türkiye
  { name: "Arda Güler", team: "Türkiye" },
  { name: "Kenan Yıldız", team: "Türkiye" },
  // Austria
  { name: "Marko Arnautović", team: "Austria" },
  // Sweden
  { name: "Alexander Isak", team: "Sweden" },
  { name: "Viktor Gyökeres", team: "Sweden" },
  // Czechia
  { name: "Patrik Schick", team: "Czechia" },
  // Bosnia
  { name: "Edin Džeko", team: "Bosnia" },
  // Scotland
  { name: "Scott McTominay", team: "Scotland" },
  { name: "Che Adams", team: "Scotland" },
  // Panama
  { name: "José Fajardo", team: "Panama" },
];

// Runtime filter: only show players from teams actually in the 2026 tournament
const _qualifiedTeamSet = new Set(ALL_TEAMS.map(t => t.n));
const TOP_SCORER_CANDIDATES = TOP_SCORER_CANDIDATES_RAW.filter(p => _qualifiedTeamSet.has(p.team));

// Module-level avatar color helper (also used by ProfileStats and others)
const _AVATAR_COLORS = ["#fbbf24","#ef4444","#3b82f6","#22c55e","#a855f7","#ec4899","#14b8a6","#f97316"];
function colorFor(n) {
  if (!n) return _AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % _AVATAR_COLORS.length;
  return _AVATAR_COLORS[h];
}

// ─── TOP SCORER GOAL CELEBRATION: when your top-scorer pick scores another goal
function TopScorerCelebration({ player, newTotalGoals, goalDelta, onDismiss }) {
  const t = useT();
  useEffect(() => {
    const id = setTimeout(onDismiss, 4500);
    return () => clearTimeout(id);
  }, [onDismiss]);

  if (!player) return null;

  const colors = ["#a855f7","#7c3aed","#c084fc","#e879f9","#fbbf24","#fde047"];
  const confetti = Array.from({length: 40}, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div onClick={onDismiss} style={{
      position:"fixed",inset:0,zIndex:9998,
      background:"radial-gradient(ellipse at center, rgba(168,85,247,0.3), rgba(0,0,0,0.85))",
      backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      animation:"goalFadeIn 0.4s ease-out",cursor:"pointer",overflow:"hidden",
    }}>
      <style>{`
        @keyframes goalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shoePop {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(15deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes pointsPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes purpleGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(168,85,247,0.8), 0 0 40px rgba(168,85,247,0.5); }
          50% { text-shadow: 0 0 30px rgba(168,85,247,1), 0 0 60px rgba(168,85,247,0.7); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {/* Confetti */}
      {confetti.map((c, i) => (
        <div key={i} style={{
          position:"absolute",top:0,left:`${c.left}%`,
          width:c.size,height:c.size,background:c.color,
          borderRadius: i % 2 === 0 ? "50%" : 2,
          animation:`confettiFall ${c.duration}s linear ${c.delay}s infinite`,
          transform:`rotate(${c.rotation}deg)`,pointerEvents:"none",
        }}/>
      ))}

      <div style={{textAlign:"center",padding:"30px 20px",animation:"goalFadeIn 0.4s ease-out",position:"relative",zIndex:2,maxWidth:380}}>
        {/* Big shoe */}
        <div style={{fontSize:80,marginBottom:10,animation:"shoePop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",filter:"drop-shadow(0 4px 20px rgba(168,85,247,0.6))"}}>👟</div>

        {/* "GOOOOAL!" text */}
        <div style={{
          fontSize:42,fontWeight:900,letterSpacing:3,
          color:"#a855f7",
          animation:"purpleGlow 1.2s ease-in-out infinite",
          marginBottom:8,fontStyle:"italic",
          background:"linear-gradient(180deg,#e9d5ff,#a855f7)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          filter:"drop-shadow(0 4px 12px rgba(168,85,247,0.7))",
        }}>{t("celebration.topScorerScored")}</div>

        {/* Player card */}
        <div style={{
          background:"rgba(15,20,36,0.85)",
          border:"2px solid #a855f7",
          borderRadius:14,padding:"14px 18px",
          boxShadow:"0 0 40px rgba(168,85,247,0.4)",
          marginBottom:14,
        }}>
          <div style={{fontSize:18,fontWeight:900,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.name}</div>
          <div style={{fontSize:12,color:"#c084fc",marginTop:2}}>{player.team}</div>
          <div style={{
            marginTop:10,display:"flex",alignItems:"center",justifyContent:"center",gap:14,
            fontSize:11,color:"#94a3b8",letterSpacing:1,
          }}>
            <div>
              <div style={{fontSize:9,letterSpacing:2,fontWeight:700}}>{t("celebration.totalGoals")}</div>
              <div style={{fontSize:24,color:"#fbbf24",fontWeight:900,lineHeight:1,marginTop:2}}>{newTotalGoals}</div>
            </div>
          </div>
        </div>

        {/* Points awarded */}
        <div style={{
          fontSize:32,fontWeight:900,color:"#22c55e",letterSpacing:1,
          animation:"pointsPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s backwards",
        }}>+{goalDelta * 2} {t("welcome.pts").toUpperCase()}</div>
        <div style={{fontSize:11,color:"#94a3b8",marginTop:6,letterSpacing:1}}>{t("celebration.tapToDismiss")}</div>
      </div>
    </div>
  );
}

// ─── GOAL CELEBRATION: full-screen overlay when an exact prediction lands ────
function GoalCelebration({ fixture, score, onDismiss }) {
  const t = useT();
  // Auto-dismiss after 5s
  useEffect(() => {
    const id = setTimeout(onDismiss, 5000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  if (!fixture) return null;
  const home = findTeam(fixture.home);
  const away = findTeam(fixture.away);

  // Generate 30 confetti pieces with random colors/positions
  const colors = ["#fbbf24","#22c55e","#3b82f6","#a855f7","#ef4444","#ec4899","#06b6d4"];
  const confetti = Array.from({length: 50}, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div onClick={onDismiss} style={{
      position:"fixed",inset:0,zIndex:9999,
      background:"radial-gradient(ellipse at center, rgba(251,191,36,0.25), rgba(0,0,0,0.85))",
      backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      animation:"goalFadeIn 0.4s ease-out",
      cursor:"pointer",overflow:"hidden",
    }}>
      <style>{`
        @keyframes goalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes goalScaleIn { 
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; } 
          50% { transform: scale(1.2) rotate(5deg); opacity: 1; } 
          100% { transform: scale(1) rotate(0deg); opacity: 1; } 
        }
        @keyframes goalShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px) rotate(-2deg); }
          75% { transform: translateX(8px) rotate(2deg); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes goalGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(251,191,36,0.8), 0 0 40px rgba(251,191,36,0.5); }
          50% { text-shadow: 0 0 30px rgba(251,191,36,1), 0 0 60px rgba(251,191,36,0.7); }
        }
        @keyframes flagPop {
          0% { transform: scale(0) rotate(-180deg); }
          60% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>

      {/* Confetti rain */}
      {confetti.map((c, i) => (
        <div key={i} style={{
          position:"absolute",
          top:0,left:`${c.left}%`,
          width:c.size,height:c.size,
          background:c.color,
          borderRadius: i % 2 === 0 ? "50%" : 2,
          animation:`confettiFall ${c.duration}s linear ${c.delay}s infinite`,
          transform:`rotate(${c.rotation}deg)`,
          pointerEvents:"none",
        }}/>
      ))}

      {/* Center card */}
      <div style={{
        textAlign:"center",padding:"30px 20px",
        animation:"goalScaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        position:"relative",zIndex:2,maxWidth:380,
      }}>
        {/* GOAL! text */}
        <div style={{
          fontSize: 64, fontWeight: 900, letterSpacing: 4,
          color:"#fbbf24",
          animation:"goalGlow 1.2s ease-in-out infinite",
          marginBottom: 8,
          fontStyle:"italic",
          background:"linear-gradient(180deg,#fde68a,#f59e0b)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          filter:"drop-shadow(0 4px 12px rgba(251,191,36,0.7))",
        }}>GOAL!</div>

        {/* Subtitle */}
        <div style={{
          fontSize:13,color:"#fff",letterSpacing:3,marginBottom:20,fontWeight:700,
        }}>🎯 {t("celebration.exactScore")} 🎯</div>

        {/* Match card */}
        <div style={{
          background:"rgba(15,20,36,0.85)",
          border:"2px solid #fbbf24",
          borderRadius:16,padding:"18px 20px",
          boxShadow:"0 0 40px rgba(251,191,36,0.4)",
          animation:"goalShake 0.5s ease-in-out 0.6s",
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-around",gap:8}}>
            {/* Home */}
            <div style={{textAlign:"center",flex:1,minWidth:0}}>
              <div style={{fontSize:36,animation:"flagPop 0.6s ease-out 0.3s backwards"}}>{home?.f}</div>
              <div style={{fontSize:11,color:"#cbd5e1",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{home?.n}</div>
            </div>
            {/* Score */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{
                fontSize:42,fontWeight:900,color:"#fbbf24",lineHeight:1,
                animation:"flagPop 0.6s ease-out 0.5s backwards",
                fontVariantNumeric:"tabular-nums",
              }}>{score.h}</div>
              <div style={{fontSize:18,color:"#64748b"}}>-</div>
              <div style={{
                fontSize:42,fontWeight:900,color:"#fbbf24",lineHeight:1,
                animation:"flagPop 0.6s ease-out 0.7s backwards",
                fontVariantNumeric:"tabular-nums",
              }}>{score.a}</div>
            </div>
            {/* Away */}
            <div style={{textAlign:"center",flex:1,minWidth:0}}>
              <div style={{fontSize:36,animation:"flagPop 0.6s ease-out 0.9s backwards"}}>{away?.f}</div>
              <div style={{fontSize:11,color:"#cbd5e1",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{away?.n}</div>
            </div>
          </div>
        </div>

        {/* Points awarded */}
        <div style={{marginTop:18,fontSize:24,fontWeight:900,color:"#22c55e",letterSpacing:1}}>
          +5 {t("welcome.pts").toUpperCase()}
        </div>
        <div style={{fontSize:11,color:"#94a3b8",marginTop:6,letterSpacing:1}}>{t("celebration.tapToDismiss")}</div>
      </div>
    </div>
  );
}

// ─── PROFILE STATS: personal performance dashboard ──────────────────────────
// ─── ONBOARDING: 3-slide tutorial shown to new users ────────────────────────
function OnboardingTutorial({ onDone }) {
  const t = useT();
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      emoji: "🎯",
      title: t("onboarding.slide1Title"),
      accent: "#fbbf24",
      content: (
        <div>
          {/* Example match card */}
          <div style={{
            background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(15,20,36,0.5))",
            border:"1px solid rgba(251,191,36,0.3)",
            borderRadius:14,padding:"14px 16px",marginBottom:18,
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-around",gap:8}}>
              <div style={{textAlign:"center",flex:1}}>
                <div style={{fontSize:28}}>🇧🇷</div>
                <div style={{fontSize:11,color:"#cbd5e1",fontWeight:700,marginTop:2}}>Brazil</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:28,fontWeight:900,color:"#fbbf24",fontVariantNumeric:"tabular-nums"}}>2</div>
                <div style={{fontSize:14,color:"#64748b"}}>-</div>
                <div style={{fontSize:28,fontWeight:900,color:"#fbbf24",fontVariantNumeric:"tabular-nums"}}>1</div>
              </div>
              <div style={{textAlign:"center",flex:1}}>
                <div style={{fontSize:28}}>🇫🇷</div>
                <div style={{fontSize:11,color:"#cbd5e1",fontWeight:700,marginTop:2}}>France</div>
              </div>
            </div>
          </div>

          {/* Scoring rows */}
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(251,191,36,0.08)",borderRadius:8,border:"1px solid rgba(251,191,36,0.2)"}}>
              <span style={{fontSize:13,color:"#cbd5e1"}}>🎯 {t("onboarding.exact")}</span>
              <span style={{fontSize:14,fontWeight:900,color:"#fbbf24"}}>+5</span>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(34,197,94,0.08)",borderRadius:8,border:"1px solid rgba(34,197,94,0.2)"}}>
              <span style={{fontSize:13,color:"#cbd5e1"}}>✅ {t("onboarding.winner")}</span>
              <span style={{fontSize:14,fontWeight:900,color:"#22c55e"}}>+3</span>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(71,85,105,0.15)",borderRadius:8,border:"1px solid rgba(71,85,105,0.3)"}}>
              <span style={{fontSize:13,color:"#94a3b8"}}>❌ {t("onboarding.wrong")}</span>
              <span style={{fontSize:14,fontWeight:900,color:"#64748b"}}>0</span>
            </div>
          </div>

          {/* Tips */}
          <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.6,padding:"0 4px"}}>
            🔥 {t("onboarding.koDouble")}<br/>
            🔒 {t("onboarding.lockHour")}
          </div>
        </div>
      ),
    },
    {
      emoji: "⭐",
      title: t("onboarding.slide2Title"),
      accent: "#a855f7",
      content: (
        <div>
          {/* Two big bet cards side by side */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
            <div style={{
              background:"linear-gradient(135deg,rgba(251,191,36,0.12),rgba(15,20,36,0.5))",
              border:"1px solid rgba(251,191,36,0.4)",
              borderRadius:12,padding:"14px 10px",textAlign:"center",
            }}>
              <div style={{fontSize:36,marginBottom:4}}>🏆</div>
              <div style={{fontSize:11,color:"#cbd5e1",fontWeight:700,marginBottom:6,letterSpacing:1}}>{t("onboarding.champion")}</div>
              <div style={{fontSize:22,fontWeight:900,color:"#fbbf24"}}>+20</div>
            </div>
            <div style={{
              background:"linear-gradient(135deg,rgba(168,85,247,0.12),rgba(15,20,36,0.5))",
              border:"1px solid rgba(168,85,247,0.4)",
              borderRadius:12,padding:"14px 10px",textAlign:"center",
            }}>
              <div style={{fontSize:36,marginBottom:4}}>👟</div>
              <div style={{fontSize:11,color:"#cbd5e1",fontWeight:700,marginBottom:6,letterSpacing:1}}>{t("onboarding.topScorer")}</div>
              <div style={{fontSize:18,fontWeight:900,color:"#a855f7"}}>+2 / {t("onboarding.goal")}</div>
            </div>
          </div>

          {/* Tips */}
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.7,padding:"0 4px"}}>
            💡 {t("onboarding.lockAtKickoff")}<br/>
            📍 {t("onboarding.findInBonus")}
          </div>
        </div>
      ),
    },
    {
      emoji: "👥",
      title: t("onboarding.slide3Title"),
      accent: "#22c55e",
      content: (
        <div>
          {/* Three steps */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
            {[
              { n: "1", text: t("onboarding.step1") },
              { n: "2", text: t("onboarding.step2") },
              { n: "3", text: t("onboarding.step3") },
            ].map(step => (
              <div key={step.n} style={{
                display:"flex",alignItems:"center",gap:12,
                padding:"10px 14px",
                background:"rgba(34,197,94,0.08)",
                border:"1px solid rgba(34,197,94,0.25)",
                borderRadius:10,
              }}>
                <div style={{
                  width:28,height:28,borderRadius:"50%",
                  background:"linear-gradient(135deg,#22c55e,#16a34a)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:900,color:"#fff",flexShrink:0,
                }}>{step.n}</div>
                <span style={{fontSize:13,color:"#cbd5e1",fontWeight:600}}>{step.text}</span>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.7,padding:"0 4px"}}>
            💬 {t("onboarding.whatsappTip")}<br/>
            🌍 {t("onboarding.worldTip")}
          </div>
        </div>
      ),
    },
  ];

  const current = slides[slide];
  const isLast = slide === slides.length - 1;

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9500,
      background:"linear-gradient(180deg, rgba(10,14,28,0.97), rgba(15,20,36,0.97))",
      backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:20,animation:"goalFadeIn 0.4s ease-out",
    }}>
      <style>{`
        @keyframes goalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={{
        maxWidth:420,width:"100%",
        background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
        border:`1px solid ${current.accent}66`,
        borderRadius:20,padding:"30px 24px",
        boxShadow:`0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${current.accent}22`,
      }}>
        {/* Skip button */}
        <div style={{textAlign:"right",marginBottom:8}}>
          <button onClick={onDone} style={{
            background:"transparent",border:"none",
            color:"#64748b",fontSize:11,cursor:"pointer",fontFamily:"inherit",
            padding:"4px 8px",letterSpacing:1,
          }}>{t("onboarding.skip")}</button>
        </div>

        {/* Slide content */}
        <div key={slide} style={{textAlign:"center",animation:"slideIn 0.4s ease-out"}}>
          <div style={{
            fontSize:56,marginBottom:8,
            filter:`drop-shadow(0 4px 16px ${current.accent}66)`,
          }}>{current.emoji}</div>

          <h2 style={{
            fontSize:20,margin:"0 0 16px",
            color:current.accent,fontWeight:900,
            letterSpacing:0.5,
          }}>{current.title}</h2>

          <div style={{textAlign:"start",marginBottom:18}}>{current.content}</div>
        </div>

        {/* Progress dots */}
        <div style={{
          display:"flex",justifyContent:"center",gap:8,
          marginBottom:18,
        }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === slide ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === slide ? current.accent : "rgba(71,85,105,0.4)",
              transition: "all 0.3s",
            }}/>
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{display:"flex",gap:8}}>
          {slide > 0 && (
            <button onClick={()=>setSlide(s=>s-1)} style={{
              ...ghostBtn,flex:1,
            }}>{t("onboarding.back")}</button>
          )}
          <button onClick={()=>{
            if (isLast) onDone();
            else setSlide(s=>s+1);
          }} style={{
            ...primaryBtn,flex:slide > 0 ? 2 : 1,
            background: `linear-gradient(135deg, ${current.accent}, ${current.accent}cc)`,
            color: current.accent === "#fbbf24" ? "#0a0e1c" : "#fff",
            boxShadow: `0 6px 18px ${current.accent}44`,
          }}>
            {isLast ? t("onboarding.letsGo") : t("onboarding.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TOAST NOTIFICATIONS: small messages at bottom of screen ────────────────
const ToastContext = createContext({ showToast: () => {} });
function useToast() { return useContext(ToastContext); }

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // { id, message, type, expiresAt }

  const showToast = (message, type = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    const expiresAt = Date.now() + 3000;
    setToasts(prev => [...prev, { id, message, type, expiresAt }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position:"fixed",bottom:70,left:"50%",
          transform:"translateX(-50%)",zIndex:9999,
          display:"flex",flexDirection:"column",gap:6,
          maxWidth:"calc(100vw - 32px)",
          pointerEvents:"none",
        }}>
          {toasts.map(t => {
            const colors = {
              info: { bg:"rgba(59,130,246,0.95)", border:"#3b82f6", text:"#fff", icon:"ℹ️" },
              success: { bg:"rgba(34,197,94,0.95)", border:"#22c55e", text:"#fff", icon:"✓" },
              warning: { bg:"rgba(251,191,36,0.95)", border:"#fbbf24", text:"#0a0e1c", icon:"⚠️" },
              error: { bg:"rgba(239,68,68,0.95)", border:"#ef4444", text:"#fff", icon:"❌" },
            };
            const c = colors[t.type] || colors.info;
            return (
              <div key={t.id} style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: c.text,
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                animation: "toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                display:"flex",alignItems:"center",gap:8,
                pointerEvents:"auto",
                backdropFilter:"blur(4px)",
              }}>
                <span style={{fontSize:15}}>{c.icon}</span>
                <span>{t.message}</span>
              </div>
            );
          })}
          <style>{`
            @keyframes toastIn {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </ToastContext.Provider>
  );
}

function ProfileStats({ name, picks, koWinners, actuals, actualKo, winnerPick, topScorerPick, onClose }) {
  const t = useT();
  const stats = useMemo(() => {
    const ms = totalScore(picks, actuals);
    // Count most-picked team in knockout
    const teamCounts = {};
    Object.values(koWinners || {}).forEach(s => {
      // Skip — koWinners holds 'a'/'b' not team names; skip this metric for now
    });
    // Count predictions made in group stage
    let predicted = 0;
    let totalGoalsPredicted = 0;
    let highestPredictedScore = { match: null, total: 0 };
    let boldestUpset = null;
    FIXTURES.forEach(f => {
      const p = picks[f.id];
      if (!p || p.h === "" || p.h === undefined) return;
      predicted++;
      const ph = parseInt(p.h) || 0;
      const pa = parseInt(p.a) || 0;
      totalGoalsPredicted += ph + pa;
      if (ph + pa > highestPredictedScore.total) {
        highestPredictedScore = { match: f, total: ph + pa, h: ph, a: pa };
      }
    });

    // Knockout predictions count
    const koPredictedCount = Object.keys(koWinners || {}).length;

    // Accuracy %
    const accuracy = ms.played > 0 ? Math.round(((ms.exact + ms.gd + ms.result) / ms.played) * 100) : 0;
    const exactAccuracy = ms.played > 0 ? Math.round((ms.exact / ms.played) * 100) : 0;

    return {
      ...ms,
      predicted, koPredictedCount,
      accuracy, exactAccuracy,
      totalGoalsPredicted,
      highestPredictedScore,
    };
  }, [picks, koWinners, actuals]);

  const lang = useLang().lang;

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9000,
      background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:16,animation:"goalFadeIn 0.2s ease-out",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
        border:"1px solid rgba(251,191,36,0.4)",
        borderRadius:18,padding:"22px 20px",
        maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <style>{`
          @keyframes goalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{
            width:64,height:64,borderRadius:"50%",
            background:`linear-gradient(135deg,${colorFor(name)},${colorFor(name)}aa)`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:28,fontWeight:900,color:"#fff",
            margin:"0 auto 8px",
            boxShadow:"0 6px 20px rgba(0,0,0,0.4)",
          }}>{name[0]?.toUpperCase()}</div>
          <h2 style={{margin:0,fontSize:18,color:"#f1f5f9"}}>{name}</h2>
          <div style={{fontSize:10,color:"#64748b",letterSpacing:3,marginTop:2}}>{t("profile.yourStats")}</div>
        </div>

        {/* Big point total */}
        <div style={{
          textAlign:"center",
          background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(15,20,36,0.5))",
          border:"1px solid rgba(251,191,36,0.4)",
          borderRadius:14,padding:"14px 12px",marginBottom:14,
        }}>
          <div style={{fontSize:11,color:"#fbbf24",letterSpacing:3,marginBottom:4}}>{t("profile.totalPoints")}</div>
          <div style={{fontSize:48,fontWeight:900,color:"#fbbf24",lineHeight:1}}>{stats.total}</div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{stats.played} {t("profile.fromMatches")}</div>
        </div>

        {/* Accuracy block */}
        {stats.played > 0 && (
          <div style={{
            background:"rgba(30,41,59,0.5)",border:"1px solid rgba(71,85,105,0.4)",
            borderRadius:12,padding:"12px 14px",marginBottom:14,
          }}>
            <div style={{fontSize:10,color:"#94a3b8",letterSpacing:2,marginBottom:8,fontWeight:700}}>{t("profile.accuracy")}</div>
            {/* Bar 1: total accuracy */}
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:3}}>
                <span>{t("profile.anyHit")}</span>
                <span style={{fontWeight:700,color:"#22c55e"}}>{stats.accuracy}%</span>
              </div>
              <div style={{height:6,background:"rgba(15,20,36,0.6)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${stats.accuracy}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",borderRadius:3,transition:"width 0.6s"}}/>
              </div>
            </div>
            {/* Bar 2: exact */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:3}}>
                <span>{t("profile.exactHits")}</span>
                <span style={{fontWeight:700,color:"#fbbf24"}}>{stats.exactAccuracy}%</span>
              </div>
              <div style={{height:6,background:"rgba(15,20,36,0.6)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${stats.exactAccuracy}%`,background:"linear-gradient(90deg,#fbbf24,#d97706)",borderRadius:3,transition:"width 0.6s"}}/>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          <StatTile color="#fbbf24" label={t("profile.exactPicks")} value={stats.exact} icon="🎯"/>
          <StatTile color="#22c55e" label={t("profile.rightWinner")} value={stats.result} icon="✅"/>
          <StatTile color="#ef4444" label={t("profile.wrongPicks")} value={stats.wrong} icon="💀"/>
        </div>

        {/* Predictions completion */}
        <div style={{
          background:"rgba(30,41,59,0.5)",border:"1px solid rgba(71,85,105,0.4)",
          borderRadius:12,padding:"12px 14px",marginBottom:14,
        }}>
          <div style={{fontSize:10,color:"#94a3b8",letterSpacing:2,marginBottom:8,fontWeight:700}}>{t("profile.predictions")}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#cbd5e1",marginBottom:4}}>
            <span>⚽ {t("profile.groupMatches")}</span>
            <span style={{fontWeight:700,color:"#f1f5f9"}}>{stats.predicted}/{FIXTURES.length}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#cbd5e1",marginBottom:4}}>
            <span>🏆 {t("profile.knockoutPicks")}</span>
            <span style={{fontWeight:700,color:"#f1f5f9"}}>{stats.koPredictedCount}/31</span>
          </div>
          {winnerPick && (
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#cbd5e1",marginBottom:4}}>
              <span>👑 {t("profile.championBet")}</span>
              <span style={{fontWeight:700,color:"#fbbf24"}}>{winnerPick.flag||winnerPick.f} {winnerPick.name||winnerPick.n}</span>
            </div>
          )}
          {topScorerPick && (
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#cbd5e1"}}>
              <span>👟 {t("profile.topScorerBet")}</span>
              <span style={{fontWeight:700,color:"#a855f7",overflow:"hidden",textOverflow:"ellipsis",maxWidth:180}}>{topScorerPick.name}</span>
            </div>
          )}
        </div>

        {/* Fun facts */}
        {stats.predicted > 0 && (
          <div style={{
            background:"linear-gradient(135deg,rgba(168,85,247,0.1),rgba(15,20,36,0.5))",
            border:"1px solid rgba(168,85,247,0.3)",
            borderRadius:12,padding:"12px 14px",marginBottom:14,
          }}>
            <div style={{fontSize:10,color:"#a855f7",letterSpacing:2,marginBottom:8,fontWeight:700}}>{t("profile.funFacts")}</div>
            <div style={{fontSize:11,color:"#cbd5e1",marginBottom:6}}>
              ⚽ {t("profile.goalsPredicted")}: <strong style={{color:"#fbbf24"}}>{stats.totalGoalsPredicted}</strong>
            </div>
            {stats.highestPredictedScore.match && (
              <div style={{fontSize:11,color:"#cbd5e1"}}>
                🎆 {t("profile.boldestPrediction")}: <strong style={{color:"#fbbf24"}}>
                {stats.highestPredictedScore.match.home} {stats.highestPredictedScore.h}-{stats.highestPredictedScore.a} {stats.highestPredictedScore.match.away}
                </strong>
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} style={{...primaryBtn,marginTop:0}}>{t("profile.close")}</button>
      </div>
    </div>
  );
}

function StatTile({ color, label, value, icon }) {
  return (
    <div style={{
      background:"rgba(30,41,59,0.5)",border:`1px solid ${color}55`,
      borderRadius:10,padding:"10px 8px",textAlign:"center",
    }}>
      <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
      <div style={{fontSize:22,fontWeight:900,color,lineHeight:1}}>{value}</div>
      <div style={{fontSize:9,color:"#94a3b8",letterSpacing:1,marginTop:3,fontWeight:600}}>{label}</div>
    </div>
  );
}

// ─── BACK TO TOP: floating button that appears after scrolling 400px ─────────
// ─── WORLD LEADERBOARD: global ranking across all users worldwide ───────────
function WorldLeaderboard({ userId, name, onClose }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // Check cache first (5 min)
      const cached = (() => {
        try {
          const raw = localStorage.getItem("wc2026_world_v2");
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (Date.now() - parsed.fetchedAt > 5 * 60 * 1000) return null;
          return parsed;
        } catch { return null; }
      })();
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
      const result = await fetchGlobalLeaderboard(10, userId);
      try { localStorage.setItem("wc2026_world_v2", JSON.stringify(result)); } catch {}
      setData(result);
    } catch (e) {
      console.error("World leaderboard failed:", e);
      setError(e.message || "Couldn't fetch world leaderboard");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Percentile calc
  const percentile = (data && data.myRank && data.totalUsers)
    ? Math.round(((data.totalUsers - data.myRank + 1) / data.totalUsers) * 100)
    : null;

  return (
    <div style={{padding:"16px 14px 60px",maxWidth:480,margin:"0 auto"}}>
      <button onClick={onClose} style={{...ghostBtn,width:"auto",padding:"7px 14px",marginBottom:14}}>
        ← {t("world.back")}
      </button>

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:42,marginBottom:6}}>🌍</div>
        <h2 style={{
          margin:"0 0 4px",fontSize:22,
          background:"linear-gradient(180deg,#fde68a,#f59e0b)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          fontWeight:900,
        }}>{t("world.title")}</h2>
        <p style={{color:"#94a3b8",fontSize:12,margin:0}}>{t("world.subtitle")}</p>
      </div>

      {loading && (
        <div style={{textAlign:"center",padding:"30px 0",color:"#94a3b8",fontSize:13}}>
          <div style={{fontSize:32,marginBottom:8,animation:"pulse 1.5s infinite"}}>🌐</div>
          {t("world.loading")}
        </div>
      )}

      {error && (
        <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:10,padding:14,textAlign:"center",fontSize:12,color:"#fca5a5"}}>
          ⚠️ {error}
          <button onClick={load} style={{...ghostBtn,marginTop:10,padding:"6px 14px",width:"auto"}}>
            {t("world.tryAgain")}
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* My rank summary */}
          {data.myRank ? (
            <div style={{
              background:"linear-gradient(135deg,rgba(251,191,36,0.18),rgba(217,119,6,0.08))",
              border:"1px solid rgba(251,191,36,0.5)",
              borderRadius:14,padding:"16px 14px",marginBottom:16,textAlign:"center",
            }}>
              <div style={{fontSize:10,color:"#fbbf24",letterSpacing:3,marginBottom:6,fontWeight:700}}>
                {t("world.yourRank")}
              </div>
              <div style={{fontSize:36,fontWeight:900,color:"#fbbf24",lineHeight:1}}>
                #{data.myRank}
                <span style={{fontSize:14,color:"#94a3b8",marginLeft:6}}>
                  {t("world.outOf")} {data.totalUsers}
                </span>
              </div>
              <div style={{fontSize:11,color:"#cbd5e1",marginTop:8}}>
                {data.myPoints} {t("welcome.pts")} · {t("world.topPercent").replace("{p}", percentile)}
              </div>
            </div>
          ) : (
            <div style={{
              background:"rgba(30,41,59,0.5)",
              border:"1px dashed rgba(71,85,105,0.4)",
              borderRadius:12,padding:"14px 16px",marginBottom:16,textAlign:"center",
              fontSize:12,color:"#94a3b8",lineHeight:1.5,
            }}>
              {t("world.notRankedYet")}
            </div>
          )}

          {/* Top 10 */}
          <div style={{fontSize:11,color:"#94a3b8",letterSpacing:3,marginBottom:10,textAlign:"center",fontWeight:700}}>
            🏆 {t("world.topTen")}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {data.top.length === 0 && (
              <div style={{textAlign:"center",padding:"20px 0",fontSize:12,color:"#64748b",fontStyle:"italic"}}>
                {t("world.noPlayersYet")}
              </div>
            )}
            {data.top.map((u, i) => {
              const isMe = u.uid === userId;
              const rankColor = u.rank === 1 ? "#fbbf24" : u.rank === 2 ? "#cbd5e1" : u.rank === 3 ? "#d97706" : "#64748b";
              const rankIcon = u.rank === 1 ? "🥇" : u.rank === 2 ? "🥈" : u.rank === 3 ? "🥉" : `#${u.rank}`;
              return (
                <div key={u.uid} style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"10px 12px",
                  background: isMe ? "linear-gradient(135deg,rgba(251,191,36,0.18),rgba(15,20,36,0.5))" : "rgba(30,41,59,0.5)",
                  border: isMe ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(71,85,105,0.3)",
                  borderRadius:10,
                }}>
                  <span style={{fontSize:14,color:rankColor,fontWeight:800,minWidth:28,textAlign:"center"}}>{rankIcon}</span>
                  <div style={{
                    width:30,height:30,borderRadius:"50%",
                    background:`linear-gradient(135deg,${colorFor(u.name)},${colorFor(u.name)}aa)`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:13,fontWeight:900,color:"#fff",flexShrink:0,
                  }}>{u.name?.[0]?.toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:isMe?800:600,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {u.name}{isMe && <span style={{fontSize:10,color:"#fbbf24",marginLeft:6,letterSpacing:1}}>({t("league.you").trim()})</span>}
                  </div>
                  <div style={{fontSize:16,fontWeight:900,color:"#fbbf24"}}>{u.totalPoints || 0}</div>
                </div>
              );
            })}
          </div>

          <p style={{fontSize:9,color:"#64748b",textAlign:"center",marginTop:16}}>
            {t("world.updatedEvery")}
          </p>
        </>
      )}
    </div>
  );
}

// ─── SIDEBAR: hamburger menu drawer that slides in from one side ─────────────
function Sidebar({ open, onClose, name, lang, setLang, onShowProfile, onShowRules, onShowBackup, onShowTutorial, onShowAchievements, onLogout, onReset, totalPoints, unlockedCount }) {
  const t = useT();
  const isRTL = lang === "he";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed",inset:0,zIndex:9998,
          background:"rgba(0,0,0,0.6)",
          backdropFilter:"blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition:"opacity 0.25s ease-out",
        }}
      />

      {/* Drawer */}
      <div style={{
        position:"fixed",top:0,bottom:0,
        [isRTL ? "right" : "left"]: 0,
        zIndex:9999,width:"82%",maxWidth:320,
        background:"linear-gradient(180deg,#1a1f3a,#0f1424)",
        boxShadow: isRTL ? "-8px 0 32px rgba(0,0,0,0.5)" : "8px 0 32px rgba(0,0,0,0.5)",
        transform: open
          ? "translateX(0)"
          : isRTL ? "translateX(100%)" : "translateX(-100%)",
        transition:"transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        display:"flex",flexDirection:"column",
        overflowY:"auto",
        direction: isRTL ? "rtl" : "ltr",
      }}>
        {/* Top: close button + user profile */}
        <div style={{padding:"18px 20px",borderBottom:"1px solid rgba(71,85,105,0.3)"}}>
          <button onClick={onClose} aria-label="Close menu" style={{
            background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",
            fontSize:22,color:"#94a3b8",padding:"4px 8px",
            marginBottom:14,marginLeft:isRTL?0:-4,marginRight:isRTL?-4:0,
          }}>✕</button>

          {/* User card */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:48,height:48,borderRadius:"50%",
              background:`linear-gradient(135deg,${colorFor(name)},${colorFor(name)}aa)`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:20,fontWeight:900,color:"#fff",flexShrink:0,
              boxShadow:"0 4px 12px rgba(0,0,0,0.3)",
            }}>{name?.[0]?.toUpperCase() || "?"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
              <div style={{fontSize:11,color:"#fbbf24",marginTop:2,fontWeight:700}}>
                📈 {totalPoints} {t("welcome.pts")}
              </div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div style={{padding:"12px 12px",flex:1}}>
          <SidebarItem icon="📊" label={t("sidebar.myStats")} onClick={()=>{onClose();onShowProfile();}}/>
          <SidebarItem
            icon="🏅"
            label={`${t("sidebar.achievements")}${unlockedCount ? ` (${unlockedCount})` : ""}`}
            onClick={()=>{onClose();onShowAchievements();}}
          />
          <SidebarItem icon="🎓" label={t("sidebar.tutorial")} onClick={()=>{onClose();onShowTutorial();}}/>
          <SidebarItem icon="ⓘ" label={t("sidebar.scoringRules")} onClick={()=>{onClose();onShowRules();}}/>
          <SidebarItem icon="💾" label={t("sidebar.backup")} onClick={()=>{onClose();onShowBackup();}}/>

          <div style={{
            margin:"14px 12px",height:1,background:"rgba(71,85,105,0.3)",
          }}/>

          {/* Language selector */}
          <div style={{padding:"4px 12px",marginBottom:10}}>
            <div style={{fontSize:9,color:"#64748b",letterSpacing:2,marginBottom:6,fontWeight:700}}>
              🌐 {t("sidebar.language")}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setLang("en")} style={{
                flex:1,padding:"8px 10px",borderRadius:8,
                background: lang==="en" ? "linear-gradient(135deg,#fbbf24,#d97706)" : "rgba(30,41,59,0.6)",
                color: lang==="en" ? "#0a0e1c" : "#cbd5e1",
                border: lang==="en" ? "none" : "1px solid rgba(71,85,105,0.4)",
                fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                letterSpacing:1,
              }}>EN English</button>
              <button onClick={()=>setLang("he")} style={{
                flex:1,padding:"8px 10px",borderRadius:8,
                background: lang==="he" ? "linear-gradient(135deg,#fbbf24,#d97706)" : "rgba(30,41,59,0.6)",
                color: lang==="he" ? "#0a0e1c" : "#cbd5e1",
                border: lang==="he" ? "none" : "1px solid rgba(71,85,105,0.4)",
                fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                letterSpacing:1,
              }}>עב עברית</button>
            </div>
          </div>

          <div style={{
            margin:"14px 12px",height:1,background:"rgba(71,85,105,0.3)",
          }}/>

          <SidebarItem icon="🚪" label={t("sidebar.logOut")} onClick={()=>{onClose();onLogout();}}/>
          <SidebarItem icon="🗑️" label={t("sidebar.deleteAll")} danger onClick={()=>{onClose();onReset();}}/>
        </div>

        {/* Footer */}
        <div style={{padding:"14px 20px",borderTop:"1px solid rgba(71,85,105,0.3)",fontSize:10,color:"#64748b",textAlign:"center"}}>
          ⚽ {t("sidebar.footer")}
          <div style={{fontSize:9,color:"#475569",marginTop:4,letterSpacing:1,fontFamily:"monospace"}}>
            v{APP_VERSION}
          </div>
        </div>
      </div>
    </>
  );
}

function SidebarItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      display:"flex",alignItems:"center",gap:12,
      width:"100%",
      background:"transparent",border:"none",
      padding:"12px 14px",borderRadius:8,
      cursor:"pointer",fontFamily:"inherit",
      color: danger ? "#f87171" : "#cbd5e1",
      fontSize:14,fontWeight:600,
      textAlign:"start",
      transition:"background 0.15s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = danger ? "rgba(239,68,68,0.1)" : "rgba(251,191,36,0.08)"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <span style={{fontSize:18,minWidth:24,textAlign:"center"}}>{icon}</span>
      <span style={{flex:1}}>{label}</span>
    </button>
  );
}

// ─── COUNTDOWN BAR: time until first match kickoff ──────────────────────────
// ─── ACHIEVEMENTS MODAL: shows all badges, locked + unlocked ──────────────
function AchievementsModal({ unlockedIds, onClose }) {
  const t = useT();
  const unlockedCount = unlockedIds.size;
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlockedCount / total) * 100);

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9000,
      background:"rgba(0,0,0,0.85)",
      backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:14,animation:"goalFadeIn 0.3s ease-out",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto",
        background:"linear-gradient(180deg,#1a1f3a,#0f1424)",
        border:"1px solid rgba(251,191,36,0.3)",
        borderRadius:18,padding:"22px 18px",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <h2 style={{margin:0,fontSize:20,color:"#fbbf24",fontWeight:900}}>
            🏅 {t("achv.title")}
          </h2>
          <button onClick={onClose} style={{
            background:"transparent",border:"none",color:"#94a3b8",fontSize:22,
            cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",
          }}>✕</button>
        </div>

        <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 16px"}}>
          {t("achv.subtitle")}
        </p>

        {/* Progress bar */}
        <div style={{
          background:"rgba(71,85,105,0.3)",borderRadius:8,
          padding:"10px 14px",marginBottom:18,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",fontWeight:700,marginBottom:6}}>
            <span>{unlockedCount} / {total}</span>
            <span>{pct}%</span>
          </div>
          <div style={{height:6,background:"rgba(15,20,36,0.5)",borderRadius:3,overflow:"hidden"}}>
            <div style={{
              width:`${pct}%`,height:"100%",
              background:"linear-gradient(90deg,#fbbf24,#f59e0b)",
              borderRadius:3,transition:"width 0.4s",
            }}/>
          </div>
        </div>

        {/* Badges grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:10}}>
          {ACHIEVEMENTS.map(a => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <div key={a.id} style={{
                padding:"12px 10px",
                background: unlocked
                  ? `linear-gradient(135deg, ${a.color}22, rgba(15,20,36,0.5))`
                  : "rgba(15,20,36,0.5)",
                border: `1px solid ${unlocked ? a.color + "66" : "rgba(71,85,105,0.3)"}`,
                borderRadius:12,
                opacity: unlocked ? 1 : 0.5,
                position:"relative",
              }}>
                <div style={{display:"flex",alignItems:"start",gap:8}}>
                  <div style={{
                    fontSize:30,
                    filter: unlocked ? `drop-shadow(0 0 8px ${a.color}66)` : "grayscale(1)",
                    flexShrink:0,
                  }}>{a.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:800,color: unlocked ? a.color : "#94a3b8",lineHeight:1.2,marginBottom:3}}>
                      {t(`achv.${a.id}.name`)}
                    </div>
                    <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.3}}>
                      {t(`achv.${a.id}.desc`)}
                    </div>
                  </div>
                </div>
                {!unlocked && (
                  <div style={{position:"absolute",top:6,insetInlineEnd:8,fontSize:10}}>🔒</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── NEW BADGE POPUP: pops up when a new badge is unlocked ────────────────
function NewBadgePopup({ achievement, onClose }) {
  const t = useT();
  useEffect(() => {
    if (!achievement) return;
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [achievement]);
  if (!achievement) return null;

  return (
    <div style={{
      position:"fixed",bottom:80,insetInline:14,zIndex:9500,
      display:"flex",justifyContent:"center",
      pointerEvents:"none",
    }}>
      <style>{`
        @keyframes badgeSlideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(140px) rotate(540deg); opacity: 0; }
        }
      `}</style>

      <div style={{
        background:"linear-gradient(135deg,#1a1f3a,#0f1424)",
        border:`2px solid ${achievement.color}`,
        borderRadius:16,padding:"14px 18px",maxWidth:360,
        boxShadow:`0 12px 32px rgba(0,0,0,0.5), 0 0 24px ${achievement.color}44`,
        animation:"badgeSlideIn 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2)",
        display:"flex",alignItems:"center",gap:12,
        pointerEvents:"auto",cursor:"pointer",
        position:"relative",overflow:"hidden",
      }} onClick={onClose}>
        {/* Confetti */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position:"absolute",
            left:`${Math.random() * 100}%`,
            top:"-10px",
            width:6,height:6,
            background: [achievement.color, "#fbbf24", "#22c55e", "#a855f7", "#ef4444"][i % 5],
            borderRadius: i % 2 ? "50%" : "2px",
            animation:`confettiFall ${1 + Math.random() * 1.2}s ease-in ${Math.random() * 0.5}s forwards`,
            pointerEvents:"none",
          }}/>
        ))}

        <div style={{
          fontSize:38,
          filter: `drop-shadow(0 0 8px ${achievement.color}99)`,
          flexShrink:0,
        }}>{achievement.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:9,color:achievement.color,letterSpacing:2,fontWeight:800,marginBottom:2}}>
            {t("achv.newBadge")}
          </div>
          <div style={{fontSize:14,color:"#f1f5f9",fontWeight:800,lineHeight:1.2,marginBottom:2}}>
            {t(`achv.${achievement.id}.name`)}
          </div>
          <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.3}}>
            {t(`achv.${achievement.id}.desc`)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CountdownBar() {
  const t = useT();
  const [now, setNow] = useState(Date.now());

  // Find the first match kickoff
  const firstKickoff = useMemo(() => {
    const times = FIXTURES.filter(f => f.kickoff).map(f => new Date(f.kickoff).getTime());
    if (times.length === 0) return null;
    return Math.min(...times);
  }, []);

  useEffect(() => {
    // Tick every second for the seconds display
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!firstKickoff) return null;
  const msLeft = firstKickoff - now;
  if (msLeft <= 0) return null; // Tournament has started — hide

  // Calculate days/hours/minutes/seconds
  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const Cell = ({ value, label }) => (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",
      minWidth:38,
    }}>
      <div style={{
        fontSize:18,fontWeight:900,color:"#fbbf24",
        lineHeight:1,fontVariantNumeric:"tabular-nums",
        textShadow:"0 0 8px rgba(251,191,36,0.4)",
      }}>{String(value).padStart(2,"0")}</div>
      <div style={{fontSize:8,color:"#94a3b8",marginTop:3,letterSpacing:1,fontWeight:700}}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{
      background:"linear-gradient(90deg, rgba(251,191,36,0.05), rgba(168,85,247,0.05), rgba(251,191,36,0.05))",
      borderTop:"1px solid rgba(71,85,105,0.2)",
      borderBottom:"1px solid rgba(71,85,105,0.2)",
      padding:"8px 14px",
      display:"flex",alignItems:"center",justifyContent:"center",gap:14,
    }}>
      <div style={{fontSize:10,color:"#fbbf24",letterSpacing:1,fontWeight:700,whiteSpace:"nowrap"}}>
        🏆 {t("countdown.title")}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,direction:"ltr"}}>
        <Cell value={days} label={t("countdown.days")}/>
        <span style={{color:"#475569",fontSize:14,marginTop:-8}}>:</span>
        <Cell value={hours} label={t("countdown.hours")}/>
        <span style={{color:"#475569",fontSize:14,marginTop:-8}}>:</span>
        <Cell value={minutes} label={t("countdown.minutes")}/>
        <span style={{color:"#475569",fontSize:14,marginTop:-8}}>:</span>
        <Cell value={seconds} label={t("countdown.seconds")}/>
      </div>
    </div>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{
        position: "fixed",
        bottom: 70,
        right: 16,
        zIndex: 50,
        width: 44, height: 44,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#fbbf24,#d97706)",
        border: "none",
        color: "#0a0e1c",
        fontSize: 20,
        fontWeight: 900,
        cursor: "pointer",
        fontFamily: "inherit",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 16px rgba(251,191,36,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeUp 0.3s ease-out",
        transition: "transform 0.2s",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >⬆</button>
  );
}

// ─── RECAP MODAL: summary of matches that finished since user's last visit ───
function RecapModal({ recap, onClose }) {
  const t = useT();
  if (!recap || !recap.newMatches?.length) return null;
  const { newMatches, totalPoints } = recap;
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9000,
      background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:16,animation:"goalFadeIn 0.3s ease-out",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
        border:"1px solid rgba(251,191,36,0.4)",
        borderRadius:18,padding:"22px 18px",
        maxWidth:460,width:"100%",maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <style>{`@keyframes goalFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:34,marginBottom:4}}>📊</div>
          <h2 style={{
            margin:0,fontSize:20,
            background:"linear-gradient(180deg,#fde68a,#f59e0b)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            fontWeight:900,
          }}>{t("recap.title")}</h2>
          <p style={{margin:"4px 0 0",fontSize:12,color:"#94a3b8"}}>
            {t("recap.subtitle").replace("{n}", newMatches.length)}
          </p>
        </div>

        {/* Big point total */}
        <div style={{
          textAlign:"center",
          background: totalPoints > 0
            ? "linear-gradient(135deg,rgba(34,197,94,0.18),rgba(15,20,36,0.5))"
            : "linear-gradient(135deg,rgba(71,85,105,0.15),rgba(15,20,36,0.5))",
          border:`1px solid ${totalPoints > 0 ? "rgba(34,197,94,0.5)" : "rgba(71,85,105,0.4)"}`,
          borderRadius:12,padding:"12px 10px",marginBottom:14,
        }}>
          <div style={{fontSize:10,color:totalPoints > 0 ? "#22c55e" : "#64748b",letterSpacing:3,marginBottom:2,fontWeight:700}}>
            {t("recap.youEarned")}
          </div>
          <div style={{fontSize:36,fontWeight:900,color:totalPoints > 0 ? "#22c55e" : "#64748b",lineHeight:1}}>
            +{totalPoints}
          </div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{t("welcome.pts")}</div>
        </div>

        {/* Per-match recap */}
        <div style={{maxHeight:320,overflowY:"auto",marginBottom:14}}>
          {newMatches.map(({ fixture, actual, pick, score }, i) => {
            const home = findTeam(fixture.home);
            const away = findTeam(fixture.away);
            const userPicked = pick && pick.h !== undefined && pick.h !== "";
            const scoreColor = score.type === "exact" ? "#fbbf24"
              : score.type === "result" ? "#22c55e"
              : score.type === "wrong" ? "#f87171" : "#475569";
            const scoreBg = score.type === "exact" ? "rgba(251,191,36,0.12)"
              : score.type === "result" ? "rgba(34,197,94,0.1)"
              : score.type === "wrong" ? "rgba(239,68,68,0.08)" : "rgba(30,41,59,0.4)";
            return (
              <div key={fixture.id} style={{
                background: scoreBg,
                border: `1px solid ${scoreColor}55`,
                borderRadius:10,padding:"8px 10px",marginBottom:6,
              }}>
                {/* Match teams + actual score */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:userPicked ? 4 : 0}}>
                  <span style={{fontSize:16,flexShrink:0}}>{home?.f}</span>
                  <span style={{flex:1,fontSize:12,color:"#f1f5f9",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{home?.n}</span>
                  <span style={{fontSize:14,fontWeight:900,color:"#fff",letterSpacing:1,fontVariantNumeric:"tabular-nums"}}>
                    {actual.h} - {actual.a}
                  </span>
                  <span style={{flex:1,fontSize:12,color:"#f1f5f9",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{away?.n}</span>
                  <span style={{fontSize:16,flexShrink:0}}>{away?.f}</span>
                </div>
                {/* User's pick + points earned */}
                {userPicked ? (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:10,paddingTop:4,borderTop:"1px dashed rgba(71,85,105,0.3)"}}>
                    <span style={{color:"#94a3b8"}}>
                      {t("recap.youPicked")}: <strong style={{color:"#cbd5e1"}}>{pick.h}-{pick.a}</strong>
                    </span>
                    <span style={{color:scoreColor,fontWeight:900,fontSize:12}}>
                      {score.type === "exact" && `🎯 +${score.points}`}
                      {score.type === "result" && `✅ +${score.points}`}
                      {score.type === "wrong" && `❌ +0`}
                    </span>
                  </div>
                ) : (
                  <div style={{fontSize:10,color:"#64748b",textAlign:"center",paddingTop:3,fontStyle:"italic"}}>
                    {t("recap.noPickMade")}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onClose} style={primaryBtn}>{t("recap.gotIt")}</button>
      </div>
    </div>
  );
}

// ─── SCORING RULES: floating info modal accessible from anywhere ──────────────
function ScoringRulesModal({ onClose }) {
  const t = useT();
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9000,
      background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:16,animation:"goalFadeIn 0.2s ease-out",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
        border:"1px solid rgba(251,191,36,0.4)",
        borderRadius:18,padding:"22px 20px",
        maxWidth:440,width:"100%",maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <style>{`
          @keyframes goalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:32,marginBottom:4}}>🎯</div>
          <h2 style={{
            margin:0,fontSize:20,
            background:"linear-gradient(180deg,#fde68a,#f59e0b)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            fontWeight:900,
          }}>{t("welcome.scoring")}</h2>
        </div>

        {/* Group stage */}
        <div style={{background:"rgba(15,20,36,0.6)",border:"1px solid rgba(71,85,105,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
          <div style={{fontSize:10,color:"#94a3b8",letterSpacing:2,marginBottom:8,fontWeight:700}}>⚽ {t("rules.groupStage")}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#cbd5e1",marginBottom:6}}>
            <span>{t("welcome.exactScore")}</span>
            <span style={{color:"#fbbf24",fontWeight:800}}>+5 {t("welcome.pts")}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#cbd5e1"}}>
            <span>{t("welcome.rightResultOnly")}</span>
            <span style={{color:"#22c55e",fontWeight:800}}>+3 {t("welcome.pts")}</span>
          </div>
        </div>

        {/* Knockout */}
        <div style={{background:"linear-gradient(135deg,rgba(168,85,247,0.1),rgba(15,20,36,0.6))",border:"1px solid rgba(168,85,247,0.4)",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
          <div style={{fontSize:10,color:"#a855f7",letterSpacing:2,marginBottom:8,fontWeight:700}}>🔥 {t("rules.knockoutDouble")}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#cbd5e1",marginBottom:6}}>
            <span>{t("welcome.exactScore")}</span>
            <span style={{color:"#fbbf24",fontWeight:800}}>+10 {t("welcome.pts")}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#cbd5e1"}}>
            <span>{t("welcome.rightResultOnly")}</span>
            <span style={{color:"#22c55e",fontWeight:800}}>+6 {t("welcome.pts")}</span>
          </div>
        </div>

        {/* Bonus bets */}
        <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(15,20,36,0.6))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:8,fontWeight:700}}>⭐ {t("rules.bonusBets")}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#cbd5e1",marginBottom:5}}>
            <span>🏆 {t("rules.tournamentWinner")}</span>
            <span style={{color:"#fbbf24",fontWeight:700}}>+20</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#cbd5e1"}}>
            <span>👟 {t("rules.topScorerGoal")}</span>
            <span style={{color:"#a855f7",fontWeight:700}}>+2</span>
          </div>
        </div>

        <button onClick={onClose} style={primaryBtn}>{t("profile.close")}</button>
      </div>
    </div>
  );
}

function BonusPicks({
  winnerPick, setWinnerPick,
  topScorerPick, setTopScorerPick,
  actualWinner, actualTopScorer,
  isLocked, onBack,
  topScorers = [], topScorersFetchedAt, topScorersError,
}) {
  const t = useT();
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
      <button onClick={onBack} style={{...ghostBtn,marginBottom:14,padding:"7px 14px",width:"auto"}}>{t("welcome.back")}</button>

      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3}}>{t("bonus.bonusPicks")}</div>
        <h2 style={{fontSize:24,margin:"4px 0",background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>{t("bonus.title")}</h2>
        <p style={{fontSize:12,color:"#94a3b8",margin:0}}>{t("bonus.subtitle")}</p>
      </div>

      {isLocked && (
        <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#fca5a5",textAlign:"center"}}>
          {t("bonus.locked")}
        </div>
      )}

      {/* ─── TOURNAMENT WINNER ─── */}
      <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(15,20,36,0.6))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:14,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:"#fbbf24",letterSpacing:2,fontWeight:700}}>{t("bonus.tournamentWinner")}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{t("bonus.pickOneTeam")}</div>
          </div>
          <div style={{background:"#fbbf24",color:"#0a0e1c",fontSize:11,fontWeight:900,padding:"3px 8px",borderRadius:6,letterSpacing:1}}>{t("bonus.fiftyPts")}</div>
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
              <button onClick={()=>setWinnerPick(null)} style={{background:"rgba(10,14,28,0.2)",border:"none",borderRadius:6,padding:"4px 10px",color:"#0a0e1c",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("bonus.change")}</button>
            )}
            {actualWinner && (
              <div style={{fontSize:11,fontWeight:900}}>
                {(actualWinner.name||actualWinner.n) === (winnerPick.name||winnerPick.n) ? "✅ +20" : "❌"}
              </div>
            )}
          </div>
        ) : !isLocked ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(94px,1fr))",gap:5}}>
            {allTeams.map(team => (
              <button key={team.n} onClick={()=>setWinnerPick({name:team.n, flag:team.f})} style={{
                background:"rgba(30,41,59,0.6)",border:"1px solid rgba(71,85,105,0.4)",
                borderRadius:8,padding:"7px 4px",color:"#cbd5e1",fontSize:11,
                cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:5,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              }}>
                <span style={{fontSize:14}}>{team.f}</span>
                <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left"}}>{team.n}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{fontSize:11,color:"#64748b",textAlign:"center",padding:"10px 0"}}>{t("bonus.noPickMade")}</div>
        )}
      </div>

      {/* ─── TOP SCORER ─── */}
      <div style={{background:"linear-gradient(135deg,rgba(168,85,247,0.08),rgba(15,20,36,0.6))",border:"1px solid rgba(168,85,247,0.3)",borderRadius:14,padding:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:"#a855f7",letterSpacing:2,fontWeight:700}}>{t("bonus.goldenBoot")}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{t("bonus.pickPlayer")}</div>
          </div>
          <div style={{background:"#a855f7",color:"#0a0e1c",fontSize:11,fontWeight:900,padding:"3px 8px",borderRadius:6,letterSpacing:1}}>{t("bonus.fivePerGoal")}</div>
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
              <button onClick={()=>setTopScorerPick(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,padding:"4px 10px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("bonus.change")}</button>
            )}
            {actualTopScorer && (
              <div style={{textAlign:"center",fontSize:10}}>
                <div style={{fontWeight:900,fontSize:13}}>
                  {actualTopScorer.name === topScorerPick.name ? `+${actualTopScorer.goals * 2}` : "❌"}
                </div>
                {actualTopScorer.name === topScorerPick.name && <div style={{opacity:0.85}}>{actualTopScorer.goals} {t("bonus.goals")}</div>}
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
              }}>{t("bonus.fromFavorites")}</button>
              <button onClick={()=>setScorerMode("custom")} style={{
                flex:1,padding:"6px 0",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",
                background:scorerMode==="custom"?"rgba(168,85,247,0.2)":"transparent",
                color:scorerMode==="custom"?"#a855f7":"#94a3b8",
                fontSize:11,fontWeight:700,
              }}>{t("bonus.enterManually")}</button>
            </div>

            {scorerMode === "list" && (
              <>
                <input value={scorerFilter} onChange={e=>setScorerFilter(e.target.value)} placeholder={t("bonus.searchPlaceholder")} style={{
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
                    <div style={{fontSize:11,color:"#64748b",textAlign:"center",padding:"10px"}}>{t("bonus.noMatches")}</div>
                  )}
                </div>
              </>
            )}

            {scorerMode === "custom" && (
              <div>
                <input value={customPlayer} onChange={e=>setCustomPlayer(e.target.value)} placeholder={t("bonus.playerName")} style={{
                  width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                  background:"#0a0e1c",border:"1px solid rgba(71,85,105,0.4)",
                  color:"#f1f5f9",fontFamily:"inherit",outline:"none",
                  marginBottom:6,boxSizing:"border-box",
                }}/>
                <input value={customTeam} onChange={e=>setCustomTeam(e.target.value)} placeholder={t("bonus.team")} style={{
                  width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                  background:"#0a0e1c",border:"1px solid rgba(71,85,105,0.4)",
                  color:"#f1f5f9",fontFamily:"inherit",outline:"none",
                  marginBottom:8,boxSizing:"border-box",
                }}/>
                <button onClick={submitCustom} disabled={!customPlayer.trim()||!customTeam.trim()} style={{
                  ...primaryBtn,opacity:(!customPlayer.trim()||!customTeam.trim())?0.5:1,
                }}>{t("bonus.lockIn")}</button>
              </div>
            )}
          </>
        ) : (
          <div style={{fontSize:11,color:"#64748b",textAlign:"center",padding:"10px 0"}}>{t("bonus.noPickMade")}</div>
        )}
      </div>

      {/* ─── TOP SCORERS LEADERBOARD — always visible ─── */}
      <div style={{
        marginTop:14,
        background:"linear-gradient(135deg,rgba(168,85,247,0.05),rgba(15,20,36,0.6))",
        border:"1px solid rgba(168,85,247,0.3)",
        borderRadius:14,padding:14,
      }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:11,color:"#a855f7",letterSpacing:2,fontWeight:700}}>📊 {t("bonus.topScorersLive")}</div>
            <div style={{fontSize:9,color:"#64748b"}}>
              {topScorersError ? `⚠️ ${topScorersError}` :
                topScorersFetchedAt ? `${t("bonus.updated")} ${Math.max(0,Math.round((Date.now()-topScorersFetchedAt)/60000))}m ${t("bonus.minAgo")}` :
                t("bonus.loadingScorers")}
            </div>
          </div>

          {topScorers.length === 0 ? (
            <div style={{fontSize:11,color:"#64748b",textAlign:"center",padding:"16px 0",fontStyle:"italic"}}>
              {t("bonus.noScorersYet")}
            </div>
          ) : (
            <>
              {/* Top 10 */}
              <div>
                {topScorers.slice(0, 10).map((s, i) => {
                  const isMine = topScorerPick && s.name === topScorerPick.name;
                  return (
                    <div key={s.name+i} style={{
                      display:"flex",alignItems:"center",gap:8,
                      padding:"6px 8px",
                      background: isMine ? "rgba(168,85,247,0.2)" : "transparent",
                      border: isMine ? "1px solid rgba(168,85,247,0.5)" : "1px solid transparent",
                      borderRadius:6,
                      marginBottom:2,
                    }}>
                      <span style={{
                        fontSize:11,color: s.rank===1?"#fbbf24":s.rank===2?"#cbd5e1":s.rank===3?"#d97706":"#64748b",
                        fontWeight:800,minWidth:20,textAlign:"center",
                      }}>
                        {s.rank===1?"🥇":s.rank===2?"🥈":s.rank===3?"🥉":`${s.rank}.`}
                      </span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#f1f5f9",fontWeight:isMine?700:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {s.name}
                          {isMine && <span style={{fontSize:9,color:"#a855f7",marginLeft:6,letterSpacing:1,fontWeight:800}}>👟 {t("bonus.yourPick")}</span>}
                        </div>
                        <div style={{fontSize:10,color:"#64748b"}}>{s.team}</div>
                      </div>
                      <div style={{fontSize:14,color:"#fbbf24",fontWeight:900}}>{s.goals}</div>
                      <span style={{fontSize:11}}>⚽</span>
                    </div>
                  );
                })}
              </div>

              {/* If user's pick is OUTSIDE top 10, show their rank separately */}
              {topScorerPick && (() => {
                const myPick = topScorers.find(s => s.name === topScorerPick.name);
                if (!myPick || myPick.rank <= 10) return null;
                return (
                  <>
                    <div style={{height:1,background:"rgba(71,85,105,0.3)",margin:"8px 0",borderTop:"1px dashed rgba(71,85,105,0.4)"}}/>
                    <div style={{
                      display:"flex",alignItems:"center",gap:8,
                      padding:"6px 8px",
                      background:"rgba(168,85,247,0.2)",
                      border:"1px solid rgba(168,85,247,0.5)",
                      borderRadius:6,
                    }}>
                      <span style={{fontSize:11,color:"#a855f7",fontWeight:800,minWidth:30,textAlign:"center"}}>#{myPick.rank}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#f1f5f9",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {myPick.name}
                          <span style={{fontSize:9,color:"#a855f7",marginLeft:6,letterSpacing:1,fontWeight:800}}>👟 {t("bonus.yourPick")}</span>
                        </div>
                        <div style={{fontSize:10,color:"#64748b"}}>{myPick.team}</div>
                      </div>
                      <div style={{fontSize:14,color:"#fbbf24",fontWeight:900}}>{myPick.goals}</div>
                      <span style={{fontSize:11}}>⚽</span>
                    </div>
                  </>
                );
              })()}

              {/* If user's pick hasn't scored at all (not in API list) */}
              {topScorerPick && !topScorers.find(s => s.name === topScorerPick.name) && (
                <>
                  <div style={{height:1,background:"rgba(71,85,105,0.3)",margin:"8px 0",borderTop:"1px dashed rgba(71,85,105,0.4)"}}/>
                  <div style={{
                    display:"flex",alignItems:"center",gap:8,
                    padding:"6px 8px",
                    background:"rgba(71,85,105,0.15)",
                    border:"1px dashed rgba(71,85,105,0.4)",
                    borderRadius:6,
                  }}>
                    <span style={{fontSize:11,color:"#64748b",fontWeight:800,minWidth:30,textAlign:"center"}}>—</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:"#cbd5e1",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {topScorerPick.name}
                        <span style={{fontSize:9,color:"#a855f7",marginLeft:6,letterSpacing:1,fontWeight:800}}>👟 {t("bonus.yourPick")}</span>
                      </div>
                      <div style={{fontSize:10,color:"#64748b"}}>{topScorerPick.team} · {t("bonus.notScoredYet")}</div>
                    </div>
                    <div style={{fontSize:14,color:"#64748b",fontWeight:900}}>0</div>
                    <span style={{fontSize:11,opacity:0.4}}>⚽</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
    </div>
  );
}

function Welcome({ onStart, onImport }) {
  const t = useT();
  const [name, setName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  // Cycle through fun taglines (English only — Hebrew uses a static one)
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
        <h1 style={{fontSize:24,textAlign:"center",margin:"0 0 6px",background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>{t("welcome.title")}</h1>
        <p style={{textAlign:"center",color:"#94a3b8",fontSize:12,margin:"0 0 16px",fontStyle:"italic"}}>{t("welcome.subtitle") || tagline}</p>

        {/* Scoring rules preview */}
        <div style={{background:"rgba(15,20,36,0.6)",border:"1px solid rgba(71,85,105,0.3)",borderRadius:10,padding:"10px 12px",marginBottom:18}}>
          <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:6,textAlign:"center"}}>{t("welcome.scoring")}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:3}}>
            <span>{t("welcome.exactScore")}</span><span style={{color:"#fbbf24",fontWeight:700}}>+5 {t("welcome.pts")}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:6}}>
            <span>{t("welcome.rightResultOnly")}</span><span style={{color:"#22c55e",fontWeight:700}}>+3 {t("welcome.pts")}</span>
          </div>
          <div style={{
            borderTop:"1px dashed rgba(71,85,105,0.4)",
            paddingTop:6,marginTop:4,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,color:"#fbbf24",fontWeight:700,letterSpacing:1,marginBottom:4}}>
              <span>{t("welcome.knockoutDouble")}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:2}}>
              <span>{t("welcome.exactScore")}</span><span style={{color:"#fbbf24",fontWeight:700}}>+10 {t("welcome.pts")}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1"}}>
              <span>{t("welcome.rightResultOnly")}</span><span style={{color:"#22c55e",fontWeight:700}}>+6 {t("welcome.pts")}</span>
            </div>
          </div>
        </div>

        {!showImport ? (
          <div>
            <label style={lbl}>{t("welcome.yourName")}</label>
            <input autoFocus placeholder={t("welcome.namePlaceholder")} value={name}
              onChange={e=>{setName(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&(name.trim()?onStart(name.trim()):setErr(t("welcome.enterName")))}
              maxLength={20} style={inputStyle}/>
            {name.trim() && (
              <div style={{fontSize:12,color:"#fbbf24",textAlign:"center",marginBottom:8,animation:"fadeUp 0.3s ease-out"}}>
                {t("welcome.welcomeGreeting")} <strong>{name.trim()}</strong>! {t("welcome.welcomeQuestion")}
              </div>
            )}
            {err && <div style={errStyle}>⚠️ {err}</div>}
            <button onClick={()=>name.trim()?onStart(name.trim()):setErr(t("welcome.enterName"))} style={primaryBtn}>
              {name.trim() ? `${t("welcome.letsGo")} ${name.trim().split(" ")[0]}! →` : t("welcome.letsPredict")}
            </button>
            <div style={{textAlign:"center",margin:"14px 0 8px",color:"#475569",fontSize:11,letterSpacing:2}}>{t("welcome.or")}</div>
            <button onClick={()=>setShowImport(true)} style={ghostBtn}>{t("welcome.importCode")}</button>
          </div>
        ) : (
          <div>
            <label style={lbl}>{t("welcome.pasteCode")}</label>
            <textarea autoFocus placeholder="WC26P|..." value={code}
              onChange={e=>{setCode(e.target.value);setErr("");}} rows={3}
              style={{...inputStyle,fontFamily:"monospace",fontSize:11,resize:"vertical"}}/>
            {err && <div style={errStyle}>⚠️ {err}</div>}
            <button onClick={()=>{
              const d = decodePicks(code);
              if (!d) { setErr(t("welcome.invalidCode")); return; }
              onImport(d);
            }} style={primaryBtn}>{t("welcome.import")}</button>
            <button onClick={()=>{setShowImport(false);setErr("");}} style={{...ghostBtn,marginTop:10}}>{t("welcome.back")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ fixture, pick, actual, onPick, showResults, homeInputId, awayInputId, nextInputId, lockable = true, leagueMembers = null }) {
  const t = useT();
  const home = findTeam(fixture.home);
  const away = findTeam(fixture.away);
  const h = pick?.h ?? "";
  const a = pick?.a ?? "";
  const hasResult = h !== "" && a !== "";

  // ─── LEAGUE INSIGHTS: show % of league picks after match has started ──
  const insights = useMemo(() => {
    if (!leagueMembers || !fixture.kickoff) return null;
    const matchStarted = Date.now() >= new Date(fixture.kickoff).getTime();
    if (!matchStarted) return null;
    let homeWin = 0, draw = 0, awayWin = 0, total = 0;
    for (const m of leagueMembers) {
      const p = m.picks?.[fixture.id];
      if (!p || p.h === undefined || p.h === "" || p.a === undefined || p.a === "") continue;
      const ph = parseInt(p.h), pa = parseInt(p.a);
      if (isNaN(ph) || isNaN(pa)) continue;
      total++;
      if (ph > pa) homeWin++;
      else if (ph < pa) awayWin++;
      else draw++;
    }
    if (total === 0) return null;
    return {
      total,
      home: Math.round((homeWin / total) * 100),
      draw: Math.round((draw / total) * 100),
      away: Math.round((awayWin / total) * 100),
    };
  }, [leagueMembers, fixture.id, fixture.kickoff]);

  // ─── LOCKOUT: matches lock 1 hour before kickoff ──
  const LOCK_MS = 60 * 60 * 1000; // 1 hour
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!lockable) return;
    // Re-check the clock every 30s so we lock automatically as time approaches
    const intervalId = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(intervalId);
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
    result: {bg:"rgba(34,197,94,0.15)", border:"#22c55e", text:"#22c55e", label:"✅ WINNER"},
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
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:8,direction:"ltr"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end",opacity:result==="away"?0.5:1}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:0}}>
            <span style={{fontSize:13,fontWeight:result==="home"?800:500,color:"#f1f5f9",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{home.n}</span>
            {fifaRank(home.n) && (
              <span style={{fontSize:9,color:"#64748b",letterSpacing:0.5,marginTop:1}}>#{fifaRank(home.n)}</span>
            )}
          </div>
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
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",minWidth:0}}>
            <span style={{fontSize:13,fontWeight:result==="away"?800:500,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{away.n}</span>
            {fifaRank(away.n) && (
              <span style={{fontSize:9,color:"#64748b",letterSpacing:0.5,marginTop:1}}>#{fifaRank(away.n)}</span>
            )}
          </div>
        </div>
      </div>
      {actual && actual.h !== undefined && actual.h !== "" && (
        <div style={{
          marginTop:8,paddingTop:8,
          borderTop:"1px solid rgba(71,85,105,0.3)",
        }}>
          <div style={{
            display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:8,
            padding:"6px 4px",direction:"ltr",
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
              {score?.type === "result" && " · right winner ✅"}
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

      {/* 🧠 LEAGUE INSIGHTS: % pick distribution, shown after kickoff */}
      {insights && (
        <div style={{
          marginTop:10,padding:"8px 10px",
          background:"linear-gradient(135deg,rgba(168,85,247,0.08),rgba(15,20,36,0.4))",
          border:"1px solid rgba(168,85,247,0.25)",
          borderRadius:8,
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:9,color:"#a855f7",letterSpacing:2,fontWeight:700}}>🧠 {t("insights.yourLeague")}</span>
            <span style={{fontSize:9,color:"#64748b"}}>{insights.total} {insights.total===1 ? t("insights.pick") : t("insights.picks")}</span>
          </div>
          {/* Three-segment bar showing %s */}
          <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:"rgba(15,20,36,0.6)",marginBottom:5}}>
            {insights.home > 0 && (
              <div style={{
                width:`${insights.home}%`,
                background:"linear-gradient(90deg,#22c55e,#16a34a)",
                transition:"width 0.5s",
              }}/>
            )}
            {insights.draw > 0 && (
              <div style={{
                width:`${insights.draw}%`,
                background:"linear-gradient(90deg,#64748b,#475569)",
                transition:"width 0.5s",
              }}/>
            )}
            {insights.away > 0 && (
              <div style={{
                width:`${insights.away}%`,
                background:"linear-gradient(90deg,#3b82f6,#2563eb)",
                transition:"width 0.5s",
              }}/>
            )}
          </div>
          {/* Three-column legend */}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontVariantNumeric:"tabular-nums"}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:11}}>{home?.f}</span>
              <span style={{color:"#22c55e",fontWeight:700}}>{insights.home}%</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{color:"#94a3b8",fontWeight:700}}>{t("insights.draw")} {insights.draw}%</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{color:"#3b82f6",fontWeight:700}}>{insights.away}%</span>
              <span style={{fontSize:11}}>{away?.f}</span>
            </div>
          </div>
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

// ─── TODAY SCREEN: matches happening today/tomorrow ──────────────────────────
function TodayScreen({ picks, actuals, onPick, onBack, onGoToBracket, leagueMembers = null }) {
  const t = useT();

  // Group all fixtures (group + knockout) by date
  // For group matches we already have kickoff. For KO we use KO_SCHEDULE.
  const allMatches = useMemo(() => {
    const list = [];
    // Group stage
    FIXTURES.forEach(f => {
      if (f.kickoff) list.push({ type: "group", fixture: f, kickoff: f.kickoff });
    });
    // Knockout (only show if we have a kickoff and slot is ready)
    Object.entries(KO_SCHEDULE).forEach(([slotId, sched]) => {
      if (sched.kickoff) list.push({ type: "ko", slotId, kickoff: sched.kickoff, venue: sched.venue });
    });
    return list.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  }, []);

  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(); tomorrowEnd.setDate(tomorrowEnd.getDate() + 2); tomorrowEnd.setHours(0, 0, 0, 0);

  // Bucket matches by day
  const todayMatches = [];
  const tomorrowMatches = [];
  const liveOrJustEndedMatches = [];
  for (const m of allMatches) {
    const k = new Date(m.kickoff).getTime();
    if (k < todayStart.getTime()) {
      // Possibly live / just ended (within last 3 hours)
      if (k > now - 3 * 60 * 60 * 1000 && k < now) {
        liveOrJustEndedMatches.push(m);
      }
      continue;
    }
    const isToday = k < todayStart.getTime() + 24 * 60 * 60 * 1000;
    if (isToday) todayMatches.push(m);
    else if (k < tomorrowEnd.getTime()) tomorrowMatches.push(m);
  }

  const renderMatchRow = (m) => {
    if (m.type === "group") {
      const f = m.fixture;
      const p = picks[f.id];
      const a = actuals[f.id];
      const hasPick = p && p.h !== undefined && p.h !== "";
      const hasResult = a && a.h !== undefined && a.h !== "";
      const lockMs = new Date(f.kickoff).getTime() - Date.now();
      const isLocked = lockMs < 60 * 60 * 1000;
      const needsPick = !hasPick && !isLocked;

      const kf = formatKickoff(f.kickoff);

      return (
        <MatchCard
          key={f.id}
          fixture={f}
          pick={p}
          actual={a}
          onPick={(field, val) => onPick(f.id, field, val)}
          showResults={hasResult}
          homeInputId={`today-h-${f.id}`}
          awayInputId={`today-a-${f.id}`}
          nextInputId={null}
          lockable={true}
          leagueMembers={leagueMembers}
        />
      );
    }
    // KO match — read-only summary card (can't easily predict score here without slot context)
    const k = formatKickoff(m.kickoff);
    return (
      <div key={m.slotId} style={{
        background:"rgba(168,85,247,0.05)",
        border:"1px solid rgba(168,85,247,0.3)",
        borderRadius:12,padding:"10px 14px",marginBottom:8,
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:10,color:"#a855f7",letterSpacing:2,fontWeight:700}}>🏆 KNOCKOUT · {m.slotId}</span>
          <span style={{fontSize:10,color:"#94a3b8"}}>📅 {k.day} · 🕐 {k.time}</span>
        </div>
        {m.venue && <div style={{fontSize:10,color:"#64748b"}}>📍 {m.venue}</div>}
        <button onClick={onGoToBracket} style={{
          marginTop:8,width:"100%",
          padding:"6px 10px",background:"rgba(168,85,247,0.15)",
          border:"1px solid rgba(168,85,247,0.4)",borderRadius:6,
          color:"#a855f7",fontSize:11,fontWeight:700,cursor:"pointer",
          fontFamily:"inherit",
        }}>{t("today.openBracket")}</button>
      </div>
    );
  };

  const renderEmptySection = (label) => (
    <div style={{textAlign:"center",padding:"20px 12px",color:"#64748b",fontSize:12,fontStyle:"italic"}}>
      {label}
    </div>
  );

  // Count missing predictions for the today/tomorrow group matches
  const missingPicks = [...todayMatches, ...tomorrowMatches]
    .filter(m => m.type === "group")
    .filter(m => {
      const p = picks[m.fixture.id];
      const hasPick = p && p.h !== undefined && p.h !== "";
      const lockMs = new Date(m.kickoff).getTime() - Date.now();
      const isLocked = lockMs < 60 * 60 * 1000;
      return !hasPick && !isLocked;
    }).length;

  return (
    <div style={{padding:"16px 14px 60px",maxWidth:560,margin:"0 auto"}}>
      <button onClick={onBack} style={{...ghostBtn,marginBottom:14,padding:"7px 14px",width:"auto"}}>{t("welcome.back")}</button>

      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3}}>{t("today.upcoming")}</div>
        <h2 style={{
          fontSize:24,margin:"4px 0",
          background:"linear-gradient(180deg,#fde68a,#f59e0b)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          fontWeight:900,
        }}>📅 {t("today.title")}</h2>
        <p style={{fontSize:12,color:"#94a3b8",margin:0}}>{t("today.subtitle")}</p>
      </div>

      {/* Missing picks warning */}
      {missingPicks > 0 && (
        <div style={{
          background:"linear-gradient(135deg,rgba(239,68,68,0.12),rgba(15,20,36,0.5))",
          border:"1px solid rgba(239,68,68,0.4)",
          borderRadius:12,padding:"10px 14px",marginBottom:14,
          display:"flex",alignItems:"center",gap:10,
        }}>
          <span style={{fontSize:22}}>🚨</span>
          <div style={{flex:1,fontSize:12,color:"#fca5a5",lineHeight:1.4}}>
            <strong>{missingPicks} {missingPicks === 1 ? t("today.matchNoPick") : t("today.matchesNoPick")}</strong>
            <div style={{fontSize:10,color:"#f87171",opacity:0.85}}>{t("today.dontMissOut")}</div>
          </div>
        </div>
      )}

      {/* Live / just-ended */}
      {liveOrJustEndedMatches.length > 0 && (
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,color:"#22c55e",letterSpacing:3,marginBottom:8,fontWeight:700}}>
            🔴 {t("today.liveNow")}
          </div>
          {liveOrJustEndedMatches.map(renderMatchRow)}
        </div>
      )}

      {/* Today */}
      <div style={{marginBottom:18}}>
        <div style={{fontSize:11,color:"#fbbf24",letterSpacing:3,marginBottom:8,fontWeight:700}}>
          ⚽ {t("today.today")} ({todayMatches.length})
        </div>
        {todayMatches.length === 0
          ? renderEmptySection(t("today.noMatchesToday"))
          : todayMatches.map(renderMatchRow)}
      </div>

      {/* Tomorrow */}
      <div>
        <div style={{fontSize:11,color:"#a78bfa",letterSpacing:3,marginBottom:8,fontWeight:700}}>
          🌅 {t("today.tomorrow")} ({tomorrowMatches.length})
        </div>
        {tomorrowMatches.length === 0
          ? renderEmptySection(t("today.noMatchesTomorrow"))
          : tomorrowMatches.map(renderMatchRow)}
      </div>
    </div>
  );
}

function GroupView({ group, picks, actuals, standings, bestThirds, liveStandings, liveBestThirds, hasActuals, onPick, onNext, onPrev, onJump, isFirst, isLast, showResults, scope = "p", leagueMembers = null }) {
  const t = useT();
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
        gap:6,marginBottom:14,direction:"ltr",
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
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3,marginBottom:4}}>{t("group.groupStage")}</div>
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
        }}>{t("group.group")} {group}</div>
        <div style={{fontSize:10,color:"#475569",letterSpacing:2,marginTop:8}}>{t("group.typeAuto")}</div>
      </div>

      {[1,2,3].map(md => (
        <div key={md} style={{marginBottom:14}}>
          <div style={{fontSize:10,color:"#64748b",letterSpacing:3,marginBottom:6,paddingLeft:4}}>━━ {t("match.matchday")} {md}</div>
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
                leagueMembers={scope === "p" ? leagueMembers : null}
              />
            );
          })}
        </div>
      ))}

      <StandingsTable group={group} standings={standings} bestThirds={bestThirds} liveStandings={liveStandings} liveBestThirds={liveBestThirds} hasActuals={hasActuals} />

      <div style={{display:"flex",gap:10,marginTop:18}}>
        <button onClick={onPrev} disabled={isFirst} style={{...ghostBtn,flex:1,opacity:isFirst?0.4:1,cursor:isFirst?"not-allowed":"pointer"}}>{t("group.previous")}</button>
        <button onClick={onNext} style={{...primaryBtn,flex:2}}>{isLast ? t("group.toBracket") : `${t("group.group")} ${GROUP_KEYS[GROUP_KEYS.indexOf(group)+1]} →`}</button>
      </div>
    </div>
  );
}

// ─── KNOCKOUT BRACKET ─────────────────────────────────────────────────────────

function KnockoutBracket({ standings, bestThirds, liveStandings, liveBestThirds, hasActuals, actualKo = {}, koWinners, setKoWinners, koPicks = {}, setKoPicks = ()=>{}, onBack, onShare, complete, onChampionPicked }) {
  const t = useT();
  // The bracket is now built from REAL results, not predictions.
  // R32 teams come from the actual group standings (liveStandings).
  // R16/QF/SF/FINAL fill in only when actualKo says who won each match.
  // If actuals aren't there yet, slots stay as null (TBD).
  const actualStandings = liveStandings && hasActuals ? liveStandings : null;
  const actualThirds = liveBestThirds && hasActuals ? liveBestThirds : null;
  const r32 = useMemo(
    () => actualStandings ? buildR32(actualStandings, actualThirds) : buildR32({}, []),
    [actualStandings, actualThirds]
  );
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

  // Each round's winners come from `actualKo` (real results from the API), NOT from user picks.
  // Before a result is in, the slot stays null (TBD).
  const r32Winners = r32.map(m => actualKo[m.id] === "a" ? m.a : actualKo[m.id] === "b" ? m.b : null);
  const r16 = []; for (let i=0;i<16;i+=2) r16.push({id:`R16-${i/2}`,a:r32Winners[i],b:r32Winners[i+1]});
  const r16Winners = r16.map(m => actualKo[m.id] === "a" ? m.a : actualKo[m.id] === "b" ? m.b : null);
  const qf = []; for (let i=0;i<8;i+=2) qf.push({id:`QF-${i/2}`,a:r16Winners[i],b:r16Winners[i+1]});
  const qfWinners = qf.map(m => actualKo[m.id] === "a" ? m.a : actualKo[m.id] === "b" ? m.b : null);
  const sf = []; for (let i=0;i<4;i+=2) sf.push({id:`SF-${i/2}`,a:qfWinners[i],b:qfWinners[i+1]});
  const sfWinners = sf.map(m => actualKo[m.id] === "a" ? m.a : actualKo[m.id] === "b" ? m.b : null);
  const final = { id:"FINAL", a:sfWinners[0], b:sfWinners[1] };
  const champion = actualKo[final.id]==="a"?final.a:actualKo[final.id]==="b"?final.b:null;

  // Old "pick winner" function — no longer used since we removed the buttons.
  // Kept as a no-op so any leftover references don't crash.
  const pickWinner = (id, side) => {};

  // Lock knockout picks 1 hour before kickoff (same window as group matches).
  // Re-check every 30s so locks engage smoothly.
  const LOCK_MS = 60 * 60 * 1000;
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const renderMatch = (m) => {
    const ready = m.a && m.b;
    const sched = KO_SCHEDULE[m.id];
    const k = sched ? formatKickoff(sched.kickoff) : null;
    const kickMs = sched ? new Date(sched.kickoff).getTime() : null;
    const isLocked = kickMs != null && (kickMs - nowTs) < LOCK_MS;
    const kp = koPicks[m.id] || { h: "", a: "" };
    const hasPick = kp.h !== "" && kp.a !== "";

    const handleKoScoreChange = (side, val) => {
      const cleaned = val.replace(/\D/g, "").slice(0, 1);
      setKoPicks(prev => ({
        ...prev,
        [m.id]: { ...(prev[m.id] || { h: "", a: "" }), [side]: cleaned },
      }));
    };

    return (
      <div key={m.id} style={{
        background: ready ? "rgba(30,41,59,0.6)" : "rgba(15,20,36,0.4)",
        border: `1px solid ${hasPick ? "rgba(251,191,36,0.4)" : "rgba(71,85,105,0.3)"}`,
        borderRadius: 10, padding: "9px 10px", marginBottom: 8,
        opacity: ready ? 1 : 0.5,
      }}>
        {k && (
          <div style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",
            fontSize:9,color: isLocked ? "#f87171" : "#64748b",letterSpacing:1,
            marginBottom:6,fontWeight:600,
          }}>
            <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>📅 {k.day} · {k.time}</span>
            {isLocked && <span style={{marginLeft:4,whiteSpace:"nowrap"}}>🔒</span>}
          </div>
        )}

        {/* Match row: home team | score inputs | away team */}
        <div style={{
          display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:6,
          direction:"ltr",
        }}>
          {/* Home team (left) */}
          <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0,justifyContent:"flex-end"}}>
            <span style={{fontSize:11,color:"#f1f5f9",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{m.a?.name||m.a?.n||"TBD"}</span>
            <span style={{fontSize:18,flexShrink:0}}>{m.a?.flag||m.a?.f||"❓"}</span>
          </div>

          {/* Score inputs */}
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <input
              type="text"
              inputMode="numeric"
              value={kp.h}
              onChange={e=>handleKoScoreChange("h", e.target.value)}
              onFocus={e=>e.target.select()}
              readOnly={isLocked || !ready}
              placeholder={ready ? (isLocked ? "·" : "—") : ""}
              style={{
                width:30,height:30,textAlign:"center",
                background: (isLocked || !ready) ? "rgba(71,85,105,0.2)" : "#0a0e1c",
                border: `1px solid ${hasPick ? "#fbbf24" : "rgba(71,85,105,0.5)"}`,
                borderRadius:6,color: (isLocked || !ready) ? "#64748b" : "#f1f5f9",
                fontSize:14,fontWeight:800,fontFamily:"inherit",outline:"none",
              }}
            />
            <span style={{color:"#475569",fontSize:13,fontWeight:700}}>:</span>
            <input
              type="text"
              inputMode="numeric"
              value={kp.a}
              onChange={e=>handleKoScoreChange("a", e.target.value)}
              onFocus={e=>e.target.select()}
              readOnly={isLocked || !ready}
              placeholder={ready ? (isLocked ? "·" : "—") : ""}
              style={{
                width:30,height:30,textAlign:"center",
                background: (isLocked || !ready) ? "rgba(71,85,105,0.2)" : "#0a0e1c",
                border: `1px solid ${hasPick ? "#fbbf24" : "rgba(71,85,105,0.5)"}`,
                borderRadius:6,color: (isLocked || !ready) ? "#64748b" : "#f1f5f9",
                fontSize:14,fontWeight:800,fontFamily:"inherit",outline:"none",
              }}
            />
          </div>

          {/* Away team (right) */}
          <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
            <span style={{fontSize:18,flexShrink:0}}>{m.b?.flag||m.b?.f||"❓"}</span>
            <span style={{fontSize:11,color:"#f1f5f9",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.b?.name||m.b?.n||"TBD"}</span>
          </div>
        </div>

        {sched?.venue && (
          <div style={{fontSize:8,color:"#475569",marginTop:5,textAlign:"center",letterSpacing:0.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            📍 {sched.venue}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{padding:"16px 14px 100px",maxWidth:920,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3}}>{t("bracket.knockoutStage")}</div>
        <h2 style={{fontSize:24,margin:"4px 0",background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>{t("bracket.title")}</h2>
        <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 10px"}}>{t("bracket.tapToAdvance")}</p>
        <div style={{
          display:"inline-flex",alignItems:"center",gap:8,
          background:"linear-gradient(135deg,#fbbf24,#d97706)",
          color:"#0a0e1c",
          padding:"5px 14px",borderRadius:20,
          fontSize:11,fontWeight:900,letterSpacing:1,
          boxShadow:"0 4px 12px rgba(251,191,36,0.4)",
        }}>
          {t("bracket.doublePoints")}
        </div>
      </div>

      {/* Knockout scoring info — only per-match scoring, doubled */}
      <div style={{
        display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14,
      }}>
        <div style={{
          background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(15,20,36,0.5))",
          border:"1px solid #fbbf24",
          borderRadius:10,padding:"8px 6px",textAlign:"center",
          boxShadow:"0 2px 10px rgba(251,191,36,0.2)",
        }}>
          <div style={{fontSize:9,color:"#fbbf24",letterSpacing:1,fontWeight:700,marginBottom:2}}>
            🎯 {t("welcome.exactScore").replace(/^🎯\s*/, "")}
          </div>
          <div style={{fontSize:18,color:"#fbbf24",fontWeight:900,lineHeight:1}}>+10</div>
        </div>
        <div style={{
          background:"linear-gradient(135deg,rgba(34,197,94,0.15),rgba(15,20,36,0.5))",
          border:"1px solid #22c55e",
          borderRadius:10,padding:"8px 6px",textAlign:"center",
          boxShadow:"0 2px 10px rgba(34,197,94,0.2)",
        }}>
          <div style={{fontSize:9,color:"#22c55e",letterSpacing:1,fontWeight:700,marginBottom:2}}>
            ✅ {t("welcome.rightResultOnly").replace(/^✅\s*/, "")}
          </div>
          <div style={{fontSize:18,color:"#22c55e",fontWeight:900,lineHeight:1}}>+6</div>
        </div>
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
              {p.matchScore.result > 0 && <Badge color="#22c55e">✅ {p.matchScore.result} winner</Badge>}
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
  name, userId, picks, koWinners, koPicks,
  leagueCode, setLeagueCode, leagueData, leagueError,
  actuals, actualKo, actualKoScores, hasActuals,
  liveStandings, liveBestThirds,
  liveFetchAt, liveError, onFetchLive,
  actualWinner, actualTopScorer,
  leagueCodes, activeLeagueCode, setActiveLeagueCode, allLeagueData, maxLeagues,
  onShowWorld,
}) {
  const t = useT();
  const { showToast } = useToast();
  // ─── MODE LOGIC ──
  // Instead of a manual mode that fights with props, derive the mode from current state.
  // The only "user intent" is wantsToAddMore (when they click "Add another league"
  // even while viewing an active league). This is reset whenever leagueCodes change.
  const [wantsToAddMore, setWantsToAddMore] = useState(false);
  // What mode are we actually in?
  const mode = useMemo(() => {
    if (wantsToAddMore) return "creating-or-joining";
    if (!leagueCodes || leagueCodes.length === 0) return "creating-or-joining";
    if (activeLeagueCode) return "active";
    return "list";
  }, [wantsToAddMore, leagueCodes?.length, activeLeagueCode]);
  // Reset wantsToAddMore once they actually join/create (leagueCodes grows)
  const prevCodesLen = useRef((leagueCodes || []).length);
  useEffect(() => {
    const newLen = (leagueCodes || []).length;
    if (newLen > prevCodesLen.current) {
      // They successfully added a league — clear the intent
      setWantsToAddMore(false);
    }
    prevCodesLen.current = newLen;
  }, [leagueCodes?.length]);
  // Helper: explicitly go to a mode
  const setMode = (m) => {
    if (m === "list") {
      setWantsToAddMore(false);
      setActiveLeagueCode("");
    } else if (m === "creating-or-joining") {
      setWantsToAddMore(true);
    } else if (m === "active") {
      setWantsToAddMore(false);
      // Caller should have already set activeLeagueCode
    }
  };
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

  // ─── Create league ──
  const handleCreate = async () => {
    if (!draftName.trim()) { setErr("Give your league a name"); return; }
    if (leagueCodes && leagueCodes.length >= (maxLeagues || 5)) {
      setErr(t("leagues.maxReached"));
      return;
    }
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
      await updateMyPicks(code, userId, name, picks, koWinners, { koPicks });
      setLeagueCode(code);
      setDraftName("");
      showToast(t("toast.leagueCreated"), "success");
    } catch (e) {
      setErr(e.message || "Couldn't create league. Check Firebase setup.");
    }
    setBusy(false);
  };

  // ─── Join league ──
  const handleJoin = async () => {
    const code = draftCode.trim().toUpperCase();
    if (!code) { setErr("Enter a league code"); return; }
    if (leagueCodes && leagueCodes.includes(code)) {
      setErr(t("leagues.alreadyJoined"));
      return;
    }
    if (leagueCodes && leagueCodes.length >= (maxLeagues || 5)) {
      setErr(t("leagues.maxReached"));
      return;
    }
    setBusy(true); setErr("");
    try {
      await joinLeague(code);
      // Push our picks
      await updateMyPicks(code, userId, name, picks, koWinners, { koPicks });
      setLeagueCode(code);
      setDraftCode("");
      showToast(t("toast.leagueJoined"), "success");
    } catch (e) {
      setErr(e.message || "Couldn't join. Check the code.");
    }
    setBusy(false);
  };

  // ─── Leave league ──
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameErr, setRenameErr] = useState("");

  const handleRename = async () => {
    const newName = renameDraft.trim();
    if (!newName) { setRenameErr(t("league.nameRequired")); return; }
    if (newName.length > 40) { setRenameErr(t("league.nameTooLong")); return; }
    if (newName === leagueData?.name) { setShowRename(false); return; }
    setRenameBusy(true); setRenameErr("");
    try {
      await renameLeague(leagueCode, newName);
      showToast(t("toast.leagueRenamed"), "success");
      setShowRename(false);
    } catch (e) {
      setRenameErr(e.message || "Couldn't rename");
    }
    setRenameBusy(false);
  };

  const handleLeave = async () => {
    if (!leagueCode) return;
    try { await leaveLeague(leagueCode, userId); } catch {}
    setLeagueCode(""); // shim handles removing from list + switching to next
    setConfirmLeave(false);
    // After leaving, go back to list (or creating-or-joining handled by useEffect)
  };

  const requestLeave = () => setConfirmLeave(true);

  const copy = async () => {
    const ok = await copyText(leagueCode);
    if (ok) {
      setCopied(true);
      showToast(t("toast.codeCopied"), "success");
      setTimeout(()=>setCopied(false), 2000);
    }
  };

  const AVATAR_COLORS = ["#fbbf24","#ef4444","#3b82f6","#22c55e","#a855f7","#ec4899","#14b8a6","#f97316"];
  const colorFor = (n) => {
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[h];
  };

  // ─── LIST MODE: overview of all leagues the user is in ──
  if (mode === "list") {
    const myLeagues = (leagueCodes || []).map(code => {
      try {
        const data = allLeagueData?.[code] || null;
        if (!data) return { code, loading: true };
        const members = Object.values(data.members || {});
        // Compute rank for me — use only match score + bonus picks (simple, no bracket calc)
        const ranked = members.map(m => {
          let total = 0;
          try {
            if (m.picks) {
              const ms = totalScore(m.picks, actuals);
              total = ms.total;
            }
          } catch (e) {}
          // Bonus picks
          if (actualWinner && m.winnerPick) {
            const aw = actualWinner.name || actualWinner.n;
            const mw = m.winnerPick.name || m.winnerPick.n;
            if (aw && mw && aw === mw) total += POINTS.WINNER_BET;
          }
          if (actualTopScorer && m.topScorerPick && actualTopScorer.name === m.topScorerPick.name) {
            total += (actualTopScorer.goals || 0) * POINTS.TOP_SCORER_GOAL;
          }
          return { uid: m.uid, name: m.name, total };
        }).sort((a, b) => b.total - a.total);
        const myEntry = ranked.find(r => r.uid === userId);
        const myRank = myEntry ? ranked.indexOf(myEntry) + 1 : null;
        return {
          code,
          name: data.name,
          memberCount: members.length,
          myRank,
          myPoints: myEntry?.total ?? 0,
          topName: ranked[0]?.name,
          topPoints: ranked[0]?.total ?? 0,
        };
      } catch (e) {
        console.error("Error computing league summary:", e);
        return { code, loading: false, name: code, memberCount: 0 };
      }
    });

    const canAddMore = (leagueCodes?.length || 0) < (maxLeagues || 5);

    return (
      <div style={{padding:"16px 14px 40px",maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:42,marginBottom:6}}>🏅</div>
          <h2 style={{margin:"0 0 4px",fontSize:22,background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>{t("leagues.myLeagues")}</h2>
          <p style={{color:"#94a3b8",fontSize:12,margin:0}}>
            {leagueCodes.length} {leagueCodes.length === 1 ? t("leagues.activeLeague") : t("leagues.activeLeagues")} · {t("leagues.maxOf")} {maxLeagues || 5}
          </p>
        </div>

        {/* League cards */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
          {myLeagues.map(L => (
            <button key={L.code} onClick={() => setActiveLeagueCode(L.code)} style={{
              textAlign:"start",
              padding:"14px 16px",
              background:"linear-gradient(145deg,#1e293b,#0f172a)",
              border:"1px solid rgba(251,191,36,0.3)",
              borderRadius:14,
              cursor:"pointer",fontFamily:"inherit",color:"#f1f5f9",
              transition:"transform 0.15s, box-shadow 0.15s",
              display:"flex",flexDirection:"column",gap:4,
            }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
               onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {L.loading ? "..." : (L.name || L.code)}
                  </div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>
                    <span style={{color:"#22c55e"}}>●</span> {L.memberCount || 0} {(L.memberCount||0) === 1 ? t("league.member") : t("league.members")}
                  </div>
                </div>
                {L.myRank && (
                  <div style={{textAlign:"end",flexShrink:0}}>
                    <div style={{fontSize:10,color:"#94a3b8",letterSpacing:1}}>{t("leagues.yourRank")}</div>
                    <div style={{
                      fontSize:18,fontWeight:900,
                      color: L.myRank === 1 ? "#fbbf24" : L.myRank === 2 ? "#cbd5e1" : L.myRank === 3 ? "#d97706" : "#f1f5f9",
                    }}>
                      {L.myRank === 1 ? "🥇" : L.myRank === 2 ? "🥈" : L.myRank === 3 ? "🥉" : `#${L.myRank}`}
                      <span style={{fontSize:11,color:"#94a3b8",marginLeft:4}}>· {L.myPoints} {t("league.pts")}</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:10,color:"#64748b",marginTop:4}}>
                <span>{L.topName ? `👑 ${t("leagues.leader")}: ${L.topName} (${L.topPoints} ${t("league.pts")})` : t("leagues.noActivity")}</span>
                <span style={{color:"#fbbf24"}}>{t("leagues.open")} →</span>
              </div>
            </button>
          ))}
        </div>

        {/* Add new league */}
        {canAddMore ? (
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setMode("creating-or-joining")} style={{...primaryBtn,flex:1}}>
              ✨ {t("leagues.addNew")}
            </button>
          </div>
        ) : (
          <div style={{padding:"10px 14px",background:"rgba(71,85,105,0.15)",border:"1px dashed rgba(71,85,105,0.4)",borderRadius:10,textAlign:"center",fontSize:11,color:"#94a3b8"}}>
            {t("leagues.maxReached")} ({maxLeagues || 5} {t("leagues.activeLeagues")})
          </div>
        )}

        {/* World leaderboard link */}
        {onShowWorld && (
          <button onClick={onShowWorld} style={{
            marginTop:12,width:"100%",
            background:"linear-gradient(135deg,rgba(59,130,246,0.18),rgba(15,20,36,0.5))",
            border:"1px solid rgba(59,130,246,0.4)",
            color:"#93c5fd",
            borderRadius:12,padding:"12px 14px",
            fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          }}>
            🌍 {t("world.openButton")}
          </button>
        )}
      </div>
    );
  }

  // ─── HOME (no league yet, or adding new) ──
  if (mode === "home" || mode === "creating-or-joining") {
    return (
      <div style={{padding:"16px 14px 40px",maxWidth:480,margin:"0 auto"}}>
        {leagueCodes && leagueCodes.length > 0 && (
          <button onClick={()=>{setActiveLeagueCode(""); setMode("list");}} style={{
            background:"transparent",border:"1px solid rgba(71,85,105,0.4)",
            borderRadius:8,padding:"6px 12px",
            color:"#94a3b8",fontSize:11,cursor:"pointer",fontFamily:"inherit",
            marginBottom:14,fontWeight:600,
          }}>← {t("leagues.allLeagues")}</button>
        )}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,marginBottom:6}}>🏆</div>
          <h2 style={{margin:"0 0 4px",fontSize:22,background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>{t("league.playWithFriends")}</h2>
          <p style={{color:"#94a3b8",fontSize:13,margin:0,lineHeight:1.5}}>{t("league.intro")}</p>
        </div>

        {/* JOIN (prominent — most users will join an existing league) */}
        <div style={{background:"linear-gradient(145deg,rgba(251,191,36,0.12),#1e293b)",border:"1px solid rgba(251,191,36,0.5)",borderRadius:14,padding:16,marginBottom:12,boxShadow:"0 4px 14px rgba(251,191,36,0.1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:24}}>🤝</span>
            <span style={{fontSize:15,fontWeight:800,color:"#fbbf24"}}>{t("league.joinLeague")}</span>
          </div>
          <p style={{fontSize:11,color:"#94a3b8",margin:"0 0 8px"}}>{t("league.joinHint")}</p>
          <input value={draftCode} onChange={e=>{setDraftCode(e.target.value.toUpperCase());setErr("");}}
            placeholder={t("league.joinPlaceholder")} maxLength={30}
            style={{...inputStyle,fontFamily:"monospace",letterSpacing:1}}/>
          <button onClick={handleJoin} disabled={busy} style={{...primaryBtn,opacity:busy?0.5:1}}>
            {busy ? t("league.joining") : t("league.joinBtn")}
          </button>
        </div>

        {/* OR divider */}
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0 10px",fontSize:10,color:"#64748b",letterSpacing:2}}>
          <div style={{flex:1,height:1,background:"rgba(71,85,105,0.3)"}}/>
          <span>{t("league.orCreate")}</span>
          <div style={{flex:1,height:1,background:"rgba(71,85,105,0.3)"}}/>
        </div>

        {/* CREATE (secondary — for the few who organize their own league) */}
        <div style={{background:"rgba(30,41,59,0.4)",border:"1px solid rgba(71,85,105,0.3)",borderRadius:14,padding:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:18}}>✨</span>
            <span style={{fontSize:13,fontWeight:700,color:"#cbd5e1"}}>{t("league.createLeague")}</span>
          </div>
          <input value={draftName} onChange={e=>{setDraftName(e.target.value);setErr("");}} maxLength={30}
            placeholder={t("league.createPlaceholder")} style={inputStyle}/>
          <button onClick={handleCreate} disabled={busy} style={{...ghostBtn,opacity:busy?0.5:1}}>
            {busy ? t("league.creating") : t("league.createBtn")}
          </button>
        </div>

        {err && (
          <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:8,padding:"10px 12px",marginTop:14,fontSize:12,color:"#fca5a5"}}>
            ⚠️ {err}
          </div>
        )}

        {/* World leaderboard — visible to non-league users too */}
        {onShowWorld && (
          <button onClick={onShowWorld} style={{
            marginTop:18,width:"100%",
            background:"linear-gradient(135deg,rgba(59,130,246,0.15),rgba(15,20,36,0.5))",
            border:"1px solid rgba(59,130,246,0.4)",
            color:"#93c5fd",
            borderRadius:12,padding:"12px 14px",
            fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          }}>
            🌍 {t("world.openButton")}
          </button>
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
          <h2 style={{color:"#fca5a5",margin:"0 0 8px",fontSize:18}}>{t("league.connectionError")}</h2>
          <p style={{color:"#94a3b8",fontSize:13,marginBottom:16}}>{leagueError}</p>
          <button onClick={handleLeave} style={ghostBtn}>{t("league.backToMenu")}</button>
        </div>
      );
    }
    if (!leagueData) {
      return (
        <div style={{padding:"30px 20px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8,animation:"pulse 1.5s infinite"}}>⏳</div>
          <p style={{color:"#94a3b8",fontSize:13}}>{t("league.connecting")}</p>
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
      // ─── Bonus picks scoring (Tournament Winner + Top Scorer) ──
      let bonusPoints = 0;
      // Winner bet: +20 if correct
      if (actualWinner && m.winnerPick) {
        const aw = actualWinner.name || actualWinner.n;
        const mw = m.winnerPick.name || m.winnerPick.n;
        if (aw && mw && aw === mw) bonusPoints += POINTS.WINNER_BET;
      }
      // Top scorer: +2 per goal that player has scored
      if (actualTopScorer && m.topScorerPick) {
        if (actualTopScorer.name === m.topScorerPick.name) {
          bonusPoints += (actualTopScorer.goals || 0) * POINTS.TOP_SCORER_GOAL;
        }
      }
      return {
        uid, name: m.name, isMe: uid === userId,
        picks: m.picks, koWinners: m.koWinners, standings: st, bestThirds: bt, knockout: kt,
        matchScore: ms, koScore: ks,
        bonusPoints,
        winnerPick: m.winnerPick, topScorerPick: m.topScorerPick,
        totalPoints: ms.total + ks.total + bonusPoints,
        predictedCount,
        updatedAt: m.updatedAt,
      };
    }).sort((a,b) => b.totalPoints - a.totalPoints);

    // Drill into one member
    if (viewing) {
      const m = members.find(x => x.uid === viewing);
      if (!m) { setViewing(null); return null; }
      const champ = m.knockout?.champion;
      const isMyOwn = m.uid === userId;
      // ─── FAIR PLAY: bonus/bracket picks reveal only when tournament starts ──
      const firstKick = Math.min(...FIXTURES.filter(f => f.kickoff).map(f => new Date(f.kickoff).getTime()));
      const tournamentStarted = Number.isFinite(firstKick) && Date.now() >= firstKick;
      const showChamp = isMyOwn || tournamentStarted;

      // Show predicted match results, grouped by group + matchday
      const renderMatchRow = (f) => {
        const pick = m.picks?.[f.id];
        const home = findTeam(f.home);
        const away = findTeam(f.away);
        const hasPick = pick && pick.h !== undefined && pick.h !== "" && pick.a !== undefined && pick.a !== "";
        const actual = actuals?.[f.id];
        const hasActual = actual && actual.h !== undefined && actual.h !== "";
        // ─── FAIR PLAY: hide other members' picks until match has started ──
        const isMyOwn = m.uid === userId;
        const matchStarted = f.kickoff ? Date.now() >= new Date(f.kickoff).getTime() : false;
        const showPick = isMyOwn || matchStarted;
        const score = hasActual && hasPick ? scoreMatch(pick, actual) : null;
        const scoreColor = score?.type === "exact" ? "#fbbf24"
                         : score?.type === "result" ? "#22c55e"
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
              background:hasPick?"#0a0e1c":"transparent",
              border:`1px solid ${hasPick && showPick ? scoreColor : "rgba(71,85,105,0.3)"}`,
              borderRadius:6,padding:"3px 8px",minWidth:48,justifyContent:"center",
              color: !showPick && hasPick ? "#64748b" : (hasPick ? (score?scoreColor:"#f1f5f9") : "#64748b"),
              fontWeight:800,fontSize:13,
            }}>
              {!showPick && hasPick ? "🔒" : (hasPick ? `${pick.h} - ${pick.a}` : "—")}
            </div>
            <div style={{color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {away?.f} {away?.n}
            </div>
            {hasActual && (
              <div style={{gridColumn:"1 / -1",textAlign:"center",fontSize:9,color:"#64748b",marginTop:2}}>
                Actual: <span style={{color:"#f1f5f9"}}>{actual.h}–{actual.a}</span>
                {score && showPick && <span style={{color:scoreColor,marginLeft:6,fontWeight:700}}>+{score.points}</span>}
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

      // Build bracket using REAL results (actual standings + actualKo), not the member's predictions.
      // The bracket structure shows who really advanced; the member's koPicks (score predictions) sit alongside.
      const realStandings = liveStandings && hasActuals ? liveStandings : null;
      const realThirds = liveBestThirds && hasActuals ? liveBestThirds : null;
      const memberR32 = realStandings ? buildR32(realStandings, realThirds) : buildR32({}, []);
      const buildMemberBracket = () => {
        if (!memberR32) return null;
        const ako = actuals && Object.keys(actuals).length > 0 ? (window?.actualKo || {}) : {};
        // We can't access actualKo from this scope easily — actually we can, it's passed as prop. Use it.
        return null; // placeholder, replaced below
      };
      // Build using actualKo passed as prop
      const buildBracketRounds = () => {
        if (!memberR32) return null;
        const ako = actualKo || {};
        const r32Winners = memberR32.map(mt => ako[mt.id] === "a" ? mt.a : ako[mt.id] === "b" ? mt.b : null);
        const r16 = [];
        for (let i=0;i<16;i+=2) r16.push({id:`R16-${i/2}`,a:r32Winners[i],b:r32Winners[i+1]});
        const r16Winners = r16.map(mt => ako[mt.id]==="a"?mt.a:ako[mt.id]==="b"?mt.b:null);
        const qf = [];
        for (let i=0;i<8;i+=2) qf.push({id:`QF-${i/2}`,a:r16Winners[i],b:r16Winners[i+1]});
        const qfWinners = qf.map(mt => ako[mt.id]==="a"?mt.a:ako[mt.id]==="b"?mt.b:null);
        const sf = [];
        for (let i=0;i<4;i+=2) sf.push({id:`SF-${i/2}`,a:qfWinners[i],b:qfWinners[i+1]});
        const sfWinners = sf.map(mt => ako[mt.id]==="a"?mt.a:ako[mt.id]==="b"?mt.b:null);
        const finalM = { id:"FINAL", a:sfWinners[0], b:sfWinners[1] };
        return { r32: memberR32, r16, qf, sf, final: finalM };
      };
      const memberBracket = buildBracketRounds();
      // The member's score predictions per KO match
      const memberKoPicks = m.koPicks || {};
      // Real KO scores (for scoring badges)
      const realKoScores = actualKoScores || {};

      const renderKoMatch = (mt) => {
        const ready = mt.a && mt.b;
        const memberPick = memberKoPicks[mt.id];
        const hasMemberPick = memberPick && memberPick.h !== "" && memberPick.h !== undefined;
        // Fair-play: show pick only if it's me, or the KO match has a real result already
        const realResult = realKoScores[mt.id];
        const hasRealResult = realResult && realResult.h !== "" && realResult.h !== undefined;
        const showPick = m.isMe || hasRealResult;
        // Score this prediction if we have real result
        const koScore = (hasMemberPick && hasRealResult) ? scoreKoMatch(memberPick, realResult) : null;
        const scoreColor = koScore?.type === "exact" ? "#fbbf24"
                         : koScore?.type === "result" ? "#22c55e"
                         : koScore?.type === "wrong" ? "#f87171"
                         : "rgba(71,85,105,0.5)";
        return (
          <div key={mt.id} style={{
            background:ready?"rgba(30,41,59,0.6)":"rgba(15,20,36,0.4)",
            border:`1px solid ${hasMemberPick && showPick ? scoreColor : "rgba(71,85,105,0.3)"}`,
            borderRadius:8,padding:"6px 8px",marginBottom:5,
            opacity:ready?1:0.5,fontSize:11,
          }}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:4,direction:"ltr"}}>
              {/* Home team */}
              <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0,justifyContent:"flex-end"}}>
                <span style={{fontSize:11,color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{mt.a?.name||mt.a?.n||"TBD"}</span>
                <span style={{fontSize:14,flexShrink:0}}>{mt.a?.flag||mt.a?.f||"❓"}</span>
              </div>
              {/* Score (member's pick or lock) */}
              <div style={{
                display:"flex",alignItems:"center",gap:2,
                padding:"2px 7px",borderRadius:5,
                background: hasMemberPick && showPick ? "#0a0e1c" : "transparent",
                border: `1px solid ${hasMemberPick && showPick ? scoreColor : "transparent"}`,
                color: hasMemberPick && showPick ? (koScore?scoreColor:"#f1f5f9") : "#64748b",
                fontWeight:800,fontSize:12,minWidth:38,justifyContent:"center",
              }}>
                {!showPick && hasMemberPick ? "🔒" : hasMemberPick ? `${memberPick.h}-${memberPick.a}` : "—"}
              </div>
              {/* Away team */}
              <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0}}>
                <span style={{fontSize:14,flexShrink:0}}>{mt.b?.flag||mt.b?.f||"❓"}</span>
                <span style={{fontSize:11,color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mt.b?.name||mt.b?.n||"TBD"}</span>
              </div>
            </div>
            {/* Real result + points badge */}
            {hasRealResult && (
              <div style={{textAlign:"center",fontSize:9,color:"#64748b",marginTop:3}}>
                Actual: <span style={{color:"#f1f5f9"}}>{realResult.h}–{realResult.a}</span>
                {koScore && showPick && <span style={{color:scoreColor,marginLeft:6,fontWeight:700}}>+{koScore.points}</span>}
              </div>
            )}
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
          {champ && showChamp && (
            <div style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",borderRadius:12,padding:12,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:10,letterSpacing:3,color:"#0a0e1c",fontWeight:800}}>🏆 PREDICTED CHAMPION</div>
              <div style={{fontSize:26,margin:"2px 0"}}>{champ.flag||champ.f}</div>
              <div style={{fontSize:15,color:"#0a0e1c",fontWeight:900}}>{champ.name||champ.n}</div>
            </div>
          )}
          {champ && !showChamp && (
            <div style={{
              background:"linear-gradient(135deg,rgba(71,85,105,0.3),rgba(15,20,36,0.5))",
              border:"1px dashed rgba(71,85,105,0.5)",
              borderRadius:12,padding:12,marginBottom:14,textAlign:"center",
            }}>
              <div style={{fontSize:10,letterSpacing:3,color:"#94a3b8",fontWeight:800}}>🔒 {t("league.hiddenPick")}</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:4}}>{t("league.hiddenUntilKickoff")}</div>
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
          {viewTab === "standings" && !showChamp && (
            <div style={{
              background:"linear-gradient(135deg,rgba(71,85,105,0.3),rgba(15,20,36,0.5))",
              border:"1px dashed rgba(71,85,105,0.5)",
              borderRadius:12,padding:"24px 16px",textAlign:"center",
            }}>
              <div style={{fontSize:36,marginBottom:8}}>🔒</div>
              <div style={{fontSize:13,color:"#cbd5e1",fontWeight:700,marginBottom:4}}>{t("league.standingsHidden")}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{t("league.hiddenUntilKickoff")}</div>
            </div>
          )}
          {viewTab === "standings" && showChamp && (
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
          {viewTab === "bracket" && !showChamp && (
            <div style={{
              background:"linear-gradient(135deg,rgba(71,85,105,0.3),rgba(15,20,36,0.5))",
              border:"1px dashed rgba(71,85,105,0.5)",
              borderRadius:12,padding:"24px 16px",textAlign:"center",
            }}>
              <div style={{fontSize:36,marginBottom:8}}>🔒</div>
              <div style={{fontSize:13,color:"#cbd5e1",fontWeight:700,marginBottom:4}}>{t("league.bracketHidden")}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{t("league.hiddenUntilKickoff")}</div>
            </div>
          )}
          {viewTab === "bracket" && showChamp && memberBracket && (() => {
            const koH = {fontSize:9,color:"#94a3b8",letterSpacing:2,fontWeight:700,textAlign:"center",marginBottom:6,padding:"3px 0",borderBottom:"1px solid rgba(71,85,105,0.3)"};
            const koHFinal = {...koH, color:"#fbbf24"};
            if (isNarrow) {
              return (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {/* Final on top */}
                  <div style={{background:"linear-gradient(135deg, rgba(251,191,36,0.08), rgba(217,119,6,0.04))",border:"1px solid rgba(251,191,36,0.4)",borderRadius:12,padding:"10px 12px"}}>
                    <div style={{textAlign:"center",marginBottom:6}}>
                      <div style={{fontSize:22,filter:"drop-shadow(0 0 6px rgba(251,191,36,0.6))"}}>🏆</div>
                      <div style={{fontSize:10,color:"#fbbf24",letterSpacing:3,fontWeight:800}}>FINAL</div>
                    </div>
                    {renderKoMatch(memberBracket.final)}
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:5}}>SEMI-FINALS</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      {memberBracket.sf.map(mt => renderKoMatch(mt))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:5}}>QUARTER-FINALS</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      {memberBracket.qf.map(mt => renderKoMatch(mt))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:5}}>ROUND OF 16</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      {memberBracket.r16.map(mt => renderKoMatch(mt))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:3,fontWeight:700,textAlign:"center",marginBottom:5}}>ROUND OF 32</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      {memberBracket.r32.map(mt => renderKoMatch(mt))}
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
                  {memberBracket.r32.slice(0, 8).map(mt => renderKoMatch(mt))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>R16</div>
                  {memberBracket.r16.slice(0, 4).map(mt => renderKoMatch(mt))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>QF</div>
                  {memberBracket.qf.slice(0, 2).map(mt => renderKoMatch(mt))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>SF</div>
                  {renderKoMatch(memberBracket.sf[0])}
                </div>

                {/* CENTER: FINAL */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={koHFinal}>FINAL</div>
                  <div style={{fontSize:24,marginBottom:3,filter:"drop-shadow(0 0 6px rgba(251,191,36,0.6))"}}>🏆</div>
                  {renderKoMatch(memberBracket.final)}
                </div>

                {/* RIGHT SIDE */}
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>SF</div>
                  {renderKoMatch(memberBracket.sf[1])}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>QF</div>
                  {memberBracket.qf.slice(2, 4).map(mt => renderKoMatch(mt))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>R16</div>
                  {memberBracket.r16.slice(4, 8).map(mt => renderKoMatch(mt))}
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                  <div style={koH}>R32</div>
                  {memberBracket.r32.slice(8, 16).map(mt => renderKoMatch(mt))}
                </div>
              </div>
            );
          })()}
          {viewTab === "bracket" && showChamp && !memberBracket && (
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
        {/* Back to "My Leagues" button (only if user has more than 1 league) */}
        {leagueCodes && leagueCodes.length > 1 && (
          <button onClick={()=>setActiveLeagueCode("")} style={{
            background:"transparent",border:"1px solid rgba(71,85,105,0.4)",
            borderRadius:8,padding:"6px 12px",
            color:"#94a3b8",fontSize:11,cursor:"pointer",fontFamily:"inherit",
            marginBottom:10,fontWeight:600,
          }}>← {t("leagues.allLeagues")}</button>
        )}
        {/* League header — centered, clean */}
        <div style={{
          background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(217,119,6,0.05))",
          border:"1px solid rgba(251,191,36,0.3)",
          borderRadius:14,padding:"16px 14px",marginBottom:14,
          textAlign:"center",position:"relative",
        }}>
          {/* Edit pencil (creator only) — absolute positioned, doesn't affect centering */}
          {leagueData.createdBy === name && (
            <button onClick={()=>{setRenameDraft(leagueData.name);setShowRename(true);}}
              title={t("league.editName")}
              style={{
                position:"absolute",top:10,insetInlineEnd:10,
                background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",
                fontSize:14,color:"#fbbf24",padding:"4px 6px",borderRadius:6,
              }}>✏️</button>
          )}
          <div style={{fontSize:32,marginBottom:4}}>🏆</div>
          <div style={{fontSize:9,color:"#fbbf24",letterSpacing:3,marginBottom:4,fontWeight:700}}>{t("league.yourLeague")}</div>
          <h2 style={{
            margin:"0 0 6px",fontSize:22,color:"#f1f5f9",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
            fontWeight:900,
            background:"linear-gradient(180deg,#fde68a,#f59e0b)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          }}>{leagueData.name}</h2>
          <div style={{fontSize:11,color:"#94a3b8"}}>
            <span style={{color:"#22c55e"}}>●</span> {members.length} {members.length===1?t("league.member"):t("league.members")}
          </div>
        </div>

        {/* 🎯 Hits & Misses awards — preview before tournament starts */}
        {!hasActuals && members.length > 0 && (
          <div style={{marginBottom:14,opacity:0.6}}>
            <div style={{fontSize:11,color:"#94a3b8",letterSpacing:3,marginBottom:8,textAlign:"center"}}>{t("league.hitsMisses")}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {/* Empty Top Hit preview */}
              <div style={{
                background:"linear-gradient(135deg,rgba(34,197,94,0.06),rgba(15,20,36,0.4))",
                border:"1px dashed rgba(34,197,94,0.3)",
                borderRadius:12,padding:"10px 10px",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                  <span style={{fontSize:18,filter:"grayscale(0.5)"}}>🎯</span>
                  <span style={{fontSize:9,color:"#22c55e",letterSpacing:2,fontWeight:800}}>{t("league.topHit")}</span>
                </div>
                <div style={{fontSize:11,color:"#64748b",fontStyle:"italic",lineHeight:1.4}}>
                  {t("league.previewHit")}
                </div>
              </div>
              {/* Empty Top Miss preview */}
              <div style={{
                background:"linear-gradient(135deg,rgba(239,68,68,0.06),rgba(15,20,36,0.4))",
                border:"1px dashed rgba(239,68,68,0.3)",
                borderRadius:12,padding:"10px 10px",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                  <span style={{fontSize:18,filter:"grayscale(0.5)"}}>💀</span>
                  <span style={{fontSize:9,color:"#f87171",letterSpacing:2,fontWeight:800}}>{t("league.topMiss")}</span>
                </div>
                <div style={{fontSize:11,color:"#64748b",fontStyle:"italic",lineHeight:1.4}}>
                  {t("league.previewMiss")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🎯 Hits & Misses awards */}
        {hasActuals && members.length > 0 && (() => {
          // Find member with most exact-score hits
          const topHit = [...members].sort((a, b) => {
            if (b.matchScore.exact !== a.matchScore.exact) return b.matchScore.exact - a.matchScore.exact;
            // tie-break: more total points wins
            return b.totalPoints - a.totalPoints;
          })[0];
          // Find member with most wrong predictions (only count members who actually predicted)
          const eligibleForMiss = members.filter(m => m.matchScore.played > 0);
          const topMiss = eligibleForMiss.length > 0 ? [...eligibleForMiss].sort((a, b) => {
            if (b.matchScore.wrong !== a.matchScore.wrong) return b.matchScore.wrong - a.matchScore.wrong;
            return a.totalPoints - b.totalPoints;
          })[0] : null;
          const anyHits = topHit && topHit.matchScore.exact > 0;
          const anyMisses = topMiss && topMiss.matchScore.wrong > 0;
          if (!anyHits && !anyMisses) return null;
          return (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:"#94a3b8",letterSpacing:3,marginBottom:8,textAlign:"center"}}>{t("league.hitsMisses")}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {/* Top Hit */}
                <div style={{
                  background:"linear-gradient(135deg,rgba(34,197,94,0.15),rgba(15,20,36,0.5))",
                  border:"1px solid rgba(34,197,94,0.4)",
                  borderRadius:12,padding:"10px 10px",
                  boxShadow:"0 4px 12px rgba(34,197,94,0.15)",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                    <span style={{fontSize:18}}>🎯</span>
                    <span style={{fontSize:9,color:"#22c55e",letterSpacing:2,fontWeight:800}}>{t("league.topHit")}</span>
                  </div>
                  {anyHits ? (
                    <>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${colorFor(topHit.name)},${colorFor(topHit.name)}aa)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0}}>{topHit.name[0]?.toUpperCase()}</div>
                        <span style={{fontSize:13,color:"#f1f5f9",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topHit.name}{topHit.isMe?t("league.you"):""}</span>
                      </div>
                      <div style={{fontSize:11,color:"#22c55e",fontWeight:700}}>
                        {topHit.matchScore.exact} {topHit.matchScore.exact === 1 ? t("league.exactScoreOne") : t("league.exactScoresMany")}
                      </div>
                      <div style={{fontSize:9,color:"#64748b",marginTop:2}}>{t("league.nailedIt")}</div>
                    </>
                  ) : (
                    <div style={{fontSize:11,color:"#64748b",fontStyle:"italic"}}>{t("league.noExactPicks")}</div>
                  )}
                </div>
                {/* Top Miss */}
                <div style={{
                  background:"linear-gradient(135deg,rgba(239,68,68,0.12),rgba(15,20,36,0.5))",
                  border:"1px solid rgba(239,68,68,0.4)",
                  borderRadius:12,padding:"10px 10px",
                  boxShadow:"0 4px 12px rgba(239,68,68,0.1)",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                    <span style={{fontSize:18}}>💀</span>
                    <span style={{fontSize:9,color:"#f87171",letterSpacing:2,fontWeight:800}}>{t("league.topMiss")}</span>
                  </div>
                  {anyMisses ? (
                    <>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${colorFor(topMiss.name)},${colorFor(topMiss.name)}aa)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0}}>{topMiss.name[0]?.toUpperCase()}</div>
                        <span style={{fontSize:13,color:"#f1f5f9",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topMiss.name}{topMiss.isMe?t("league.you"):""}</span>
                      </div>
                      <div style={{fontSize:11,color:"#f87171",fontWeight:700}}>
                        {topMiss.matchScore.wrong} {topMiss.matchScore.wrong === 1 ? t("league.wrongPickOne") : t("league.wrongPicksMany")}
                      </div>
                      <div style={{fontSize:9,color:"#64748b",marginTop:2}}>{t("league.oof")}</div>
                    </>
                  ) : (
                    <div style={{fontSize:11,color:"#64748b",fontStyle:"italic"}}>{t("league.noMissesYet")}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Leaderboard */}
        <div style={{fontSize:11,color:"#94a3b8",letterSpacing:3,marginBottom:8,textAlign:"center"}}>
          {t("league.standings")}
        </div>
        {!hasActuals && (
          <div style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:11,color:"#93c5fd",lineHeight:1.5,textAlign:"center"}}>
            {t("league.pointsFillIn")} <strong>{t("league.refresh")}</strong> {t("league.pointsFillInRest")}
          </div>
        )}
        {members.length === 0 && (
          <div style={{background:"rgba(30,41,59,0.4)",border:"1px dashed rgba(71,85,105,0.4)",borderRadius:10,padding:"16px 12px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>
            {t("league.noMembers")}
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
                }}>{p.name}{p.isMe?t("league.you"):""}</div>
                <div style={{fontSize:10,color:"#64748b",marginTop:1}}>
                  {p.predictedCount}/{FIXTURES.length} {t("league.predicted")}
                  {showPoints && p.matchScore.exact>0 && ` · 🎯${p.matchScore.exact} ${t("league.exact")}`}
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
                <div style={{fontSize:9,color:"#94a3b8",letterSpacing:1}}>{t("league.pts")}</div>
              </div>
            </button>
          );
        })}

        {/* Live results status — compact, at bottom */}
        <div style={{
          marginTop:14,
          background:"rgba(30,41,59,0.3)",
          border:"1px solid rgba(71,85,105,0.2)",
          borderRadius:8,padding:"6px 10px",
          display:"flex",alignItems:"center",gap:8,
        }}>
          <span style={{fontSize:11}}>📡</span>
          <div style={{flex:1,minWidth:0,fontSize:9,color:liveError?"#fca5a5":"#64748b",letterSpacing:0.5}}>
            {liveError || fetchedLabel}
          </div>
          <button onClick={()=>{showToast(t("toast.refreshing"), "info"); onFetchLive();}} style={{
            background:"transparent",
            border:"1px solid rgba(251,191,36,0.3)",
            color:"#fbbf24",
            borderRadius:5,padding:"3px 8px",
            fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:0.5,
          }}>
            ↻ {t("league.refresh")}
          </button>
        </div>

        {/* Invite friends card — moved from header to keep top slim */}
        <div style={{
          background:"linear-gradient(135deg,rgba(34,197,94,0.08),rgba(15,20,36,0.5))",
          border:"1px solid rgba(34,197,94,0.3)",
          borderRadius:14,padding:14,marginTop:18,marginBottom:6,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <span style={{fontSize:18}}>📣</span>
            <span style={{fontSize:12,fontWeight:800,color:"#22c55e",letterSpacing:1}}>{t("league.inviteFriends")}</span>
          </div>
          {/* Code display */}
          <div style={{display:"flex",alignItems:"center",gap:6,background:"#0a0e1c",borderRadius:8,padding:"8px 10px",border:"1px dashed rgba(71,85,105,0.5)",marginBottom:8}}>
            <span style={{fontSize:10,color:"#64748b",letterSpacing:1}}>{t("league.code")}</span>
            <span style={{flex:1,fontFamily:"monospace",fontSize:13,color:"#fbbf24",letterSpacing:1,fontWeight:700,wordBreak:"break-all"}}>{leagueCode}</span>
            <button onClick={copy} title={t("league.copyTooltip")} style={{background:copied?"#22c55e":"#fbbf24",color:"#0a0e1c",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
              {copied ? "✓" : "📋"}
            </button>
          </div>
          {/* Share buttons row */}
          <div style={{display:"flex",gap:6}}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                t("league.shareMessage")
                  .replace("{name}", leagueData?.name || leagueCode)
                  .replace("{code}", leagueCode)
                  .replace("{url}", typeof window !== "undefined" ? window.location.origin : "")
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex:1,textAlign:"center",
                background:"linear-gradient(135deg,#25D366,#128C7E)",
                color:"#fff",
                border:"none",borderRadius:8,padding:"8px 10px",
                fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                textDecoration:"none",
                boxShadow:"0 4px 12px rgba(37,211,102,0.3)",
                display:"flex",alignItems:"center",justifyContent:"center",gap:6,
              }}>
              <span style={{fontSize:14}}>💬</span> {t("league.shareWhatsapp")}
            </a>
            <button
              onClick={async () => {
                const msg = t("league.shareMessage")
                  .replace("{name}", leagueData?.name || leagueCode)
                  .replace("{code}", leagueCode)
                  .replace("{url}", typeof window !== "undefined" ? window.location.origin : "");
                if (typeof navigator !== "undefined" && navigator.share) {
                  try { await navigator.share({ text: msg }); } catch (e) {}
                } else {
                  await copyText(msg);
                  showToast(t("toast.invitationCopied"), "success");
                }
              }}
              style={{
                background:"rgba(30,41,59,0.6)",
                border:"1px solid rgba(71,85,105,0.4)",
                color:"#cbd5e1",
                borderRadius:8,padding:"8px 12px",
                fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
              📤
            </button>
          </div>
        </div>

        {/* Leave league + Add another league + World */}
        <div style={{marginTop:24,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          {leagueCodes && leagueCodes.length < (maxLeagues || 5) && (
            <button onClick={()=>setMode("creating-or-joining")} style={{
              background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(217,119,6,0.08))",
              border:"1px solid rgba(251,191,36,0.4)",
              color:"#fbbf24",fontSize:12,fontWeight:700,
              padding:"8px 16px",borderRadius:10,
              cursor:"pointer",fontFamily:"inherit",
            }}>✨ {t("leagues.addNew")}</button>
          )}
          {onShowWorld && (
            <button onClick={onShowWorld} style={{
              background:"linear-gradient(135deg,rgba(59,130,246,0.15),rgba(15,20,36,0.5))",
              border:"1px solid rgba(59,130,246,0.4)",
              color:"#93c5fd",fontSize:12,fontWeight:700,
              padding:"8px 16px",borderRadius:10,
              cursor:"pointer",fontFamily:"inherit",
            }}>🌍 {t("world.openButton")}</button>
          )}
          <button onClick={requestLeave} style={{background:"transparent",border:"none",color:"#64748b",fontSize:12,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>{t("league.leaveLeague")}</button>
        </div>

        {/* Rename league modal */}
        {showRename && (
          <div onClick={()=>!renameBusy && setShowRename(false)} style={{
            position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,
            display:"flex",alignItems:"center",justifyContent:"center",padding:20,
            backdropFilter:"blur(8px)",
          }}>
            <div onClick={e=>e.stopPropagation()} style={{
              background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
              border:"1px solid rgba(251,191,36,0.5)",
              borderRadius:18,padding:"24px 22px",maxWidth:380,width:"100%",
              boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
            }}>
              <div style={{fontSize:34,textAlign:"center",marginBottom:8}}>✏️</div>
              <h2 style={{margin:"0 0 10px",fontSize:18,textAlign:"center",color:"#fbbf24"}}>
                {t("league.renameTitle")}
              </h2>
              <p style={{fontSize:12,color:"#94a3b8",textAlign:"center",margin:"0 0 16px"}}>
                {t("league.renameSubtitle")}
              </p>
              <input
                type="text"
                value={renameDraft}
                onChange={e=>setRenameDraft(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")handleRename();}}
                maxLength={40}
                autoFocus
                style={{
                  width:"100%",boxSizing:"border-box",
                  padding:"10px 12px",fontSize:14,
                  background:"#0a0e1c",border:"1px solid rgba(251,191,36,0.4)",
                  borderRadius:8,color:"#f1f5f9",fontFamily:"inherit",outline:"none",
                  marginBottom:12,
                }}
              />
              {renameErr && (
                <div style={{fontSize:11,color:"#fca5a5",marginBottom:10,textAlign:"center"}}>
                  ⚠️ {renameErr}
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button onClick={handleRename} disabled={renameBusy} style={{
                  ...primaryBtn,opacity:renameBusy?0.5:1,
                }}>
                  {renameBusy ? "..." : t("league.renameConfirm")}
                </button>
                <button onClick={()=>setShowRename(false)} disabled={renameBusy} style={{
                  background:"transparent",border:"none",color:"#94a3b8",
                  fontSize:12,padding:"8px 0",cursor:"pointer",fontFamily:"inherit",
                }}>{t("leagueConfirm.cancel")}</button>
              </div>
            </div>
          </div>
        )}

        {/* Leave confirmation modal */}
        {confirmLeave && (
          <div onClick={()=>setConfirmLeave(false)} style={{
            position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,
            display:"flex",alignItems:"center",justifyContent:"center",padding:20,
            backdropFilter:"blur(8px)",
          }}>
            <div onClick={e=>e.stopPropagation()} style={{
              background:"linear-gradient(145deg,#1a1f3a,#0f1424)",
              border:"1px solid rgba(239,68,68,0.5)",
              borderRadius:18,padding:"24px 22px",maxWidth:380,width:"100%",
              boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
            }}>
              <div style={{fontSize:34,textAlign:"center",marginBottom:8}}>⚠️</div>
              <h2 style={{margin:"0 0 10px",fontSize:18,textAlign:"center",color:"#fca5a5"}}>
                {t("leagueConfirm.title")}
              </h2>
              <p style={{fontSize:13,color:"#cbd5e1",lineHeight:1.5,textAlign:"center",margin:"0 0 18px"}}>
                {t("leagueConfirm.message").replace("{name}", leagueData?.name || leagueCode)}
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button onClick={handleLeave} style={{
                  ...primaryBtn,
                  background:"linear-gradient(135deg,#ef4444,#dc2626)",
                  color:"#fff",
                  boxShadow:"0 6px 18px rgba(239,68,68,0.3)",
                }}>
                  {t("leagueConfirm.confirm")}
                </button>
                <button onClick={()=>setConfirmLeave(false)} style={{
                  background:"transparent",border:"none",color:"#94a3b8",
                  fontSize:12,padding:"8px 0",cursor:"pointer",fontFamily:"inherit",
                }}>{t("leagueConfirm.cancel")}</button>
              </div>
            </div>
          </div>
        )}
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

// ─── BACKUP CODE: compact format ─────────────────────────────────────────────
// WC26|<name>|<groupPicks144>|<koWinners31>|<winner>|<topScorer>|<leagueCodes>
// - groupPicks: 144 chars, 2 per fixture (h+a). "-" for empty digit. Pipes inside become tildes.
// - koWinners: 31 chars in fixed order (R32-1..16, R16-0..7, QF-0..3, SF-0,1, FINAL). 'a' | 'b' | '-'
// - winner / topScorer: name (escaped: | → ~ ). Empty if not picked.
// - leagueCodes: comma-separated.
// The old WC26B|... base64 format still works (handled in decodeBackup) for legacy backups.

const KO_BACKUP_ORDER = [
  ...Array.from({length:16},(_,i)=>`R32-${i+1}`),
  ...Array.from({length:8},(_,i)=>`R16-${i}`),
  ...Array.from({length:4},(_,i)=>`QF-${i}`),
  "SF-0","SF-1","FINAL",
];

function _esc(s) { return (s || "").replace(/\|/g, "~"); }
function _unesc(s) { return (s || "").replace(/~/g, "|"); }
function _digit(v) {
  if (v === "" || v === undefined || v === null) return "-";
  const n = parseInt(v);
  if (isNaN(n) || n < 0 || n > 9) return "-";
  return String(n);
}

function encodeBackup(state) {
  try {
    // Group picks: 72 fixtures × 2 digits = 144 chars
    let groupPicks = "";
    for (const f of FIXTURES) {
      const p = state.picks?.[f.id];
      groupPicks += _digit(p?.h) + _digit(p?.a);
    }
    // KO score predictions: 31 matches × 2 digits = 62 chars
    let koScores = "";
    for (const slot of KO_BACKUP_ORDER) {
      const p = state.koPicks?.[slot];
      koScores += _digit(p?.h) + _digit(p?.a);
    }
    // Other bits
    const winner = state.winnerPick ? _esc(state.winnerPick.name || state.winnerPick.n || "") : "";
    const scorer = state.topScorerPick ? _esc(state.topScorerPick.name || "") : "";
    // League codes (array preferred, fallback to single)
    let codes = "";
    if (Array.isArray(state.leagueCodes) && state.leagueCodes.length > 0) {
      codes = state.leagueCodes.join(",");
    } else if (state.leagueCode) {
      codes = state.leagueCode;
    }
    return `WC26|${_esc(state.name || "")}|${groupPicks}|${koScores}|${winner}|${scorer}|${codes}`;
  } catch { return null; }
}

function decodeBackup(code) {
  if (!code) return null;
  const c = code.trim();
  // Legacy Base64 format
  if (c.startsWith("WC26B|")) {
    try { return JSON.parse(decodeURIComponent(escape(atob(c.slice(6))))); }
    catch { return null; }
  }
  // Compact format
  if (c.startsWith("WC26|")) {
    try {
      const parts = c.slice(5).split("|");
      const [rawName, groupStr, koStr, winner, scorer, codesStr] = parts;
      const name = _unesc(rawName || "");
      // Decode group picks
      const picks = {};
      const gp = groupStr || "";
      FIXTURES.forEach((f, i) => {
        const h = gp[i*2];
        const a = gp[i*2 + 1];
        if (h && h !== "-" && a && a !== "-") {
          picks[f.id] = { h, a };
        }
      });
      // Decode KO data — auto-detect format:
      //  - 31 chars of "a"/"b"/"-": old single-letter winners format (legacy v1.x backups)
      //  - 62 chars of digits/-: new score predictions format (v2.0+)
      const koPicks = {};
      const koWinners = {};
      const ks = koStr || "";
      if (ks.length >= 62) {
        // New format: scores
        KO_BACKUP_ORDER.forEach((slot, i) => {
          const h = ks[i*2];
          const a = ks[i*2 + 1];
          if (h && h !== "-" && a && a !== "-") {
            koPicks[slot] = { h, a };
          }
        });
      } else {
        // Legacy format: just winners (no scores)
        KO_BACKUP_ORDER.forEach((slot, i) => {
          const v = ks[i];
          if (v === "a" || v === "b") koWinners[slot] = v;
        });
      }
      // Other bits
      const winnerPick = winner ? { name: _unesc(winner), n: _unesc(winner) } : null;
      const topScorerPick = scorer ? { name: _unesc(scorer) } : null;
      // League codes
      const leagueCodes = codesStr ? codesStr.split(",").filter(Boolean) : [];
      const leagueCode = leagueCodes[0] || "";
      return {
        name, picks, koWinners, koPicks,
        winnerPick, topScorerPick,
        leagueCodes, leagueCode,
        activeLeagueCode: leagueCode,
      };
    } catch { return null; }
  }
  return null;
}

// ─── BACKUP MODAL ─────────────────────────────────────────────────────────────

function ConfirmModal({ action, onClose }) {
  const [typedText, setTypedText] = useState("");
  // Reset typed text whenever the modal opens with a new action
  useEffect(() => { setTypedText(""); }, [action]);
  if (!action) return null;
  const requireType = action.requireType; // optional string user must type
  const canConfirm = !requireType || typedText.trim().toLowerCase() === requireType.toLowerCase();
  const handleConfirm = () => {
    if (!canConfirm) return;
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
        {requireType && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#fca5a5",textAlign:"center",marginBottom:6,letterSpacing:1}}>
              {action.typePrompt || `Type "${requireType}" to confirm:`}
            </div>
            <input
              autoFocus
              value={typedText}
              onChange={e => setTypedText(e.target.value)}
              placeholder={requireType}
              style={{
                width:"100%",
                padding:"10px 12px",
                borderRadius:8,
                background:"#0a0e1c",
                border:`1px solid ${canConfirm ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.4)"}`,
                color:"#f1f5f9",
                fontSize:14,
                fontFamily:"inherit",
                outline:"none",
                textAlign:"center",
                boxSizing:"border-box",
              }}
            />
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {action.secondaryLabel && (
            <button onClick={handleSecondary} style={{...primaryBtn}}>
              {action.secondaryLabel}
            </button>
          )}
          <button onClick={handleConfirm} disabled={!canConfirm} style={{
            ...primaryBtn,
            background: action.danger ? "linear-gradient(135deg,#ef4444,#dc2626)" : (action.secondaryLabel ? "rgba(30,41,59,0.6)" : primaryBtn.background),
            color: action.secondaryLabel && !action.danger ? "#cbd5e1" : (action.danger ? "#fff" : primaryBtn.color),
            boxShadow: action.danger ? "0 6px 18px rgba(239,68,68,0.3)" : (action.secondaryLabel ? "none" : primaryBtn.boxShadow),
            border: action.secondaryLabel && !action.danger ? "1px solid rgba(71,85,105,0.4)" : "none",
            opacity: canConfirm ? 1 : 0.4,
            cursor: canConfirm ? "pointer" : "not-allowed",
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
  // NEW (Stage 1): koPicks holds score predictions for each knockout match.
  // Format: { "R32-1": { h: "2", a: "1" }, ... }. Parallel to `picks` for groups.
  const [koPicks, setKoPicks] = useState(saved?.koPicks || {});
  const [groupIdx, setGroupIdx] = useState(saved?.groupIdx || 0);
  const [friends, setFriends] = useState(saved?.friends || []);
  const [actuals, setActuals] = useState(saved?.actuals || {});
  const [actualKo, setActualKo] = useState(saved?.actualKo || {});
  // NEW: actual scores for knockout matches (parallel to actualKo which is just a/b winner)
  // Format: { "R32-1": { h: "2", a: "1" }, ... }
  const [actualKoScores, setActualKoScores] = useState(saved?.actualKoScores || {});
  const [winnerPick, setWinnerPick] = useState(saved?.winnerPick || null); // {name, flag} of team you bet wins it all
  // Goal celebration: which exact-prediction fixtures have already been celebrated
  const [celebratedIds, setCelebratedIds] = useState(() => {
    try {
      const raw = localStorage.getItem("wc2026_celebrated_v1");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  // Track last-seen goal count for our top scorer so we can detect new goals
  const [lastSeenGoals, setLastSeenGoals] = useState(() => {
    try { return parseInt(localStorage.getItem("wc2026_lastseen_goals_v1") || "0") || 0; } catch { return 0; }
  });
  // Pending celebration to show right now
  const [pendingCelebration, setPendingCelebration] = useState(null);
  const [pendingTopScorerCeleb, setPendingTopScorerCeleb] = useState(null);
  // Recap of recent finished matches the user hasn't seen yet
  const [seenActualIds, setSeenActualIds] = useState(() => {
    try {
      const raw = localStorage.getItem("wc2026_seen_actuals_v1");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const [pendingRecap, setPendingRecap] = useState(null); // {newMatches: [...], totalPoints: N}
  // Profile modal open?
  const [showProfile, setShowProfile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  // Track unlocked badge IDs (persisted in localStorage)
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => {
    try {
      const raw = localStorage.getItem("wc2026_achv_v1");
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });
  // Track the local hours at which the user makes picks (for night_owl / early_bird badges)
  const [pickedAtHours, setPickedAtHours] = useState(() => {
    try {
      const raw = localStorage.getItem("wc2026_pickhours_v1");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  // Record the current local hour whenever picks change (debounced)
  const prevPicksRef = useRef(picks);
  useEffect(() => {
    if (prevPicksRef.current === picks) return;
    prevPicksRef.current = picks;
    const handle = setTimeout(() => {
      const hour = new Date().getHours();
      setPickedAtHours(prev => {
        if (prev.includes(hour)) return prev;
        const next = [...prev, hour];
        try { localStorage.setItem("wc2026_pickhours_v1", JSON.stringify(next)); } catch {}
        return next;
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [picks, koPicks]);
  // Queue of newly unlocked badges to show as popups
  const [newBadgeQueue, setNewBadgeQueue] = useState([]);
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("wc2026_lang") || "en"; } catch { return "en"; }
  });
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem("wc2026_lang", l); } catch {}
  };
  // Update document direction when language changes (RTL for Hebrew)
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // ─── GOAL CELEBRATION: detect new exact predictions ──────────────────────
  // Whenever actuals change, check if any new fixture has an exact-score match
  // against the user's picks. Show the celebration overlay once per match.
  useEffect(() => {
    if (!name) return;
    if (pendingCelebration) return; // already showing one
    for (const f of FIXTURES) {
      const a = actuals[f.id];
      const p = picks[f.id];
      if (!a || a.h === undefined || a.h === "" || a.a === undefined || a.a === "") continue;
      if (!p || p.h === undefined || p.h === "" || p.a === undefined || p.a === "") continue;
      const ph = parseInt(p.h), pa = parseInt(p.a);
      const ah = parseInt(a.h), aa2 = parseInt(a.a);
      if (ph === ah && pa === aa2 && !celebratedIds.has(f.id)) {
        // EXACT MATCH! Celebrate.
        setPendingCelebration({ fixture: f, score: { h: ah, a: aa2 } });
        const newSet = new Set(celebratedIds);
        newSet.add(f.id);
        setCelebratedIds(newSet);
        try { localStorage.setItem("wc2026_celebrated_v1", JSON.stringify([...newSet])); } catch {}
        break; // one at a time
      }
    }
  }, [actuals, picks, name, pendingCelebration]);

  // ─── RECAP: when user opens app, show summary of new finished matches ─────
  useEffect(() => {
    if (!name) return;
    if (pendingRecap) return; // already showing
    // Find finished matches (with actual scores) that the user hasn't seen yet
    const unseenMatches = [];
    let recapPoints = 0;
    for (const f of FIXTURES) {
      const a = actuals[f.id];
      const p = picks[f.id];
      if (!a || a.h === undefined || a.h === "" || a.a === undefined || a.a === "") continue;
      if (seenActualIds.has(f.id)) continue;
      const sc = (p && p.h !== undefined && p.h !== "") ? scoreMatch(p, a) : { points: 0, type: "none" };
      unseenMatches.push({ fixture: f, actual: a, pick: p, score: sc });
      recapPoints += sc.points;
    }
    // Only show recap if 2+ new matches (otherwise the goal celebration handles it)
    if (unseenMatches.length >= 2) {
      setPendingRecap({ newMatches: unseenMatches, totalPoints: recapPoints });
    }
    // Mark them all as seen (whether we show recap or not — single matches don't get a recap, just the celebration)
    if (unseenMatches.length > 0) {
      const newSet = new Set(seenActualIds);
      unseenMatches.forEach(m => newSet.add(m.fixture.id));
      setSeenActualIds(newSet);
      try { localStorage.setItem("wc2026_seen_actuals_v1", JSON.stringify([...newSet])); } catch {}
    }
  }, [actuals, picks, name, pendingRecap]);

  const [topScorerPick, setTopScorerPick] = useState(saved?.topScorerPick || null); // {name, team}
  const [actualWinner, setActualWinner] = useState(saved?.actualWinner || null);
  const [actualTopScorer, setActualTopScorer] = useState(saved?.actualTopScorer || null); // {name, team, goals}
  // Top scorers leaderboard — array of {name, team, goals, rank}
  const [topScorers, setTopScorers] = useState([]);
  const [topScorersFetchedAt, setTopScorersFetchedAt] = useState(null);
  const [topScorersError, setTopScorersError] = useState(null);

  // ─── TOP SCORER CELEBRATION: detect when your pick scores another goal ──
  useEffect(() => {
    if (!name) return;
    if (!topScorerPick || !actualTopScorer) return;
    if (actualTopScorer.name !== topScorerPick.name) return; // wrong player
    if (pendingTopScorerCeleb) return; // already showing
    const currentGoals = actualTopScorer.goals || 0;
    if (currentGoals > lastSeenGoals) {
      const delta = currentGoals - lastSeenGoals;
      setPendingTopScorerCeleb({
        player: { name: actualTopScorer.name, team: actualTopScorer.team || topScorerPick.team },
        newTotalGoals: currentGoals,
        goalDelta: delta,
      });
      setLastSeenGoals(currentGoals);
      try { localStorage.setItem("wc2026_lastseen_goals_v1", String(currentGoals)); } catch {}
    } else if (currentGoals < lastSeenGoals) {
      // Reset (shouldn't happen normally, but safeguard)
      setLastSeenGoals(currentGoals);
      try { localStorage.setItem("wc2026_lastseen_goals_v1", String(currentGoals)); } catch {}
    }
  }, [actualTopScorer, topScorerPick, name, pendingTopScorerCeleb, lastSeenGoals]);

  const [leagueName, setLeagueName] = useState(saved?.leagueName || "");
  // ─── MULTI-LEAGUE SUPPORT ─────────────────────────────────────────────────
  // leagueCodes: array of all league codes the user has joined
  // activeLeagueCode: which league is currently being viewed (for sync)
  // Migration: if saved has leagueCode (single string), upgrade it to an array
  const [leagueCodes, setLeagueCodes] = useState(() => {
    if (Array.isArray(saved?.leagueCodes)) return saved.leagueCodes;
    if (saved?.leagueCode) return [saved.leagueCode]; // migrate old single code
    return [];
  });
  const [activeLeagueCode, setActiveLeagueCode] = useState(() => {
    if (Array.isArray(saved?.leagueCodes) && saved.leagueCodes.length > 0) {
      return saved.activeLeagueCode || saved.leagueCodes[0];
    }
    return saved?.leagueCode || "";
  });
  // Cache of league data for each league code: { code -> data }
  const [allLeagueData, setAllLeagueData] = useState({});
  const MAX_LEAGUES = 5;
  const [userId] = useState(() => saved?.userId || `u_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
  // Backwards-compatibility shims: rest of App.jsx still uses `leagueCode` / `setLeagueCode`
  // for the *currently active* league. These will continue to work transparently.
  const leagueCode = activeLeagueCode;
  const setLeagueCode = (code) => {
    if (code) {
      // Joining/creating: add to list if not already there
      setLeagueCodes(prev => prev.includes(code) ? prev : [...prev, code]);
      setActiveLeagueCode(code);
    } else {
      // Empty string = leaving the currently active league
      setLeagueCodes(prev => prev.filter(c => c !== activeLeagueCode));
      // After leaving, switch to another league if available, else empty
      setActiveLeagueCode(prev => {
        const remaining = leagueCodes.filter(c => c !== prev);
        return remaining[0] || "";
      });
    }
  };
  // The currently-active league's data
  const leagueData = allLeagueData[activeLeagueCode] || null;
  const setLeagueData = (data) => {
    if (!activeLeagueCode) return;
    setAllLeagueData(prev => ({ ...prev, [activeLeagueCode]: data }));
  };
  const [leagueError, setLeagueError] = useState("");
  const [liveFetchAt, setLiveFetchAt] = useState(null); // timestamp of last successful fetch
  const [liveError, setLiveError] = useState("");
  const [showBackup, setShowBackup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showIntro, setShowIntro] = useState(!saved?.name);
  // Onboarding: shown once after first welcome
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("wc2026_onboarded_v1"); } catch { return true; }
  });
  const completeOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem("wc2026_onboarded_v1", "1"); } catch {}
  };
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
    const ok = saveState({ name, picks, koWinners, koPicks, groupIdx, friends, actuals, actualKo, actualKoScores, leagueName, leagueCode, leagueCodes, activeLeagueCode, userId, winnerPick, topScorerPick, actualWinner, actualTopScorer });
    if (ok) {
      setJustSaved(true);
      const t = setTimeout(()=>setJustSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [name, picks, koWinners, koPicks, groupIdx, friends, actuals, actualKo, actualKoScores, leagueName, leagueCode, leagueCodes, activeLeagueCode, winnerPick, topScorerPick, actualWinner, actualTopScorer]);

  // ─── FIREBASE LEAGUE SYNC ──────────────────────────────────────────────────
  // Subscribe to ALL leagues the user has joined, in real-time
  useEffect(() => {
    if (!leagueCodes || leagueCodes.length === 0) {
      setAllLeagueData({});
      return;
    }
    const unsubs = [];
    leagueCodes.forEach(code => {
      const unsub = subscribeLeague(
        code,
        (data) => {
          setAllLeagueData(prev => ({ ...prev, [code]: data }));
          // Pull shared actuals from the ACTIVE league only (so commissioner can broadcast)
          if (code === activeLeagueCode && data.actuals) setActuals(data.actuals);
          if (code === activeLeagueCode && data.actualKo) setActualKo(data.actualKo);
        },
        (err) => {
          console.error(`League sync error (${code}):`, err);
          if (code === activeLeagueCode) setLeagueError(err.message || "Couldn't sync league");
        }
      );
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u?.());
  }, [leagueCodes.join("|"), activeLeagueCode]);

  // Push our picks to ALL leagues the user is in (debounced)
  useEffect(() => {
    if (!leagueCodes.length || !name) return;
    const handle = setTimeout(() => {
      leagueCodes.forEach(code => {
        updateMyPicks(code, userId, name, picks, koWinners, { winnerPick, topScorerPick, koPicks })
          .catch(err => console.error(`Failed to push picks to ${code}:`, err));
      });
    }, 800);
    return () => clearTimeout(handle);
  }, [leagueCodes.join("|"), userId, name, picks, koWinners, winnerPick, topScorerPick]);

  // ─── GLOBAL PROFILE: push to the worldwide leaderboard (every user) ──────
  // Independent of league membership — everyone is on the global board.
  useEffect(() => {
    if (!name) return;
    const handle = setTimeout(() => {
      // Compute total points: group score + KO score + bonus
      let total = 0;
      try {
        const ms = totalScore(picks, actuals);
        total = ms.total;
      } catch (e) {}
      try {
        const ks = totalKoScore(koPicks, actualKoScores);
        total += ks.total;
      } catch (e) {}
      // Bonus picks
      if (actualWinner && winnerPick) {
        const aw = actualWinner.name || actualWinner.n;
        const mw = winnerPick.name || winnerPick.n;
        if (aw && mw && aw === mw) total += POINTS.WINNER_BET;
      }
      if (actualTopScorer && topScorerPick && actualTopScorer.name === topScorerPick.name) {
        total += (actualTopScorer.goals || 0) * POINTS.TOP_SCORER_GOAL;
      }
      updateMyGlobalProfile(userId, name, picks, koWinners, {
        winnerPick, topScorerPick, koPicks, totalPoints: total,
      }).catch(err => console.error("Failed to push global profile:", err));
    }, 1200);
    return () => clearTimeout(handle);
  }, [userId, name, picks, koWinners, koPicks, winnerPick, topScorerPick, actuals, actualKoScores, actualWinner, actualTopScorer]);

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

          // Iteratively resolve: each round needs the previous round's winners filled in.
          // Each pass also extracts the actual KO scores from API (for scoring user predictions).
          let workingKo = { ...actualKo };
          let workingKoScores = { ...actualKoScores };
          for (let pass = 0; pass < 5; pass++) {
            const realBracket = buildRealBracket(workingKo);
            // Flatten all rounds into one list of matches to look up
            const allRounds = [...realBracket.r32, ...realBracket.r16, ...realBracket.qf, ...realBracket.sf, realBracket.final];
            const { winners: koWinners, scores: koScores } = mapKnockoutToBracket(data, allRounds);
            const mergedKo = { ...workingKo, ...koWinners };
            const mergedScores = { ...workingKoScores, ...koScores };
            const koChanged = JSON.stringify(mergedKo) !== JSON.stringify(workingKo);
            const scoresChanged = JSON.stringify(mergedScores) !== JSON.stringify(workingKoScores);
            if (!koChanged && !scoresChanged) break;
            workingKo = mergedKo;
            workingKoScores = mergedScores;
          }
          if (JSON.stringify(workingKo) !== JSON.stringify(actualKo)) {
            newActualKo = workingKo;
            setActualKo(workingKo);
          }
          if (JSON.stringify(workingKoScores) !== JSON.stringify(actualKoScores)) {
            setActualKoScores(workingKoScores);
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

  // Fetch top scorers (separate API call, same 5-min cache)
  const fetchAndApplyTopScorers = async () => {
    try {
      const scorers = await fetchTopScorers();
      setTopScorers(scorers);
      setTopScorersFetchedAt(Date.now());
      setTopScorersError(null);
      // If user has a top-scorer pick, sync actualTopScorer to their match
      if (topScorerPick && scorers.length > 0) {
        const found = scorers.find(s => s.name === topScorerPick.name);
        if (found) {
          setActualTopScorer({ name: found.name, team: found.team, goals: found.goals });
        }
      }
      // Track overall top scorer (rank 1) for winner-bet bonus
      if (scorers.length > 0 && scorers[0].rank === 1) {
        const leader = scorers[0];
        // Only set actualTopScorer if user hasn't picked anyone or their pick isn't found
        // (the per-pick sync above handles their own pick already)
      }
    } catch (err) {
      console.error("Top scorers fetch failed:", err);
      setTopScorersError(err.message || "Couldn't fetch top scorers");
    }
  };

  useEffect(() => {
    if (!name) return;
    // Initial fetch shortly after load
    const initial = setTimeout(() => { fetchAndApplyLive(); fetchAndApplyTopScorers(); }, 3000);
    // Then every 5 minutes
    const interval = setInterval(() => { fetchAndApplyLive(); fetchAndApplyTopScorers(); }, 5 * 60 * 1000);
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
  // Total points for sidebar display
  const myTotalPoints = useMemo(() => {
    let total = 0;
    try {
      const ms = totalScore(picks, actuals);
      total = ms.total;
    } catch {}
    // KO predictions
    try {
      const ks = totalKoScore(koPicks, actualKoScores);
      total += ks.total;
    } catch {}
    if (actualWinner && winnerPick) {
      const aw = actualWinner.name || actualWinner.n;
      const mw = winnerPick.name || winnerPick.n;
      if (aw && mw && aw === mw) total += POINTS.WINNER_BET;
    }
    if (actualTopScorer && topScorerPick && actualTopScorer.name === topScorerPick.name) {
      total += (actualTopScorer.goals || 0) * POINTS.TOP_SCORER_GOAL;
    }
    return total;
  }, [picks, actuals, koPicks, actualKoScores, winnerPick, topScorerPick, actualWinner, actualTopScorer]);

  // ─── ACHIEVEMENTS CHECK ──────────────────────────────────────────────────
  // Whenever relevant state changes, recompute which badges should be unlocked.
  // New unlocks go into a queue that pops up one at a time.
  useEffect(() => {
    // Compute my rank from any active league + how many people in it
    let myRank = null;
    let leagueSize = 0;
    if (leagueData?.members) {
      const ranked = Object.values(leagueData.members).map(m => {
        let total = 0;
        try { total = totalScore(m.picks || {}, actuals).total; } catch {}
        if (actualWinner && m.winnerPick) {
          const aw = actualWinner.name || actualWinner.n;
          const mw = m.winnerPick.name || m.winnerPick.n;
          if (aw && mw && aw === mw) total += POINTS.WINNER_BET;
        }
        if (actualTopScorer && m.topScorerPick && actualTopScorer.name === m.topScorerPick.name) {
          total += (actualTopScorer.goals || 0) * POINTS.TOP_SCORER_GOAL;
        }
        return { uid: m.uid, total };
      }).sort((a, b) => b.total - a.total);
      leagueSize = ranked.length;
      const idx = ranked.findIndex(r => r.uid === userId);
      if (idx >= 0) myRank = idx + 1;
    }
    // Global rank from cached world leaderboard (if available)
    let globalRank = null;
    try {
      const raw = localStorage.getItem("wc2026_world_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.myRank) globalRank = parsed.myRank;
      }
    } catch {}
    const ctx = {
      picks, actuals, koWinners, koPicks, actualKoScores,
      winnerPick, topScorerPick,
      actualWinner, actualTopScorer,
      totalPoints: myTotalPoints,
      leagueCodes, myRank, leagueSize, globalRank,
      pickedAtHours,
    };
    const nowUnlocked = checkAchievements(ctx);
    // Find genuinely new badges
    const newOnes = [];
    nowUnlocked.forEach(id => {
      if (!unlockedAchievements.has(id)) {
        const achv = ACHIEVEMENTS.find(a => a.id === id);
        if (achv) newOnes.push(achv);
      }
    });
    if (newOnes.length > 0) {
      const merged = new Set([...unlockedAchievements, ...nowUnlocked]);
      setUnlockedAchievements(merged);
      try { localStorage.setItem("wc2026_achv_v1", JSON.stringify([...merged])); } catch {}
      setNewBadgeQueue(q => [...q, ...newOnes]);
    }
  }, [picks, actuals, koWinners, koPicks, actualKoScores, winnerPick, topScorerPick, actualWinner, actualTopScorer, myTotalPoints, leagueCodes.join("|"), leagueData, pickedAtHours]);
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
    setKoPicks(restored.koPicks || {});
    setGroupIdx(restored.groupIdx || 0);
    setFriends(restored.friends || []);
    setActuals(restored.actuals || {});
    setActualKo(restored.actualKo || {});
    setLeagueName(restored.leagueName || "");
    // Restore leagues - support both old single-code format and new array format
    if (Array.isArray(restored.leagueCodes)) {
      setLeagueCodes(restored.leagueCodes);
      setActiveLeagueCode(restored.activeLeagueCode || restored.leagueCodes[0] || "");
    } else if (restored.leagueCode) {
      setLeagueCodes([restored.leagueCode]);
      setActiveLeagueCode(restored.leagueCode);
    } else {
      setLeagueCodes([]);
      setActiveLeagueCode("");
    }
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
      requireType: name || "DELETE",
      typePrompt: name ? `Type your name ("${name}") to confirm:` : `Type "DELETE" to confirm:`,
      onConfirm: () => {
        // Wipe everything from Firebase first (global profile + all leagues),
        // then clear local state.
        const codesToLeave = [...leagueCodes];
        const myUid = userId;
        Promise.all([
          deleteMyGlobalProfile(myUid).catch(() => {}),
          ...codesToLeave.map(c => leaveLeague(c, myUid).catch(() => {})),
        ]).catch(() => {});
        clearState();
        setName(""); setPicks({}); setKoWinners({}); setKoPicks({}); setGroupIdx(0);
        setFriends([]); setActuals({}); setActualKo({}); setActualKoScores({}); setLeagueName(""); setLeagueCode(""); setLeagueCodes([]); setActiveLeagueCode(""); setAllLeagueData({}); setWinnerPick(null); setTopScorerPick(null); setCelebratedIds(new Set()); setLastSeenGoals(0); setSeenActualIds(new Set()); setShowOnboarding(true); try { localStorage.removeItem("wc2026_celebrated_v1"); localStorage.removeItem("wc2026_lastseen_goals_v1"); localStorage.removeItem("wc2026_seen_actuals_v1"); localStorage.removeItem("wc2026_onboarded_v1"); localStorage.removeItem("wc2026_world_v2"); localStorage.removeItem("wc2026_achv_v1"); localStorage.removeItem("wc2026_pickhours_v1"); } catch {}
        setScreen("welcome");
        setShowIntro(false);
      },
    });
  };
  const handleLogout = () => {
    const hasData = totalPredicted > 0 || friends.length > 0;
    if (!hasData) {
      // No data to worry about, just log out locally — keep Firebase intact in case they restore
      clearState();
      setName(""); setPicks({}); setKoWinners({}); setKoPicks({}); setGroupIdx(0);
      setFriends([]); setActuals({}); setActualKo({}); setActualKoScores({}); setLeagueName(""); setLeagueCode(""); setLeagueCodes([]); setActiveLeagueCode(""); setAllLeagueData({}); setWinnerPick(null); setTopScorerPick(null); setCelebratedIds(new Set()); setLastSeenGoals(0); setSeenActualIds(new Set()); setShowOnboarding(true); try { localStorage.removeItem("wc2026_celebrated_v1"); localStorage.removeItem("wc2026_lastseen_goals_v1"); localStorage.removeItem("wc2026_seen_actuals_v1"); localStorage.removeItem("wc2026_onboarded_v1"); localStorage.removeItem("wc2026_world_v2"); localStorage.removeItem("wc2026_achv_v1"); localStorage.removeItem("wc2026_pickhours_v1"); } catch {}
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
        // Logout is local-only — Firebase profile + league memberships stay intact
        // so the user can restore their progress later with a backup code.
        clearState();
        setName(""); setPicks({}); setKoWinners({}); setKoPicks({}); setGroupIdx(0);
        setFriends([]); setActuals({}); setActualKo({}); setActualKoScores({}); setLeagueName(""); setLeagueCode(""); setLeagueCodes([]); setActiveLeagueCode(""); setAllLeagueData({}); setWinnerPick(null); setTopScorerPick(null); setCelebratedIds(new Set()); setLastSeenGoals(0); setSeenActualIds(new Set()); setShowOnboarding(true); try { localStorage.removeItem("wc2026_celebrated_v1"); localStorage.removeItem("wc2026_lastseen_goals_v1"); localStorage.removeItem("wc2026_seen_actuals_v1"); localStorage.removeItem("wc2026_onboarded_v1"); localStorage.removeItem("wc2026_world_v2"); localStorage.removeItem("wc2026_achv_v1"); localStorage.removeItem("wc2026_pickhours_v1"); } catch {}
        setScreen("welcome");
        setShowIntro(false);
      },
    });
  };
  const setPick = (id, p) => setPicks(prev => ({ ...prev, [id]: p }));

  const currentGroup = GROUP_KEYS[groupIdx];

  const fullState = { name, picks, koWinners, koPicks, groupIdx, friends, actuals, actualKo, leagueName, leagueCode, leagueCodes, activeLeagueCode, winnerPick, topScorerPick, userId };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
    <ToastProvider>
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at top,#1e1b4b 0%,#0a0e1c 70%)",color:"#f1f5f9",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",position:"relative",overflow:"hidden",direction:lang==="he"?"rtl":"ltr"}}>
      {/* Language toggle: shown only on welcome screen */}
      {screen === "welcome" && (
        <div style={{
          position:"fixed",
          top:10,
          [lang==="he" ? "left" : "right"]:10,
          zIndex:100,
          display:"flex",
          background:"rgba(15,23,42,0.85)",
          backdropFilter:"blur(8px)",
          border:"1px solid rgba(71,85,105,0.4)",
          borderRadius:20,
          padding:2,
        }}>
          <button onClick={()=>setLang("en")} style={{
            padding:"4px 10px",border:"none",borderRadius:16,cursor:"pointer",fontFamily:"inherit",
            background: lang==="en" ? "#fbbf24" : "transparent",
            color: lang==="en" ? "#0a0e1c" : "#94a3b8",
            fontSize:10,fontWeight:800,letterSpacing:1,
          }}>EN</button>
          <button onClick={()=>setLang("he")} style={{
            padding:"4px 10px",border:"none",borderRadius:16,cursor:"pointer",fontFamily:"inherit",
            background: lang==="he" ? "#fbbf24" : "transparent",
            color: lang==="he" ? "#0a0e1c" : "#94a3b8",
            fontSize:10,fontWeight:800,letterSpacing:1,
          }}>עב</button>
        </div>
      )}
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

      {/* Top bar — minimalist */}
      {screen !== "welcome" && screen !== "results" && (
        <div style={{position:"sticky",top:0,zIndex:20,background:"rgba(10,14,28,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(71,85,105,0.3)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,maxWidth:560,margin:"0 auto",padding:"10px 14px"}}>
            {/* ☰ Hamburger menu */}
            <button onClick={()=>setShowSidebar(true)} aria-label="Menu" style={{
              background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",
              padding:"4px 6px",
              display:"flex",flexDirection:"column",gap:4,
              flexShrink:0,
            }}>
              <span style={{width:22,height:2.5,background:"#fbbf24",borderRadius:2,display:"block"}}/>
              <span style={{width:22,height:2.5,background:"#fbbf24",borderRadius:2,display:"block"}}/>
              <span style={{width:22,height:2.5,background:"#fbbf24",borderRadius:2,display:"block"}}/>
            </button>

            {/* Progress bar */}
            <div style={{flex:1,height:6,background:"rgba(71,85,105,0.3)",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${Math.round((totalPredicted/FIXTURES.length)*100)}%`,height:"100%",background:"linear-gradient(90deg,#fbbf24,#f59e0b)",borderRadius:3,transition:"width 0.4s"}}/>
            </div>
            <span style={{fontSize:10,color:"#fbbf24",fontWeight:700,minWidth:42,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>{totalPredicted}/{FIXTURES.length}</span>

            {/* Just-saved indicator (small green check) */}
            {justSaved && (
              <span style={{
                color:"#22c55e",fontSize:14,fontWeight:900,
                animation:"fadeUp 0.3s ease-out",
              }}>✓</span>
            )}
          </div>

          {/* 🏆 Countdown to first match — disappears when tournament starts */}
          <CountdownBar />

          {/* Bottom nav */}
          {(screen === "group" || screen === "today" || screen === "bracket" || screen === "bonus" || screen === "league") && (
            <div style={{display:"flex",justifyContent:"center",borderTop:"1px solid rgba(71,85,105,0.3)"}}>
              {[
                ["today", TRANSLATIONS[lang]?.["nav.today"] || TRANSLATIONS.en["nav.today"]],
                ["group", TRANSLATIONS[lang]?.["nav.predict"] || TRANSLATIONS.en["nav.predict"]],
                ["bracket", TRANSLATIONS[lang]?.["nav.bracket"] || TRANSLATIONS.en["nav.bracket"]],
                ["bonus", TRANSLATIONS[lang]?.["nav.bonus"] || TRANSLATIONS.en["nav.bonus"]],
                ["league", TRANSLATIONS[lang]?.["nav.league"] || TRANSLATIONS.en["nav.league"]],
              ].map(([s, label]) => (
                <button key={s} onClick={()=>setScreen(s)} style={{
                  flex:1,padding:"8px 2px",background:screen===s?"rgba(251,191,36,0.1)":"transparent",
                  border:"none",borderBottom:screen===s?"2px solid #fbbf24":"2px solid transparent",
                  color:screen===s?"#fbbf24":"#94a3b8",fontSize:10,cursor:"pointer",fontFamily:"inherit",
                  letterSpacing:0.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {screen === "welcome" && showIntro && <SoccerIntro onDone={()=>setShowIntro(false)} />}
      {name && showOnboarding && <OnboardingTutorial onDone={completeOnboarding} />}
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
          leagueMembers={leagueData ? Object.values(leagueData.members || {}) : null}
        />
      )}

      {screen === "today" && (
        <TodayScreen
          picks={picks}
          actuals={actuals}
          onPick={(fid, field, val) => setPicks(p => ({ ...p, [fid]: { ...p[fid], [field]: val } }))}
          onBack={()=>setScreen("group")}
          onGoToBracket={()=>setScreen("bracket")}
          leagueMembers={leagueData ? Object.values(leagueData.members || {}) : null}
        />
      )}

      {screen === "bracket" && (
        <KnockoutBracket
          standings={standings}
          bestThirds={bestThirds}
          liveStandings={liveStandings}
          liveBestThirds={liveBestThirds}
          hasActuals={hasActuals}
          actualKo={actualKo}
          koWinners={koWinners}
          setKoWinners={setKoWinners}
          koPicks={koPicks}
          setKoPicks={setKoPicks}
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
          topScorers={topScorers}
          topScorersFetchedAt={topScorersFetchedAt}
          topScorersError={topScorersError}
        />
      )}

      {screen === "league" && (
        <LeagueHub
          name={name} userId={userId}
          picks={picks} koWinners={koWinners} koPicks={koPicks}
          leagueCode={leagueCode} setLeagueCode={setLeagueCode}
          leagueData={leagueData} leagueError={leagueError}
          actuals={actuals} actualKo={actualKo} actualKoScores={actualKoScores} hasActuals={hasActuals}
          liveStandings={liveStandings} liveBestThirds={liveBestThirds}
          liveFetchAt={liveFetchAt} liveError={liveError}
          onFetchLive={fetchAndApplyLive}
          actualWinner={actualWinner} actualTopScorer={actualTopScorer}
          leagueCodes={leagueCodes}
          activeLeagueCode={activeLeagueCode}
          setActiveLeagueCode={setActiveLeagueCode}
          allLeagueData={allLeagueData}
          maxLeagues={MAX_LEAGUES}
          onShowWorld={()=>setScreen("world")}
        />
      )}

      {screen === "world" && (
        <WorldLeaderboard
          userId={userId}
          name={name}
          onClose={()=>setScreen("league")}
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

      {/* 🎉 Goal celebration overlay */}
      {pendingCelebration && (
        <GoalCelebration
          fixture={pendingCelebration.fixture}
          score={pendingCelebration.score}
          onDismiss={()=>setPendingCelebration(null)}
        />
      )}

      {/* 👟 Top scorer goal celebration */}
      {pendingTopScorerCeleb && (
        <TopScorerCelebration
          player={pendingTopScorerCeleb.player}
          newTotalGoals={pendingTopScorerCeleb.newTotalGoals}
          goalDelta={pendingTopScorerCeleb.goalDelta}
          onDismiss={()=>setPendingTopScorerCeleb(null)}
        />
      )}

      {/* 📊 Profile stats modal */}
      {showProfile && name && (
        <ProfileStats
          name={name}
          picks={picks}
          koWinners={koWinners}
          actuals={actuals}
          actualKo={actualKo}
          winnerPick={winnerPick}
          topScorerPick={topScorerPick}
          onClose={()=>setShowProfile(false)}
        />
      )}

      {/* ⓘ Scoring rules modal */}
      {showRules && <ScoringRulesModal onClose={()=>setShowRules(false)} />}

      {/* 📊 Recap modal — new matches since last visit */}
      {pendingRecap && (
        <RecapModal recap={pendingRecap} onClose={()=>setPendingRecap(null)} />
      )}

      {/* ⬆ Back to top floating button */}
      <BackToTopButton />

      {/* 🍔 Sidebar drawer */}
      <Sidebar
        open={showSidebar}
        onClose={()=>setShowSidebar(false)}
        name={name}
        lang={lang}
        setLang={setLang}
        totalPoints={myTotalPoints}
        unlockedCount={unlockedAchievements.size}
        onShowProfile={()=>setShowProfile(true)}
        onShowRules={()=>setShowRules(true)}
        onShowBackup={()=>setShowBackup(true)}
        onShowTutorial={()=>setShowOnboarding(true)}
        onShowAchievements={()=>setShowAchievements(true)}
        onLogout={handleLogout}
        onReset={handleReset}
      />

      {/* 🏅 Achievements modal */}
      {showAchievements && (
        <AchievementsModal
          unlockedIds={unlockedAchievements}
          onClose={()=>setShowAchievements(false)}
        />
      )}

      {/* 🎉 New badge popup (one at a time, auto-dismisses) */}
      {newBadgeQueue.length > 0 && (
        <NewBadgePopup
          achievement={newBadgeQueue[0]}
          onClose={()=>setNewBadgeQueue(q => q.slice(1))}
        />
      )}
      </div>
    </div>
    </ToastProvider>
    </LangContext.Provider>
  );
}
