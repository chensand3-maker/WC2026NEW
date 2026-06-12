import { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import {
  generateLeagueCode, createLeague, joinLeague,
  updateMyPicks, leaveLeague, subscribeLeague, updateActualResults,
  updateMyGlobalProfile, deleteMyGlobalProfile, fetchGlobalLeaderboard, renameLeague,
  sendGiftToLeague,
  fetchAllGlobalUsers, deleteGlobalUser,
} from "./firebase";
import { fetchLiveResults, mapResultsToFixtures, mapKnockoutToWinners, mapKnockoutToBracket, fetchTopScorers, fetchMatchDetails, getApiFixtureId } from "./liveResults";

// ─── APP VERSION ──────────────────────────────────────────────────────────────
// Bump this manually before each deploy. Shown in the sidebar footer.
const APP_VERSION = "3.32.0";

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
    "today.liveNow": "LIVE NOW",
    "today.justFinished": "JUST FINISHED",
    "today.refresh": "Refresh",
    "matchcard.predicted": "Predicted",
    "matchcard.noPick": "No prediction yet",
    "matchdetails.title": "GOAL SCORERS",
    "matchdetails.loading": "Loading goals...",
    "matchdetails.error": "Couldn't load goals",
    "matchdetails.notReady": "Goals aren't available yet",
    "matchdetails.goals": "GOALS",
    "matchdetails.noGoals": "No goals in this match",
    "matchdetails.stats": "STATISTICS",
    "matchdetails.possession": "Possession",
    "matchdetails.shots": "Shots",
    "matchdetails.shotsOnTarget": "On target",
    "matchdetails.corners": "Corners",
    "matchdetails.fouls": "Fouls",
    "matchdetails.yellowCards": "Yellow Cards",
    "matchdetails.redCards": "Red Cards",
    "matchdetails.assist": "Assist",
    "matchdetails.unknown": "Unknown",
    "matchdetails.viewBtn": "View goal scorers",
    "admin.title": "LEAGUE ADMIN",
    "admin.info": "As the league creator, you can view all members' data and share their backup if they lose access.",
    "admin.picks": "PICKS",
    "admin.coins": "COINS",
    "admin.cards": "CARDS",
    "admin.badges": "BADGES",
    "admin.shareBackup": "Share their backup",
    "admin.noMembers": "No members yet",
    "admin.menuItem": "👑 Manage members",
    "today.nextMatchIn": "NEXT MATCH IN",
    "today.days": "DAYS",
    "today.hours": "HRS",
    "today.mins": "MIN",
    "today.secs": "SEC",
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
    "onboarding.slide4Title": "Roulette & Cards",
    "onboarding.coinsTitle": "Earn coins",
    "onboarding.rarityTitle": "5 RARITY TIERS",
    "onboarding.spinTip": "Spin for 100 🪙 — collect 300+ player cards",
    "onboarding.collectTip": "Find your collection in the menu (☰)",
    "onboarding.dupTip": "Duplicate cards refund coins automatically",
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
    "sidebar.wrapped": "📊 My Week",
    "wrapped.title": "YOUR WEEK",
    "wrapped.subtitle": "Mundialito 2026 · weekly recap",
    "wrapped.tapToContinue": "Tap to continue →",
    "wrapped.predictionsTitle": "PREDICTIONS",
    "wrapped.predictionsSubtitle": "You made",
    "wrapped.predictionsSingular": "prediction this week",
    "wrapped.predictionsPlural": "predictions this week",
    "wrapped.exactTitle": "EXACT SCORES",
    "wrapped.winnersTitle": "WINNERS",
    "wrapped.exactSubtitle": "Bullseyes this week",
    "wrapped.exactBrag": "🔥 You're on fire!",
    "wrapped.exactZero": "Next week is yours!",
    "wrapped.coinsTitle": "COINS EARNED",
    "wrapped.coinsSubtitle": "From predictions",
    "wrapped.coinsLabel": "🪙 added to your balance",
    "wrapped.cardsTitle": "CARDS COLLECTED",
    "wrapped.cardsSubtitle": "Spun the roulette",
    "wrapped.cardsSingular": "new card this week",
    "wrapped.cardsPlural": "new cards this week",
    "wrapped.bestCardTitle": "TOP CARD",
    "wrapped.bestCardSubtitle": "Your best pull of the week",
    "wrapped.finalTitle": "THE VERDICT",
    "wrapped.finalSubtitle": "And the title goes to...",
    "wrapped.shareIt": "Brag about it!",
    "wrapped.shareBtn": "SHARE TO WHATSAPP",
    "sidebar.achievements": "Achievements",
    "sidebar.roulette": "Roulette",
    "sidebar.tutorial": "How to Play",
    "roulette.title": "PLAYER CARDS",
    "roulette.spinTitle": "Spin to Win",
    "roulette.yourBalance": "BALANCE",
    "roulette.spinCost": "COST",
    "roulette.spinBtn": "SPIN!",
    "roulette.spinning": "SPINNING...",
    "roulette.notEnough": "NOT ENOUGH COINS",
    "roulette.viewCollection": "View My Collection",
    "roulette.duplicate": "Duplicate! Coins refunded",
    "roulette.tapToClose": "TAP ANYWHERE TO CLOSE",
    "collection.title": "My Collection",
    "collection.collected": "collected",
    "collection.all": "All",
    "collection.owned": "Owned",
    "collection.missing": "Missing",
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
    "achv.first_card.name": "First Card",
    "achv.first_card.desc": "Open your first player card",
    "achv.ten_cards.name": "Card Collector",
    "achv.ten_cards.desc": "Collect 10 different cards",
    "achv.fifty_cards.name": "Card Hoarder",
    "achv.fifty_cards.desc": "Collect 50 different cards",
    "achv.hundred_cards.name": "Card Champion",
    "achv.hundred_cards.desc": "Collect 100 different cards",
    "achv.first_legendary.name": "Legend Pulled!",
    "achv.first_legendary.desc": "Pull your first Legendary card",
    "achv.five_legendary.name": "Hall of Fame",
    "achv.five_legendary.desc": "Collect 5 Legendary cards",
    "achv.perfect_card.name": "PERFECT 99!",
    "achv.perfect_card.desc": "Pull a card rated 99",
    "achv.card_master.name": "Card Master",
    "achv.card_master.desc": "Collect every single card 🌟",
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
    "group.previous": "← הקודם",
    "group.next": "הבא →",
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
    "bracket.doublePoints": "🔥 כל ניחוש שווה כפול בנוקאאוט!",
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
    "today.liveNow": "משחק חי",
    "today.justFinished": "זה עתה הסתיים",
    "today.refresh": "רענן",
    "matchcard.predicted": "ניחשת",
    "matchcard.noPick": "עוד לא ניחשת",
    "matchdetails.title": "שערים שנכבשו",
    "matchdetails.loading": "טוען שערים...",
    "matchdetails.error": "לא הצלחנו לטעון",
    "matchdetails.notReady": "השערים עדיין לא זמינים",
    "matchdetails.goals": "שערים",
    "matchdetails.noGoals": "לא נכבשו שערים במשחק",
    "matchdetails.stats": "סטטיסטיקות",
    "matchdetails.possession": "החזקת כדור",
    "matchdetails.shots": "בעיטות",
    "matchdetails.shotsOnTarget": "למסגרת",
    "matchdetails.corners": "קרנות",
    "matchdetails.fouls": "עבירות",
    "matchdetails.yellowCards": "כרטיסים צהובים",
    "matchdetails.redCards": "כרטיסים אדומים",
    "matchdetails.assist": "בישול",
    "matchdetails.unknown": "לא ידוע",
    "matchdetails.viewBtn": "ראה מי הבקיע",
    "admin.title": "ניהול הליגה",
    "admin.info": "כיוצר הליגה, אתה יכול לראות את הנתונים של כל החברים ולשלוח להם גיבוי במידה ואיבדו גישה.",
    "admin.picks": "ניחושים",
    "admin.coins": "מטבעות",
    "admin.cards": "קלפים",
    "admin.badges": "הישגים",
    "admin.shareBackup": "שלח לו את הגיבוי",
    "admin.noMembers": "אין עדיין חברים",
    "admin.menuItem": "👑 ניהול חברים",
    "today.nextMatchIn": "המשחק הבא בעוד",
    "today.days": "ימים",
    "today.hours": "שעות",
    "today.mins": "דק'",
    "today.secs": "שנ'",
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
    "onboarding.slide4Title": "רולטה וקלפים",
    "onboarding.coinsTitle": "צבור מטבעות",
    "onboarding.rarityTitle": "5 רמות נדירות",
    "onboarding.spinTip": "סיבוב עולה 100 🪙 — אסוף 300+ קלפי שחקנים",
    "onboarding.collectTip": "מצא את האוסף שלך בתפריט (☰)",
    "onboarding.dupTip": "קלפים כפולים מחזירים לך מטבעות אוטומטית",
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
    "sidebar.wrapped": "📊 השבוע שלי",
    "wrapped.title": "השבוע שלך",
    "wrapped.subtitle": "מונדיאליטו 2026 · סיכום שבועי",
    "wrapped.tapToContinue": "הקש להמשך →",
    "wrapped.predictionsTitle": "ניחושים",
    "wrapped.predictionsSubtitle": "ביצעת",
    "wrapped.predictionsSingular": "ניחוש השבוע",
    "wrapped.predictionsPlural": "ניחושים השבוע",
    "wrapped.exactTitle": "ניחושים מדויקים",
    "wrapped.winnersTitle": "מנצח נכון",
    "wrapped.exactSubtitle": "בולים השבוע",
    "wrapped.exactBrag": "🔥 בלתי ניתן לעצור!",
    "wrapped.exactZero": "השבוע הבא יהיה שלך!",
    "wrapped.coinsTitle": "מטבעות שצברת",
    "wrapped.coinsSubtitle": "מהניחושים שלך",
    "wrapped.coinsLabel": "🪙 נוספו ליתרה שלך",
    "wrapped.cardsTitle": "קלפים שאספת",
    "wrapped.cardsSubtitle": "מהרולטה השבועית",
    "wrapped.cardsSingular": "קלף חדש השבוע",
    "wrapped.cardsPlural": "קלפים חדשים השבוע",
    "wrapped.bestCardTitle": "הקלף הטוב ביותר",
    "wrapped.bestCardSubtitle": "השליפה הכי טובה השבוע",
    "wrapped.finalTitle": "ההכרזה",
    "wrapped.finalSubtitle": "וההכתר השבועי שייך ל...",
    "wrapped.shareIt": "תתפאר!",
    "wrapped.shareBtn": "שתף בוואטסאפ",
    "sidebar.achievements": "הישגים",
    "sidebar.roulette": "רולטה",
    "sidebar.tutorial": "איך משחקים?",
    "roulette.title": "קלפי שחקנים",
    "roulette.spinTitle": "סובב לזכייה",
    "roulette.yourBalance": "יתרה",
    "roulette.spinCost": "מחיר",
    "roulette.spinBtn": "סובב!",
    "roulette.spinning": "מסתובב...",
    "roulette.notEnough": "אין מספיק מטבעות",
    "roulette.viewCollection": "צפה באוסף שלי",
    "roulette.duplicate": "כפילות! מטבעות הוחזרו",
    "roulette.tapToClose": "הקש בכל מקום לסגירה",
    "collection.title": "האוסף שלי",
    "collection.collected": "נאספו",
    "collection.all": "הכל",
    "collection.owned": "ברשותי",
    "collection.missing": "חסרים",
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
    "achv.first_card.name": "קלף ראשון",
    "achv.first_card.desc": "פתח את הקלף הראשון שלך",
    "achv.ten_cards.name": "אספן",
    "achv.ten_cards.desc": "אסוף 10 קלפים שונים",
    "achv.fifty_cards.name": "אספן רציני",
    "achv.fifty_cards.desc": "אסוף 50 קלפים שונים",
    "achv.hundred_cards.name": "אלוף הקלפים",
    "achv.hundred_cards.desc": "אסוף 100 קלפים שונים",
    "achv.first_legendary.name": "האגדה הראשונה!",
    "achv.first_legendary.desc": "תקבל את הקלף הלג'נדרי הראשון שלך",
    "achv.five_legendary.name": "היכל התהילה",
    "achv.five_legendary.desc": "אסוף 5 קלפים לג'נדריים",
    "achv.perfect_card.name": "מושלם 99!",
    "achv.perfect_card.desc": "קבל קלף עם דירוג 99",
    "achv.card_master.name": "מאסטר הקלפים",
    "achv.card_master.desc": "אסוף את כל הקלפים 🌟",
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

// 💰 Coin economy
const COINS = {
  EXACT: 500,       // 🎯 perfect prediction (groups)
  RESULT: 250,      // ✅ correct winner (groups)
  KO_EXACT: 1000,   // 🎯 perfect KO prediction (doubled — rarer)
  KO_RESULT: 500,   // ✅ correct KO winner
  SPIN: 100,        // 🎰 cost of one roulette spin
  DAILY_BONUS: 500, // 🎁 daily login bonus
  SCRATCH_PRICE: 200, // 🃏 buy extra scratch card after daily free
  STARTING_BONUS: 1000, // 🎁 given when user first opens the app
  // Duplicate-card refund by rarity (doubled — to balance the rarer pulls)
  DUP_COMMON: 40,
  DUP_UNCOMMON: 100,
  DUP_RARE: 200,
  DUP_EPIC: 600,
  DUP_LEGENDARY: 2000,
  DUP_LEGEND: 500,     // 🟢 Hall of Fame legends — modest refund (free spin already!)
  DUP_FRIEND: 1000,    // 🎴 Friend cards — rare so a decent refund
  DUP_TRASH: 50,       // 🗑️ Israeli "legends" — small refund (it's a joke tier)
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
  // ─── 🃏 CARD COLLECTOR ACHIEVEMENTS ────────────────────────────────
  { id: "first_card", icon: "🎴", color: "#94a3b8", check: ({ cardCollection }) => {
    if (!cardCollection) return false;
    return Object.values(cardCollection).some(c => c > 0);
  } },
  { id: "ten_cards", icon: "🃏", color: "#3b82f6", check: ({ cardCollection }) => {
    if (!cardCollection) return false;
    return Object.keys(cardCollection).filter(k => cardCollection[k] > 0).length >= 10;
  } },
  { id: "fifty_cards", icon: "📦", color: "#a855f7", check: ({ cardCollection }) => {
    if (!cardCollection) return false;
    return Object.keys(cardCollection).filter(k => cardCollection[k] > 0).length >= 50;
  } },
  { id: "hundred_cards", icon: "💯", color: "#ef4444", check: ({ cardCollection }) => {
    if (!cardCollection) return false;
    return Object.keys(cardCollection).filter(k => cardCollection[k] > 0).length >= 100;
  } },
  { id: "first_legendary", icon: "🏆", color: "#fbbf24", check: ({ cardCollection }) => {
    if (!cardCollection) return false;
    return CARDS_BY_RARITY.L.some(c => (cardCollection[c.id] || 0) > 0);
  } },
  { id: "five_legendary", icon: "👑", color: "#fbbf24", check: ({ cardCollection }) => {
    if (!cardCollection) return false;
    return CARDS_BY_RARITY.L.filter(c => (cardCollection[c.id] || 0) > 0).length >= 5;
  } },
  { id: "perfect_card", icon: "💎", color: "#fbbf24", check: ({ cardCollection }) => {
    if (!cardCollection) return false;
    return CARDS.some(c => (cardCollection[c.id] || 0) > 0 && getPlayerRating(c) === 99);
  } },
  { id: "card_master", icon: "🌟", color: "#fbbf24", check: ({ cardCollection }) => {
    if (!cardCollection) return false;
    const owned = Object.keys(cardCollection).filter(k => cardCollection[k] > 0).length;
    return owned >= CARDS.length;
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
  // 🔴 Don't award points for live (in-progress) matches — only when finished
  if (actual.isLive === true) return { points: 0, type: "none" };
  
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
  // 🔴 Don't award points for live matches
  if (actual.isLive === true) return { points: 0, type: "none" };
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
    // 👑 Admin-sent JSON backup format — also accepted on the welcome screen
    if (c.startsWith("{") && c.includes("wc2026-backup-v1")) {
      try {
        const obj = JSON.parse(c);
        if (obj && obj.version === "wc2026-backup-v1") {
          return {
            name: obj.name || "Friend",
            userId: obj.userId || null,
            picks: obj.picks || {},
            koWinners: obj.koWinners || {},
            koPicks: obj.koPicks || {},
            winnerPick: obj.winnerPick || null,
            topScorerPick: obj.topScorerPick || null,
            leagueCode: obj.leagueCode || "",
            leagueCodes: obj.leagueCode ? [obj.leagueCode] : [],
            activeLeagueCode: obj.leagueCode || "",
            cardCollection: obj.cardCollection || {},
            coinBalance: obj.coinBalance,
            unlockedAchievements: obj.unlockedAchievements || [],
            pickedAtHours: obj.pickedAtHours || [],
          };
        }
      } catch { /* fall through */ }
      return null;
    }
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
  background:"rgba(36,49,80,0.8)",border:"1px solid rgba(251,191,36,0.3)",
  borderRadius:10,color:"#f1f5f9",fontSize:14,outline:"none",marginBottom:10,fontFamily:"inherit",
};
const errStyle = {color:"#f87171",fontSize:12,marginBottom:8};
const primaryBtn = {
  width:"100%",padding:"12px 18px",
  background:"linear-gradient(135deg,#fbbf24,#d97706)",
  color:"#1e2940",border:"none",borderRadius:12,
  fontSize:14,fontWeight:800,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit",
  boxShadow:"0 4px 0 #92400e, 0 8px 18px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
  transition:"all 0.15s",
};
const ghostBtn = {
  width:"100%",padding:"11px 16px",
  background:"linear-gradient(180deg,rgba(50,65,95,0.7),rgba(30,41,59,0.7))",
  color:"#cbd5e1",border:"1px solid rgba(100,116,139,0.5)",
  borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
  boxShadow:"0 3px 0 rgba(15,23,42,0.6), 0 6px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
  transition:"all 0.15s",
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
      background:"linear-gradient(180deg, #1e2940 0%, #1e1b4b 35%, #1e293b 65%, #14532d 65%, #052e16 100%)",
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
  }).join(' ')} L400,60 Z' fill='#1e2940'/>
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
              <rect x="-3" y="-28" width="6" height="22" rx="2" fill="#1e2940"/>
              <rect x="-5" y="-8" width="10" height="5" rx="1" fill="#fbbf24"/>
            </g>
            {/* Front leg (kicking) */}
            <g style={{
              transformOrigin:"0px -28px",
              animation:"introKickLeg 0.5s cubic-bezier(0.5,0,0.4,1.2) 2.6s both",
            }}>
              <rect x="-3" y="-28" width="6" height="22" rx="2" fill="#1e2940"/>
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
              <polygon points="0,-5 4.8,-1.5 3,4 -3,4 -4.8,-1.5" fill="#1e2940"/>
              <line x1="0" y1="-5" x2="0" y2="-9" stroke="#1e2940" strokeWidth="0.8"/>
              <line x1="4.8" y1="-1.5" x2="8.5" y2="-2.8" stroke="#1e2940" strokeWidth="0.8"/>
              <line x1="3" y1="4" x2="5.3" y2="7.3" stroke="#1e2940" strokeWidth="0.8"/>
              <line x1="-3" y1="4" x2="-5.3" y2="7.3" stroke="#1e2940" strokeWidth="0.8"/>
              <line x1="-4.8" y1="-1.5" x2="-8.5" y2="-2.8" stroke="#1e2940" strokeWidth="0.8"/>
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

// ─── 🎰 PLAYER CARDS COLLECTION ────────────────────────────────────────────
// 300+ players spread across 5 rarity tiers. Pulled from roulette spins.
// Rarity ratios: Legendary 5% (15), Epic 13% (40), Rare 20% (60), Uncommon 28% (85), Common 34% (100)
// Format: [name, team, rarity, position]
// Rarities: "L"=Legendary, "E"=Epic, "R"=Rare, "U"=Uncommon, "C"=Common
// Positions: "GK"=Goalkeeper, "D"=Defender, "M"=Midfielder, "F"=Forward
// IMPORTANT: only includes teams that qualified for WC 2026 (48 nations).
// 🟢 LEGENDS — Hall of Fame players from past World Cups
// These bypass the "qualified team" filter (they're historical, not current squads).
// Rarity: "G" (Green/Legend) — a new tier above Legendary.
const LEGEND_CARDS_RAW = [
  // 🇧🇷 Brazil
  ["Pelé", "Brazil", "F"],
  ["Ronaldo", "Brazil", "F"],
  ["Ronaldinho", "Brazil", "M"],
  ["Romário", "Brazil", "F"],
  ["Cafú", "Brazil", "D"],
  ["Roberto Carlos", "Brazil", "D"],
  ["Kaká", "Brazil", "M"],
  // 🇦🇷 Argentina
  ["Diego Maradona", "Argentina", "F"],
  ["Gabriel Batistuta", "Argentina", "F"],
  ["Alfredo Di Stéfano", "Argentina", "F"],
  // 🇩🇪 Germany
  ["Franz Beckenbauer", "Germany", "D"],
  ["Oliver Kahn", "Germany", "GK"],
  ["Miroslav Klose", "Germany", "F"],
  // 🇫🇷 France
  ["Zinedine Zidane", "France", "M"],
  ["Thierry Henry", "France", "F"],
  ["Michel Platini", "France", "M"],
  // 🇳🇱 Netherlands
  ["Johan Cruyff", "Netherlands", "F"],
  ["Marco van Basten", "Netherlands", "F"],
  ["Ruud Gullit", "Netherlands", "M"],
  // 🇮🇹 Italy
  ["Paolo Maldini", "Italy", "D"],
  ["Roberto Baggio", "Italy", "F"],
  ["Gianluigi Buffon", "Italy", "GK"],
  ["Andrea Pirlo", "Italy", "M"],
  ["Francesco Totti", "Italy", "F"],
  ["Javier Zanetti", "Italy", "D"],
  // 🇪🇸 Spain
  ["Xavi Hernández", "Spain", "M"],
  ["Andrés Iniesta", "Spain", "M"],
  ["Iker Casillas", "Spain", "GK"],
  // 🏴 England
  ["David Beckham", "England", "M"],
  ["Bobby Charlton", "England", "M"],
  // 🇵🇹 Portugal
  ["Eusébio", "Portugal", "F"],
  ["Luís Figo", "Portugal", "M"],
  // 🇸🇪 Sweden
  ["Zlatan Ibrahimović", "Sweden", "F"],
  // 🇨🇮 Ivory Coast
  ["Didier Drogba", "Ivory Coast", "F"],
  ["Yaya Touré", "Ivory Coast", "M"],
  // 🇩🇰 Denmark
  ["Peter Schmeichel", "Denmark", "GK"],
  // 🇭🇺 Hungary
  ["Ferenc Puskás", "Hungary", "F"],
  // 🇺🇾 Uruguay
  ["Diego Forlán", "Uruguay", "F"],
  // 🇨🇲 Cameroon
  ["Samuel Eto'o", "Cameroon", "F"],
  // 🇫🇷 France (additional)
  ["Franck Ribéry", "France", "F"],
  // 🇪🇸 Spain (additional)
  ["Xabi Alonso", "Spain", "M"],
  // 🏴 England (additional)
  ["Frank Lampard", "England", "M"],
  ["Steven Gerrard", "England", "M"],
  ["John Terry", "England", "D"],
  // 🇮🇹 Italy (additional)
  ["Gianluca Zambrotta", "Italy", "D"],
  // 🇧🇷 Brazil (more)
  ["Roberto Carlos", "Brazil", "D"],
  ["Marcelo", "Brazil", "D"],
  // 🇪🇸 Spain (more)
  ["Sergio Ramos", "Spain", "D"],
  ["David Villa", "Spain", "F"],
  ["Fernando Torres", "Spain", "F"],
  // 🇫🇷 France (more)
  ["Thierry Henry", "France", "F"],
  // 🇺🇦 Ukraine
  ["Andriy Shevchenko", "Ukraine", "F"],
];

// Flag lookup for legend nations (some didn't qualify for WC 2026)
const LEGEND_FLAGS = {
  "Brazil": "🇧🇷", "Argentina": "🇦🇷", "Germany": "🇩🇪", "France": "🇫🇷",
  "Netherlands": "🇳🇱", "Italy": "🇮🇹", "Spain": "🇪🇸", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Portugal": "🇵🇹", "Sweden": "🇸🇪", "Ivory Coast": "🇨🇮", "Denmark": "🇩🇰",
  "Hungary": "🇭🇺", "Uruguay": "🇺🇾", "Cameroon": "🇨🇲", "Ukraine": "🇺🇦",
};

// Build LEGEND_CARDS with stable IDs (legend-0, legend-1, ...)
const LEGEND_CARDS = LEGEND_CARDS_RAW.map(([name, team, pos], i) => ({
  id: `legend-${i}`,
  name, team, pos,
  rarity: "G",
  flag: LEGEND_FLAGS[team] || ALL_TEAMS.find(t => t.n === team)?.f || "⚽",
  isLegend: true,
}));

// 🎴 FRIEND CARDS — special cards of the league members. Rarity: "F" (Friend).
// Special variants: "lafamilia" (black/yellow) and "pokemon" (Pokemon trainer theme).
const FRIEND_CARDS_RAW = [
  // [name, position, rating, subtitle/team, variant]
  ["Adiv Elmakias",     "M",  99, "Snowy Power Pole",          "maccabi_ta"],
  ["Or Ran Attia",      "M",  99, "Chicken Breast & Toothpick","maccabi_ta"],
  ["Shay Ben Harosh",   "F",  99, "Fish Soup",                 "beitar"],
  ["Itay Quatinsky",    "M",  99, "La Familia",                "lafamilia"],
  ["Yossi Higri",       "M",  99, "Napkins",                   "maccabi_haifa"],
  ["Eliran Cohen",      "M",  99, "One Plate",                 "pokemon"],
  ["Chen Sandgarten",   "D",  99, "Pikatofu",                  "real_madrid"],
  ["Malki Rada",        "D",  99, "Malki Bryant",              "maccabi_ta"],
];

const FRIEND_CARDS = FRIEND_CARDS_RAW.map(([name, pos, rating, subtitle, variant], i) => ({
  id: `friend-${i}`,
  name,
  team: subtitle,
  pos,
  rarity: "F",
  flag: variant === "lafamilia" || variant === "beitar" ? "🦁"
      : variant === "pokemon" ? "🔴"
      : variant === "maccabi_ta" ? "💛"
      : variant === "maccabi_haifa" ? "💚"
      : variant === "real_madrid" ? "👑"
      : "🇮🇱",
  isLegend: false,
  isFriend: true,
  variant,
  manualRating: rating,
}));

// ─── 🌌 GALAXY CARDS: Top players of the 25/26 season ─────────────────────────
const GALAXY_CARDS_RAW = [
  // [name, team, pos, rating, {PAC, SHO, PAS, DRI, DEF, PHY}]
  ["Ousmane Dembélé",  "France",    "F",  96, { PAC:94, SHO:86, PAS:82, DRI:92, DEF:38, PHY:72 }],
  ["Lamine Yamal",     "Spain",     "F",  97, { PAC:92, SHO:90, PAS:85, DRI:97, DEF:30, PHY:70 }],
  ["Michael Olise",    "France",    "F",  92, { PAC:88, SHO:84, PAS:86, DRI:92, DEF:38, PHY:70 }],
  ["Harry Kane",       "England",   "F",  96, { PAC:70, SHO:96, PAS:88, DRI:84, DEF:38, PHY:86 }],
  ["Pedri",            "Spain",     "M",  96, { PAC:78, SHO:78, PAS:90, DRI:91, DEF:65, PHY:70 }],
  ["Bruno Fernandes",  "Portugal",  "M",  93, { PAC:75, SHO:88, PAS:92, DRI:87, DEF:70, PHY:75 }],
  ["Bukayo Saka",      "England",   "F",  94, { PAC:90, SHO:86, PAS:84, DRI:90, DEF:45, PHY:72 }],
  ["Erling Haaland",   "Norway",    "F",  97, { PAC:89, SHO:96, PAS:73, DRI:87, DEF:47, PHY:88 }],
  ["Kylian Mbappé",    "France",    "F",  98, { PAC:97, SHO:92, PAS:80, DRI:95, DEF:36, PHY:78 }],
  ["Vinícius Júnior",  "Brazil",    "F",  97, { PAC:95, SHO:88, PAS:80, DRI:96, DEF:30, PHY:74 }],
  ["Vitinha",          "Portugal",  "M",  94, { PAC:78, SHO:80, PAS:91, DRI:89, DEF:78, PHY:72 }],
  ["Thibaut Courtois", "Belgium",   "GK", 94, { PAC:50, SHO:25, PAS:65, DRI:56, DEF:92, PHY:88 }],
  ["Julián Álvarez",   "Argentina", "F",  94, { PAC:87, SHO:90, PAS:82, DRI:89, DEF:50, PHY:78 }],
  ["Nuno Mendes",      "Portugal",  "D",  92, { PAC:92, SHO:65, PAS:78, DRI:85, DEF:86, PHY:80 }],
];

const GALAXY_FLAGS = {
  "France": "🇫🇷", "Spain": "🇪🇸", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Portugal": "🇵🇹", "Norway": "🇳🇴", "Brazil": "🇧🇷",
  "Belgium": "🇧🇪", "Argentina": "🇦🇷",
};

const GALAXY_CARDS = GALAXY_CARDS_RAW.map(([name, team, pos, rating, stats], i) => ({
  id: `galaxy-${i}`,
  name,
  team,
  pos,
  rarity: "X",
  flag: GALAXY_FLAGS[team] || "🌌",
  isLegend: false,
  isGalaxy: true,
  manualRating: rating,
  galaxyStats: stats,
}));

// 🗑️ ISRAELI TRASH LEGENDS — local heroes with low ratings, for fun.
const ISRAELI_LEGENDS_RAW = [
  ["Eyal Berkovic", "Israel", "M"],
  ["Eran Zahavi", "Israel", "F"],
  ["Avi Nimni", "Israel", "M"],
  ["Haim Revivo", "Israel", "M"],
  ["Alon Mizrahi", "Israel", "F"],
  ["Reuven Atar", "Israel", "F"],
  ["Dudu Aouate", "Israel", "GK"],
  ["Lior Refaelov", "Israel", "M"],
  ["Eli Ohana", "Israel", "F"],
  ["Yossi Benayoun", "Israel", "M"],
  ["Arik Benado", "Israel", "D"],
  ["Uri Malmilian", "Israel", "F"],
  ["Mordechai Spiegler", "Israel", "F"],
  ["Moshe Sinai", "Israel", "M"],
  ["Tal Banin", "Israel", "M"],
  ["Bonny Ginzburg", "Israel", "GK"],
  ["Barak Yitzhaki", "Israel", "F"],
];

const ISRAELI_LEGENDS = ISRAELI_LEGENDS_RAW.map(([name, team, pos], i) => ({
  id: `trash-${i}`,
  name, team, pos,
  rarity: "T",
  flag: "🇮🇱",
  isLegend: false,
  isTrash: true,
}));

const CARD_DATA = [
  // ─── LEGENDARY (15) — the icons ─────────────────────────────────
  ["Lionel Messi", "Argentina", "L", "F"],
  ["Cristiano Ronaldo", "Portugal", "L", "F"],
  ["Kylian Mbappé", "France", "L", "F"],
  ["Erling Haaland", "Norway", "L", "F"],
  ["Vinícius Júnior", "Brazil", "L", "F"],
  ["Jude Bellingham", "England", "L", "M"],
  ["Mohamed Salah", "Egypt", "L", "F"],
  ["Harry Kane", "England", "L", "F"],
  ["Lamine Yamal", "Spain", "L", "F"],
  ["Rodri", "Spain", "L", "M"],
  ["Pedri", "Spain", "L", "M"],
  ["Luka Modrić", "Croatia", "L", "M"],
  ["Virgil van Dijk", "Netherlands", "L", "D"],
  ["Achraf Hakimi", "Morocco", "L", "D"],
  ["Son Heung-min", "South Korea", "L", "F"],

  // ─── EPIC (40) — top-tier stars ─────────────────────────────────
  ["Lautaro Martínez", "Argentina", "E", "F"],
  ["Julián Álvarez", "Argentina", "E", "F"],
  ["Emiliano Martínez", "Argentina", "E", "GK"],
  ["Antoine Griezmann", "France", "E", "F"],
  ["Ousmane Dembélé", "France", "E", "F"],
  ["Aurélien Tchouaméni", "France", "E", "M"],
  ["Bukayo Saka", "England", "E", "F"],
  ["Phil Foden", "England", "E", "M"],
  ["Declan Rice", "England", "E", "M"],
  ["Raphinha", "Brazil", "E", "F"],
  ["Rodrygo", "Brazil", "E", "F"],
  ["Casemiro", "Brazil", "E", "M"],
  ["Alisson", "Brazil", "E", "GK"],
  ["Bruno Fernandes", "Portugal", "E", "M"],
  ["Bernardo Silva", "Portugal", "E", "M"],
  ["Rafael Leão", "Portugal", "E", "F"],
  ["Florian Wirtz", "Germany", "E", "M"],
  ["Jamal Musiala", "Germany", "E", "M"],
  ["Kai Havertz", "Germany", "R", "F"],
  ["Federico Valverde", "Uruguay", "E", "M"],
  ["Darwin Núñez", "Uruguay", "R", "F"],
  ["Frenkie de Jong", "Netherlands", "E", "M"],
  ["Memphis Depay", "Netherlands", "R", "F"],
  ["Kevin De Bruyne", "Belgium", "E", "M"],
  ["Romelu Lukaku", "Belgium", "R", "F"],
  ["Luis Díaz", "Colombia", "E", "F"],
  ["James Rodríguez", "Colombia", "E", "M"],
  ["Sadio Mané", "Senegal", "E", "F"],
  ["Édouard Mendy", "Senegal", "E", "GK"],
  ["Hirving Lozano", "Mexico", "E", "F"],
  ["Christian Pulisic", "USA", "R", "F"],
  ["Takumi Minamino", "Japan", "E", "F"],
  ["Hakan Çalhanoğlu", "Türkiye", "E", "M"],
  ["Brahim Díaz", "Morocco", "E", "M"],
  ["Hakim Ziyech", "Morocco", "E", "M"],
  ["Yassine Bounou", "Morocco", "R", "GK"],
  ["Alphonso Davies", "Canada", "E", "D"],
  ["Jonathan David", "Canada", "E", "F"],
  ["Riyad Mahrez", "Algeria", "E", "F"],
  ["Mehdi Taremi", "Iran", "E", "F"],

  // ─── RARE (60) — national-team starters ─────────────────────────
  ["Ángel Di María", "Argentina", "R", "F"],
  ["Cristian Romero", "Argentina", "E", "D"],
  ["Rodrigo De Paul", "Argentina", "E", "M"],
  ["Theo Hernández", "France", "E", "D"],
  ["William Saliba", "France", "E", "D"],
  ["Mike Maignan", "France", "E", "GK"],
  ["Eduardo Camavinga", "France", "E", "M"],
  ["Marcus Rashford", "England", "E", "F"],
  ["Harry Maguire", "England", "R", "D"],
  ["John Stones", "England", "E", "D"],
  ["Jordan Pickford", "England", "E", "GK"],
  ["Marquinhos", "Brazil", "E", "D"],
  ["Éder Militão", "Brazil", "E", "D"],
  ["Bruno Guimarães", "Brazil", "E", "M"],
  ["Vitinha", "Portugal", "R", "M"],
  ["João Cancelo", "Portugal", "E", "D"],
  ["Diogo Costa", "Portugal", "E", "GK"],
  ["Rúben Dias", "Portugal", "E", "D"],
  ["Joshua Kimmich", "Germany", "E", "M"],
  ["Antonio Rüdiger", "Germany", "R", "D"],
  ["Manuel Neuer", "Germany", "E", "GK"],
  ["İlkay Gündoğan", "Germany", "R", "M"],
  ["Cody Gakpo", "Netherlands", "E", "F"],
  ["Denzel Dumfries", "Netherlands", "R", "D"],
  ["Nathan Aké", "Netherlands", "R", "D"],
  ["Xavi Simons", "Netherlands", "E", "M"],
  ["Thibaut Courtois", "Belgium", "E", "GK"],
  ["Youri Tielemans", "Belgium", "R", "M"],
  ["Jérémy Doku", "Belgium", "R", "F"],
  ["Mateo Kovačić", "Croatia", "R", "M"],
  ["Marcelo Brozović", "Croatia", "R", "M"],
  ["Joško Gvardiol", "Croatia", "E", "D"],
  ["Álvaro Morata", "Spain", "R", "F"],
  ["Nico Williams", "Spain", "E", "F"],
  ["Dani Olmo", "Spain", "E", "M"],
  ["Unai Simón", "Spain", "R", "GK"],
  ["Daichi Kamada", "Japan", "R", "M"],
  ["Wataru Endo", "Japan", "R", "M"],
  ["Kaoru Mitoma", "Japan", "R", "F"],
  ["Kim Min-jae", "South Korea", "R", "D"],
  ["Lee Kang-in", "South Korea", "R", "M"],
  ["Hwang Hee-chan", "South Korea", "R", "F"],
  ["Sardar Azmoun", "Iran", "R", "F"],
  ["Yann Sommer", "Switzerland", "R", "GK"],
  ["Granit Xhaka", "Switzerland", "R", "M"],
  ["Manuel Akanji", "Switzerland", "R", "D"],
  ["Pierre-Emerick Aubameyang", "Senegal", "R", "F"],
  ["Idrissa Gueye", "Senegal", "R", "M"],
  ["Kalidou Koulibaly", "Senegal", "R", "D"],
  ["Edson Álvarez", "Mexico", "R", "M"],
  ["Raúl Jiménez", "Mexico", "R", "F"],
  ["Guillermo Ochoa", "Mexico", "R", "GK"],
  ["Tyler Adams", "USA", "R", "M"],
  ["Weston McKennie", "USA", "R", "M"],
  ["Tim Weah", "USA", "R", "F"],
  ["Folarin Balogun", "USA", "R", "F"],
  ["Andy Robertson", "Scotland", "R", "D"],
  ["Scott McTominay", "Scotland", "R", "M"],
  ["Mathew Ryan", "Australia", "R", "GK"],
  ["Moisés Caicedo", "Ecuador", "R", "M"],
  ["Enner Valencia", "Ecuador", "R", "F"],

  // ─── UNCOMMON (85) — solid squad members ─────────────────────────
  ["Enzo Fernández", "Argentina", "E", "M"],
  ["Nicolás Otamendi", "Argentina", "R", "D"],
  ["Nahuel Molina", "Argentina", "R", "D"],
  ["Alexis Mac Allister", "Argentina", "E", "M"],
  ["Nicolás Tagliafico", "Argentina", "U", "D"],
  ["Adrien Rabiot", "France", "R", "M"],
  ["Jules Koundé", "France", "E", "D"],
  ["Ibrahima Konaté", "France", "U", "D"],
  ["Dayot Upamecano", "France", "U", "D"],
  ["Kingsley Coman", "France", "U", "F"],
  ["Olivier Giroud", "France", "U", "F"],
  ["Kieran Trippier", "England", "U", "D"],
  ["Luke Shaw", "England", "U", "D"],
  ["Kyle Walker", "England", "R", "D"],
  ["Conor Gallagher", "England", "U", "M"],
  ["Eberechi Eze", "England", "U", "M"],
  ["Jarrod Bowen", "England", "U", "F"],
  ["Ollie Watkins", "England", "U", "F"],
  ["Gabriel Magalhães", "Brazil", "U", "D"],
  ["Lucas Paquetá", "Brazil", "U", "M"],
  ["Antony", "Brazil", "U", "F"],
  ["Gabriel Martinelli", "Brazil", "U", "F"],
  ["Richarlison", "Brazil", "U", "F"],
  ["Danilo", "Brazil", "U", "D"],
  ["Ederson", "Brazil", "E", "GK"],
  ["Pepe", "Portugal", "U", "D"],
  ["João Félix", "Portugal", "R", "F"],
  ["Diogo Jota", "Portugal", "U", "F"],
  ["Gonçalo Ramos", "Portugal", "U", "F"],
  ["Nuno Mendes", "Portugal", "E", "D"],
  ["Leroy Sané", "Germany", "E", "F"],
  ["Serge Gnabry", "Germany", "U", "F"],
  ["Niclas Füllkrug", "Germany", "R", "F"],
  ["Robin Gosens", "Germany", "U", "D"],
  ["Leon Goretzka", "Germany", "U", "M"],
  ["Daley Blind", "Netherlands", "U", "D"],
  ["Steven Bergwijn", "Netherlands", "U", "F"],
  ["Wout Weghorst", "Netherlands", "U", "F"],
  ["Stefan de Vrij", "Netherlands", "U", "D"],
  ["Leandro Trossard", "Belgium", "U", "F"],
  ["Charles De Ketelaere", "Belgium", "U", "M"],
  ["Amadou Onana", "Belgium", "U", "M"],
  ["Ferran Torres", "Spain", "U", "F"],
  ["Marco Asensio", "Spain", "U", "F"],
  ["Mikel Merino", "Spain", "R", "M"],
  ["Ivan Perišić", "Croatia", "U", "F"],
  ["Andrej Kramarić", "Croatia", "U", "F"],
  ["Dominik Livaković", "Croatia", "U", "GK"],
  ["Sofyan Amrabat", "Morocco", "R", "M"],
  ["Youssef En-Nesyri", "Morocco", "R", "F"],
  ["Romain Saïss", "Morocco", "U", "D"],
  ["Noussair Mazraoui", "Morocco", "U", "D"],
  ["Rafael Borré", "Colombia", "U", "F"],
  ["Davinson Sánchez", "Colombia", "U", "D"],
  ["Mateus Uribe", "Colombia", "U", "M"],
  ["Jhon Arias", "Colombia", "U", "F"],
  ["Ronald Araújo", "Uruguay", "E", "D"],
  ["José María Giménez", "Uruguay", "U", "D"],
  ["Sergio Rochet", "Uruguay", "U", "GK"],
  ["Manuel Ugarte", "Uruguay", "U", "M"],
  ["Ismaël Bennacer", "Algeria", "U", "M"],
  ["Sébastien Haller", "Côte d'Ivoire", "U", "F"],
  ["Franck Kessié", "Côte d'Ivoire", "U", "M"],
  ["Stephen Eustáquio", "Canada", "U", "M"],
  ["Tajon Buchanan", "Canada", "U", "F"],
  ["David Marshall", "Scotland", "U", "GK"],
  ["John McGinn", "Scotland", "U", "M"],
  ["Aaron Mooy", "Australia", "U", "M"],
  ["Mitchell Duke", "Australia", "U", "F"],
  ["David Cancar", "Bosnia", "U", "D"],
  ["Edin Džeko", "Bosnia", "U", "F"],
  ["Mohamed Muntari", "Qatar", "U", "F"],
  ["Akram Afif", "Qatar", "U", "F"],
  ["Pervis Estupiñán", "Ecuador", "U", "D"],
  ["Hellal Mosquera", "Paraguay", "U", "F"],
  ["Antonio Sanabria", "Paraguay", "U", "F"],
  ["Almoez Ali", "Qatar", "U", "F"],
  ["Wahbi Khazri", "Tunisia", "U", "F"],
  ["Hannibal Mejbri", "Tunisia", "U", "M"],
  ["Salem Al-Dawsari", "Saudi Arabia", "U", "F"],
  ["Salman Al-Faraj", "Saudi Arabia", "U", "M"],
  ["André Onana", "DR Congo", "U", "GK"],
  ["Cédric Bakambu", "DR Congo", "U", "F"],
  ["Mohammed Kudus", "Ghana", "U", "M"],
  ["Thomas Partey", "Ghana", "U", "M"],
  ["Inaki Williams", "Ghana", "U", "F"],

  // ─── COMMON (101) — rest of the squads, plus smaller WC nations ─
  ["Gerónimo Rulli", "Argentina", "C", "GK"],
  ["Marcos Acuña", "Argentina", "C", "D"],
  ["Germán Pezzella", "Argentina", "C", "D"],
  ["Lisandro Martínez", "Argentina", "C", "D"],
  ["Leandro Paredes", "Argentina", "R", "M"],
  ["Steve Mandanda", "France", "C", "GK"],
  ["Alphonse Areola", "France", "C", "GK"],
  ["Benjamin Pavard", "France", "C", "D"],
  ["Lucas Hernández", "France", "C", "D"],
  ["Mattéo Guendouzi", "France", "C", "M"],
  ["Youssouf Fofana", "France", "C", "M"],
  ["Randal Kolo Muani", "France", "C", "F"],
  ["Sam Johnstone", "England", "C", "GK"],
  ["Aaron Ramsdale", "England", "C", "GK"],
  ["Marc Guéhi", "England", "C", "D"],
  ["Lewis Dunk", "England", "C", "D"],
  ["Trent Alexander-Arnold", "England", "E", "D"],
  ["Jordan Henderson", "England", "C", "M"],
  ["Kalvin Phillips", "England", "C", "M"],
  ["Mason Mount", "England", "C", "M"],
  ["Anthony Gordon", "England", "C", "F"],
  ["Bento", "Brazil", "C", "GK"],
  ["Léo Ortiz", "Brazil", "C", "D"],
  ["Wendell", "Brazil", "C", "D"],
  ["Joelinton", "Brazil", "C", "M"],
  ["André", "Brazil", "C", "M"],
  ["Endrick", "Brazil", "C", "F"],
  ["Estêvão", "Brazil", "C", "F"],
  ["Otávio", "Portugal", "C", "M"],
  ["António Silva", "Portugal", "C", "D"],
  ["Diogo Dalot", "Portugal", "C", "D"],
  ["Francisco Conceição", "Portugal", "C", "F"],
  ["Rui Patrício", "Portugal", "C", "GK"],
  ["David Raum", "Germany", "C", "D"],
  ["Nico Schlotterbeck", "Germany", "C", "D"],
  ["Pascal Groß", "Germany", "C", "M"],
  ["Chris Führich", "Germany", "C", "F"],
  ["Bart Verbruggen", "Netherlands", "C", "GK"],
  ["Justin Bijlow", "Netherlands", "C", "GK"],
  ["Lutsharel Geertruida", "Netherlands", "C", "D"],
  ["Donyell Malen", "Netherlands", "C", "F"],
  ["Brian Brobbey", "Netherlands", "C", "F"],
  ["Tijjani Reijnders", "Netherlands", "C", "M"],
  ["Koen Casteels", "Belgium", "C", "GK"],
  ["Wout Faes", "Belgium", "C", "D"],
  ["Timothy Castagne", "Belgium", "C", "D"],
  ["Aster Vranckx", "Belgium", "C", "M"],
  ["Loïs Openda", "Belgium", "C", "F"],
  ["Johan Bakayoko", "Belgium", "C", "F"],
  ["David Raya", "Spain", "C", "GK"],
  ["Robin Le Normand", "Spain", "C", "D"],
  ["Aymeric Laporte", "Spain", "E", "D"],
  ["Dani Carvajal", "Spain", "C", "D"],
  ["Mikel Oyarzabal", "Spain", "C", "F"],
  ["Joselu", "Spain", "C", "F"],
  ["Borna Sosa", "Croatia", "C", "D"],
  ["Mario Pašalić", "Croatia", "C", "M"],
  ["Bruno Petković", "Croatia", "C", "F"],
  ["Lovro Majer", "Croatia", "C", "M"],
  ["Achraf Dari", "Morocco", "C", "D"],
  ["Selim Amallah", "Morocco", "C", "M"],
  ["Abde Ezzalzouli", "Morocco", "C", "F"],
  ["Adam Masina", "Morocco", "C", "D"],
  ["Camilo Vargas", "Colombia", "C", "GK"],
  ["Yerry Mina", "Colombia", "C", "D"],
  ["Daniel Muñoz", "Colombia", "C", "D"],
  ["Juan Cuadrado", "Colombia", "C", "M"],
  ["Radamel Falcao", "Colombia", "C", "F"],
  ["Matt Turner", "USA", "C", "GK"],
  ["Walker Zimmerman", "USA", "C", "D"],
  ["Yunus Musah", "USA", "C", "M"],
  ["Brenden Aaronson", "USA", "C", "M"],
  ["Daniel Schmidt", "Japan", "C", "GK"],
  ["Takehiro Tomiyasu", "Japan", "C", "D"],
  ["Maya Yoshida", "Japan", "C", "D"],
  ["Hidemasa Morita", "Japan", "C", "M"],
  ["Junya Ito", "Japan", "C", "F"],
  ["Kim Seung-gyu", "South Korea", "C", "GK"],
  ["Kim Young-gwon", "South Korea", "C", "D"],
  ["Hwang In-beom", "South Korea", "C", "M"],
  ["Cho Gue-sung", "South Korea", "C", "F"],
  ["Alireza Beiranvand", "Iran", "C", "GK"],
  ["Saeid Ezatolahi", "Iran", "C", "M"],
  ["Ali Gholizadeh", "Iran", "C", "F"],
  ["Riccardo Calafiori", "Australia", "C", "D"],
  ["Jackson Irvine", "Australia", "C", "M"],
  ["Awer Mabil", "Australia", "C", "F"],
  ["Ché Adams", "Scotland", "C", "F"],
  ["Lyndon Dykes", "Scotland", "C", "F"],
  ["Billy Gilmour", "Scotland", "C", "M"],
  ["Edmilson Junior", "Qatar", "C", "F"],
  ["Boualem Khoukhi", "Qatar", "C", "M"],
  ["Saad Al-Sheeb", "Qatar", "C", "GK"],
  ["Ali Maâloul", "Tunisia", "C", "D"],
  ["Aïssa Laïdouni", "Tunisia", "C", "M"],
  ["Aymen Dahmen", "Tunisia", "C", "GK"],
  ["Yasin Kol", "Iraq", "C", "F"],
  ["Sherko Kareem", "Iraq", "C", "M"],
  ["Musa Al-Taamari", "Jordan", "C", "F"],
  ["Yazan Al-Naimat", "Jordan", "C", "F"],
  ["Eldor Shomurodov", "Uzbekistan", "C", "F"],
  ["Otabek Shukurov", "Uzbekistan", "C", "M"],
  // 9 remaining WC teams: South Africa, Czechia, Haiti, Curaçao, Sweden, New Zealand, Cabo Verde, Austria, Panama
  ["Lyle Foster", "South Africa", "U", "F"],
  ["Percy Tau", "South Africa", "U", "F"],
  ["Ronwen Williams", "South Africa", "C", "GK"],
  ["Patrik Schick", "Czechia", "U", "F"],
  ["Tomáš Souček", "Czechia", "U", "M"],
  ["Vladimír Coufal", "Czechia", "C", "D"],
  ["Antonín Barák", "Czechia", "C", "M"],
  ["Duckens Nazon", "Haiti", "C", "F"],
  ["Frantzdy Pierrot", "Haiti", "C", "F"],
  ["Johnatan Saïs", "Curaçao", "C", "F"],
  ["Leandro Bacuna", "Curaçao", "C", "M"],
  ["Alexander Isak", "Sweden", "E", "F"],
  ["Viktor Gyökeres", "Sweden", "E", "F"],
  ["Dejan Kulusevski", "Sweden", "R", "F"],
  ["Robin Olsen", "Sweden", "C", "GK"],
  ["Chris Wood", "New Zealand", "U", "F"],
  ["Joe Bell", "New Zealand", "C", "M"],
  ["Ryan Mendes", "Cabo Verde", "C", "F"],
  ["Vozinha", "Cabo Verde", "C", "GK"],
  ["David Alaba", "Austria", "E", "D"],
  ["Marko Arnautović", "Austria", "U", "F"],
  ["Marcel Sabitzer", "Austria", "U", "M"],
  ["Konrad Laimer", "Austria", "C", "M"],
  ["Alexander Schlager", "Austria", "C", "GK"],
  ["Aníbal Godoy", "Panama", "C", "M"],
  ["José Fajardo", "Panama", "C", "F"],
  ["Orlando Mosquera", "Panama", "C", "GK"],
];

// Auto-filter to teams in the 2026 tournament + index by rarity
// CARDS — IDs are based on ORIGINAL position in CARD_DATA (before filtering by qualified teams).
// This ensures IDs stay STABLE even if a team's qualification status changes between app versions.
const CARDS = CARD_DATA
  .map(([name, team, rarity, pos], origIdx) => ({
    id: `card-${origIdx}`,
    name, team, rarity, pos,
    flag: ALL_TEAMS.find(t => t.n === team)?.f || "⚽",
    _qualified: _qualifiedTeamSet.has(team),
  }))
  .filter(c => c._qualified)
  .map(c => { delete c._qualified; return c; });

// 🔄 Card ID migration map: old (post-filter) ID → new (pre-filter) ID.
const _oldStyleCards = CARD_DATA
  .filter(([, team]) => _qualifiedTeamSet.has(team))
  .map(([name, team], i) => ({ id: `card-${i}`, name, team }));

const _newCardByNameTeam = new Map(CARDS.map(c => [`${c.name}|${c.team}`, c.id]));

const CARD_ID_MIGRATION = {};
for (const oldC of _oldStyleCards) {
  const newId = _newCardByNameTeam.get(`${oldC.name}|${oldC.team}`);
  if (newId && newId !== oldC.id) {
    CARD_ID_MIGRATION[oldC.id] = newId;
  }
}

/**
 * Migrate a card collection object from old IDs to new IDs.
 * Returns a NEW object — does not mutate input.
 */
function migrateCardCollection(coll) {
  if (!coll || typeof coll !== "object") return coll;
  // If no migration entries, nothing to do
  if (Object.keys(CARD_ID_MIGRATION).length === 0) return coll;
  // Detect: does collection contain any OLD-style IDs that don't match any current CARDS?
  const currentIds = new Set(CARDS.map(c => c.id));
  let needsMigration = false;
  for (const k in coll) {
    if (!currentIds.has(k) && CARD_ID_MIGRATION[k]) { needsMigration = true; break; }
  }
  if (!needsMigration) return coll;
  // Build remapped collection
  const out = {};
  for (const k in coll) {
    const remappedKey = CARD_ID_MIGRATION[k] || k;
    out[remappedKey] = (out[remappedKey] || 0) + (coll[k] || 0);
  }
  return out;
}

const CARDS_BY_RARITY = {
  G: LEGEND_CARDS,    // 🟢 Legends — historical hall of fame
  F: FRIEND_CARDS,    // 🎴 Friends — league members (white card)
  X: GALAXY_CARDS,    // 🌌 Galaxy — top players of 25/26
  T: ISRAELI_LEGENDS, // 🗑️ Trash — Israeli "heroes"
  L: CARDS.filter(c => c.rarity === "L"),
  E: CARDS.filter(c => c.rarity === "E"),
  R: CARDS.filter(c => c.rarity === "R"),
  U: CARDS.filter(c => c.rarity === "U"),
  C: CARDS.filter(c => c.rarity === "C"),
};

// Rarity probabilities (must sum to 100) — Legendary intentionally very rare
// Regular spin odds (harder to get top tier — legendary stays at 2%, rest reduced)
const RARITY_ODDS = { L: 2, E: 5, R: 15, U: 28, C: 50 };

// Visual config per rarity tier — used by the card UI later
const RARITY_CONFIG = {
  G: { label: "LEGEND",    color: "#22c55e", bgGrad: "linear-gradient(135deg,#14532d,#16a34a,#bbf7d0,#16a34a,#14532d)", glow: "rgba(34,197,94,0.7)", emoji: "🟢", coins: 500 },
  F: { label: "FRIEND",    color: "#ffffff", bgGrad: "linear-gradient(135deg,#f8fafc,#ffffff,#e2e8f0,#ffffff,#f8fafc)", glow: "rgba(255,255,255,0.7)", emoji: "⭐", coins: 800 },
  X: { label: "GALAXY",    color: "#c084fc", bgGrad: "conic-gradient(from 0deg,#1e1b4b,#4c1d95,#be185d,#9333ea,#1e3a8a,#0e7490,#1e1b4b)", glow: "rgba(192,132,252,0.9)", emoji: "🌌", coins: 3000 },
  T: { label: "ISRAEL",    color: "#a16207", bgGrad: "linear-gradient(135deg,#3f3f46,#78716c,#a8a29e,#78716c,#3f3f46)", glow: "rgba(120,113,108,0.5)", emoji: "🗑️", coins: 50 },
  L: { label: "LEGENDARY", color: "#fbbf24", bgGrad: "linear-gradient(135deg,#78350f,#fbbf24,#fde68a,#fbbf24,#78350f)", glow: "rgba(251,191,36,0.8)", emoji: "🏆", coins: 1000 },
  E: { label: "EPIC",      color: "#a855f7", bgGrad: "linear-gradient(135deg,#581c87,#9333ea,#581c87)", glow: "rgba(168,85,247,0.5)", emoji: "💎", coins: 300 },
  R: { label: "RARE",      color: "#ef4444", bgGrad: "linear-gradient(135deg,#7f1d1d,#dc2626,#7f1d1d)", glow: "rgba(239,68,68,0.5)", emoji: "🔥", coins: 100 },
  U: { label: "UNCOMMON",  color: "#3b82f6", bgGrad: "linear-gradient(135deg,#1e3a8a,#2563eb,#1e3a8a)", glow: "rgba(59,130,246,0.4)", emoji: "💧", coins: 50 },
  C: { label: "COMMON",    color: "#94a3b8", bgGrad: "linear-gradient(135deg,#334155,#64748b,#334155)", glow: "rgba(148,163,184,0.3)", emoji: "⚪", coins: 20 },
};

// Pull one card at random based on rarity odds
function rollOneCard() {
  // 🌌 1% chance for GALAXY (top 25/26 players)
  if (Math.random() < 0.01) {
    const galaxy = CARDS_BY_RARITY.X || [];
    if (galaxy.length > 0) {
      return galaxy[Math.floor(Math.random() * galaxy.length)];
    }
  }
  const roll = Math.random() * 100;
  let cumulative = 0;
  let rarity = "C";
  for (const [r, pct] of Object.entries(RARITY_ODDS)) {
    cumulative += pct;
    if (roll < cumulative) { rarity = r; break; }
  }
  const pool = CARDS_BY_RARITY[rarity];
  if (!pool || pool.length === 0) {
    const all = CARDS;
    return all[Math.floor(Math.random() * all.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// 🎮 Player rating (FIFA-style 55-99 score)
// New bands per user request: Legendary 95-99, Epic 85-94, Rare 75-84, Uncommon 65-74, Common 55-64
const RATING_RANGES = {
  G: { min: 90, max: 99 },  // Legend — hall of fame, spans wider range
  F: { min: 95, max: 99 },  // 🎴 Friends — all 99 by default (overridden by manualRating)
  X: { min: 92, max: 99 },  // 🌌 Galaxy — top of the top
  T: { min: 10, max: 40 },  // 🗑️ Trash — Israeli "legends" with low ratings
  L: { min: 95, max: 99 },  // Legendary
  E: { min: 85, max: 94 },  // Epic
  R: { min: 75, max: 84 },  // Rare
  U: { min: 65, max: 74 },  // Uncommon
  C: { min: 55, max: 64 },  // Common
};

// Manual ratings for the top players — locked to specific values to feel like FC25
// (within our 55-99 scale, scaled up so the best player gets 99).
const MANUAL_RATINGS = {
  // 🗑️ Israeli "legends" — locked at low ratings (10-40) for comedy
  "Eli Ohana": 38,
  "Eran Zahavi": 40,
  "Haim Revivo": 35,
  "Ronny Rosenthal": 28,
  "Dudu Aouate": 32,
  "Yossi Benayoun": 36,
  "Avi Nimni": 30,
  "Shalom Tikva": 22,
  "Gili Landau": 18,
  "Moshe Sinai": 15,
  // 🟢 Legends (Hall of Fame) — ratings 90-99 by relative greatness
  "Pelé": 99,
  "Diego Maradona": 99,
  "Johan Cruyff": 98,
  "Ronaldo": 98,                  // R9 — Phenomeno
  "Zinedine Zidane": 98,
  "Alfredo Di Stéfano": 97,
  "Franz Beckenbauer": 97,
  "Ferenc Puskás": 97,
  "Ronaldinho": 96,
  "Marco van Basten": 96,
  "Xavi Hernández": 96,
  "Andrés Iniesta": 96,
  "Andrea Pirlo": 96,
  "Paolo Maldini": 96,
  "Gianluigi Buffon": 96,
  "Thierry Henry": 95,
  "Michel Platini": 95,
  "Eusébio": 95,
  "Bobby Charlton": 95,
  "Romário": 94,
  "Iker Casillas": 94,
  "Francesco Totti": 94,
  "Roberto Baggio": 94,
  "Ruud Gullit": 93,
  "Kaká": 93,
  "Roberto Carlos": 93,
  "Cafú": 93,
  "Luís Figo": 93,
  "Zlatan Ibrahimović": 93,
  "Oliver Kahn": 93,
  "Peter Schmeichel": 92,
  "Gabriel Batistuta": 92,
  "Didier Drogba": 92,
  "David Beckham": 92,
  "Miroslav Klose": 91,
  "Javier Zanetti": 91,
  // New legends (modern retired)
  "Diego Forlán": 92,
  "Samuel Eto'o": 94,
  "Frank Lampard": 95,
  "Steven Gerrard": 95,
  "Yaya Touré": 92,
  "Franck Ribéry": 93,
  "Xabi Alonso": 93,
  "John Terry": 91,
  "Gianluca Zambrotta": 90,
  "Roberto Carlos": 96,
  "Marcelo": 93,
  "Sergio Ramos": 94,
  "David Villa": 93,
  "Fernando Torres": 92,
  "Thierry Henry": 96,
  "Andriy Shevchenko": 94,
  // 🗑️ Israeli "legends" — low ratings for comedy
  "Eyal Berkovic": 38,
  "Eran Zahavi": 40,        // top of the trash — actually decent
  "Avi Nimni": 32,
  "Haim Revivo": 35,
  "Alon Mizrahi": 28,
  "Reuven Atar": 25,
  "Dudu Aouate": 36,        // GK
  "Lior Refaelov": 33,
  "Eli Ohana": 34,
  "Yossi Benayoun": 39,
  "Arik Benado": 22,
  "Uri Malmilian": 37,
  "Mordechai Spiegler": 36,
  "Moshe Sinai": 30,
  "Tal Banin": 33,
  "Bonny Ginzburg": 28,
  "Barak Yitzhaki": 31,
  // Legendary tier (95-99)
  "Kylian Mbappé": 99,
  "Erling Haaland": 99,
  "Vinícius Júnior": 98,
  "Jude Bellingham": 98,
  "Lamine Yamal": 98,
  "Mohamed Salah": 97,
  "Rodri": 97,
  "Pedri": 96,
  "Lionel Messi": 96,
  "Virgil van Dijk": 96,
  "Achraf Hakimi": 95,
  "Cristiano Ronaldo": 95,
  "Luka Modrić": 95,
  "Harry Kane": 96,
  "Son Heung-min": 95,
  // Epic tier (85-94)
  "Thibaut Courtois": 90,
  "Lautaro Martínez": 91,
  "Julián Álvarez": 90,
  "Emiliano Martínez": 89,
  "Antoine Griezmann": 88,
  "Ousmane Dembélé": 90,
  "Aurélien Tchouaméni": 88,
  "Bukayo Saka": 90,
  "Phil Foden": 89,
  "Declan Rice": 88,
  "Raphinha": 88,
  // Portugal stars
  "Bernardo Silva": 89,
  "Bruno Fernandes": 89,
  "Rafael Leão": 87,
  "Nuno Mendes": 88,
  "Diogo Costa": 85,
  "João Cancelo": 87,
  "Rúben Dias": 89,
  "João Félix": 84,
  // Brazil
  "Neymar": 90,
  "Rodrygo": 88,
  "Casemiro": 85,
  "Marquinhos": 87,
  "Éder Militão": 85,
  "Alisson": 88,
  "Ederson": 87,
  "Bruno Guimarães": 85,
  // Spain
  "Aymeric Laporte": 85,
  "Dani Olmo": 86,
  "Fabián Ruiz": 84,
  "Nico Williams": 87,
  "Mikel Merino": 84,
  "Unai Simón": 84,
  "Marc Cucurella": 84,
  // France
  "Adrien Rabiot": 84,
  "Eduardo Camavinga": 85,
  "Theo Hernández": 85,
  "Jules Koundé": 86,
  "William Saliba": 87,
  "Mike Maignan": 87,
  "N'Golo Kanté": 85,
  // England
  "Harry Maguire": 82,
  "John Stones": 85,
  "Cole Palmer": 87,
  "Marcus Rashford": 85,
  "Jordan Pickford": 86,
  "Kyle Walker": 84,
  "Trent Alexander-Arnold": 87,
  // Germany
  "Joshua Kimmich": 88,
  "Florian Wirtz": 88,
  "Kai Havertz": 84,
  "Leroy Sané": 85,
  "Jamal Musiala": 88,
  "İlkay Gündoğan": 84,
  "Manuel Neuer": 85,
  "Niclas Füllkrug": 81,
  // Argentina
  "Rodrigo De Paul": 85,
  "Ángel Di María": 84,
  "Cristian Romero": 87,
  "Nicolás Otamendi": 83,
  "Enzo Fernández": 86,
  "Alexis Mac Allister": 86,
  "Nahuel Molina": 82,
  "Leandro Paredes": 81,
  // Netherlands
  "Frenkie de Jong": 86,
  "Memphis Depay": 84,
  "Cody Gakpo": 85,
  "Xavi Simons": 85,
  "Denzel Dumfries": 84,
  // Italy stars (if any in)
  "Lautaro Martínez": 89,
  // Croatia
  "Joško Gvardiol": 87,
  "Mateo Kovačić": 84,
  // Belgium
  "Kevin De Bruyne": 88,
  "Romelu Lukaku": 84,
  // Morocco
  "Youssef En-Nesyri": 84,
  "Sofyan Amrabat": 82,
  "Yassine Bounou": 84,
  // Other internationals
  "Khvicha Kvaratskhelia": 86,
  "Federico Valverde": 88,
  "Darwin Núñez": 84,
  "Ronald Araújo": 85,
  "Christian Pulisic": 84,
  "Weston McKennie": 80,
};

// Hash a string into a deterministic integer
function _stringHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
// Each player gets a deterministic rating. Manual override applies first (top stars),
// otherwise hash within the rarity range gives a stable rating.
function getPlayerRating(card) {
  // Built-in manualRating on the card itself (used by FRIEND_CARDS)
  if (card.manualRating != null) return card.manualRating;
  // Manual override for top players (matches FC25 prestige)
  if (MANUAL_RATINGS[card.name] != null) return MANUAL_RATINGS[card.name];
  const range = RATING_RANGES[card.rarity] || RATING_RANGES.C;
  const hash = _stringHash(card.name);
  const span = range.max - range.min;
  return range.min + (hash % (span + 1));
}


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
          background:"rgba(36,49,80,0.85)",
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
          background:"rgba(36,49,80,0.85)",
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
            background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(36,49,80,0.5))",
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
              background:"linear-gradient(135deg,rgba(251,191,36,0.12),rgba(36,49,80,0.5))",
              border:"1px solid rgba(251,191,36,0.4)",
              borderRadius:12,padding:"14px 10px",textAlign:"center",
            }}>
              <div style={{fontSize:36,marginBottom:4}}>🏆</div>
              <div style={{fontSize:11,color:"#cbd5e1",fontWeight:700,marginBottom:6,letterSpacing:1}}>{t("onboarding.champion")}</div>
              <div style={{fontSize:22,fontWeight:900,color:"#fbbf24"}}>+20</div>
            </div>
            <div style={{
              background:"linear-gradient(135deg,rgba(168,85,247,0.12),rgba(36,49,80,0.5))",
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
    {
      emoji: "🎰",
      title: t("onboarding.slide4Title"),
      accent: "#fbbf24",
      content: (
        <div>
          {/* Coins explainer */}
          <div style={{
            background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(36,49,80,0.5))",
            border:"1px solid rgba(251,191,36,0.4)",
            borderRadius:12,padding:"14px",marginBottom:14,
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:24}}>🪙</span>
                <span style={{fontSize:14,fontWeight:900,color:"#fbbf24"}}>{t("onboarding.coinsTitle")}</span>
              </div>
              <span style={{fontSize:11,color:"#94a3b8"}}>1000 🎁</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:11}}>
              <div style={{color:"#cbd5e1"}}>🎯 {t("onboarding.exact")}</div>
              <div style={{color:"#fbbf24",fontWeight:800,textAlign:"end"}}>+200 🪙</div>
              <div style={{color:"#cbd5e1"}}>✅ {t("onboarding.winner")}</div>
              <div style={{color:"#fbbf24",fontWeight:800,textAlign:"end"}}>+100 🪙</div>
            </div>
          </div>

          {/* Rarity rainbow */}
          <div style={{
            background:"rgba(36,49,80,0.5)",
            border:"1px solid rgba(71,85,105,0.3)",
            borderRadius:12,padding:"12px",marginBottom:14,
          }}>
            <div style={{fontSize:11,color:"#cbd5e1",fontWeight:700,marginBottom:8,textAlign:"center",letterSpacing:2}}>{t("onboarding.rarityTitle")}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:4}}>
              {[
                { e: "🏆", l: "LEG", c: "#fbbf24", p: "3%" },
                { e: "💎", l: "EPIC", c: "#a855f7", p: "12%" },
                { e: "🔥", l: "RARE", c: "#ef4444", p: "22%" },
                { e: "💧", l: "UNC", c: "#3b82f6", p: "28%" },
                { e: "⚪", l: "COM", c: "#94a3b8", p: "35%" },
              ].map(r => (
                <div key={r.l} style={{
                  textAlign:"center",
                  padding:"6px 2px",borderRadius:6,
                  background:`${r.c}15`,
                  border:`1px solid ${r.c}44`,
                }}>
                  <div style={{fontSize:18,marginBottom:2}}>{r.e}</div>
                  <div style={{fontSize:8,color:r.c,fontWeight:900,letterSpacing:0.5}}>{r.l}</div>
                  <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,marginTop:2}}>{r.p}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.7,padding:"0 4px"}}>
            🎰 {t("onboarding.spinTip")}<br/>
            🃏 {t("onboarding.collectTip")}<br/>
            🔁 {t("onboarding.dupTip")}
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
      background:"linear-gradient(180deg, rgba(30,41,64,0.97), rgba(36,49,80,0.97))",
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
        background:"linear-gradient(145deg,#2c3956,#243150)",
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
            color: current.accent === "#fbbf24" ? "#1e2940" : "#fff",
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
              warning: { bg:"rgba(251,191,36,0.95)", border:"#fbbf24", text:"#1e2940", icon:"⚠️" },
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
        background:"linear-gradient(145deg,#2c3956,#243150)",
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
          background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(36,49,80,0.5))",
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
              <div style={{height:6,background:"rgba(36,49,80,0.6)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${stats.accuracy}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",borderRadius:3,transition:"width 0.6s"}}/>
              </div>
            </div>
            {/* Bar 2: exact */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#cbd5e1",marginBottom:3}}>
                <span>{t("profile.exactHits")}</span>
                <span style={{fontWeight:700,color:"#fbbf24"}}>{stats.exactAccuracy}%</span>
              </div>
              <div style={{height:6,background:"rgba(36,49,80,0.6)",borderRadius:3,overflow:"hidden"}}>
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
            background:"linear-gradient(135deg,rgba(168,85,247,0.1),rgba(36,49,80,0.5))",
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
                  background: isMe ? "linear-gradient(135deg,rgba(251,191,36,0.18),rgba(36,49,80,0.5))" : "rgba(30,41,59,0.5)",
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
function Sidebar({ open, onClose, name, lang, setLang, onShowProfile, onShowRules, onShowBackup, onShowTutorial, onShowAchievements, onShowRoulette, onShowWrapped, onShowAdmin, onShowAdminGift, onShowGlobalAdmin, onShowLuckyWheel, onShowCoinWheel, coinWheelAvailable, wheelAvailable, hlPlaysToday, onLogout, onReset, totalPoints, unlockedCount, coinBalance }) {
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
        background:"linear-gradient(180deg,#2c3956,#243150)",
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
                📈 <AnimatedNumber value={totalPoints} /> {t("welcome.pts")}
              </div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div style={{padding:"12px 12px",flex:1}}>
          <SidebarItem icon="📊" label={t("sidebar.myStats")} onClick={()=>{onClose();onShowProfile();}}/>
          {onShowWrapped && (
            <SidebarItem icon="🎬" label={t("sidebar.wrapped")} onClick={()=>{onClose();onShowWrapped();}}/>
          )}
          {onShowAdmin && (
            <SidebarItem icon="👑" label={t("admin.menuItem")} onClick={()=>{onClose();onShowAdmin();}}/>
          )}
          {onShowAdminGift && (
            <SidebarItem icon="🎁" label="שלח מתנה לליגה" onClick={()=>{onClose();onShowAdminGift();}}/>
          )}
          {onShowGlobalAdmin && (
            <SidebarItem icon="🌍" label="ניהול גלובלי" onClick={()=>{onClose();onShowGlobalAdmin();}}/>
          )}
          <SidebarItem
            icon="🏅"
            label={`${t("sidebar.achievements")}${unlockedCount ? ` (${unlockedCount})` : ""}`}
            onClick={()=>{onClose();onShowAchievements();}}
          />
          <SidebarItem
            icon="🎰"
            label={`${t("sidebar.roulette")}${coinBalance ? ` · 🪙 ${coinBalance}` : ""}`}
            onClick={()=>{onClose();onShowRoulette();}}
          />
          <SidebarItem
            icon="🎴"
            label={`גבוה או נמוך${wheelAvailable ? ` · ${Math.max(0, 5 - hlPlaysToday)} חינם` : ""}`}
            onClick={()=>{onClose();onShowLuckyWheel();}}
          />
          <SidebarItem
            icon="🪙"
            label={`גלגל הגורל${coinWheelAvailable ? " · 🟢 זמין!" : ""}`}
            onClick={()=>{onClose();onShowCoinWheel();}}
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
                color: lang==="en" ? "#1e2940" : "#cbd5e1",
                border: lang==="en" ? "none" : "1px solid rgba(71,85,105,0.4)",
                fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                letterSpacing:1,
              }}>EN English</button>
              <button onClick={()=>setLang("he")} style={{
                flex:1,padding:"8px 10px",borderRadius:8,
                background: lang==="he" ? "linear-gradient(135deg,#fbbf24,#d97706)" : "rgba(30,41,59,0.6)",
                color: lang==="he" ? "#1e2940" : "#cbd5e1",
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
        background:"linear-gradient(180deg,#2c3956,#243150)",
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
          <div style={{height:6,background:"rgba(36,49,80,0.5)",borderRadius:3,overflow:"hidden"}}>
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
                  ? `linear-gradient(135deg, ${a.color}22, rgba(36,49,80,0.5))`
                  : "rgba(36,49,80,0.5)",
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
        background:"linear-gradient(135deg,#2c3956,#243150)",
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

// ─── 🎰 ROULETTE MODAL ────────────────────────────────────────────────────
// 🔊 Slot machine sounds via Web Audio API (no MP3 files needed)
let _audioCtx = null;
function getAudio() {
  if (typeof window === "undefined") return null;
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  return _audioCtx;
}
function isMuted() {
  try { return localStorage.getItem("wc2026_mute") === "1"; } catch { return false; }
}
function setMuted(v) {
  try { localStorage.setItem("wc2026_mute", v ? "1" : "0"); } catch {}
}
// One-off "tick" sound — used for each tick of the reels
function playTick() {
  if (isMuted()) return;
  const ctx = getAudio(); if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 800 + Math.random() * 200;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  } catch {}
}
// "Reel stop" sound — a thud
function playReelStop() {
  if (isMuted()) return;
  const ctx = getAudio(); if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } catch {}
}
// Lever pull — a satisfying mechanical pull
function playLever() {
  if (isMuted()) return;
  const ctx = getAudio(); if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  } catch {}
}
// Win fanfare — happy ascending tones (more notes = bigger reward)
function playWinSound(rarity) {
  if (isMuted()) return;
  const ctx = getAudio(); if (!ctx) return;
  // Note sequences (higher = better tier)
  const sequences = {
    L: [523, 659, 784, 1047, 1319, 1568], // C-E-G-C-E-G (huge fanfare!)
    E: [523, 659, 784, 1047],               // C-E-G-C
    R: [523, 659, 784],                      // C-E-G
    U: [523, 659],                           // C-E
    C: [523],                                // single C
  };
  const notes = sequences[rarity] || sequences.C;
  notes.forEach((freq, i) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const startT = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(0.2, startT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(startT); osc.stop(startT + 0.4);
    } catch {}
  });
}

// 🎁 DAILY BONUS MODAL — shows the 7-day reward grid + claim button

function RouletteModal({ coins, isSpinning, pendingCard, onSpin, onLegendsSpin, legendsSpinAvailable, onGalaxySpin, galaxyTestMode, spinCount, onClose, onShowCollection }) {
  const t = useT();
  const canSpin = coins.balance >= COINS.SPIN && !isSpinning;
  const [leverPulled, setLeverPulled] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  // Pull the lever, play sound, then trigger spin
  const handleLeverPull = () => {
    if (!canSpin) return;
    setLeverPulled(true);
    playLever();
    setTimeout(() => { onSpin(); }, 300);
    setTimeout(() => setLeverPulled(false), 800);
  };

  const handleSpinClick = () => { handleLeverPull(); };

  return (
    <div onClick={() => !isSpinning && onClose()} style={{
      position:"fixed",inset:0,zIndex:9000,
      background:"radial-gradient(circle at center, rgba(51,65,85,0.85), rgba(36,49,80,0.92))",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:14,
    }}>
      <style>{`
        @keyframes rouletteSpinIn {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slotReel {
          0% { transform: translateY(0); }
          100% { transform: translateY(-720px); }
        }
        @keyframes slotReelEnd {
          0% { transform: translateY(0); }
          70% { transform: translateY(-20px); }
          100% { transform: translateY(0); }
        }
        @keyframes coinShimmer {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(10deg); }
        }
        @keyframes neonPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(251,191,36,0.5), inset 0 0 12px rgba(251,191,36,0.3); }
          50% { box-shadow: 0 0 24px rgba(251,191,36,0.8), inset 0 0 20px rgba(251,191,36,0.5); }
        }
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth:420,width:"100%",
        background:"linear-gradient(180deg, #334155, #1e293b)",
        border:"2px solid #fbbf24",
        borderRadius:24,padding:"24px 20px",
        boxShadow:"0 20px 80px rgba(251,191,36,0.2)",
        animation:"rouletteSpinIn 0.5s ease-out",
        position:"relative",
      }}>
        {/* Close + Mute */}
        {!isSpinning && (
          <button onClick={onClose} style={{
            position:"absolute",top:12,insetInlineEnd:12,
            background:"transparent",border:"none",color:"#94a3b8",fontSize:20,
            cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",
          }}>✕</button>
        )}
        <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} style={{
          position:"absolute",top:12,insetInlineStart:12,
          background:"transparent",border:"none",fontSize:16,
          cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",
        }}>{muted ? "🔇" : "🔊"}</button>

        {/* Title */}
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:11,color:"#fbbf24",letterSpacing:4,fontWeight:800,marginBottom:4}}>{t("roulette.title")}</div>
          <h2 style={{margin:0,fontSize:26,fontWeight:900,
            background:"linear-gradient(180deg,#fde68a,#f59e0b)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          }}>🎰 {t("roulette.spinTitle")}</h2>
        </div>

        {/* 🎰 SLOT MACHINE — reels on left, big lever on right */}
        <div style={{
          display:"flex",alignItems:"center",gap:14,
          margin:"24px 0",
          direction:"ltr", // ensure lever stays on the right even in RTL mode
        }}>
          {/* Slot machine reels */}
          <div style={{
            flex:1,
            display:"flex",justifyContent:"center",gap:6,
            padding:"14px 10px",
            background:"linear-gradient(180deg,#2c3956,#1e2940)",
            border:"3px solid #fbbf24",
            borderRadius:14,
            animation: isSpinning ? "neonPulse 0.6s ease-in-out infinite" : "none",
          }}>
            <SlotReel
              type="flag"
              spinning={isSpinning}
              stopAt={2000}
              finalValue={pendingCard?.flag}
            />
            <SlotReel
              type="position"
              spinning={isSpinning}
              stopAt={4000}
              finalValue={pendingCard?.pos}
            />
            <SlotReel
              type="rarity"
              spinning={isSpinning}
              stopAt={7000}
              finalValue={pendingCard?.rarity}
            />
          </div>

          {/* 🎰 LEVER on the RIGHT — sized just right, bright gold arm */}
          <div style={{
            width:60,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",
            position:"relative",
            paddingTop:4,
          }}>
            {/* Mount base — gold housing */}
            <div style={{
              width:34,height:18,
              background:"linear-gradient(180deg,#fde68a,#fbbf24,#92400e)",
              borderRadius:"5px 5px 0 0",
              border:"2px solid #78350f",
              boxShadow:"0 2px 4px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)",
              position:"relative",
              zIndex:3,
            }}>
              {/* Bolt detail */}
              <div style={{
                position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                width:6,height:6,borderRadius:"50%",
                background:"radial-gradient(circle at 30% 30%, #fde68a, #92400e)",
                border:"1px solid #78350f",
              }}/>
            </div>
            {/* Lever button (clickable) */}
            <button
              onClick={handleLeverPull}
              disabled={!canSpin}
              title="Pull to spin!"
              style={{
                width:60,
                background:"transparent",
                border:"none",
                cursor: canSpin ? "pointer" : "not-allowed",
                opacity: canSpin ? 1 : 0.5,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",
                fontFamily:"inherit",padding:0,
                position:"relative",
              }}
            >
              {/* Lever arm — bright GOLD pole (pops against brighter bg) */}
              <div style={{
                width:10,height:75,
                background:"linear-gradient(90deg, #92400e 0%, #fbbf24 30%, #fde68a 50%, #fbbf24 70%, #92400e 100%)",
                borderRadius:5,
                boxShadow:"0 0 8px rgba(251,191,36,0.6), inset 0 0 4px rgba(0,0,0,0.3)",
                transformOrigin:"top center",
                transform: leverPulled ? "translateY(45px) scaleY(0.55)" : "translateY(0) scaleY(1)",
                transition: leverPulled ? "transform 0.25s ease-in" : "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}/>
              {/* Lever ball — BIG red knob */}
              <div style={{
                width:42,height:42,borderRadius:"50%",
                background:"radial-gradient(circle at 32% 32%, #fee2e2 0%, #ef4444 40%, #991b1b 80%, #450a0a)",
                boxShadow:`
                  0 8px 16px rgba(0,0,0,0.6),
                  inset 0 -5px 10px rgba(0,0,0,0.4),
                  inset 0 3px 6px rgba(255,255,255,0.3),
                  0 0 18px rgba(239,68,68,0.5)
                `,
                marginTop:-5,
                transform: leverPulled ? "translateY(45px)" : "translateY(0)",
                transition: leverPulled ? "transform 0.25s ease-in" : "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                border:"3px solid #450a0a",
                position:"relative",
              }}>
                {/* Shine highlight */}
                <div style={{
                  position:"absolute",
                  top:5,left:8,
                  width:12,height:12,borderRadius:"50%",
                  background:"radial-gradient(circle, rgba(255,255,255,0.7), transparent 70%)",
                }}/>
              </div>
              {/* "PULL" label */}
              {canSpin && !isSpinning && !leverPulled && (
                <div style={{
                  position:"absolute",
                  bottom:-20,
                  fontSize:9,color:"#fbbf24",letterSpacing:3,fontWeight:900,
                  animation:"pullPulse 1.2s ease-in-out infinite",
                  textShadow:"0 0 8px rgba(251,191,36,0.6)",
                }}>↓ PULL ↓</div>
              )}
            </button>
            <style>{`
              @keyframes pullPulse {
                0%, 100% { opacity: 0.6; transform: translateY(0); }
                50% { opacity: 1; transform: translateY(2px); }
              }
            `}</style>
          </div>
        </div>

        {/* Rarity legend */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:4,marginBottom:18}}>
          {Object.entries(RARITY_ODDS).map(([r, pct]) => {
            const cfg = RARITY_CONFIG[r];
            return (
              <div key={r} style={{
                textAlign:"center",
                padding:"4px 2px",borderRadius:6,
                background:`${cfg.color}11`,
                border:`1px solid ${cfg.color}44`,
              }}>
                <div style={{fontSize:8,color:cfg.color,fontWeight:800,letterSpacing:0.5,marginBottom:2}}>{cfg.label.slice(0,4)}</div>
                <div style={{fontSize:11,color:"#f1f5f9",fontWeight:700}}>{pct}%</div>
              </div>
            );
          })}
        </div>

        {/* Balance + spin button */}
        <div style={{
          background:"#1e2940",
          borderRadius:12,padding:"12px 14px",marginBottom:12,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          border:"1px solid rgba(251,191,36,0.2)",
        }}>
          <div>
            <div style={{fontSize:9,color:"#64748b",letterSpacing:1,marginBottom:2}}>{t("roulette.yourBalance")}</div>
            <div style={{fontSize:20,color:"#fbbf24",fontWeight:900,display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:18,animation:"coinShimmer 2s ease-in-out infinite"}}>🪙</span>
              {coins.balance}
            </div>
          </div>
          <div style={{textAlign:"end"}}>
            <div style={{fontSize:9,color:"#64748b",letterSpacing:1,marginBottom:2}}>{t("roulette.spinCost")}</div>
            <div style={{fontSize:14,color:"#cbd5e1",fontWeight:700}}>🪙 {COINS.SPIN}</div>
          </div>
        </div>

        <button onClick={handleSpinClick} disabled={!canSpin} style={{
          width:"100%",padding:"14px",borderRadius:12,
          background: canSpin ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "rgba(71,85,105,0.4)",
          color: canSpin ? "#1e2940" : "#64748b",
          border:"none",fontSize:16,fontWeight:900,
          fontFamily:"inherit",cursor: canSpin ? "pointer" : "not-allowed",
          boxShadow: canSpin ? "0 8px 24px rgba(251,191,36,0.4)" : "none",
          letterSpacing:1,
        }}>
          {isSpinning ? `🎰 ${t("roulette.spinning")}` : canSpin ? `🎰 ${t("roulette.spinBtn")}` : `🪙 ${t("roulette.notEnough")}`}
        </button>

        {/* 🟢 Legends Spin — appears after 5 regular spins */}
        {legendsSpinAvailable ? (
          <button onClick={() => !isSpinning && onLegendsSpin?.()} disabled={isSpinning} style={{
            width:"100%",marginTop:10,padding:"14px",borderRadius:12,
            background:"linear-gradient(135deg,#15803d,#22c55e,#bbf7d0,#22c55e,#15803d)",
            backgroundSize:"200% 200%",
            color:"#0a0a0a",
            border:"2px solid #22c55e",
            fontSize:15,fontWeight:900,
            fontFamily:"inherit",cursor: isSpinning ? "not-allowed" : "pointer",
            boxShadow:"0 8px 24px rgba(34,197,94,0.6), 0 0 30px rgba(34,197,94,0.4)",
            letterSpacing:1,
            animation: isSpinning ? "none" : "legendShimmer 3s linear infinite",
          }}>
            🟢 LEGENDS SPIN — חינם!
            <div style={{fontSize:9,marginTop:3,opacity:0.8,letterSpacing:0.5,fontWeight:700}}>
              אגדה אמיתית או... ישראלי 🗑️?
            </div>
          </button>
        ) : (
          <div style={{
            marginTop:10,padding:"10px 12px",
            background:"rgba(34,197,94,0.08)",
            border:"1px solid rgba(34,197,94,0.25)",
            borderRadius:10,
            fontSize:11,color:"#86efac",
            textAlign:"center",fontWeight:700,
          }}>
            🟢 ספין אגדה חינם — עוד {Math.max(0, 5 - (spinCount || 0))} ספינים
            <div style={{
              marginTop:6,height:5,background:"rgba(255,255,255,0.1)",
              borderRadius:3,overflow:"hidden",
            }}>
              <div style={{
                width:`${Math.min(100, ((spinCount || 0) / 5) * 100)}%`,
                height:"100%",
                background:"linear-gradient(90deg,#22c55e,#bbf7d0)",
                transition:"width 0.4s ease",
              }}/>
            </div>
          </div>
        )}
        <style>{`@keyframes legendShimmer { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>

        {/* 🌌 GALAXY SPIN — 1000 coins · 5% chance for top 25/26 player */}
        {(coins.balance >= 1000 || galaxyTestMode) && (
          <button
            onClick={() => !isSpinning && onGalaxySpin?.()}
            disabled={isSpinning}
            style={{
              width:"100%",marginTop:10,padding:"14px",borderRadius:12,
              background:"conic-gradient(from 0deg,#1e1b4b,#4c1d95,#be185d,#9333ea,#1e3a8a,#0e7490,#1e1b4b)",
              backgroundSize:"200% 200%",
              color:"#fff",
              border:"2px solid #c084fc",
              fontSize:15,fontWeight:900,
              fontFamily:"inherit",cursor: isSpinning ? "not-allowed" : "pointer",
              boxShadow:"0 8px 24px rgba(192,132,252,0.6), 0 0 30px rgba(192,132,252,0.4)",
              letterSpacing:1,
              animation: isSpinning ? "none" : "galaxyShimmer 5s linear infinite",
              position:"relative",
            }}>
            🌌 GALAXY SPIN
            <div style={{fontSize:10,marginTop:3,opacity:0.95,letterSpacing:0.5,fontWeight:700}}>
              {galaxyTestMode ? "🧪 מצב בדיקה — חינם" : "🪙 1000 · 5% למצטייני 25/26"}
            </div>
          </button>
        )}
        <style>{`@keyframes galaxyShimmer { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>

        <button onClick={onShowCollection} style={{
          width:"100%",marginTop:8,padding:"10px",borderRadius:10,
          background:"rgba(30,41,59,0.5)",
          color:"#cbd5e1",
          border:"1px solid rgba(71,85,105,0.4)",
          fontSize:12,fontWeight:700,
          fontFamily:"inherit",cursor:"pointer",
        }}>
          🃏 {t("roulette.viewCollection")}
        </button>
      </div>
    </div>
  );
}

// One reel of the slot machine. Type determines what it cycles through.
// - "flag": all 48 WC team flags → stops at 1.5s
// - "position": GK/D/M/F → stops at 3s
// - "rarity": Common→Legendary labels → stops at 5s (the climax!)
function SlotReel({ type, spinning, stopAt, finalValue }) {
  const [stopped, setStopped] = useState(false);
  const [displayValue, setDisplayValue] = useState(null);

  // Choose the icon pool based on reel type
  const ICONS = useMemo(() => {
    if (type === "flag") {
      // All 48 WC team flags
      return ALL_TEAMS.map(t => t.f);
    }
    if (type === "position") {
      return ["GK", "D", "M", "F"];
    }
    if (type === "rarity") {
      // Show rarity emojis weighted toward common (so legendary feels rare)
      return ["⚪","💧","⚪","🔥","💧","⚪","💎","💧","⚪","🏆","🔥","⚪","💧","💎","⚪","🔥","💧","⚪","🏆","💧"];
    }
    return ["?"];
  }, [type]);

  useEffect(() => {
    if (spinning) {
      setStopped(false);
      // Cycle through icons while spinning — rarity reel cycles SLOWER to build tension
      const cycleSpeed = type === "rarity" ? 140 : 80;
      let i = 0;
      const tick = setInterval(() => {
        i = (i + 1) % ICONS.length;
        setDisplayValue(ICONS[i]);
      }, cycleSpeed);
      // Stop at stopAt ms
      const stop = setTimeout(() => {
        clearInterval(tick);
        // For rarity, show the emoji of the actual rarity
        if (type === "rarity") {
          setDisplayValue(RARITY_CONFIG[finalValue]?.emoji || "?");
        } else {
          setDisplayValue(finalValue);
        }
        setStopped(true);
        // Loud thud when reel stops
        playReelStop();
      }, stopAt);
      return () => { clearInterval(tick); clearTimeout(stop); };
    } else {
      setStopped(false);
      setDisplayValue(null);
    }
  }, [spinning, stopAt, finalValue, ICONS, type]);

  // Render content based on type + value
  const renderContent = (v) => {
    if (!v) return <span style={{color:"#475569"}}>?</span>;
    if (type === "flag") {
      return <span style={{fontSize:34}}>{v}</span>;
    }
    if (type === "position") {
      const label = { GK: "GK", D: "DEF", M: "MID", F: "FWD" }[v] || v;
      const color = { GK: "#fbbf24", D: "#3b82f6", M: "#22c55e", F: "#ef4444" }[v] || "#94a3b8";
      return <span style={{fontSize:18,fontWeight:900,color,letterSpacing:1}}>{label}</span>;
    }
    if (type === "rarity") {
      // Rarity reel just shows emojis (🏆💎🔥💧⚪)
      return <span style={{
        fontSize:34,
        filter: stopped && finalValue === "L" ? `drop-shadow(0 0 12px ${RARITY_CONFIG.L.glow})` : "none",
      }}>{v}</span>;
    }
    return <span>?</span>;
  };

  // Glow border once stopped on a special rarity
  const isLegendaryStop = stopped && type === "rarity" && finalValue === "L";
  const isEpicStop = stopped && type === "rarity" && finalValue === "E";
  const borderGlow = isLegendaryStop
    ? `0 0 24px ${RARITY_CONFIG.L.glow}, inset 0 0 12px ${RARITY_CONFIG.L.glow}`
    : isEpicStop
    ? `0 0 16px ${RARITY_CONFIG.E.glow}`
    : "none";

  return (
    <div style={{
      width:64,height:80,
      background:"linear-gradient(180deg,#1e2940,#2c3956)",
      border:`2px solid ${stopped ? "#fbbf24" : "rgba(251,191,36,0.3)"}`,
      borderRadius:8,
      overflow:"hidden",position:"relative",
      display:"flex",alignItems:"center",justifyContent:"center",
      transition:"border-color 0.3s",
      boxShadow: borderGlow,
      animation: stopped ? "slotReelEnd 0.4s ease-out" : "none",
    }}>
      {/* Inset glow */}
      <div style={{
        position:"absolute",inset:0,
        background:"radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6))",
        pointerEvents:"none",
      }}/>
      {renderContent(displayValue)}
    </div>
  );
}

// ─── 🃏 PLAYER CARD COMPONENT ──────────────────────────────────────────────
// Shared card display used in the reveal + collection. Animates by rarity.
// 3-letter country codes (FIFA style)
const COUNTRY_CODE = {
  "Argentina":"ARG","France":"FRA","England":"ENG","Brazil":"BRA","Portugal":"POR",
  "Spain":"ESP","Germany":"GER","Netherlands":"NED","Belgium":"BEL","Italy":"ITA",
  "Croatia":"CRO","Morocco":"MAR","Uruguay":"URU","Colombia":"COL","Senegal":"SEN",
  "Mexico":"MEX","USA":"USA","Japan":"JPN","Switzerland":"SUI","Denmark":"DEN",
  "South Korea":"KOR","Ecuador":"ECU","Austria":"AUT","Türkiye":"TUR","Australia":"AUS",
  "Canada":"CAN","Norway":"NOR","Panama":"PAN","Algeria":"ALG","Egypt":"EGY",
  "Scotland":"SCO","Paraguay":"PAR","Tunisia":"TUN","Côte d\'Ivoire":"CIV","Czechia":"CZE",
  "Uzbekistan":"UZB","Qatar":"QAT","Saudi Arabia":"KSA","South Africa":"RSA","Jordan":"JOR",
  "Iran":"IRN","Iraq":"IRQ","Bosnia":"BIH","DR Congo":"COD","Cabo Verde":"CPV",
  "Ghana":"GHA","Curaçao":"CUW","Haiti":"HAI","New Zealand":"NZL","Sweden":"SWE",
};
function countryCode(n) { return COUNTRY_CODE[n] || (n || "").slice(0,3).toUpperCase(); }

// Shirt number by position (deterministic from name)
function shirtNumber(card) {
  const h = _stringHash(card.name);
  const numbers = {
    GK: [1, 12, 22, 23],
    D:  [2, 3, 4, 5, 6],
    M:  [8, 10, 14, 16, 18, 20],
    F:  [7, 9, 11, 17, 19, 21],
  }[card.pos] || [10];
  return numbers[h % numbers.length];
}

// Skill stars based on rating (1-5)
function skillStars(rating) {
  if (rating >= 95) return 5;
  if (rating >= 85) return 4;
  if (rating >= 75) return 3;
  if (rating >= 65) return 2;
  return 1;
}

// 📊 4 FIFA-style stats derived from rating + position (deterministic)
// Returns { pace, shooting, passing, defending }
function getPlayerStats(card) {
  const rating = getPlayerRating(card);
  const h = _stringHash(card.name);
  // Position weights: how each pos affects each stat
  // Format: [pace, shooting, passing, defending]
  const weights = {
    GK: [-15, -25,  -5,  +5],
    D:  [ -5, -15,  -2,  +8],
    M:  [  0,  -5,  +8,  -3],
    F:  [ +5, +10,  -3, -15],
  }[card.pos] || [0,0,0,0];
  // Use different hash slices for each stat → unique variance per stat
  const variances = [(h % 11) - 5, ((h>>3) % 11) - 5, ((h>>7) % 11) - 5, ((h>>11) % 11) - 5];
  const stats = weights.map((w, i) => {
    let v = rating + w + variances[i];
    return Math.max(20, Math.min(99, v));
  });
  return { pace: stats[0], shooting: stats[1], passing: stats[2], defending: stats[3] };
}

function PlayerCard({ card, size = "L", animated = false, flippable = false }) {
  const isFriend = card.rarity === "F";
  const variant = card.variant || "default";
  // Friend cards can override the base config based on variant
  let cfg = RARITY_CONFIG[card.rarity];
  if (isFriend) {
    if (variant === "lafamilia" || variant === "beitar") {
      // 🟡⚫ Beitar Jerusalem — yellow & black
      cfg = { ...cfg,
        bgGrad: "linear-gradient(135deg,#0a0a0a,#1c1917,#facc15,#1c1917,#0a0a0a)",
        color: "#facc15",
        glow: "rgba(250,204,21,0.7)",
      };
    } else if (variant === "pokemon") {
      // 🔴⚪ Pokemon trainer — red & white
      cfg = { ...cfg,
        bgGrad: "linear-gradient(135deg,#7f1d1d,#dc2626,#fef2f2,#dc2626,#7f1d1d)",
        color: "#fef2f2",
        glow: "rgba(220,38,38,0.7)",
      };
    } else if (variant === "maccabi_ta") {
      // 🟡🔵 Maccabi Tel Aviv — yellow & blue
      cfg = { ...cfg,
        bgGrad: "linear-gradient(135deg,#1e3a8a,#2563eb,#fde047,#2563eb,#1e3a8a)",
        color: "#fde047",
        glow: "rgba(253,224,71,0.7)",
      };
    } else if (variant === "maccabi_haifa") {
      // 🟢⚪ Maccabi Haifa — green & white
      cfg = { ...cfg,
        bgGrad: "linear-gradient(135deg,#064e3b,#16a34a,#f0fdf4,#16a34a,#064e3b)",
        color: "#f0fdf4",
        glow: "rgba(22,163,74,0.7)",
      };
    } else if (variant === "real_madrid") {
      // ⚪ Real Madrid — pure white with subtle silver/gold accents
      cfg = { ...cfg,
        bgGrad: "linear-gradient(135deg,#ffffff,#f8fafc,#e2e8f0,#f8fafc,#ffffff)",
        color: "#1e293b",
        glow: "rgba(255,255,255,0.9)",
      };
    }
    // default also stays white from RARITY_CONFIG.F
  }
  const isLegend = card.rarity === "G";
  const isGalaxy = card.rarity === "X";
  const isLegendary = card.rarity === "L";
  const rating = getPlayerRating(card);
  const isPerfect = rating === 99;
  const stars = skillStars(rating);
  const stats = getPlayerStats(card);

  // Flip state — only used when flippable=true
  const [flipped, setFlipped] = useState(false);

  const dims = size === "L" ? { w: 240, h: 360, font: 18, flag: 80, position: 16, rating: 42, star: 11 }
             : size === "M" ? { w: 140, h: 210, font: 12, flag: 46, position: 11, rating: 24, star: 7 }
             : { w: 95, h: 138, font: 9, flag: 30, position: 8, rating: 17, star: 5 };

  const posInfo = {
    GK: { label: "GOALKEEPER", short: "GK", color: "#fbbf24", icon: "🧤" },
    D:  { label: "DEFENDER",   short: "DEF", color: "#3b82f6", icon: "🛡️" },
    M:  { label: "MIDFIELDER", short: "MID", color: "#22c55e", icon: "⚙️" },
    F:  { label: "FORWARD",    short: "FWD", color: "#ef4444", icon: "⚔️" },
  }[card.pos] || { label: "PLAYER", short: "P", color: "#94a3b8", icon: "⚽" };

  // ─── BACK SIDE: Mundialito branding + 4 stats ───────────────────────
  const renderBack = () => (
    <div style={{
      width: dims.w, height: dims.h,
      background: cfg.bgGrad,
      backgroundSize: "150% 150%",
      backgroundPosition: "center",
      border: `3px solid ${cfg.color}`,
      borderRadius: 14,
      display: "flex", flexDirection: "column",
      padding: size === "L" ? "16px 16px" : size === "M" ? "10px 10px" : "6px 6px",
      boxShadow: animated
        ? `0 0 30px ${cfg.glow}, 0 8px 24px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3)`
        : `0 4px 12px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.2)`,
      position: "relative",
      overflow: "hidden",
      backfaceVisibility: "hidden",
      transform: "rotateY(180deg)",
    }}>
      {/* Subtle field pattern */}
      <div style={{
        position:"absolute",inset:0,
        background:`repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,255,255,0.03) 18px, rgba(255,255,255,0.03) 20px)`,
        pointerEvents:"none",
      }}/>

      {/* MUNDIALITO branding header */}
      <div style={{
        textAlign:"center",
        marginBottom: size === "L" ? 12 : 6,
        position:"relative",zIndex:2,
      }}>
        <div style={{
          fontSize: size === "L" ? 9 : 6,
          color: cfg.color,
          letterSpacing: 3,
          fontWeight:900,
          textShadow:`0 0 6px ${cfg.glow}`,
        }}>🏆 MUNDIALITO</div>
        <div style={{
          fontSize: size === "L" ? 16 : size === "M" ? 11 : 8,
          color:"#fff",fontWeight:900,letterSpacing:2,
          textShadow:"0 2px 4px rgba(0,0,0,0.6)",
          marginTop:1,
        }}>2026</div>
      </div>

      {/* Divider */}
      <div style={{
        height:1,
        background:`linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
        marginBottom: size === "L" ? 12 : 6,
        position:"relative",zIndex:2,
      }}/>

      {/* 4 Stats */}
      <div style={{
        flex:1,
        display:"flex",flexDirection:"column",justifyContent:"center",
        gap: size === "L" ? 12 : size === "M" ? 6 : 3,
        position:"relative",zIndex:2,
      }}>
        {[
          { lbl:"PAC", val: stats.pace, icon:"⚡" },
          { lbl:"SHO", val: stats.shooting, icon:"⚽" },
          { lbl:"PAS", val: stats.passing, icon:"🎯" },
          { lbl:"DEF", val: stats.defending, icon:"🛡️" },
        ].map(s => (
          <div key={s.lbl} style={{
            display:"flex",alignItems:"center",
            gap: size === "L" ? 8 : 4,
          }}>
            <div style={{
              fontSize: size === "L" ? 13 : size === "M" ? 9 : 7,
              fontWeight:900,
              color:"#fff",
              minWidth: size === "L" ? 30 : 22,
              letterSpacing:1,
              textShadow:"0 1px 2px rgba(0,0,0,0.5)",
            }}>{s.lbl}</div>
            <div style={{
              flex:1,height: size === "L" ? 8 : 5,
              background:"rgba(0,0,0,0.4)",
              borderRadius:4,overflow:"hidden",
              border:`1px solid ${cfg.color}55`,
            }}>
              <div style={{
                width: `${s.val}%`,
                height:"100%",
                background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color})`,
                boxShadow:`0 0 8px ${cfg.glow}`,
                transition:"width 0.6s ease-out",
              }}/>
            </div>
            <div style={{
              fontSize: size === "L" ? 14 : size === "M" ? 10 : 8,
              fontWeight:900,
              color:"#fff",
              minWidth: size === "L" ? 24 : 18,
              textAlign:"right",
              fontVariantNumeric:"tabular-nums",
              textShadow:"0 1px 3px rgba(0,0,0,0.7)",
            }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Footer: tap to flip hint */}
      {flippable && size === "L" && (
        <div style={{
          textAlign:"center",
          fontSize:9,color:"#fff",opacity:0.5,letterSpacing:2,
          marginTop:8,position:"relative",zIndex:2,
        }}>↻ TAP TO FLIP</div>
      )}
    </div>
  );

  // ─── FRONT SIDE ─────────────────────────────────────────────────────
  const renderFront = () => (
    <div style={{
      width: dims.w, height: dims.h,
      background: isGalaxy
        ? cfg.bgGrad
        : `radial-gradient(ellipse at center top, ${cfg.color}33 0%, transparent 60%), ${cfg.bgGrad}`,
      backgroundSize: "150% 150%",
      backgroundPosition: "center",
      border: `3px solid ${cfg.color}`,
      borderRadius: 14,
      padding: 0,
      display: "flex", flexDirection: "column",
      boxShadow: animated
        ? `0 0 30px ${cfg.glow}, 0 8px 24px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.4)`
        : `0 4px 12px rgba(0,0,0,0.3), inset 0 0 30px rgba(0,0,0,0.3)`,
      position: "relative",
      overflow: "hidden",
      backfaceVisibility: "hidden",
    }}>
      {isGalaxy && (
        <style>{`
          @keyframes galaxyRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes galaxyTwinkle {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      )}
      {/* 🌌 Slowly rotating conic gradient layer (no flicker) */}
      {isGalaxy && (
        <div style={{
          position:"absolute",
          inset: "-30%",
          background: cfg.bgGrad,
          animation: "galaxyRotate 20s linear infinite",
          pointerEvents:"none",
          zIndex: 0,
          willChange: "transform",
        }}/>
      )}
      {/* 🌌 Galaxy particles — opacity only, no scale (less GPU work) */}
      {isGalaxy && (
        <>
          {[
            {t:"10%",l:"15%",d:"0s"},
            {t:"25%",r:"8%",d:"0.4s"},
            {t:"60%",l:"8%",d:"0.8s"},
            {b:"18%",r:"18%",d:"1.2s"},
            {t:"70%",r:"10%",d:"1.6s"},
            {b:"30%",l:"22%",d:"0.2s"},
          ].map((p, i) => (
            <div key={i} style={{
              position:"absolute",
              top: p.t, left: p.l, right: p.r, bottom: p.b,
              width: size === "L" ? 4 : 3, height: size === "L" ? 4 : 3,
              background:"#fff",
              borderRadius:"50%",
              boxShadow:"0 0 6px #fff",
              animation: `galaxyTwinkle 2.5s ease-in-out infinite`,
              animationDelay: p.d,
              zIndex: 4,
              pointerEvents:"none",
              willChange: "opacity",
            }}/>
          ))}
          {/* Corner brackets — static, no animation */}
          {[
            {p:"tl",t:8,l:8,br:"none",bb:"none",br_radius:"8px 0 0 0"},
            {p:"tr",t:8,r:8,bl:"none",bb:"none",br_radius:"0 8px 0 0"},
            {p:"bl",b:8,l:8,br:"none",bt:"none",br_radius:"0 0 0 8px"},
            {p:"br",b:8,r:8,bl:"none",bt:"none",br_radius:"0 0 8px 0"},
          ].map((c, i) => (
            <div key={`c-${i}`} style={{
              position:"absolute",
              top: c.t, left: c.l, right: c.r, bottom: c.b,
              width: size === "L" ? 30 : 20, height: size === "L" ? 30 : 20,
              border: "2px solid rgba(255,255,255,0.6)",
              borderRight: c.br,
              borderBottom: c.bb,
              borderLeft: c.bl,
              borderTop: c.bt,
              borderRadius: c.br_radius,
              zIndex: 3,
              pointerEvents:"none",
            }}/>
          ))}
        </>
      )}      {/* 🏟️ Soccer pitch lines pattern (subtle) */}
      <div style={{
        position:"absolute",inset:0,
        background:`
          radial-gradient(circle at 50% 50%, transparent 0px, transparent 28px, rgba(255,255,255,0.05) 28px, rgba(255,255,255,0.05) 29px, transparent 29px),
          linear-gradient(180deg, transparent calc(50% - 0.5px), rgba(255,255,255,0.04) calc(50% - 0.5px), rgba(255,255,255,0.04) calc(50% + 0.5px), transparent calc(50% + 0.5px))
        `,
        pointerEvents:"none",
        zIndex:1,
      }}/>

      {/* Holographic stripe pattern */}
      <div style={{
        position:"absolute",inset:0,
        background:`repeating-linear-gradient(
          115deg,
          transparent 0px,
          transparent 10px,
          rgba(255,255,255,0.04) 10px,
          rgba(255,255,255,0.04) 11px
        )`,
        pointerEvents:"none",
        zIndex:1,
      }}/>

      {/* MUNDIALITO 2026 — banner at top center */}
      {size !== "S" && (
        <div style={{
          position:"absolute",
          top: size === "L" ? 8 : 5,
          left:"50%",
          transform:"translateX(-50%)",
          fontSize: size === "L" ? 8 : 6,
          color: cfg.color,
          opacity: 0.85,
          letterSpacing: size === "L" ? 3 : 1.5,
          fontWeight:900,
          pointerEvents:"none",
          zIndex:2,
          whiteSpace:"nowrap",
          textShadow:`0 0 6px ${cfg.glow}`,
        }}>🏆 MUNDIALITO 2026 🏆</div>
      )}

      {/* Corner FIFA-style decorations */}
      {size !== "S" && (
        <>
          <div style={{position:"absolute",top:6,left:6,width:14,height:14,borderTop:`2px solid ${cfg.color}aa`,borderLeft:`2px solid ${cfg.color}aa`,borderRadius:"3px 0 0 0",pointerEvents:"none",zIndex:2}}/>
          <div style={{position:"absolute",top:6,right:6,width:14,height:14,borderTop:`2px solid ${cfg.color}aa`,borderRight:`2px solid ${cfg.color}aa`,borderRadius:"0 3px 0 0",pointerEvents:"none",zIndex:2}}/>
          <div style={{position:"absolute",bottom:6,left:6,width:14,height:14,borderBottom:`2px solid ${cfg.color}aa`,borderLeft:`2px solid ${cfg.color}aa`,borderRadius:"0 0 0 3px",pointerEvents:"none",zIndex:2}}/>
          <div style={{position:"absolute",bottom:6,right:6,width:14,height:14,borderBottom:`2px solid ${cfg.color}aa`,borderRight:`2px solid ${cfg.color}aa`,borderRadius:"0 0 3px 0",pointerEvents:"none",zIndex:2}}/>
        </>
      )}

      {/* Diagonal shine streak */}
      <div style={{
        position:"absolute",
        top:0,left:"-40%",
        width:"45%",height:"100%",
        background:"linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
        pointerEvents:"none",
        zIndex:2,
      }}/>

      {/* Legendary sparkles */}
      {isLegendary && animated && (
        <>
          <div style={{position:"absolute",top:18,right:60,fontSize:14,animation:"sparkle 1.5s ease-in-out infinite",zIndex:4}}>✨</div>
          <div style={{position:"absolute",bottom:60,left:18,fontSize:14,animation:"sparkle 1.5s ease-in-out infinite 1s",zIndex:4}}>✨</div>
          <div style={{position:"absolute",bottom:60,right:18,fontSize:14,animation:"sparkle 1.5s ease-in-out infinite 0.7s",zIndex:4}}>✨</div>
        </>
      )}

      {/* 🟢 Legend sparkles — subtle */}
      {isLegend && animated && (
        <>
          <div style={{position:"absolute",top:18,right:60,fontSize:14,animation:"sparkle 1.8s ease-in-out infinite",zIndex:4}}>✨</div>
          <div style={{position:"absolute",bottom:60,left:18,fontSize:14,animation:"sparkle 1.8s ease-in-out infinite 1s",zIndex:4}}>✨</div>
        </>
      )}

      {/* HEADER: Rating + stars (left) | Rarity emoji (right) */}
      <div style={{
        display:"flex",alignItems:"flex-start",justifyContent:"space-between",
        padding: size === "L" ? "24px 12px 4px" : size === "M" ? "18px 8px 4px" : "5px 5px 3px",
        position:"relative",zIndex:3,
      }}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:3}}>
          <div style={{
            width: dims.rating, height: dims.rating,
            background: isPerfect
              ? "radial-gradient(circle at 30% 30%, #fde68a, #fbbf24, #92400e)"
              : `linear-gradient(135deg, rgba(0,0,0,0.55), rgba(0,0,0,0.75))`,
            border: `2px solid ${cfg.color}`,
            borderRadius: 8,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            boxShadow: isPerfect
              ? `0 0 16px #fbbf24, inset 0 -3px 6px rgba(0,0,0,0.3)`
              : `0 2px 4px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.3)`,
            lineHeight:1,
          }}>
            <div style={{
              fontSize: size === "L" ? 24 : size === "M" ? 15 : 11,
              fontWeight:900,
              color: isPerfect ? "#1e2940" : "#fff",
              textShadow: isPerfect ? "none" : "0 1px 2px rgba(0,0,0,0.5)",
              fontVariantNumeric:"tabular-nums",
              letterSpacing:-1,
            }}>{rating}</div>
            {size !== "S" && (
              <div style={{
                fontSize: size === "L" ? 8 : 6,
                color: isPerfect ? "#451a03" : "#cbd5e1",
                fontWeight:900,letterSpacing:1,
                marginTop:-2,
              }}>{posInfo.short}</div>
            )}
          </div>
          {size !== "S" && (
            <div style={{display:"flex",gap:1}}>
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{
                  fontSize: dims.star,
                  color: i < stars ? "#fde68a" : "rgba(255,255,255,0.25)",
                  filter: i < stars ? `drop-shadow(0 0 3px ${cfg.color})` : "none",
                }}>★</span>
              ))}
            </div>
          )}
        </div>

        <div style={{
          fontSize: size === "L" ? 22 : size === "M" ? 16 : 12,
          filter: animated ? `drop-shadow(0 0 8px ${cfg.glow})` : "none",
          marginTop:2,
        }}>{cfg.emoji}</div>
      </div>

      {/* FLAG in glowing circle */}
      <div style={{
        flex:1,
        display:"flex",alignItems:"center",justifyContent:"center",
        position:"relative",zIndex:3,
      }}>
        <div style={{
          width: dims.flag + (size === "L" ? 32 : size === "M" ? 18 : 10),
          height: dims.flag + (size === "L" ? 32 : size === "M" ? 18 : 10),
          borderRadius:"50%",
          background:`radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)`,
          border:`2px solid ${cfg.color}66`,
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow: animated
            ? `0 0 20px ${cfg.glow}, inset 0 0 20px rgba(0,0,0,0.3)`
            : `inset 0 0 12px rgba(0,0,0,0.3)`,
        }}>
          <div style={{
            fontSize: dims.flag,
            filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
          }}>{
            isFriend
              ? (variant === "lafamilia" || variant === "beitar" ? "🦁"
                : variant === "pokemon" ? "🔴"
                : variant === "maccabi_ta" ? "💛"
                : variant === "maccabi_haifa" ? "💚"
                : variant === "real_madrid" ? "👑"
                : "🇮🇱")
              : card.flag
          }</div>
        </div>
      </div>

      {/* 📊 GALAXY stats panel (PAC/SHO/PAS/DRI/DEF/PHY) */}
      {isGalaxy && card.galaxyStats && size !== "S" && (
        <div style={{
          margin: size === "L" ? "0 14px 6px" : "0 10px 4px",
          padding: size === "L" ? "8px 10px" : "5px 7px",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.15)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: size === "L" ? 14 : 8,
          rowGap: size === "L" ? 3 : 1,
          position: "relative",
          zIndex: 3,
        }}>
          {[
            { k: "PAC", v: card.galaxyStats.PAC },
            { k: "DRI", v: card.galaxyStats.DRI },
            { k: "SHO", v: card.galaxyStats.SHO },
            { k: "DEF", v: card.galaxyStats.DEF },
            { k: "PAS", v: card.galaxyStats.PAS },
            { k: "PHY", v: card.galaxyStats.PHY },
          ].map(s => (
            <div key={s.k} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              fontSize: size === "L" ? 11 : 8,
            }}>
              <span style={{color:"rgba(255,255,255,0.7)",fontWeight:600,letterSpacing:1}}>{s.k}</span>
              <span style={{color:"#fff",fontWeight:900,fontSize:size === "L" ? 13 : 9}}>{s.v}</span>
            </div>
          ))}
        </div>
      )}

      {/* PLAYER NAME + TEAM */}
      <div style={{
        padding: size === "L" ? "0 14px 6px" : size === "M" ? "0 10px 4px" : "0 6px 3px",
        textAlign:"center",
        position:"relative",zIndex:3,
      }}>
        <div style={{
          fontSize: dims.font, color:"#fff",fontWeight:900,lineHeight:1.15,
          textShadow:"0 2px 6px rgba(0,0,0,0.8)",
          marginBottom: 2,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
          letterSpacing:0.3,
        }}>
          {card.name}
        </div>
        <div style={{
          fontSize: size === "L" ? 9 : 7,
          color:"#fff",opacity:0.65,fontWeight:700,letterSpacing:1.5,
          textTransform:"uppercase",
        }}>
          {card.team}
        </div>
        {isGalaxy && (
          <div style={{
            fontSize: size === "L" ? 8 : 6,
            color: "#fff",
            fontWeight: 900,
            letterSpacing: 2,
            marginTop: 3,
            padding: size === "L" ? "2px 8px" : "1px 4px",
            background: "linear-gradient(90deg,#f0abfc,#c084fc,#818cf8)",
            color: "#1e1b4b",
            borderRadius: 10,
            display: "inline-block",
            boxShadow: "0 2px 8px rgba(192,132,252,0.5)",
          }}>
            🌌 TOP 25/26
          </div>
        )}
      </div>

      {/* FOOTER: Position */}
      <div style={{
        background:`linear-gradient(90deg, transparent 0%, ${posInfo.color}55 50%, transparent 100%)`,
        borderTop:`1px solid ${cfg.color}66`,
        padding: size === "L" ? "7px 14px" : size === "M" ? "4px 10px" : "3px 6px",
        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        position:"relative",zIndex:3,
      }}>
        <span style={{fontSize:size==="L"?16:size==="M"?12:10,filter:`drop-shadow(0 0 4px ${posInfo.color})`}}>{posInfo.icon}</span>
        <div style={{fontSize:dims.position,color:"#fff",fontWeight:900,letterSpacing:size==="L"?3:1.5}}>
          {size === "S" ? posInfo.short : posInfo.label}
        </div>
        <span style={{fontSize:size==="L"?16:size==="M"?12:10,filter:`drop-shadow(0 0 4px ${posInfo.color})`}}>{posInfo.icon}</span>
      </div>

      {/* Perfect 99 badge */}
      {isPerfect && (
        <div style={{
          position:"absolute",top:"44%",right:6,
          background:"linear-gradient(135deg,#fde68a,#fbbf24,#92400e)",
          color:"#1e2940",
          fontSize: size === "L" ? 9 : 7,
          fontWeight:900,letterSpacing:1,
          padding:"2px 6px",borderRadius:4,
          border:"1px solid #92400e",
          boxShadow:"0 0 8px #fbbf24",
          zIndex:5,
          transform:"rotate(8deg)",
        }}>PERFECT</div>
      )}
    </div>
  );

  // If not flippable, just return front
  if (!flippable) return renderFront();

  // Flippable wrapper with 3D flip
  return (
    <div
      onClick={(e) => { e.stopPropagation(); setFlipped(f => !f); }}
      style={{
        width: dims.w, height: dims.h,
        perspective: 1000,
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div style={{
        width:"100%",height:"100%",
        position:"relative",
        transformStyle:"preserve-3d",
        transition:"transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>
        <div style={{position:"absolute",inset:0}}>{renderFront()}</div>
        <div style={{position:"absolute",inset:0}}>{renderBack()}</div>
      </div>
    </div>
  );
}
function ConfettiBurst({ count = 40 }) {
  // Generate per-particle keyframes + props once
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 220 + Math.random() * 280;
      return {
        id: i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        rot: Math.random() * 1080,
        color: ["#fbbf24","#fde68a","#f59e0b","#ef4444","#a855f7","#22c55e","#3b82f6"][i % 7],
        round: i % 2 === 0,
        delay: Math.random() * 0.15,
      };
    });
  }, [count]);

  // Build a stylesheet of unique keyframes
  const css = particles.map(p => `
    @keyframes conf-${p.id} {
      0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
      100% { transform: translate(-50%, -50%) translate(${p.tx}px, ${p.ty}px) rotate(${p.rot}deg); opacity: 0; }
    }
  `).join("");

  return (
    <>
      <style>{css}</style>
      {particles.map(p => (
        <div key={p.id} style={{
          position:"fixed",
          top:"50%",left:"50%",
          width:12,height:12,
          background:p.color,
          borderRadius: p.round ? "50%" : "2px",
          animation:`conf-${p.id} 2s cubic-bezier(0.2, 0.6, 0.3, 1) forwards ${p.delay}s`,
          pointerEvents:"none",
          zIndex:9504,
        }}/>
      ))}
    </>
  );
}

// 🎬 SUNDAY WRAPPED — Spotify-Wrapped-style weekly recap
// 🎬 SUNDAY WRAPPED — single-screen weekly recap card
function WrappedModal({ stats, onClose }) {
  const t = useT();

  const handleShare = () => {
    const text = `🎬 השבוע שלי ב-Mundialito 2026:\n📊 ${stats.totalPicks} ניחושים\n🎯 ${stats.exactCount} מדויקים\n✅ ${stats.winnerCount} מנצח נכון\n\nתצטרפו אליי!`;
    if (navigator.share) {
      navigator.share({ text }).catch(()=>{});
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  const StatBox = ({ emoji, label, value, color }) => (
    <div style={{
      background:"rgba(255,255,255,0.08)",
      border:"1px solid rgba(255,255,255,0.12)",
      borderRadius:12,
      padding:"14px 10px",
      textAlign:"center",
      backdropFilter:"blur(10px)",
    }}>
      <div style={{fontSize:24,marginBottom:4}}>{emoji}</div>
      <div style={{
        fontSize:26,fontWeight:900,color: color || "#fff",
        lineHeight:1,fontVariantNumeric:"tabular-nums",
        textShadow:"0 2px 8px rgba(0,0,0,0.3)",
      }}>{value}</div>
      <div style={{
        fontSize:9,color:"rgba(255,255,255,0.7)",
        letterSpacing:1.5,fontWeight:700,marginTop:6,
      }}>{label}</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9600,
      background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:14,animation:"goalFadeIn 0.3s ease-out",
    }}>
      <style>{`
        @keyframes wrappedSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes statPop {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth:420,width:"100%",maxHeight:"95vh",overflowY:"auto",
        background:"linear-gradient(160deg,#0a0a0a 0%,#1a1a1a 50%,#0f0f0f 100%)",
        borderRadius:20,
        padding:"24px 18px 20px",
        boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 60px rgba(251,191,36,0.15)",
        animation:"wrappedSlideIn 0.5s cubic-bezier(0.2,0.7,0.3,1)",
        position:"relative",
        border:"1px solid rgba(251,191,36,0.35)",
        overflow:"hidden",
      }}>
        {/* Gold spotlight at top */}
        <div style={{
          position:"absolute",
          top:0,left:"50%",
          transform:"translateX(-50%)",
          width:"160%",height:180,
          background:"radial-gradient(ellipse at center top, rgba(251,191,36,0.25) 0%, rgba(251,191,36,0.08) 35%, transparent 65%)",
          pointerEvents:"none",
        }}/>
        {/* Thin gold accent line under header */}
        <div style={{
          position:"absolute",
          top:90,left:"25%",right:"25%",
          height:1,
          background:"linear-gradient(90deg,transparent,rgba(251,191,36,0.5),transparent)",
          pointerEvents:"none",
        }}/>
        {/* Close X */}
        <button onClick={onClose} style={{
          position:"absolute",top:12,right:12,
          background:"rgba(0,0,0,0.3)",border:"none",
          color:"#fff",fontSize:18,
          width:30,height:30,borderRadius:15,
          cursor:"pointer",fontFamily:"inherit",
        }}>✕</button>

        <div style={{position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:42,marginBottom:6}}>🏆</div>
          <div style={{
            fontSize:11,color:"rgba(251,191,36,0.95)",
            letterSpacing:3,fontWeight:800,marginBottom:4,
          }}>{t("wrapped.title")}</div>
          <div style={{
            fontSize:22,fontWeight:900,color:"#fff",
            textShadow:"0 2px 10px rgba(0,0,0,0.4)",
          }}>{stats.name}</div>
        </div>

        {/* Stats grid 2x2 */}
        <div style={{
          display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
          gap:8,marginBottom:14,
        }}>
          <StatBox emoji="📊" label={t("wrapped.predictionsTitle")} value={stats.totalPicks} />
          <StatBox emoji="🎯" label={t("wrapped.exactTitle")} value={stats.exactCount} color="#fbbf24" />
          <StatBox emoji="✅" label={t("wrapped.winnersTitle")} value={stats.winnerCount} color="#22c55e" />
        </div>

        {/* Quote */}
        <div style={{
          textAlign:"center",
          fontSize:16,fontWeight:800,color:"#fff",
          marginBottom:16,padding:"0 10px",
          textShadow:"0 2px 8px rgba(0,0,0,0.3)",
        }}>{stats.quote}</div>

        {/* Share button */}
        <button onClick={handleShare} style={{
          width:"100%",
          padding:"13px 18px",
          background:"linear-gradient(135deg,#fbbf24,#d97706)",
          color:"#0a0a0a",
          border:"none",borderRadius:12,
          fontSize:14,fontWeight:900,letterSpacing:1,
          cursor:"pointer",fontFamily:"inherit",
          boxShadow:"0 8px 24px rgba(0,0,0,0.5), 0 0 30px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}>📤 {t("wrapped.shareBtn")}</button>
        </div>
      </div>
    </div>
  );
}


// 👑 LEAGUE ADMIN — view members + share backup with them
function LeagueAdminModal({ leagueData, leagueCode, onClose }) {
  const t = useT();
  const { lang } = useContext(LangContext);
  const [selectedMember, setSelectedMember] = useState(null);

  const members = leagueData?.members ? Object.entries(leagueData.members) : [];
  // Compute simple stats per member
  const memberStats = members.map(([uid, m]) => {
    const picks = m.picks || {};
    const totalPicks = Object.keys(picks).filter(k => picks[k]?.h !== "" && picks[k]?.h !== undefined).length;
    const cardCount = Object.values(m.cardCollection || {}).reduce((a,b)=>a+b, 0);
    return {
      uid,
      name: m.name || "Unknown",
      totalPicks,
      coinBalance: m.coinBalance || 0,
      cardCount,
      achievements: (m.unlockedAchievements || []).length,
      raw: m,
    };
  }).sort((a, b) => b.totalPicks - a.totalPicks);

  const handleShareBackup = (member) => {
    const data = {
      version: "wc2026-backup-v1",
      leagueCode,
      name: member.name,
      userId: member.uid,
      ...member.raw,
    };
    const text = `🛡️ גיבוי של ${member.name} ב-Mundialito 2026\n\nשמור את הקוד הזה:\n\n${JSON.stringify(data)}\n\n📥 לשחזור: היכנס לאפליקציה → תפריט → "Backup My Progress" → "שחזר"`;
    if (navigator.share) {
      navigator.share({ text }).catch(()=>{});
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  const [removingUid, setRemovingUid] = useState(null);
  const handleRemove = async (member) => {
    const ok = confirm(`להסיר את ${member.name} מהליגה?\n\nהפעולה לא הפיכה — כל הניחושים והנתונים שלו יימחקו מהליגה.`);
    if (!ok) return;
    setRemovingUid(member.uid);
    try {
      await leaveLeague(leagueCode, member.uid);
    } catch (err) {
      alert("שגיאה: " + (err.message || "נסה שוב"));
    }
    setRemovingUid(null);
  };

  const [sendingTicketUid, setSendingTicketUid] = useState(null);
  const handleSendTicket = async (member) => {
    setSendingTicketUid(member.uid);
    try {
      await sendGiftToLeague(leagueCode, {
        id: `tk_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        kind: "scratch",
        amount: 1,
        targetUid: member.uid,
        reason: "🎴 משחק גבוה או נמוך ממך!",
        sentAt: Date.now(),
      });
      alert(`✅ נשלח משחק גבוה או נמוך ל-${member.name}`);
    } catch (err) {
      alert("שגיאה: " + (err.message || "נסה שוב"));
    }
    setSendingTicketUid(null);
  };

  const [sendingCoinWheelUid, setSendingCoinWheelUid] = useState(null);
  const handleSendCoinWheel = async (member) => {
    setSendingCoinWheelUid(member.uid);
    try {
      await sendGiftToLeague(leagueCode, {
        id: `cw_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        kind: "coinwheel",
        amount: 1,
        targetUid: member.uid,
        reason: "🪙 גלגל הגורל ממך!",
        sentAt: Date.now(),
      });
      alert(`✅ נשלח גלגל הגורל ל-${member.name}`);
    } catch (err) {
      alert("שגיאה: " + (err.message || "נסה שוב"));
    }
    setSendingCoinWheelUid(null);
  };

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9200,
      background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:14,animation:"goalFadeIn 0.25s ease-out",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth:500,width:"100%",maxHeight:"90vh",overflowY:"auto",
        background:"linear-gradient(160deg,#243150,#1f2942)",
        border:"1px solid rgba(168,85,247,0.4)",
        borderRadius:14,padding:"18px 16px",
        boxShadow:"0 20px 60px rgba(168,85,247,0.3)",
      }}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:10,color:"#a855f7",letterSpacing:2,fontWeight:700}}>
              👑 {t("admin.title")}
            </div>
            <div style={{fontSize:18,fontWeight:900,color:"#fff",marginTop:2}}>
              {leagueData?.name || leagueCode}
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"transparent",border:"none",color:"#94a3b8",fontSize:20,
            cursor:"pointer",fontFamily:"inherit",padding:0,
          }}>✕</button>
        </div>

        {/* Info banner */}
        <div style={{
          background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.25)",
          borderRadius:10,padding:"10px 12px",marginBottom:14,
          fontSize:11,color:"#c4b5fd",lineHeight:1.5,
        }}>
          💡 {t("admin.info")}
        </div>

        {/* Member list */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {memberStats.map(m => (
            <div key={m.uid} style={{
              background:"rgba(15,23,42,0.5)",
              border:"1px solid rgba(71,85,105,0.3)",
              borderRadius:10,padding:"12px",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>
                  🟢 {m.name}
                </div>
                <div style={{fontSize:9,color:"#64748b",fontFamily:"monospace"}}>
                  {m.uid.substring(0, 8)}...
                </div>
              </div>
              <div style={{
                display:"grid",gridTemplateColumns:"repeat(4, 1fr)",
                gap:6,marginBottom:10,
              }}>
                <div style={{textAlign:"center",padding:"4px 2px",background:"rgba(36,49,80,0.5)",borderRadius:6}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#22c55e"}}>{m.totalPicks}</div>
                  <div style={{fontSize:8,color:"#64748b"}}>{t("admin.picks")}</div>
                </div>
                <div style={{textAlign:"center",padding:"4px 2px",background:"rgba(36,49,80,0.5)",borderRadius:6}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#fbbf24"}}>{m.coinBalance}</div>
                  <div style={{fontSize:8,color:"#64748b"}}>{t("admin.coins")}</div>
                </div>
                <div style={{textAlign:"center",padding:"4px 2px",background:"rgba(36,49,80,0.5)",borderRadius:6}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#3b82f6"}}>{m.cardCount}</div>
                  <div style={{fontSize:8,color:"#64748b"}}>{t("admin.cards")}</div>
                </div>
                <div style={{textAlign:"center",padding:"4px 2px",background:"rgba(36,49,80,0.5)",borderRadius:6}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#a855f7"}}>{m.achievements}</div>
                  <div style={{fontSize:8,color:"#64748b"}}>{t("admin.badges")}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={() => handleShareBackup(m)} style={{
                  flex:1,minWidth:"45%",padding:"7px 10px",
                  background:"linear-gradient(180deg,rgba(168,85,247,0.2),rgba(168,85,247,0.1))",
                  border:"1px solid rgba(168,85,247,0.4)",
                  borderRadius:8,
                  color:"#c4b5fd",fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",
                }}>
                  📤 {t("admin.shareBackup")}
                </button>
                <button
                  onClick={() => handleSendTicket(m)}
                  disabled={sendingTicketUid === m.uid}
                  style={{
                    flex:1,minWidth:"45%",padding:"7px 10px",
                    background:"linear-gradient(180deg,rgba(251,191,36,0.2),rgba(251,191,36,0.1))",
                    border:"1px solid rgba(251,191,36,0.4)",
                    borderRadius:8,
                    color:"#fbbf24",fontSize:11,fontWeight:700,
                    cursor: sendingTicketUid === m.uid ? "wait" : "pointer",
                    fontFamily:"inherit",
                    opacity: sendingTicketUid === m.uid ? 0.5 : 1,
                  }}>
                  {sendingTicketUid === m.uid ? "..." : "🎴 גבוה או נמוך"}
                </button>
                <button
                  onClick={() => handleSendCoinWheel(m)}
                  disabled={sendingCoinWheelUid === m.uid}
                  style={{
                    flex:1,minWidth:"45%",padding:"7px 10px",
                    background:"linear-gradient(180deg,rgba(236,72,153,0.2),rgba(236,72,153,0.1))",
                    border:"1px solid rgba(236,72,153,0.4)",
                    borderRadius:8,
                    color:"#ec4899",fontSize:11,fontWeight:700,
                    cursor: sendingCoinWheelUid === m.uid ? "wait" : "pointer",
                    fontFamily:"inherit",
                    opacity: sendingCoinWheelUid === m.uid ? 0.5 : 1,
                  }}>
                  {sendingCoinWheelUid === m.uid ? "..." : "🪙 גלגל הגורל"}
                </button>
                <button
                  onClick={() => handleRemove(m)}
                  disabled={removingUid === m.uid}
                  style={{
                    padding:"7px 12px",
                    background:"linear-gradient(180deg,rgba(239,68,68,0.2),rgba(239,68,68,0.1))",
                    border:"1px solid rgba(239,68,68,0.4)",
                    borderRadius:8,
                    color:"#fca5a5",fontSize:11,fontWeight:700,
                    cursor: removingUid === m.uid ? "wait" : "pointer",
                    fontFamily:"inherit",
                    opacity: removingUid === m.uid ? 0.5 : 1,
                  }}>
                  {removingUid === m.uid ? "..." : "🗑️"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {memberStats.length === 0 && (
          <div style={{textAlign:"center",padding:30,color:"#64748b",fontSize:12}}>
            {t("admin.noMembers")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 🎡 LUCKY WHEEL — daily spin for coins or cards ───────────────────────────
const WHEEL_PRIZES = [
  { id: "c100",  type: "coins",  amount: 100,  weight: 25, label: "100 🪙",  color: "#94a3b8" },
  { id: "c300",  type: "coins",  amount: 300,  weight: 20, label: "300 🪙",  color: "#60a5fa" },
  { id: "c600",  type: "coins",  amount: 600,  weight: 15, label: "600 🪙",  color: "#3b82f6" },
  { id: "common",type: "card",   rarity: "C",  weight: 12, label: "⚪ Common", color: "#cbd5e1" },
  { id: "c1500", type: "coins",  amount: 1500, weight: 10, label: "1500 🪙", color: "#22c55e" },
  { id: "unc",   type: "card",   rarity: "U",  weight: 8,  label: "💧 Uncommon", color: "#06b6d4" },
  { id: "c3000", type: "coins",  amount: 3000, weight: 5,  label: "3000 🪙", color: "#16a34a" },
  { id: "rare",  type: "card",   rarity: "R",  weight: 3,  label: "🔥 Rare",  color: "#ef4444" },
  { id: "epic",  type: "card",   rarity: "E",  weight: 1.5,label: "💎 Epic",  color: "#a855f7" },
  { id: "legen", type: "card",   rarity: "L",  weight: 0.5,label: "🏆 LEGENDARY", color: "#fbbf24" },
];

function pickWheelPrize() {
  const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const p of WHEEL_PRIZES) {
    roll -= p.weight;
    if (roll <= 0) return p;
  }
  return WHEEL_PRIZES[0];
}

function WheelSpinner({ targetRotation, prizes, segmentAngle, coinSide }) {
  const [currentRot, setCurrentRot] = useState(0);
  useEffect(() => {
    setCurrentRot(0);
    // Use double rAF + small delay to ensure browser has painted at 0 before transition starts
    const timer = setTimeout(() => {
      setCurrentRot(targetRotation);
    }, 50);
    return () => clearTimeout(timer);
  }, [targetRotation]);

  return (
    <svg width="280" height="280" viewBox="0 0 280 280" style={{
      display:"block",
      transform:`rotate(${currentRot}deg)`,
      transition: "transform 4.5s cubic-bezier(0.17, 0.67, 0.16, 1.01)",
      filter: `drop-shadow(0 0 20px ${coinSide === "good" ? "rgba(251,191,36,0.5)" : "rgba(239,68,68,0.5)"})`,
    }}>
      {prizes.map((p, i) => {
        const startAngle = (i * segmentAngle) - 90;
        const endAngle = startAngle + segmentAngle;
        const startRad = startAngle * Math.PI / 180;
        const endRad = endAngle * Math.PI / 180;
        const r = 135, cx = 140, cy = 140;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
        const midAngle = startAngle + segmentAngle / 2;
        const midRad = midAngle * Math.PI / 180;
        const textR = 88;
        const tx = cx + textR * Math.cos(midRad);
        const ty = cy + textR * Math.sin(midRad);
        const emojiR = 60;
        const ex = cx + emojiR * Math.cos(midRad);
        const ey = cy + emojiR * Math.sin(midRad);
        const textRot = midAngle + 90;
        return (
          <g key={p.id}>
            <path d={pathD} fill={p.color} stroke="#0f172a" strokeWidth="2"/>
            <text x={ex} y={ey} fontSize="22" textAnchor="middle" dominantBaseline="middle">
              {p.emoji}
            </text>
            <text
              x={tx} y={ty}
              fill="#fff"
              fontSize="9"
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${textRot} ${tx} ${ty})`}
            >{p.label}</text>
          </g>
        );
      })}
      <circle cx="140" cy="140" r="138" fill="none" stroke={coinSide === "good" ? "#fbbf24" : "#ef4444"} strokeWidth="4"/>
    </svg>
  );
}

function CoinSpinner({ targetRotation }) {
  const [currentRot, setCurrentRot] = useState(0);
  useEffect(() => {
    setCurrentRot(0);
    const timer = setTimeout(() => {
      setCurrentRot(targetRotation);
    }, 50);
    return () => clearTimeout(timer);
  }, [targetRotation]);

  return (
    <div style={{
      width:120,height:120,
      transformStyle:"preserve-3d",
      transition:"transform 2.4s cubic-bezier(0.4,0,0.2,1)",
      transform: `rotateY(${currentRot}deg)`,
      position:"relative",
    }}>
      {/* Good side */}
      <div style={{
        position:"absolute",inset:0,
        borderRadius:"50%",
        background:"linear-gradient(135deg,#fbbf24,#d97706)",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:60,
        boxShadow:"0 8px 24px rgba(251,191,36,0.6), inset 0 -4px 12px rgba(0,0,0,0.2)",
        backfaceVisibility:"hidden",
        border:"3px solid #fde047",
      }}>✨</div>
      {/* Bad side */}
      <div style={{
        position:"absolute",inset:0,
        borderRadius:"50%",
        background:"linear-gradient(135deg,#7f1d1d,#dc2626)",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:60,
        boxShadow:"0 8px 24px rgba(239,68,68,0.6), inset 0 -4px 12px rgba(0,0,0,0.2)",
        backfaceVisibility:"hidden",
        transform:"rotateY(180deg)",
        border:"3px solid #fca5a5",
      }}>💀</div>
    </div>
  );
}

// ─── 🪙 COIN FLIP + WHEEL — twice per day, 60% good wheel / 40% bad wheel ─────
const GOOD_WHEEL_PRIZES = [
  { id: "c100",   type: "coins",    amount: 100,  weight: 15, label: "100",    color: "#94a3b8", emoji: "🪙" },
  { id: "c500",   type: "coins",    amount: 500,  weight: 13, label: "500",    color: "#60a5fa", emoji: "🪙" },
  { id: "c1500",  type: "coins",    amount: 1500, weight: 7,  label: "1500",   color: "#22c55e", emoji: "🪙" },
  { id: "c5000",  type: "coins",    amount: 5000, weight: 3,  label: "5000",   color: "#a855f7", emoji: "🪙" },
  { id: "rare",   type: "card",     rarity: "R",  weight: 18, label: "Rare",   color: "#ef4444", emoji: "🔥" },
  { id: "epic",   type: "card",     rarity: "E",  weight: 13, label: "Epic",   color: "#22c55e", emoji: "💎" },
  { id: "legen",  type: "card",     rarity: "L",  weight: 5,  label: "LEGEND", color: "#fbbf24", emoji: "🏆" },
  { id: "friend", type: "card",     rarity: "F",  weight: 5,  label: "FRIEND", color: "#ec4899", emoji: "🎴" },
  { id: "again",  type: "again",    weight: 21, label: "סובב שוב!", color: "#fbbf24", emoji: "🔄" },
];

const BAD_WHEEL_PRIZES = [
  { id: "nothing", type: "nothing",    weight: 25, label: "כלום!",  color: "#475569", emoji: "😵" },
  { id: "p100",    type: "penalty",    amount: 100,  weight: 18, label: "-100",   color: "#7f1d1d", emoji: "💸" },
  { id: "p500",    type: "penalty",    amount: 500,  weight: 12, label: "-500",   color: "#dc2626", emoji: "💸" },
  { id: "p1500",   type: "penalty",    amount: 1500, weight: 5,  label: "-1500",  color: "#7f1d1d", emoji: "💀" },
  { id: "trash",   type: "trash",      weight: 14, label: "🇮🇱 ישראלי", color: "#a16207", emoji: "🗑️" },
  { id: "stealE",  type: "steal",      tier: "E",  weight: 8,  label: "Epic נגנב", color: "#7c3aed", emoji: "💔" },
  { id: "stealL",  type: "steal",      tier: "L",  weight: 2,  label: "LEGEND נגנב", color: "#92400e", emoji: "🏆💀" },
  { id: "again",   type: "again",      weight: 16, label: "סובב שוב!", color: "#fbbf24", emoji: "🔄" },
];

function pickFromWheel(prizes) {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const p of prizes) {
    roll -= p.weight;
    if (roll <= 0) return p;
  }
  return prizes[0];
}

// Sound helpers for coin wheel — use Web Audio API for simple tones
function playCoinClick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.07);
    setTimeout(() => ctx.close(), 200);
  } catch {}
}

function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close(), 700);
  } catch {}
}

function playBoom() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

function CountdownTimer({ targetTs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetTs) {
    return (
      <div style={{padding:"40px 20px"}}>
        <div style={{fontSize:60,marginBottom:14,opacity:0.5}}>⏰</div>
        <div style={{fontSize:14,color:"#cbd5e1",lineHeight:1.5}}>
          חזור מחר לזריקות נוספות!
        </div>
      </div>
    );
  }
  const diff = Math.max(0, targetTs - now);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div style={{padding:"30px 20px"}}>
      <div style={{fontSize:60,marginBottom:14,opacity:0.7}}>⏰</div>
      <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.5,marginBottom:18}}>
        ניצלת את שני הזריקות היומיות!<br/>
        זריקה חדשה זמינה ב...
      </div>
      <div style={{
        display:"flex",justifyContent:"center",gap:8,marginBottom:6,
      }}>
        {[
          { label:"שעות", val: pad(hours) },
          { label:"דקות", val: pad(minutes) },
          { label:"שניות", val: pad(seconds) },
        ].map((t, i) => (
          <div key={i} style={{
            background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid rgba(251,191,36,0.4)",
            borderRadius:10,padding:"10px 14px",
            minWidth:60,
          }}>
            <div style={{
              fontSize:24,fontWeight:900,color:"#fbbf24",
              fontVariantNumeric:"tabular-nums",lineHeight:1,
            }}>{t.val}</div>
            <div style={{fontSize:9,color:"#94a3b8",marginTop:2}}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoinFlipWheelModal({ onClose, isAvailable, coinBalance, cardCollection, onApplyPrize, onConsumeSpin, nextAvailableTs, playsLeft }) {
  // 📊 History tracking
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wc2026_coinwheel_history_v1") || "{}");
    } catch { return {}; }
  });
  const recordHistory = (key, val = 1) => {
    setHistory(prev => {
      const updated = { ...prev, [key]: (prev[key] || 0) + val };
      try { localStorage.setItem("wc2026_coinwheel_history_v1", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Deferred action to run when user closes the prize popup
  const deferredCloseAction = useRef(null);

  // 🧪 Beta testing removed in v3.27.0 — feature is now live for everyone

  // Stages: "idle" → "flipping" → "wheelSpinning" → "result"
  const [stage, setStage] = useState("idle");
  const [freeAgain, setFreeAgain] = useState(false); // skip play consume on the next flip
  const [coinSide, setCoinSide] = useState(null); // "good" or "bad"
  const [coinRotation, setCoinRotation] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [prize, setPrize] = useState(null);
  const [resultMessage, setResultMessage] = useState("");

  const currentWheelPrizes = coinSide === "good" ? GOOD_WHEEL_PRIZES : BAD_WHEEL_PRIZES;
  const segmentAngle = 360 / currentWheelPrizes.length;

  const flipCoin = () => {
    if (!isAvailable && !freeAgain) return;
    if (freeAgain) {
      setFreeAgain(false); // consume the freebie
    } else {
      onConsumeSpin(); // mark used (extra spin or daily play)
    }
    setStage("flipping");
    setPrize(null);
    setResultMessage("");
    // 60% good, 40% bad
    const isGood = Math.random() < 0.60;
    const newSide = isGood ? "good" : "bad";
    setCoinSide(newSide);
    // Spin coin 8 full rotations + land on side
    const finalRot = 360 * 8 + (newSide === "good" ? 0 : 180);
    setCoinRotation(finalRot);
    setTimeout(() => {
      // Coin landed — wait for user to spin the wheel
      setStage("coinLanded");
    }, 2500);
  };

  const handleSpinWheel = () => {
    spinWheel(coinSide);
  };

  const spinWheel = (side) => {
    setStage("wheelSpinning");
    const prizes = side === "good" ? GOOD_WHEEL_PRIZES : BAD_WHEEL_PRIZES;
    const localSegAngle = 360 / prizes.length;
    const selectedPrize = pickFromWheel(prizes);
    const prizeIdx = prizes.findIndex(p => p.id === selectedPrize.id);
    const targetOffset = -(prizeIdx * localSegAngle + localSegAngle / 2);
    setWheelRotation(360 * 6 + targetOffset);
    setTimeout(() => {
      setPrize(selectedPrize);
      // If it's "again" — go back to idle stage with a free re-flip
      if (selectedPrize.type === "again") {
        setTimeout(() => {
          setStage("idle");
          setPrize(null);
          setCoinSide(null);
          setWheelRotation(0);
          setCoinRotation(0);
          setFreeAgain(true); // next flip won't consume a play
        }, 1500);
        return;
      }
      // Apply the prize
      const result = onApplyPrize(selectedPrize);
      // Support both string and {message, deferred} returns
      if (typeof result === "object" && result.deferred) {
        setResultMessage(result.message);
        deferredCloseAction.current = result.deferred;
      } else {
        setResultMessage(typeof result === "string" ? result : result?.message || "");
        deferredCloseAction.current = null;
      }
      setStage("result");
      // Record history
      recordHistory("totalPlays");
      if (side === "good") recordHistory("goodWins");
      else recordHistory("badLosses");
      if (selectedPrize.type === "coins") {
        recordHistory("coinsWon", selectedPrize.amount);
        recordHistory("biggestWin", Math.max(history.biggestWin || 0, selectedPrize.amount));
      } else if (selectedPrize.type === "penalty") {
        recordHistory("coinsLost", selectedPrize.amount);
      } else if (selectedPrize.type === "card") {
        recordHistory("cardsWon");
        if (selectedPrize.rarity === "L") recordHistory("legendariesWon");
      } else if (selectedPrize.type === "steal") {
        recordHistory("cardsStolen");
      }
      try { navigator.vibrate?.([40, 60, 100]); } catch {}
    }, 4500);
  };

  const close = () => {
    // After a result, reset to idle so user sees the coin screen again
    if (stage === "result") {
      // Run any deferred action (like opening the roulette for a stolen/won card)
      const deferred = deferredCloseAction.current;
      deferredCloseAction.current = null;
      if (deferred) {
        // Don't reset to idle — the deferred action takes over
        deferred();
        return;
      }
      setStage("idle");
      setPrize(null);
      setCoinSide(null);
      setCoinRotation(0);
      setWheelRotation(0);
      setResultMessage("");
      return;
    }
    onClose();
  };

  return (
    <div onClick={close} style={{
      position:"fixed",inset:0,
      background: coinSide === "bad"
        ? "radial-gradient(circle at center, rgba(127,29,29,0.4), rgba(7,13,30,0.97))"
        : coinSide === "good"
        ? "radial-gradient(circle at center, rgba(34,197,94,0.2), rgba(7,13,30,0.97))"
        : "rgba(7,13,30,0.96)",
      transition:"background 0.6s ease",
      zIndex:9999,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"20px 14px",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        maxWidth:420,width:"100%",
        background:"linear-gradient(160deg,#1e293b,#0f172a)",
        borderRadius:20,padding:"22px 16px",
        border:`2px solid ${coinSide === "bad" ? "rgba(239,68,68,0.5)" : "rgba(251,191,36,0.4)"}`,
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
        textAlign:"center",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:18,fontWeight:900,color:"#fbbf24"}}>🪙 גלגל הגורל</div>
          <button onClick={close} style={{background:"transparent",border:"none",color:"#cbd5e1",fontSize:24,cursor:"pointer"}}>✕</button>
        </div>

        {!isAvailable && !freeAgain && stage === "idle" ? (
          <CountdownTimer targetTs={nextAvailableTs} />
        ) : stage === "idle" ? (
          <>
            <div style={{fontSize:48,marginBottom:14}}>🪙</div>
            <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.6,marginBottom:14,padding:"0 8px"}}>
              <b>זריקת מטבע + גלגל</b><br/>
              <span style={{fontSize:11,color:"#94a3b8"}}>
                ⚪ 60% גלגל טוב · ⚫ 40% גלגל רע<br/>
                💀 הזהר — בגלגל הרע יש עונשים!
              </span>
            </div>
            <div style={{
              background:"rgba(251,191,36,0.1)",
              border:"1px solid rgba(251,191,36,0.4)",
              borderRadius:8,padding:"6px 10px",marginBottom:14,
              fontSize:11,color:"#fbbf24",
            }}>
              {freeAgain ? "🔄 זריקה חינמית! (סובב שוב)" : `🎯 נותרו ${playsLeft} זריקות היום`}
            </div>

            {/* 📊 Personal history */}
            {(history.totalPlays || 0) > 0 && (
              <div style={{
                background:"rgba(15,23,42,0.7)",
                border:"1px solid rgba(71,85,105,0.4)",
                borderRadius:10,padding:"10px 12px",marginBottom:14,
                fontSize:11,color:"#cbd5e1",
              }}>
                <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:6,fontWeight:800}}>📊 הסטטיסטיקה שלך</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:4,textAlign:"right"}}>
                  <div>🎯 משחקים: <b>{history.totalPlays || 0}</b></div>
                  <div>🎉 ניצחונות: <b style={{color:"#22c55e"}}>{history.goodWins || 0}</b></div>
                  <div>💔 הפסדים: <b style={{color:"#ef4444"}}>{history.badLosses || 0}</b></div>
                  <div>🎴 קלפים: <b style={{color:"#a855f7"}}>{history.cardsWon || 0}</b></div>
                  <div>🏆 LEGEND: <b style={{color:"#fbbf24"}}>{history.legendariesWon || 0}</b></div>
                  <div>🪙 שיא: <b style={{color:"#22c55e"}}>{history.biggestWin || 0}</b></div>
                </div>
              </div>
            )}
            <button onClick={flipCoin} style={{
              width:"100%",padding:"14px",borderRadius:12,
              background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
              color:"#1e2940",border:"none",
              fontSize:15,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
              boxShadow:"0 8px 24px rgba(251,191,36,0.4)",
            }}>🪙 זרוק את המטבע!</button>
          </>
        ) : stage === "flipping" || stage === "coinLanded" ? (
          <>
            <style>{`
              @keyframes coinPulseText {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
              }
              @keyframes screenShake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translate(-2px, 1px); }
                40% { transform: translate(2px, -1px); }
                60% { transform: translate(-1px, 2px); }
                80% { transform: translate(1px, -2px); }
              }
              @keyframes coinLandFlash {
                0% { opacity: 0; }
                30% { opacity: 1; }
                100% { opacity: 0; }
              }
              @keyframes wheelSpinShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translate(-1px, 0.5px); }
                50% { transform: translate(1px, -0.5px); }
                75% { transform: translate(-0.5px, 1px); }
              }
            `}</style>
            <div style={{
              margin:"30px auto",height:140,perspective:"800px",
              display:"flex",alignItems:"center",justifyContent:"center",
              animation: stage === "flipping" ? "screenShake 0.15s ease-in-out infinite" : "none",
            }}>
              <CoinSpinner targetRotation={coinRotation} />
            </div>
            {stage === "flipping" ? (
              <div style={{
                fontSize:18,fontWeight:900,color:"#fbbf24",
                animation:"coinPulseText 0.6s ease-in-out infinite",
              }}>זרוק... 🤞</div>
            ) : (
              <>
                {/* 🎬 Dramatic flash overlay when coin lands */}
                <div style={{
                  position:"absolute",inset:0,
                  background: coinSide === "good"
                    ? "radial-gradient(circle at center, rgba(34,197,94,0.4), transparent 70%)"
                    : "radial-gradient(circle at center, rgba(239,68,68,0.4), transparent 70%)",
                  animation:"coinLandFlash 1.2s ease-out",
                  pointerEvents:"none",
                  borderRadius:20,
                }}/>
                <div style={{
                  fontSize:22,fontWeight:900,
                  color: coinSide === "good" ? "#22c55e" : "#ef4444",
                  marginBottom:14,
                  textShadow:`0 0 20px ${coinSide === "good" ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.8)"}`,
                  animation:"coinPulseText 1s ease-in-out infinite",
                }}>
                  {coinSide === "good" ? "✨ נחת על הטוב!" : "💀 נחת על הרע!"}
                </div>
                <button onClick={handleSpinWheel} style={{
                  width:"100%",padding:"14px",borderRadius:12,
                  background: coinSide === "good"
                    ? "linear-gradient(135deg,#22c55e,#16a34a)"
                    : "linear-gradient(135deg,#ef4444,#dc2626)",
                  color:"#fff",border:"none",
                  fontSize:15,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
                  boxShadow:`0 8px 24px ${coinSide === "good" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                }}>🎡 סובב גלגל!</button>
              </>
            )}
          </>
        ) : stage === "wheelSpinning" || (stage === "result" && prize) ? (
          <>
            <div style={{
              fontSize:14,fontWeight:900,marginBottom:10,
              color: coinSide === "good" ? "#22c55e" : "#ef4444",
            }}>
              {coinSide === "good" ? "✨ גלגל טוב!" : "💀 גלגל רע!"}
            </div>
            {/* Wheel */}
            <div style={{
              position:"relative",width:280,height:280,margin:"10px auto 18px",
              animation: stage === "wheelSpinning" ? "wheelSpinShake 0.1s ease-in-out infinite" : "none",
            }}>
              <div style={{
                position:"absolute",top:-10,left:"50%",
                transform:"translateX(-50%)",
                width:0,height:0,
                borderLeft:"14px solid transparent",
                borderRight:"14px solid transparent",
                borderTop:"24px solid #fbbf24",
                zIndex:10,
                filter:"drop-shadow(0 3px 8px rgba(0,0,0,0.7))",
              }}/>
              <WheelSpinner
                targetRotation={wheelRotation}
                prizes={currentWheelPrizes}
                segmentAngle={segmentAngle}
                coinSide={coinSide}
              />
              <div style={{
                position:"absolute",top:"50%",left:"50%",
                transform:"translate(-50%, -50%)",
                width:50,height:50,borderRadius:"50%",
                background:"linear-gradient(135deg,#fbbf24,#d97706)",
                border:"3px solid #1e293b",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,
              }}>{coinSide === "good" ? "✨" : "💀"}</div>
            </div>

            {stage === "result" && prize && (
              <div style={{
                position:"fixed",inset:0,
                background:"rgba(0,0,0,0.85)",
                zIndex:10100,
                display:"flex",alignItems:"center",justifyContent:"center",
                padding:20,
                animation:"fadeIn 0.4s ease-out",
              }}>
                <style>{`
                  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                  @keyframes prizePopIn {
                    0% { transform: scale(0.3) rotate(-180deg); opacity: 0; }
                    60% { transform: scale(1.1) rotate(10deg); }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                  }
                `}</style>
                <div onClick={e=>e.stopPropagation()} style={{
                  maxWidth:340,width:"100%",
                  background: coinSide === "good"
                    ? "linear-gradient(160deg,#14532d,#0f172a)"
                    : "linear-gradient(160deg,#7f1d1d,#0f172a)",
                  borderRadius:20,
                  padding:"30px 24px",
                  border: `3px solid ${coinSide === "good" ? "#22c55e" : "#ef4444"}`,
                  boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${coinSide === "good" ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`,
                  textAlign:"center",
                  animation:"prizePopIn 0.6s cubic-bezier(0.2,0.7,0.3,1)",
                }}>
                  <div style={{fontSize:72,marginBottom:14}}>
                    {coinSide === "good" ? "🎉" : "💔"}
                  </div>
                  <div style={{
                    fontSize:22,fontWeight:900,
                    color: coinSide === "good" ? "#22c55e" : "#ef4444",
                    marginBottom:14,letterSpacing:1,
                  }}>
                    {coinSide === "good" ? "🎉 זכית!" : "💔 הפסדת!"}
                  </div>
                  <div style={{
                    fontSize:28,fontWeight:900,
                    color: prize.color,
                    marginBottom:24,
                    textShadow:`0 0 20px ${prize.color}`,
                    letterSpacing:1,
                  }}>{resultMessage || prize.label}</div>
                  <button onClick={close} style={{
                    padding:"14px 40px",borderRadius:12,
                    background: coinSide === "good"
                      ? "linear-gradient(135deg,#22c55e,#16a34a)"
                      : "linear-gradient(135deg,#64748b,#475569)",
                    color:"#fff",border:"none",
                    fontSize:15,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
                    boxShadow:"0 8px 20px rgba(0,0,0,0.4)",
                  }}>סגור</button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── 🎴 HIGHER / LOWER — guess if next card has higher or lower rating ─────────
function LuckyWheelModal({ onClose, onWin, onUpdateBestStreak, personalBest, leagueRecord, freePlaysLeft, coinBalance, onUseFree, onPayPlay }) {
  // Game states: "idle" (not playing), "playing", "lost", "won"
  const [gameState, setGameState] = useState("idle");
  const [currentCard, setCurrentCard] = useState(null);
  const [nextCard, setNextCard] = useState(null);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [revealing, setRevealing] = useState(false);
  const [lastChoice, setLastChoice] = useState(null); // "higher" | "lower"
  const [lastResult, setLastResult] = useState(null); // "correct" | "wrong"
  const timerRef = useRef(null);

  // Pick a card from the "regular" mundial pool only (no friends/legends/Israelis)
  // Only cards with rating 70-99 (tighter range = more challenging guesses)
  const pickRandomCard = () => {
    const pool = CARDS.filter(c => {
      const r = getPlayerRating(c);
      return r >= 70 && r <= 99;
    });
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const startGame = (isFree) => {
    if (!isFree) {
      if (coinBalance < 50) return;
      onPayPlay();
    } else {
      onUseFree();
    }
    const first = pickRandomCard();
    setCurrentCard(first);
    setNextCard(null);
    setStreak(0);
    setRevealing(false);
    setLastChoice(null);
    setLastResult(null);
    setGameState("playing");
    setTimeLeft(10);
  };

  // Timer tick
  useEffect(() => {
    if (gameState !== "playing" || revealing) return;
    if (timeLeft <= 0) {
      // Time's up — count as wrong
      handleChoice(null);
      return;
    }
    // Vibrate in last 3 seconds for urgency
    if (timeLeft <= 3) {
      try { navigator.vibrate?.(40); } catch {}
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, gameState, revealing]);

  const handleChoice = (choice) => {
    if (revealing || gameState !== "playing") return;
    clearTimeout(timerRef.current);
    setLastChoice(choice);
    setRevealing(true);
    // Pick the next card — re-roll if it's exactly the same rating (tie = redo)
    const curRating = getPlayerRating(currentCard);
    let next = pickRandomCard();
    let tries = 0;
    while (getPlayerRating(next) === curRating && tries < 20) {
      next = pickRandomCard();
      tries++;
    }
    setNextCard(next);
    const nextRating = getPlayerRating(next);
    let correct = false;
    if (choice === "higher" && nextRating > curRating) correct = true;
    if (choice === "lower"  && nextRating < curRating) correct = true;
    // No choice (timeout) = wrong
    setLastResult(correct ? "correct" : "wrong");
    try { navigator.vibrate?.(correct ? 30 : [40, 50, 80]); } catch {}
    setTimeout(() => {
      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        // Update personal best in real time
        if (onUpdateBestStreak) onUpdateBestStreak(newStreak);
        setCurrentCard(next);
        setNextCard(null);
        setRevealing(false);
        setLastChoice(null);
        setLastResult(null);
        setTimeLeft(10);
      } else {
        // 💰 Consolation prize — if streak >= 3, get half of what was in the pot
        const consolation = Math.floor(prizeForStreak(streak) / 2);
        if (consolation > 0) {
          onWin(consolation);
        }
        setGameState("lost");
      }
    }, 1800);
  };

  const cashOut = () => {
    const prize = prizeForStreak(streak);
    if (prize > 0) {
      onWin(prize);
    }
    setGameState("won");
  };

  function prizeForStreak(s) {
    if (s >= 30) return 10000;
    if (s >= 25) return 5000;
    if (s >= 20) return 3000;
    if (s >= 15) return 2000;
    if (s >= 12) return 1000;
    if (s >= 10) return 600;
    if (s >= 8)  return 300;
    if (s >= 5)  return 100;
    if (s >= 3)  return 50;
    return 0;
  }

  const renderMiniCard = (card) => {
    if (!card) return null;
    return <PlayerCard card={card} size="M" animated={false} />;
  };

  const renderQuestionCard = () => (
    <div style={{
      position:"relative",
      width:140,
      height:210,
      borderRadius:14,
      background:"linear-gradient(135deg,#1e293b,#0f172a)",
      boxShadow:"0 8px 24px rgba(0,0,0,0.5)",
      border:"3px dashed #fbbf24",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:64,
    }}>❓</div>
  );

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,
      background: gameState === "playing"
        ? (timeLeft <= 3
          ? "radial-gradient(circle at center, rgba(239,68,68,0.4), rgba(7,13,30,0.98))"
          : streak >= 15
          ? "radial-gradient(circle at center, rgba(249,115,22,0.3), rgba(7,13,30,0.98))"
          : streak >= 10
          ? "radial-gradient(circle at center, rgba(251,191,36,0.2), rgba(7,13,30,0.98))"
          : "rgba(7,13,30,0.96)")
        : "rgba(7,13,30,0.96)",
      transition: "background 0.5s ease",
      zIndex:9999,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"20px 14px",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        maxWidth:440,width:"100%",
        background:"linear-gradient(160deg,#1e293b,#0f172a)",
        borderRadius:20,padding:"22px 16px",
        border:"2px solid rgba(251,191,36,0.4)",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
        textAlign:"center",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:18,fontWeight:900,color:"#fbbf24"}}>🎴 גבוה או נמוך?</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#cbd5e1",fontSize:24,cursor:"pointer"}}>✕</button>
        </div>

        {gameState === "idle" && (
          <div style={{padding:"20px 10px"}}>
            <div style={{fontSize:48,marginBottom:14}}>🎴⚡🎴</div>
            <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.6,marginBottom:14,padding:"0 8px"}}>
              נחש אם הקלף הבא יקבל ציון <b style={{color:"#22c55e"}}>גבוה יותר</b> או <b style={{color:"#ef4444"}}>נמוך יותר</b><br/>
              <span style={{fontSize:11,color:"#94a3b8"}}>
                ⏱️ 10 שניות להחליט · 🔄 תיקו = הגרלה חוזרת
              </span>
            </div>

            {/* 🏆 Records */}
            <div style={{
              display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,
              marginBottom:14,
            }}>
              <div style={{
                background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(15,23,42,0.7))",
                border:"1px solid rgba(251,191,36,0.3)",
                borderRadius:10,padding:"10px 8px",textAlign:"center",
              }}>
                <div style={{fontSize:9,color:"#fbbf24",fontWeight:800,letterSpacing:1,marginBottom:2}}>🏆 השיא שלך</div>
                <div style={{fontSize:22,fontWeight:900,color:"#fbbf24"}}>{personalBest || 0}</div>
              </div>
              <div style={{
                background:"linear-gradient(135deg,rgba(168,85,247,0.15),rgba(15,23,42,0.7))",
                border:"1px solid rgba(168,85,247,0.3)",
                borderRadius:10,padding:"10px 8px",textAlign:"center",
              }}>
                <div style={{fontSize:9,color:"#c4b5fd",fontWeight:800,letterSpacing:1,marginBottom:2}}>👑 שיא הליגה</div>
                <div style={{fontSize:22,fontWeight:900,color:"#c4b5fd"}}>{leagueRecord?.streak || 0}</div>
                {leagueRecord?.streak > 0 && (
                  <div style={{fontSize:9,color:"#a78bfa",marginTop:2}}>{leagueRecord.name}</div>
                )}
              </div>
            </div>

            {/* Prize ladder */}
            <div style={{
              background:"rgba(15,23,42,0.6)",borderRadius:10,padding:"10px 12px",
              marginBottom:18,fontSize:11,color:"#cbd5e1",
            }}>
              <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,marginBottom:6,fontWeight:800}}>פרסי רצף</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:4,textAlign:"right"}}>
                <div>3 ברצף → <b style={{color:"#22c55e"}}>50</b></div>
                <div>5 ברצף → <b style={{color:"#22c55e"}}>100</b></div>
                <div>8 ברצף → <b style={{color:"#22c55e"}}>300</b></div>
                <div>10 ברצף → <b style={{color:"#fbbf24"}}>600</b></div>
                <div>12 ברצף → <b style={{color:"#fbbf24"}}>1,000</b></div>
                <div>15 ברצף → <b style={{color:"#fbbf24"}}>2,000</b></div>
                <div>20 ברצף → <b style={{color:"#a855f7"}}>3,000</b></div>
                <div>25 ברצף → <b style={{color:"#a855f7"}}>5,000</b></div>
                <div>30 ברצף → <b style={{color:"#ef4444"}}>10,000!</b></div>
              </div>
            </div>

            {freePlaysLeft > 0 ? (
              <button onClick={() => startGame(true)} style={{
                width:"100%",padding:"14px",borderRadius:12,
                background:"linear-gradient(135deg,#22c55e,#16a34a)",
                color:"#fff",border:"none",
                fontSize:15,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
                boxShadow:"0 8px 24px rgba(34,197,94,0.4)",
              }}>🆓 שחק חינם · נשארו {freePlaysLeft} ביום</button>
            ) : (
              <button
                onClick={() => startGame(false)}
                disabled={coinBalance < 50}
                style={{
                  width:"100%",padding:"14px",borderRadius:12,
                  background: coinBalance >= 50 ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "rgba(71,85,105,0.4)",
                  color: coinBalance >= 50 ? "#1e2940" : "#64748b",
                  border:"none",fontSize:15,fontWeight:900,
                  cursor: coinBalance >= 50 ? "pointer" : "not-allowed",
                  fontFamily:"inherit",
                  boxShadow: coinBalance >= 50 ? "0 8px 24px rgba(251,191,36,0.4)" : "none",
                }}>
                {coinBalance >= 50 ? "💰 שחק · 🪙 50" : "🪙 חסר 50 מטבעות"}
              </button>
            )}
            <div style={{marginTop:8,fontSize:10,color:"#64748b"}}>
              יתרה: 🪙 {coinBalance}
            </div>
          </div>
        )}

        {gameState === "playing" && (
          <div style={{position:"relative"}}>
            {/* 🔥 Fire emojis on the sides for long streaks */}
            {streak >= 15 && (
              <>
                <div style={{
                  position:"absolute",left:-8,top:"50%",transform:"translateY(-50%)",
                  fontSize:32,animation:"flameDance 1s ease-in-out infinite",
                  pointerEvents:"none",zIndex:1,
                }}>🔥</div>
                <div style={{
                  position:"absolute",right:-8,top:"50%",transform:"translateY(-50%)",
                  fontSize:32,animation:"flameDance 1s ease-in-out infinite 0.3s",
                  pointerEvents:"none",zIndex:1,
                }}>🔥</div>
                <style>{`
                  @keyframes flameDance {
                    0%, 100% { transform: translateY(-50%) scale(1) rotate(-3deg); }
                    50% { transform: translateY(-55%) scale(1.15) rotate(3deg); }
                  }
                `}</style>
              </>
            )}

            {/* Streak + timer */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"0 4px"}}>
              <div style={{
                fontSize: streak >= 10 ? 16 : 13,
                fontWeight:900,
                color:"#fbbf24",
                animation: streak >= 10 ? "streakPulse 1s ease-in-out infinite" : "none",
              }}>🔥 רצף: {streak}</div>
              <div style={{
                fontSize: timeLeft <= 3 ? 20 : 14,
                fontWeight:900,
                color: timeLeft <= 3 ? "#ef4444" : timeLeft <= 6 ? "#fbbf24" : "#22c55e",
                fontVariantNumeric:"tabular-nums",
                animation: timeLeft <= 3 ? "timerPulse 0.5s ease-in-out infinite" : "none",
                textShadow: timeLeft <= 3 ? "0 0 12px rgba(239,68,68,0.8)" : "none",
              }}>⏱️ {timeLeft}s</div>
            </div>
            <style>{`
              @keyframes streakPulse {
                0%, 100% { transform: scale(1); text-shadow: 0 0 0 transparent; }
                50% { transform: scale(1.08); text-shadow: 0 0 16px rgba(251,191,36,0.7); }
              }
              @keyframes timerPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
              }
              @keyframes questionShake {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                25% { transform: translate(-2px, 1px) rotate(-2deg); }
                50% { transform: translate(2px, -1px) rotate(2deg); }
                75% { transform: translate(-1px, -2px) rotate(-1deg); }
              }
              @keyframes cardFlip {
                0% { transform: rotateY(0deg) scale(0.95); opacity: 0; }
                50% { transform: rotateY(90deg) scale(1); }
                100% { transform: rotateY(0deg) scale(1); opacity: 1; }
              }
              @keyframes correctGlow {
                0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
                100% { box-shadow: 0 0 0 40px rgba(34,197,94,0); }
              }
              @keyframes wrongShake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-12px); }
                40% { transform: translateX(12px); }
                60% { transform: translateX(-8px); }
                80% { transform: translateX(8px); }
              }
            `}</style>

            {/* Current prize + next milestone */}
            {(() => {
              const currentPrize = prizeForStreak(streak);
              const milestones = [3, 5, 8, 10, 12, 15, 20, 25, 30];
              const nextMilestone = milestones.find(m => m > streak);
              const nextPrize = nextMilestone ? prizeForStreak(nextMilestone) : null;
              return (
                <div style={{
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  marginBottom:14,padding:"8px 12px",
                  background: streak >= 5
                    ? "linear-gradient(90deg, rgba(251,191,36,0.15), rgba(15,23,42,0.7), rgba(251,191,36,0.15))"
                    : "rgba(15,23,42,0.7)",
                  backgroundSize: streak >= 5 ? "200% 100%" : "100% 100%",
                  animation: streak >= 5 ? "shimmerBg 3s linear infinite" : "none",
                  borderRadius:10,
                  border:`1px solid rgba(251,191,36,${streak >= 5 ? 0.5 : 0.2})`,
                }}>
                  <div style={{textAlign:"center",flex:1}}>
                    <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,letterSpacing:1}}>בכיס</div>
                    <div style={{fontSize:16,fontWeight:900,color: currentPrize > 0 ? "#22c55e" : "#64748b"}}>
                      {currentPrize > 0 ? `${currentPrize} 🪙` : "—"}
                    </div>
                  </div>
                  {nextPrize && (
                    <>
                      <div style={{fontSize:16,color:"#fbbf24"}}>→</div>
                      <div style={{textAlign:"center",flex:1}}>
                        <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,letterSpacing:1}}>ב-{nextMilestone}</div>
                        <div style={{fontSize:16,fontWeight:900,color:"#fbbf24"}}>{nextPrize} 🪙</div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <style>{`
              @keyframes shimmerBg {
                0% { background-position: 0% 50%; }
                100% { background-position: 200% 50%; }
              }
            `}</style>

            {/* Two cards — centered with VS in middle */}
            <div style={{
              display:"flex",
              justifyContent:"center",
              alignItems:"center",
              gap:8,marginBottom:18,
            }}>
              <div style={{flexShrink:0}}>{renderMiniCard(currentCard)}</div>
              <div style={{
                width:38,height:38,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center",
                background:"#0f172a",
                border:"2px solid #fbbf24",
                borderRadius:"50%",
                fontSize:13,
                color:"#fbbf24",
                fontWeight:900,
                textShadow:"0 0 12px rgba(251,191,36,0.8)",
                letterSpacing:0.5,
                zIndex:5,
                boxShadow:"0 0 16px rgba(251,191,36,0.5)",
              }}>VS</div>
              <div style={{
                flexShrink:0,
                animation: revealing && nextCard
                  ? `cardFlip 0.6s ease-out, ${lastResult === "correct" ? "correctGlow 0.8s ease-out" : "wrongShake 0.5s ease-in-out"}`
                  : !revealing ? "questionShake 0.6s ease-in-out infinite" : "none",
                borderRadius:14,
              }}>
                {revealing && nextCard ? renderMiniCard(nextCard) : renderQuestionCard()}
              </div>
            </div>

            {revealing ? (
              <div style={{
                fontSize:20,fontWeight:900,
                color: lastResult === "correct" ? "#22c55e" : "#ef4444",
                animation:"fadeIn 0.4s ease",
              }}>
                {lastResult === "correct" ? "✅ צדקת!" : "❌ טעות"}
              </div>
            ) : (
              <>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={() => handleChoice("higher")} style={{
                    flex:1,padding:"16px",borderRadius:12,
                    background:"linear-gradient(135deg,#22c55e,#16a34a)",
                    color:"#fff",border:"none",
                    fontSize:15,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
                    boxShadow:"0 6px 18px rgba(34,197,94,0.4)",
                  }}>⬆️ גבוה יותר</button>
                  <button onClick={() => handleChoice("lower")} style={{
                    flex:1,padding:"16px",borderRadius:12,
                    background:"linear-gradient(135deg,#ef4444,#dc2626)",
                    color:"#fff",border:"none",
                    fontSize:15,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
                    boxShadow:"0 6px 18px rgba(239,68,68,0.4)",
                  }}>⬇️ נמוך יותר</button>
                </div>
                {streak >= 3 && (
                  <button onClick={cashOut} style={{
                    width:"100%",marginTop:10,padding:"10px",borderRadius:10,
                    background:"rgba(251,191,36,0.15)",
                    color:"#fbbf24",
                    border:"1px solid rgba(251,191,36,0.4)",
                    fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                  }}>💰 אסוף עכשיו ({prizeForStreak(streak)} 🪙)</button>
                )}
              </>
            )}
          </div>
        )}

        {gameState === "lost" && (() => {
          const consolation = Math.floor(prizeForStreak(streak) / 2);
          return (
          <div style={{padding:"20px 10px"}}>
            <div style={{fontSize:60,marginBottom:14}}>💔</div>
            <div style={{fontSize:18,fontWeight:900,color:"#ef4444",marginBottom:8}}>הפסדת</div>
            <div style={{fontSize:13,color:"#cbd5e1",marginBottom:14}}>
              עצרת ברצף של {streak}.
            </div>
            {consolation > 0 ? (
              <div style={{
                marginBottom:18,padding:"10px 14px",
                background:"rgba(251,191,36,0.15)",
                border:"1px solid rgba(251,191,36,0.4)",
                borderRadius:10,display:"inline-block",
              }}>
                <div style={{fontSize:10,color:"#fbbf24",fontWeight:800,letterSpacing:1,marginBottom:2}}>💰 פיצוי (חצי מהסכום)</div>
                <div style={{fontSize:20,fontWeight:900,color:"#fbbf24"}}>+{consolation} 🪙</div>
              </div>
            ) : (
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:18}}>
                נצרך להגיע ל-3 לפחות לפיצוי.
              </div>
            )}
            <div>
              {(freePlaysLeft > 0 || coinBalance >= 50) && (
                <button onClick={() => startGame(freePlaysLeft > 0)} style={{
                  padding:"14px 30px",borderRadius:12,marginBottom:10,marginRight:8,
                  background: freePlaysLeft > 0
                    ? "linear-gradient(135deg,#22c55e,#16a34a)"
                    : "linear-gradient(135deg,#fbbf24,#f59e0b)",
                  color: freePlaysLeft > 0 ? "#fff" : "#1e2940",
                  border:"none",fontSize:14,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
                  boxShadow:"0 6px 18px rgba(0,0,0,0.4)",
                }}>
                  {freePlaysLeft > 0 ? `🔄 שחק שוב · ${freePlaysLeft} חינם` : `🔄 שחק שוב · 🪙 50`}
                </button>
              )}
              <button onClick={onClose} style={{
                padding:"12px 24px",borderRadius:10,
                background:"transparent",
                color:"#94a3b8",border:"1px solid #475569",
                fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              }}>סגור</button>
            </div>
          </div>
          );
        })()}

        {gameState === "won" && (
          <div style={{padding:"20px 10px",position:"relative"}}>
            {/* 🪙 Coin rain */}
            {(() => {
              const prize = prizeForStreak(streak);
              const coinCount = Math.min(60, Math.max(10, Math.round(prize / 50)));
              return (
                <>
                  <style>{`
                    @keyframes coinRainHL {
                      0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
                      10%  { opacity: 1; }
                      100% { transform: translateY(120vh) rotate(720deg); opacity: 0.8; }
                    }
                  `}</style>
                  {Array.from({length: coinCount}).map((_, i) => {
                    const left = `${(i * 7.3) % 100}%`;
                    const delay = `${(i * 0.05) % 1.5}s`;
                    const duration = 1.8 + (i % 5) * 0.3;
                    return (
                      <div key={i} style={{
                        position:"fixed",top:-40,left,
                        fontSize: 18 + (i % 3) * 6,
                        zIndex:10500,
                        pointerEvents:"none",
                        animation: `coinRainHL ${duration}s cubic-bezier(0.4,0,0.2,1) ${delay} forwards`,
                      }}>🪙</div>
                    );
                  })}
                </>
              );
            })()}
            <div style={{fontSize:60,marginBottom:14}}>🎉</div>
            <div style={{fontSize:18,fontWeight:900,color:"#22c55e",marginBottom:8}}>ניצחת!</div>
            <div style={{fontSize:24,fontWeight:900,color:"#fbbf24",marginBottom:8}}>
              +{prizeForStreak(streak)} 🪙
            </div>
            {streak >= (personalBest || 0) && streak > 0 && (
              <div style={{
                fontSize:12,fontWeight:900,color:"#fbbf24",
                marginBottom:14,padding:"6px 12px",
                background:"rgba(251,191,36,0.15)",
                borderRadius:8,display:"inline-block",
                border:"1px solid rgba(251,191,36,0.4)",
              }}>🏆 שיא אישי חדש!</div>
            )}
            {(freePlaysLeft > 0 || (coinBalance + prizeForStreak(streak)) >= 50) && (
              <button onClick={() => startGame(freePlaysLeft > 0)} style={{
                padding:"14px 30px",borderRadius:12,marginBottom:10,marginRight:8,
                background: freePlaysLeft > 0
                  ? "linear-gradient(135deg,#22c55e,#16a34a)"
                  : "linear-gradient(135deg,#fbbf24,#f59e0b)",
                color: freePlaysLeft > 0 ? "#fff" : "#1e2940",
                border:"none",fontSize:14,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
                boxShadow:"0 6px 18px rgba(0,0,0,0.4)",
              }}>
                {freePlaysLeft > 0 ? `🔄 עוד אחד · ${freePlaysLeft} חינם` : `🔄 עוד אחד · 🪙 50`}
              </button>
            )}
            <button onClick={onClose} style={{
              padding:"12px 24px",borderRadius:10,
              background:"transparent",
              color:"#94a3b8",border:"1px solid #475569",
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            }}>סגור</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 🌍 GLOBAL ADMIN MODAL — manage all users in Firebase (requires secret code) ─
function GlobalAdminModal({ onClose, galaxyTestMode, setGalaxyTestMode, onGiveCoins }) {
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [removingUid, setRemovingUid] = useState(null);
  const [search, setSearch] = useState("");
  const [adminTab, setAdminTab] = useState("users"); // "users" | "galaxy"

  // 🔐 Secret code — only Chen knows it
  const ADMIN_CODE = "Chen-Boss-2026";

  const tryUnlock = () => {
    if (codeInput.trim() === ADMIN_CODE) {
      setUnlocked(true);
      setCodeError("");
      loadUsers();
    } else {
      setCodeError("קוד שגוי");
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const all = await fetchAllGlobalUsers();
      // Sort by name (case-insensitive)
      all.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(all);
    } catch (e) {
      setError(e.message || "טעינה נכשלה");
    }
    setLoading(false);
  };

  const handleDelete = async (user) => {
    const ok = confirm(`למחוק את "${user.name || user.uid}" מהדירוג העולמי?\n\nUserId: ${user.uid}\n\nהפעולה לא הפיכה — הנתונים שלו יימחקו מהענן.`);
    if (!ok) return;
    setRemovingUid(user.uid);
    try {
      await deleteGlobalUser(user.uid);
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
      // Bust the world leaderboard cache so it refreshes
      try { localStorage.removeItem("wc2026_world_v2"); } catch {}
    } catch (e) {
      alert("שגיאה: " + (e.message || "נסה שוב"));
    }
    setRemovingUid(null);
  };

  // Group users by name to find duplicates
  const groupedByName = useMemo(() => {
    const groups = {};
    for (const u of users) {
      const key = (u.name || "(ללא שם)").trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    }
    return groups;
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.name || "").toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(7,13,30,0.97)",
      zIndex:9999,overflowY:"auto",
      padding:"20px 16px",
    }}>
      <div style={{maxWidth:520,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontSize:18,fontWeight:900,color:"#fbbf24"}}>🌍 ניהול גלובלי</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#cbd5e1",fontSize:24,cursor:"pointer"}}>✕</button>
        </div>

        {!unlocked ? (
          // 🔐 Code entry screen
          <div style={{
            background:"rgba(15,23,42,0.7)",
            border:"1px solid rgba(251,191,36,0.3)",
            borderRadius:14,padding:"24px 18px",
            textAlign:"center",
          }}>
            <div style={{fontSize:42,marginBottom:14}}>🔐</div>
            <div style={{fontSize:14,color:"#cbd5e1",marginBottom:18,lineHeight:1.5}}>
              אזור אדמין בלבד — הקלד את הקוד הסודי
            </div>
            <input
              type="password"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(""); }}
              onKeyDown={e => { if (e.key === "Enter") tryUnlock(); }}
              placeholder="הקוד הסודי"
              style={{
                width:"100%",padding:"12px",borderRadius:10,
                background:"rgba(36,49,80,0.5)",
                border:`1px solid ${codeError ? "#ef4444" : "rgba(251,191,36,0.3)"}`,
                color:"#fff",fontSize:14,fontFamily:"inherit",
                textAlign:"center",letterSpacing:2,
                boxSizing:"border-box",marginBottom:14,
              }}
            />
            {codeError && (
              <div style={{color:"#fca5a5",fontSize:12,marginBottom:14}}>⚠️ {codeError}</div>
            )}
            <button onClick={tryUnlock} style={{
              width:"100%",padding:"12px",borderRadius:10,
              background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
              color:"#1e2940",border:"none",
              fontSize:14,fontWeight:900,
              cursor:"pointer",fontFamily:"inherit",
            }}>🔓 פתח</button>
          </div>
        ) : (
          // 🔓 Admin panel
          <>
            {/* 📑 Tabs */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              <button
                onClick={() => setAdminTab("users")}
                style={{
                  flex:1,padding:"10px 8px",
                  background: adminTab === "users" ? "rgba(34,197,94,0.2)" : "rgba(36,49,80,0.4)",
                  border: `1px solid ${adminTab === "users" ? "rgba(34,197,94,0.6)" : "rgba(71,85,105,0.4)"}`,
                  borderRadius:10,
                  color: adminTab === "users" ? "#86efac" : "#94a3b8",
                  fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                }}>
                👥 משתמשים
              </button>
              <button
                onClick={() => setAdminTab("galaxy")}
                style={{
                  flex:1,padding:"10px 8px",
                  background: adminTab === "galaxy" ? "rgba(192,132,252,0.2)" : "rgba(36,49,80,0.4)",
                  border: `1px solid ${adminTab === "galaxy" ? "rgba(192,132,252,0.6)" : "rgba(71,85,105,0.4)"}`,
                  borderRadius:10,
                  color: adminTab === "galaxy" ? "#e9d5ff" : "#94a3b8",
                  fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                }}>
                🌌 קלפי GALAXY
              </button>
            </div>

            {adminTab === "galaxy" ? (
              // 🌌 GALAXY CARDS GALLERY
              <div>
                <div style={{
                  background:"linear-gradient(135deg,rgba(192,132,252,0.15),rgba(168,85,247,0.08))",
                  border:"1px solid rgba(192,132,252,0.4)",
                  borderRadius:10,padding:"10px 12px",marginBottom:14,
                  fontSize:12,color:"#e9d5ff",textAlign:"center",
                }}>
                  🌌 {GALAXY_CARDS.length} קלפי GALAXY · מצטייני 25/26
                </div>

                {/* 🧪 TEST PANEL */}
                <div style={{
                  background:"rgba(15,23,42,0.7)",
                  border:`1px solid ${galaxyTestMode ? "rgba(34,197,94,0.5)" : "rgba(71,85,105,0.4)"}`,
                  borderRadius:12,padding:"12px",marginBottom:14,
                }}>
                  <div style={{fontSize:11,color:"#fbbf24",letterSpacing:2,fontWeight:800,marginBottom:10}}>🧪 פאנל בדיקה</div>

                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{fontSize:12,color:"#cbd5e1"}}>
                      מצב בדיקה (GALAXY SPIN חינם)
                    </div>
                    <button
                      onClick={() => setGalaxyTestMode?.(!galaxyTestMode)}
                      style={{
                        padding:"6px 14px",
                        background: galaxyTestMode ? "rgba(34,197,94,0.25)" : "rgba(71,85,105,0.4)",
                        border:`1px solid ${galaxyTestMode ? "rgba(34,197,94,0.7)" : "rgba(71,85,105,0.6)"}`,
                        borderRadius:8,
                        color: galaxyTestMode ? "#86efac" : "#cbd5e1",
                        fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                      }}>
                      {galaxyTestMode ? "✅ מופעל" : "כבוי"}
                    </button>
                  </div>

                  <div style={{display:"flex",gap:6}}>
                    <button
                      onClick={() => { onGiveCoins?.(1000); alert("✅ הוספו 1000 מטבעות"); }}
                      style={{
                        flex:1,padding:"8px",
                        background:"rgba(251,191,36,0.15)",
                        border:"1px solid rgba(251,191,36,0.4)",
                        borderRadius:8,color:"#fbbf24",
                        fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                      }}>
                      💰 +1000 🪙
                    </button>
                    <button
                      onClick={() => { onGiveCoins?.(10000); alert("✅ הוספו 10,000 מטבעות"); }}
                      style={{
                        flex:1,padding:"8px",
                        background:"rgba(251,191,36,0.15)",
                        border:"1px solid rgba(251,191,36,0.4)",
                        borderRadius:8,color:"#fbbf24",
                        fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                      }}>
                      💰 +10K 🪙
                    </button>
                  </div>

                  <div style={{
                    marginTop:10,padding:"8px",
                    background:"rgba(192,132,252,0.08)",
                    borderRadius:8,
                    fontSize:10,color:"#c4b5fd",lineHeight:1.5,
                  }}>
                    💡 כאשר מצב הבדיקה פעיל, כפתור "GALAXY SPIN" ברולטה יהיה <strong>חינם</strong> כדי שתוכל לבדוק את האנימציה והקלפים. כשמכבים — חוזר ל-1000 🪙.
                  </div>
                </div>

                <div style={{
                  display:"grid",
                  gridTemplateColumns:"repeat(2, 1fr)",
                  gap:14,
                  justifyItems:"center",
                  paddingBottom:30,
                }}>
                  {GALAXY_CARDS.map(c => (
                    <div key={c.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                      <PlayerCard card={c} size="M" animated={true} />
                      <div style={{fontSize:10,color:"#94a3b8",textAlign:"center"}}>
                        {c.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <>
            <div style={{
              background:"rgba(34,197,94,0.1)",
              border:"1px solid rgba(34,197,94,0.4)",
              borderRadius:10,padding:"10px 12px",marginBottom:14,
              fontSize:12,color:"#86efac",
            }}>
              🔓 פתוח. סה"כ {users.length} משתמשים בענן.
            </div>

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 חפש לפי שם או ID"
              style={{
                width:"100%",padding:"10px",borderRadius:10,
                background:"rgba(36,49,80,0.5)",
                border:"1px solid rgba(71,85,105,0.5)",
                color:"#fff",fontSize:13,fontFamily:"inherit",
                boxSizing:"border-box",marginBottom:12,
              }}
            />

            {loading && (
              <div style={{textAlign:"center",padding:30,color:"#94a3b8"}}>⏳ טוען...</div>
            )}
            {error && (
              <div style={{
                background:"rgba(239,68,68,0.15)",
                border:"1px solid rgba(239,68,68,0.4)",
                borderRadius:10,padding:12,color:"#fca5a5",fontSize:13,marginBottom:14,
              }}>⚠️ {error}</div>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filteredUsers.map(u => {
                const nameKey = (u.name || "(ללא שם)").trim().toLowerCase();
                const isDup = groupedByName[nameKey] && groupedByName[nameKey].length > 1;
                const points = u.totalPoints || 0;
                const numPicks = u.picks ? Object.keys(u.picks).length : 0;
                const numCards = u.cardCollection
                  ? Object.values(u.cardCollection).reduce((s, n) => s + (n || 0), 0)
                  : 0;
                const coinBal = u.coinBalance || 0;
                // Last seen — updatedAt might be a Firestore Timestamp or a number
                let lastSeen = "";
                try {
                  const t = u.updatedAt?.toMillis ? u.updatedAt.toMillis() : u.updatedAt;
                  if (t) {
                    const diff = Date.now() - t;
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor(diff / (1000 * 60));
                    if (minutes < 1) lastSeen = "ממש עכשיו";
                    else if (minutes < 60) lastSeen = `לפני ${minutes} דק'`;
                    else if (hours < 24) lastSeen = `לפני ${hours} שעות`;
                    else if (days === 1) lastSeen = "אתמול";
                    else lastSeen = `לפני ${days} ימים`;
                    // Also show exact time
                    const d = new Date(t);
                    const pad = (n) => String(n).padStart(2, "0");
                    const exact = `${pad(d.getDate())}/${pad(d.getMonth()+1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    lastSeen = `${lastSeen} (${exact})`;
                  }
                } catch {}
                return (
                  <div key={u.uid} style={{
                    background: isDup ? "rgba(239,68,68,0.08)" : "rgba(36,49,80,0.5)",
                    border:`1px solid ${isDup ? "rgba(239,68,68,0.4)" : "rgba(71,85,105,0.3)"}`,
                    borderRadius:10,padding:"10px 12px",
                    display:"flex",alignItems:"center",gap:10,
                  }}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:800,color:"#fff",marginBottom:2,display:"flex",alignItems:"center",gap:6}}>
                        {u.name || "(ללא שם)"}
                        {isDup && <span style={{fontSize:9,background:"#ef4444",color:"#fff",padding:"1px 5px",borderRadius:4,fontWeight:900}}>כפול</span>}
                      </div>
                      <div style={{fontSize:9,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {u.uid}
                      </div>
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:3,display:"flex",flexWrap:"wrap",gap:6}}>
                        <span>🏆 {points}</span>
                        <span>⚽ {numPicks}</span>
                        <span>🃏 {numCards}</span>
                        <span>🪙 {coinBal}</span>
                      </div>
                      {lastSeen && (
                        <div style={{fontSize:9,color:"#64748b",marginTop:2}}>
                          ⏰ {lastSeen}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={removingUid === u.uid}
                      style={{
                        padding:"7px 12px",
                        background:"linear-gradient(180deg,rgba(239,68,68,0.25),rgba(239,68,68,0.1))",
                        border:"1px solid rgba(239,68,68,0.4)",
                        borderRadius:8,
                        color:"#fca5a5",fontSize:11,fontWeight:700,
                        cursor: removingUid === u.uid ? "wait" : "pointer",
                        fontFamily:"inherit",
                        opacity: removingUid === u.uid ? 0.5 : 1,
                        flexShrink:0,
                      }}>
                      {removingUid === u.uid ? "..." : "🗑️"}
                    </button>
                  </div>
                );
              })}
              {!loading && filteredUsers.length === 0 && (
                <div style={{textAlign:"center",padding:30,color:"#64748b",fontSize:13}}>
                  אין משתמשים תואמים
                </div>
              )}
            </div>
            </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── 🎁 ADMIN GIFT MODAL — broadcast coins to all league members ──────────────
function AdminGiftModal({ leagueCode, userName, onClose }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customReason, setCustomReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");

  const PRESETS = [
    { id: "morning", emoji: "☀️", label: "בונוס בוקר טוב", amount: 100, defaultReason: "בוקר טוב מונדיאליטו!" },
    { id: "matchday", emoji: "⚽", label: "יום משחק", amount: 200, defaultReason: "בונוס יום משחק!" },
    { id: "weekly", emoji: "🏆", label: "בונוס שבועי", amount: 500, defaultReason: "בונוס נוכחות שבועי!" },
    { id: "celebration", emoji: "🎉", label: "חגיגה", amount: 1000, defaultReason: "חגיגה לליגה!" },
    { id: "huge", emoji: "💎", label: "פרס יוצא דופן", amount: 2000, defaultReason: "פרס ענק!" },
  ];

  const handleSend = async () => {
    if (!selectedPreset) return;
    setSending(true);
    const gift = {
      id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: selectedPreset.amount,
      reason: (customReason.trim() || selectedPreset.defaultReason),
      sentBy: userName,
      sentAt: Date.now(),
    };
    try {
      await sendGiftToLeague(leagueCode, gift);
      setSentMsg(`✅ נשלח! כולם קיבלו ${selectedPreset.amount} 🪙`);
      setTimeout(() => { onClose(); }, 1800);
    } catch (err) {
      setSentMsg(`❌ שגיאה: ${err.message || "נסה שוב"}`);
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",
      zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",
      padding:18,direction:"rtl",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth:440,width:"100%",maxHeight:"95vh",overflowY:"auto",
        background:"linear-gradient(160deg,#0a0a0a 0%,#1a1a1a 50%,#0f0f0f 100%)",
        borderRadius:20,padding:"24px 18px 20px",position:"relative",
        border:"1px solid rgba(251,191,36,0.35)",
        boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 60px rgba(251,191,36,0.2)",
      }}>
        <button onClick={onClose} style={{
          position:"absolute",top:14,left:14,background:"rgba(255,255,255,0.1)",
          border:"none",borderRadius:"50%",width:32,height:32,
          color:"#fff",fontSize:18,cursor:"pointer",fontFamily:"inherit",
        }}>✕</button>

        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:42,marginBottom:6}}>🎁</div>
          <div style={{fontSize:11,color:"rgba(251,191,36,0.95)",letterSpacing:3,fontWeight:800,marginBottom:4}}>ADMIN</div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>שלח מתנה לליגה</div>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>בחר תבנית — כולם יקבלו אוטומטית</div>
        </div>

        {/* Preset cards */}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {PRESETS.map(p => {
            const isSelected = selectedPreset?.id === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedPreset(p)} style={{
                display:"flex",alignItems:"center",gap:12,
                padding:"12px 14px",
                background: isSelected ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.05)",
                border: isSelected ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.1)",
                borderRadius:12,cursor:"pointer",fontFamily:"inherit",
                textAlign:"right",
              }}>
                <div style={{fontSize:28}}>{p.emoji}</div>
                <div style={{flex:1,textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>{p.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{p.defaultReason}</div>
                </div>
                <div style={{fontSize:18,fontWeight:900,color:"#fbbf24"}}>+{p.amount} 🪙</div>
              </button>
            );
          })}
        </div>

        {/* Optional custom reason */}
        {selectedPreset && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#94a3b8",marginBottom:6,fontWeight:700}}>סיבה מותאמת (אופציונלי):</div>
            <input
              type="text"
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder={selectedPreset.defaultReason}
              maxLength={60}
              style={{
                width:"100%",padding:"10px 12px",
                background:"rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:8,color:"#fff",fontSize:13,
                fontFamily:"inherit",direction:"rtl",
                boxSizing:"border-box",
              }}
            />
          </div>
        )}

        {sentMsg && (
          <div style={{
            padding:"10px 12px",borderRadius:8,marginBottom:10,
            background: sentMsg.startsWith("✅") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: sentMsg.startsWith("✅") ? "#22c55e" : "#ef4444",
            fontSize:13,fontWeight:700,textAlign:"center",
          }}>{sentMsg}</div>
        )}

        <button
          onClick={handleSend}
          disabled={!selectedPreset || sending}
          style={{
            width:"100%",padding:"13px 18px",
            background: (!selectedPreset || sending)
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg,#fbbf24,#d97706)",
            color: (!selectedPreset || sending) ? "#64748b" : "#0a0a0a",
            border:"none",borderRadius:12,
            fontSize:14,fontWeight:900,letterSpacing:1,
            cursor: (!selectedPreset || sending) ? "not-allowed" : "pointer",
            fontFamily:"inherit",
            boxShadow: (!selectedPreset || sending) ? "none" :
              "0 8px 24px rgba(0,0,0,0.5), 0 0 30px rgba(251,191,36,0.35)",
          }}>
          {sending ? "שולח..." : selectedPreset ? `🚀 שלח ${selectedPreset.amount} 🪙 לכולם` : "בחר תבנית למעלה"}
        </button>
      </div>
    </div>
  );
}

function CardRevealModal({ result, onClose, freshSpin = false }) {
  const t = useT();
  const { card, isDuplicate, refund, stolen } = result;
  const cfg = RARITY_CONFIG[card.rarity];
  const isLegend = card.rarity === "G";       // 🟢 Hall of Fame
  const isFriend = card.rarity === "F";       // 🎴 League friends
  const isTrash = card.rarity === "T";        // 🗑️ Israeli "legends"
  const isLegendary = card.rarity === "L";
  const isEpic = card.rarity === "E";
  const isRare = card.rarity === "R";
  const isUncommon = card.rarity === "U";

  // Play win sound + haptics
  useEffect(() => {
    playWinSound(card.rarity);
    try {
      if (card.rarity === "G") navigator.vibrate?.([40, 60, 40, 60, 100, 60, 150, 60, 200]); // Legend — strongest pattern
      else if (card.rarity === "L") navigator.vibrate?.([30, 50, 30, 50, 80, 50, 120]);
      else if (card.rarity === "E") navigator.vibrate?.([20, 40, 50]);
      else navigator.vibrate?.(20);
    } catch {}
  }, [card.rarity]);

  // Vignette color matches the rarity
  const vignetteBg = isLegend     ? "radial-gradient(circle at center, rgba(20,83,45,0.55) 0%, rgba(0,0,0,0.95) 70%)"
                  : isLegendary   ? "radial-gradient(circle at center, rgba(120,53,15,0.4) 0%, rgba(0,0,0,0.92) 70%)"
                  : isEpic        ? "radial-gradient(circle at center, rgba(88,28,135,0.5) 0%, rgba(0,0,0,0.92) 70%)"
                  : isRare        ? "radial-gradient(circle at center, rgba(127,29,29,0.5) 0%, rgba(0,0,0,0.92) 70%)"
                  : isUncommon    ? "radial-gradient(circle at center, rgba(30,58,138,0.4) 0%, rgba(0,0,0,0.9) 70%)"
                                  : "rgba(0,0,0,0.7)";

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9500,
      background: vignetteBg,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:14,
      overflow:"hidden",
      cursor: "pointer",
    }}>
      <style>{`
        @keyframes cardFlip {
          0% { transform: scale(0.2) rotateY(540deg); opacity: 0; }
          70% { transform: scale(1.15) rotateY(0deg); opacity: 1; }
          100% { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
        @keyframes cardShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes sparkle {
          0%, 100% { transform: scale(0.6); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 1; }
        }
        @keyframes legendaryBorderPulse {
          0%, 100% { box-shadow: 0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow}, 0 0 0 0 rgba(251,191,36,0.6); }
          50% { box-shadow: 0 0 80px ${cfg.glow}, 0 0 140px ${cfg.glow}, 0 0 0 20px rgba(251,191,36,0); }
        }
        @keyframes explosionBurst {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(8); opacity: 0; }
        }
        @keyframes rayRotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes shockwave {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(6); opacity: 0; }
        }
        @keyframes goldFall {
          0% { transform: translateY(-100px) rotate(0deg) scale(1); opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg) scale(0.8); opacity: 0; }
        }
        @keyframes orbitParticle {
          0% { transform: rotate(0deg) translateX(160px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(160px) rotate(-360deg); }
        }
        @keyframes smokePuff {
          0% { transform: translate(0, 0) scale(0.3); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translate(0, -400px) scale(3); opacity: 0; }
        }
        @keyframes fireFlick {
          0%, 100% { transform: translateY(0) scaleY(1) scaleX(1); opacity: 0.95; filter: blur(2px); }
          25% { transform: translateY(-15px) scaleY(1.3) scaleX(0.85); opacity: 0.8; }
          50% { transform: translateY(-30px) scaleY(1.5) scaleX(1.1); opacity: 0.6; filter: blur(4px); }
          75% { transform: translateY(-20px) scaleY(1.2) scaleX(0.9); opacity: 0.75; }
        }
        @keyframes embers {
          0% { transform: translateY(0) translateX(0); opacity: 1; }
          100% { transform: translateY(-300px) translateX(40px); opacity: 0; }
        }
        @keyframes wave {
          0% { transform: translateY(0) scaleX(1); opacity: 0.8; }
          100% { transform: translateY(-200px) scaleX(2); opacity: 0; }
        }
        @keyframes bubble {
          0% { transform: translateY(0) scale(0.5); opacity: 0.8; }
          100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
        }
        @keyframes commonFade {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes textChar {
          0% { transform: translateY(20px) scale(0.5); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      {/* ═════════ 🟢 LEGEND EFFECTS (Hall of Fame) ═════════ */}

      {isLegend && (
        <>
          {/* Green shockwave */}
          <div style={{
            position:"fixed",top:"50%",left:"50%",
            width:80,height:80,borderRadius:"50%",
            border:`6px solid ${cfg.color}`,
            animation:"shockwave 1.5s ease-out",
            pointerEvents:"none",zIndex:9501,
          }}/>
          {/* Green falling confetti — fewer */}
          {[...Array(18)].map((_, i) => {
            const size = [8, 12][i % 2];
            const color = ["#22c55e", "#86efac"][i % 2];
            const left = `${(i * 5.5) % 100}%`;
            const delay = `${(i * 0.1) % 2}s`;
            const duration = 2.8 + ((i % 5) * 0.2);
            return (
              <div key={`legendconfetti-${i}`} style={{
                position:"fixed",top:-20,left,
                width:size,height:size,
                background:color,
                borderRadius: i % 2 === 0 ? "50%" : "2px",
                animation:`fallParticle ${duration}s linear ${delay} infinite`,
                opacity:0.7,
                pointerEvents:"none",zIndex:9502,
              }}/>
            );
          })}
        </>
      )}

      {/* ═════════ 🏆 LEGENDARY EFFECTS ═════════ */}

      {isLegendary && (
        <>
          {/* Shockwave ring - emanates from center */}
          <div style={{
            position:"fixed",top:"50%",left:"50%",
            width:80,height:80,borderRadius:"50%",
            border:`6px solid ${cfg.color}`,
            animation:"shockwave 1.5s ease-out",
            pointerEvents:"none",zIndex:9501,
          }}/>
          {/* Rotating light rays — just 6 (was 12+16) */}
          <div style={{
            position:"fixed",top:"50%",left:"50%",
            width:"200vw",height:"200vh",
            animation:"rayRotate 8s linear infinite",
            pointerEvents:"none",zIndex:9501,
            transform:"translate(-50%, -50%)",
          }}>
            {[...Array(6)].map((_, i) => (
              <div key={`ray-${i}`} style={{
                position:"absolute",
                top:"50%",left:"50%",
                width:8,height:"100vh",
                background:`linear-gradient(180deg, transparent, ${cfg.color}cc, transparent)`,
                transformOrigin:"top center",
                transform:`translate(-50%, 0) rotate(${i * 60}deg)`,
                opacity:0.7,
              }}/>
            ))}
          </div>
          {/* Gold falling particles — 25 (was 80) */}
          {[...Array(25)].map((_, i) => {
            const size = [8, 12][i % 2];
            return (
              <div key={`gold-${i}`} style={{
                position:"fixed",
                top:"-100px",
                left:`${Math.random() * 100}%`,
                width:size,height:size,
                background:["#fbbf24","#fde68a","#f59e0b"][i%3],
                borderRadius: i%2 ? "50%" : "2px",
                animation:`goldFall ${2.5 + Math.random() * 2}s linear infinite ${Math.random() * 2}s`,
                pointerEvents:"none",
                boxShadow:`0 0 ${size}px ${cfg.color}`,
                zIndex:9502,
              }}/>
            );
          })}
        </>
      )}

      {/* ═════════ 💎 EPIC EFFECTS ═════════ */}
      {isEpic && (
        <>
          {/* Shockwave */}
          <div style={{
            position:"fixed",top:"50%",left:"50%",
            width:80,height:80,borderRadius:"50%",
            border:`5px solid ${cfg.color}`,
            animation:"shockwave 1.3s ease-out",
            pointerEvents:"none",zIndex:9501,
          }}/>
          {/* 6 purple beams (was 10+14) */}
          <div style={{
            position:"fixed",top:"50%",left:"50%",
            width:"200vw",height:"200vh",
            animation:"rayRotate 10s linear infinite",
            pointerEvents:"none",zIndex:9501,
            transform:"translate(-50%, -50%)",
          }}>
            {[...Array(6)].map((_, i) => (
              <div key={`epicray-${i}`} style={{
                position:"absolute",
                top:"50%",left:"50%",
                width:7,height:"100vh",
                background:`linear-gradient(180deg, transparent, ${cfg.color}, transparent)`,
                transformOrigin:"top center",
                transform:`translate(-50%, 0) rotate(${i * 60}deg)`,
                opacity:0.7,
              }}/>
            ))}
          </div>
          {/* Falling purple diamonds — 15 (was 40) */}
          {[...Array(15)].map((_, i) => {
            const size = [14, 22][i % 2];
            return (
              <div key={`pdiamond-${i}`} style={{
                position:"fixed",
                top:"-100px",
                left:`${Math.random() * 100}%`,
                fontSize:size,
                animation:`goldFall ${2.5 + Math.random() * 2}s linear infinite ${Math.random() * 2}s`,
                pointerEvents:"none",
                zIndex:9502,
                filter:`drop-shadow(0 0 ${size}px ${cfg.color})`,
              }}>💎</div>
            );
          })}
        </>
      )}

      {/* ═════════ 🔥 RARE EFFECTS ═════════ */}
      {isRare && (
        <>
          {/* Red shockwave */}
          <div style={{
            position:"fixed",top:"50%",left:"50%",
            width:80,height:80,borderRadius:"50%",
            border:`4px solid ${cfg.color}`,
            animation:"shockwave 1.2s ease-out",
            pointerEvents:"none",zIndex:9501,
          }}/>
          {/* Fire at bottom */}
          {[...Array(30)].map((_, i) => (
            <div key={`fire-${i}`} style={{
              position:"fixed",
              bottom:`${5 + Math.random() * 20}%`,
              left:`${5 + Math.random() * 90}%`,
              width:30,height:60,
              borderRadius:"50% 50% 20% 20%",
              background:`linear-gradient(180deg, #fef3c7 0%, #fbbf24 20%, #ef4444 60%, #7f1d1d 100%)`,
              filter:"blur(5px)",
              animation:`fireFlick ${0.5 + Math.random() * 0.6}s ease-in-out infinite ${Math.random() * 0.8}s`,
              pointerEvents:"none",
              zIndex:9501,
            }}/>
          ))}
          {/* Embers floating up */}
          {[...Array(40)].map((_, i) => (
            <div key={`ember-${i}`} style={{
              position:"fixed",
              bottom:`${Math.random() * 30}%`,
              left:`${Math.random() * 100}%`,
              width:4,height:4,
              borderRadius:"50%",
              background:["#fbbf24","#fde68a","#ef4444"][i%3],
              boxShadow:`0 0 6px ${["#fbbf24","#fde68a","#ef4444"][i%3]}`,
              animation:`embers ${2 + Math.random() * 2}s linear infinite ${Math.random() * 2}s`,
              pointerEvents:"none",
              zIndex:9502,
              "--ember-tx": `${(Math.random() - 0.5) * 120}px`,
            }}/>
          ))}
        </>
      )}

      {/* ═════════ 💧 UNCOMMON EFFECTS ═════════ */}
      {isUncommon && (
        <>
          {/* Blue shockwave */}
          <div style={{
            position:"fixed",top:"50%",left:"50%",
            width:80,height:80,borderRadius:"50%",
            border:`3px solid ${cfg.color}`,
            animation:"shockwave 1.1s ease-out",
            pointerEvents:"none",zIndex:9501,
          }}/>
          {/* Waves rising */}
          {[...Array(20)].map((_, i) => (
            <div key={`wave-${i}`} style={{
              position:"fixed",
              bottom:"-50px",
              left:`${Math.random() * 100}%`,
              width:60,height:30,
              borderRadius:"50%",
              background:`radial-gradient(ellipse, ${cfg.color}88 0%, transparent 70%)`,
              animation:`wave ${2.5 + Math.random() * 1.5}s ease-out infinite ${Math.random() * 2}s`,
              pointerEvents:"none",
              zIndex:9501,
              filter:"blur(6px)",
            }}/>
          ))}
          {/* Bubbles rising */}
          {[...Array(25)].map((_, i) => {
            const sz = 6 + Math.random() * 14;
            return (
              <div key={`bub-${i}`} style={{
                position:"fixed",
                bottom:"-30px",
                left:`${Math.random() * 100}%`,
                width:sz,height:sz,
                borderRadius:"50%",
                background:`radial-gradient(circle at 30% 30%, #fff, ${cfg.color}66)`,
                border:`1px solid ${cfg.color}`,
                animation:`bubble ${3 + Math.random() * 2}s linear infinite ${Math.random() * 2.5}s`,
                pointerEvents:"none",
                zIndex:9502,
                opacity:0.7,
              }}/>
            );
          })}
        </>
      )}

      {/* ═════════ ⚪ COMMON — simple but nice ═════════ */}
      {!isLegendary && !isEpic && !isRare && !isUncommon && (
        <>
          {/* Soft white shockwave */}
          <div style={{
            position:"fixed",top:"50%",left:"50%",
            width:80,height:80,borderRadius:"50%",
            border:`2px solid ${cfg.color}`,
            animation:"shockwave 1s ease-out",
            pointerEvents:"none",zIndex:9501,
          }}/>
          {/* Floating dots */}
          {[...Array(15)].map((_, i) => (
            <div key={`dot-${i}`} style={{
              position:"fixed",
              top:`${Math.random() * 100}%`,
              left:`${Math.random() * 100}%`,
              width:4,height:4,
              borderRadius:"50%",
              background:cfg.color,
              animation:`sparkle 2s ease-in-out infinite ${Math.random() * 2}s`,
              pointerEvents:"none",
              zIndex:9501,
            }}/>
          ))}
        </>
      )}

      {/* ═════════ Universal: confetti burst on entry ═════════ */}
      {(isLegend || isLegendary || isEpic) && (
        <ConfettiBurst count={isLegend ? 28 : isLegendary ? 20 : 14} />
      )}

      {/* ═════════ Tier announcement ═════════ */}
      {(
        <div style={{
          fontSize: stolen ? 32 : isLegend ? 38 : isLegendary ? 36 : isEpic ? 26 : 22,
          fontWeight:900,
          color: stolen ? "#ef4444" : cfg.color,
          textShadow: stolen
            ? "0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.6)"
            : `0 0 30px ${cfg.glow}, 0 0 60px ${cfg.glow}`,
          marginBottom:24,
          letterSpacing: stolen ? 4 : isLegend ? 9 : isLegendary ? 8 : isEpic ? 5 : 3,
          zIndex:9510,
          position:"relative",
          textAlign:"center",
          animation: "textChar 0.5s ease-out 0.5s both",
          opacity: 1,
          direction:"ltr",
        }}>
          {stolen ? "💔 קלף נגנב! 💔" : isLegend ? "🟢 LEGEND 🟢" : isFriend ? "🎴 FRIEND CARD 🎴" : isTrash ? "🗑️ 🇮🇱 🗑️" : isLegendary ? "🏆 LEGENDARY 🏆" : `${cfg.emoji} ${cfg.label}!`}
        </div>
      )}

      {/* ═════════ The card itself ═════════ */}
      <div style={{
        animation: `cardFlip 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        borderRadius:16,
        zIndex:9510,
        position:"relative",
        filter: isLegendary
          ? `drop-shadow(0 0 30px ${cfg.glow}) drop-shadow(0 0 60px ${cfg.glow})`
          : isEpic
          ? `drop-shadow(0 0 20px ${cfg.glow}) drop-shadow(0 0 40px ${cfg.glow})`
          : isRare
          ? `drop-shadow(0 0 16px ${cfg.glow})`
          : "none",
      }}>
        <PlayerCard card={card} size="L" animated={true} />
      </div>

      {/* Duplicate info */}
      {isDuplicate && (
        <div style={{
          marginTop:20,
          padding:"10px 18px",
          background:"rgba(251,191,36,0.18)",
          border:"1px solid rgba(251,191,36,0.5)",
          borderRadius:10,
          color:"#fbbf24",fontSize:13,fontWeight:700,
          display:"flex",alignItems:"center",gap:8,
          zIndex:9510,
          position:"relative",
          animation:"textChar 0.4s ease-out",
        }}>
          <span>🔁</span>
          <span>{t("roulette.duplicate")} · +{refund} 🪙</span>
        </div>
      )}

      {/* Tap to close */}
      {(
        <div style={{
          marginTop:24,
          fontSize:11,color:"#cbd5e1",letterSpacing:2,
          opacity:0.7,
          zIndex:9510,
          position:"relative",
          animation:"textChar 0.4s ease-out",
        }}>
          {t("roulette.tapToClose")}
        </div>
      )}
    </div>
  );
}

// ─── 🃏 COLLECTION VIEWER ──────────────────────────────────────────────────
function CollectionModal({ collection, onClose }) {
  const t = useT();
  const [section, setSection] = useState("players"); // "players" | "legends"
  const [filter, setFilter] = useState("all");
  const [previewCard, setPreviewCard] = useState(null);

  const filteredCards = useMemo(() => {
    const rarityOrder = { F: 0, X: 1, G: 2, L: 3, E: 4, R: 5, U: 6, C: 7, T: 8 };
    const sorter = (a, b) => {
      const r = (rarityOrder[a.rarity] ?? 99) - (rarityOrder[b.rarity] ?? 99);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name);
    };
    // Pool is determined by section
    const pool = section === "legends" ? [...LEGEND_CARDS, ...ISRAELI_LEGENDS, ...FRIEND_CARDS] : CARDS;
    let cards;
    if (filter === "all") cards = pool;
    else if (filter === "owned") cards = pool.filter(c => (collection[c.id] || 0) > 0);
    else if (filter === "missing") cards = pool.filter(c => (collection[c.id] || 0) === 0);
    else cards = pool.filter(c => c.rarity === filter);
    return [...cards].sort(sorter);
  }, [section, filter, collection]);

  // Stats — per section
  const sectionPool = section === "legends" ? [...LEGEND_CARDS, ...ISRAELI_LEGENDS, ...FRIEND_CARDS] : CARDS;
  const ownedCount = sectionPool.filter(c => (collection[c.id] || 0) > 0).length;
  const totalCount = sectionPool.length;
  const pct = Math.round((ownedCount / totalCount) * 100);

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9000,
      background:"rgba(0,0,0,0.92)",
      backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:14,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth:520,width:"100%",maxHeight:"92vh",
        background:"linear-gradient(180deg,#2c3956,#243150)",
        border:"1px solid rgba(251,191,36,0.3)",
        borderRadius:18,padding:"20px 16px",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
        display:"flex",flexDirection:"column",overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div>
            <div style={{fontSize:9,color:"#fbbf24",letterSpacing:3,fontWeight:800}}>{t("roulette.title")}</div>
            <h2 style={{margin:"2px 0 0",fontSize:18,color:"#f1f5f9",fontWeight:900}}>🃏 {t("collection.title")}</h2>
          </div>
          <button onClick={onClose} style={{
            background:"transparent",border:"none",color:"#94a3b8",fontSize:22,
            cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",
          }}>✕</button>
        </div>

        {/* 🎯 Section toggle — Players vs Legends */}
        <div style={{
          display:"flex",gap:0,marginBottom:10,
          background:"rgba(36,49,80,0.6)",borderRadius:10,padding:3,
        }}>
          <button onClick={() => { setSection("players"); setFilter("all"); }} style={{
            flex:1,padding:"8px 6px",border:"none",borderRadius:8,
            background: section === "players" ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "transparent",
            color: section === "players" ? "#1e2940" : "#94a3b8",
            fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
          }}>⚽ שחקני המונדיאל</button>
          <button onClick={() => { setSection("legends"); setFilter("all"); }} style={{
            flex:1,padding:"8px 6px",border:"none",borderRadius:8,
            background: section === "legends" ? "linear-gradient(135deg,#16a34a,#22c55e)" : "transparent",
            color: section === "legends" ? "#0a0a0a" : "#94a3b8",
            fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"inherit",
          }}>🟢 אגדות 🗑️</button>
        </div>

        {/* Progress */}
        <div style={{background:"rgba(36,49,80,0.6)",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6}}>
            <span style={{color:"#cbd5e1",fontWeight:700}}>{ownedCount} / {totalCount} {t("collection.collected")}</span>
            <span style={{color: section === "legends" ? "#22c55e" : "#fbbf24",fontWeight:800}}>{pct}%</span>
          </div>
          <div style={{height:6,background:"rgba(71,85,105,0.3)",borderRadius:3,overflow:"hidden"}}>
            <div style={{
              width:`${pct}%`,height:"100%",
              background: section === "legends"
                ? "linear-gradient(90deg,#22c55e,#86efac)"
                : "linear-gradient(90deg,#fbbf24,#f59e0b)",
              borderRadius:3,transition:"width 0.4s",
            }}/>
          </div>
        </div>

        {/* Filter pills (rarity filters — but only relevant to current section) */}
        <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",paddingBottom:4}}>
          {(section === "legends" ? [
            { id: "all", label: t("collection.all") },
            { id: "owned", label: `✓ ${t("collection.owned")}` },
            { id: "missing", label: `🔒 ${t("collection.missing")}` },
          ] : [
            { id: "all", label: t("collection.all") },
            { id: "owned", label: `✓ ${t("collection.owned")}` },
            { id: "missing", label: `🔒 ${t("collection.missing")}` },
            { id: "L", label: RARITY_CONFIG.L.label, color: RARITY_CONFIG.L.color },
            { id: "E", label: RARITY_CONFIG.E.label, color: RARITY_CONFIG.E.color },
            { id: "R", label: RARITY_CONFIG.R.label, color: RARITY_CONFIG.R.color },
            { id: "U", label: RARITY_CONFIG.U.label, color: RARITY_CONFIG.U.color },
            { id: "C", label: RARITY_CONFIG.C.label, color: RARITY_CONFIG.C.color },
          ]).map(f => {
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={()=>setFilter(f.id)} style={{
                flexShrink:0,
                padding:"5px 10px",borderRadius:14,
                background: active ? (f.color ? `${f.color}22` : "rgba(251,191,36,0.18)") : "transparent",
                color: active ? (f.color || "#fbbf24") : "#94a3b8",
                border:`1px solid ${active ? (f.color || "#fbbf24") : "rgba(71,85,105,0.3)"}`,
                fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                whiteSpace:"nowrap",letterSpacing:0.5,
              }}>{f.label}</button>
            );
          })}
        </div>

        {/* Cards grid — for legends section: split into Legends + Israel sub-sections */}
        {section === "legends" ? (
          <div style={{flex:1,overflowY:"auto",padding:"4px"}}>
            {(() => {
              const legends = filteredCards.filter(c => c.rarity === "G");
              // 🎴 Friends — ONLY show ones the user has unlocked (they're a surprise)
              const friends = filteredCards.filter(c => c.rarity === "F" && (collection[c.id] || 0) > 0);
              const israelis = filteredCards.filter(c => c.rarity === "T");
              const renderCard = (card) => {
                const count = collection[card.id] || 0;
                const owned = count > 0;
                return (
                  <div key={card.id}
                    onClick={() => owned && setPreviewCard(card)}
                    className="card-tilt"
                    style={{position:"relative",cursor:owned?"pointer":"default",
                      opacity: owned ? 1 : 0.35,filter: owned ? "none" : "grayscale(1)",
                    }}>
                    <PlayerCard card={card} size="S" animated={owned} />
                    {!owned && (
                      <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🔒</div>
                    )}
                    {count > 1 && (
                      <div style={{position:"absolute",top:4,right:4,background:"#fbbf24",color:"#1e2940",
                        fontSize:9,fontWeight:900,borderRadius:8,padding:"2px 5px",border:"1px solid #1e2940"}}>×{count}</div>
                    )}
                  </div>
                );
              };
              return (
                <>
                  {friends.length > 0 && (
                    <>
                      <div style={{fontSize:10,color:"#ec4899",letterSpacing:2,fontWeight:800,marginBottom:8,marginTop:4}}>
                        🎴 חברי הליגה ({friends.length})
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(95px, 1fr))",gap:8,marginBottom:16}}>
                        {friends.map(renderCard)}
                      </div>
                    </>
                  )}
                  {legends.length > 0 && (
                    <>
                      <div style={{fontSize:10,color:"#22c55e",letterSpacing:2,fontWeight:800,marginBottom:8,marginTop:4}}>
                        🟢 אגדות הכדורגל ({legends.length})
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(95px, 1fr))",gap:8,marginBottom:16}}>
                        {legends.map(renderCard)}
                      </div>
                    </>
                  )}
                  {israelis.length > 0 && (
                    <>
                      <div style={{fontSize:10,color:"#a16207",letterSpacing:2,fontWeight:800,marginBottom:8,marginTop:4}}>
                        🗑️ 🇮🇱 נבחרת ישראל 🇮🇱 🗑️ ({israelis.length})
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(95px, 1fr))",gap:8}}>
                        {israelis.map(renderCard)}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
        /* Cards grid — regular players section */
        <div style={{
          flex:1,overflowY:"auto",
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(95px, 1fr))",
          gap:8,padding:"4px",
        }}>
          {filteredCards.map(card => {
            const count = collection[card.id] || 0;
            const owned = count > 0;
            return (
              <div
                key={card.id}
                onClick={owned ? () => setPreviewCard(card) : undefined}
                className={owned ? "card-tilt" : ""}
                style={{
                  position:"relative",
                  opacity: owned ? 1 : 0.3,
                  filter: owned ? "none" : "grayscale(1)",
                  cursor: owned ? "pointer" : "default",
                }}
              >
                <PlayerCard card={card} size="S" animated={owned} />
                {!owned && (
                  <div style={{
                    position:"absolute",top:0,left:0,right:0,bottom:0,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:24,
                  }}>🔒</div>
                )}
                {count > 1 && (
                  <div style={{
                    position:"absolute",top:4,right:4,
                    background:"#fbbf24",color:"#1e2940",
                    fontSize:9,fontWeight:900,
                    borderRadius:8,padding:"2px 5px",
                    border:"1px solid #1e2940",
                  }}>×{count}</div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* 🎉 Preview reveal — replay the wow animation for an owned card */}
      {previewCard && (
        <div onClick={e => e.stopPropagation()}>
          <CardRevealModal
            result={{ card: previewCard, isDuplicate: false, refund: 0 }}
            onClose={() => setPreviewCard(null)}
          />
        </div>
      )}
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
        color: "#1e2940",
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
        background:"linear-gradient(145deg,#2c3956,#243150)",
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
            ? "linear-gradient(135deg,rgba(34,197,94,0.18),rgba(36,49,80,0.5))"
            : "linear-gradient(135deg,rgba(71,85,105,0.15),rgba(36,49,80,0.5))",
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
        background:"linear-gradient(145deg,#2c3956,#243150)",
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
        <div style={{background:"rgba(36,49,80,0.6)",border:"1px solid rgba(71,85,105,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
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
        <div style={{background:"linear-gradient(135deg,rgba(168,85,247,0.1),rgba(36,49,80,0.6))",border:"1px solid rgba(168,85,247,0.4)",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
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
        <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(36,49,80,0.6))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
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
      <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(36,49,80,0.6))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:14,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:"#fbbf24",letterSpacing:2,fontWeight:700}}>{t("bonus.tournamentWinner")}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{t("bonus.pickOneTeam")}</div>
          </div>
          <div style={{background:"#fbbf24",color:"#1e2940",fontSize:11,fontWeight:900,padding:"3px 8px",borderRadius:6,letterSpacing:1}}>{t("bonus.fiftyPts")}</div>
        </div>

        {winnerPick ? (
          <div style={{
            background:"linear-gradient(135deg,#fbbf24,#d97706)",
            color:"#1e2940",borderRadius:10,padding:"10px 12px",
            display:"flex",alignItems:"center",gap:10,
          }}>
            <span style={{fontSize:28}}>{winnerPick.flag || winnerPick.f}</span>
            <span style={{flex:1,fontSize:16,fontWeight:900}}>{winnerPick.name || winnerPick.n}</span>
            {!isLocked && (
              <button onClick={()=>setWinnerPick(null)} style={{background:"rgba(30,41,64,0.2)",border:"none",borderRadius:6,padding:"4px 10px",color:"#1e2940",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("bonus.change")}</button>
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
      <div style={{background:"linear-gradient(135deg,rgba(168,85,247,0.08),rgba(36,49,80,0.6))",border:"1px solid rgba(168,85,247,0.3)",borderRadius:14,padding:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:"#a855f7",letterSpacing:2,fontWeight:700}}>{t("bonus.goldenBoot")}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{t("bonus.pickPlayer")}</div>
          </div>
          <div style={{background:"#a855f7",color:"#1e2940",fontSize:11,fontWeight:900,padding:"3px 8px",borderRadius:6,letterSpacing:1}}>{t("bonus.fivePerGoal")}</div>
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
            <div style={{display:"flex",background:"rgba(36,49,80,0.6)",borderRadius:8,padding:2,marginBottom:10}}>
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
                  background:"#1e2940",border:"1px solid rgba(71,85,105,0.4)",
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
                  background:"#1e2940",border:"1px solid rgba(71,85,105,0.4)",
                  color:"#f1f5f9",fontFamily:"inherit",outline:"none",
                  marginBottom:6,boxSizing:"border-box",
                }}/>
                <input value={customTeam} onChange={e=>setCustomTeam(e.target.value)} placeholder={t("bonus.team")} style={{
                  width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                  background:"#1e2940",border:"1px solid rgba(71,85,105,0.4)",
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
        background:"linear-gradient(135deg,rgba(168,85,247,0.05),rgba(36,49,80,0.6))",
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
        background:"linear-gradient(145deg,#2c3956,#243150)",
        border:"1px solid rgba(251,191,36,0.3)",
        borderRadius:20,padding:"30px 24px",maxWidth:400,width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)",animation:"fadeUp 0.5s ease-out",
      }}>
        <div style={{textAlign:"center",fontSize:54,marginBottom:6,animation:"bounce 2s infinite"}}>⚽</div>
        <h1 style={{fontSize:24,textAlign:"center",margin:"0 0 6px",background:"linear-gradient(180deg,#fde68a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>{t("welcome.title")}</h1>
        <p style={{textAlign:"center",color:"#94a3b8",fontSize:12,margin:"0 0 16px",fontStyle:"italic"}}>{t("welcome.subtitle") || tagline}</p>

        {/* Scoring rules preview */}
        <div style={{background:"rgba(36,49,80,0.6)",border:"1px solid rgba(71,85,105,0.3)",borderRadius:10,padding:"10px 12px",marginBottom:18}}>
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

function MatchCard({ fixture, pick, actual, onPick, showResults, homeInputId, awayInputId, nextInputId, lockable = true, leagueMembers = null, onShowDetails = null, defaultCollapsed = false }) {
  const [showAllPicks, setShowAllPicks] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const t = useT();
  const { lang } = useContext(LangContext);
  const isRTL = lang === "he";
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

  // Only highlight winning side in GREEN after the user has *just* edited.
  // On entering the page, scores show in neutral color so it doesn't look
  // like the app is grading their predictions.
  const [justEdited, setJustEdited] = useState(false);
  useEffect(() => {
    if (!justEdited) return;
    const handle = setTimeout(() => setJustEdited(false), 2500);
    return () => clearTimeout(handle);
  }, [justEdited, h, a]);
  const showHighlight = justEdited;

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
  // We persist "seen" state in localStorage so re-entering the screen doesn't replay.
  const [reaction, setReaction] = useState(null);
  const prevCompleteRef = useRef(false);
  useEffect(() => {
    if (!hasResult) {
      prevCompleteRef.current = false;
      return;
    }
    if (prevCompleteRef.current) return; // already triggered this mount
    // Check if we've ever shown a reaction for this match before
    let seenReactions = {};
    try {
      const raw = localStorage.getItem("wc2026_reactions_v1");
      if (raw) seenReactions = JSON.parse(raw);
    } catch {}
    const key = `${fixture.id}:${h}-${a}`;
    if (seenReactions[key]) {
      prevCompleteRef.current = true;
      return; // already saw a reaction for this pick — don't replay
    }
    // First time! Show reaction and mark as seen
    const r = getReaction(h, a);
    setReaction({ ...r, key: Date.now() });
    try { navigator.vibrate?.(15); } catch {}
    seenReactions[key] = 1;
    try { localStorage.setItem("wc2026_reactions_v1", JSON.stringify(seenReactions)); } catch {}
    const tm = setTimeout(()=>setReaction(null), 1600);
    prevCompleteRef.current = true;
    return () => clearTimeout(tm);
  }, [hasResult, h, a, fixture.id]);

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
    setJustEdited(true);
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
      boxShadow: sc
        ? (score.type === "exact" ? "0 0 20px rgba(251,191,36,0.25), 0 4px 12px rgba(0,0,0,0.2)"
          : score.type === "result" ? "0 0 16px rgba(34,197,94,0.22), 0 4px 12px rgba(0,0,0,0.2)"
          : "0 0 14px rgba(248,113,113,0.18), 0 4px 12px rgba(0,0,0,0.2)")
        : "0 2px 8px rgba(0,0,0,0.15)",
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
            color:"#1e2940",padding:"6px 12px",borderRadius:20,
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
        {!sc && !isLocked && hasResult && <span style={{color:"#22c55e"}} title={t("matchcard.predicted")}>✓</span>}
        {!sc && !isLocked && !hasResult && <span style={{color:"#64748b",opacity:0.5}} title={t("matchcard.noPick")}>⚪</span>}
        {/* 🗜️ Collapse toggle — only for finished matches */}
        {actual && actual.h !== undefined && actual.h !== "" && actual.isLive !== true && (
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background:"transparent",border:"none",
              color:"#94a3b8",cursor:"pointer",
              fontSize:14,padding:"2px 6px",
              fontFamily:"inherit",
            }}
            title={collapsed ? "הרחב" : "צמצם"}
          >
            {collapsed ? "🔽" : "🔼"}
          </button>
        )}
      </div>
      {/* 🗜️ Compact view when collapsed */}
      {collapsed && actual && actual.h !== undefined && actual.h !== "" ? (
        <div
          onClick={() => setCollapsed(false)}
          style={{
            display:"grid",
            gridTemplateColumns:"1fr auto 1fr",
            alignItems:"center",
            gap:8,padding:"10px 8px",
            direction:"ltr",cursor:"pointer",
            background: sc?.bg || "rgba(36,49,80,0.3)",
            borderRadius:8,
            border:`1px solid ${sc?.border || "rgba(71,85,105,0.4)"}`,
          }}
        >
          <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9",textAlign:"right"}}>
            {home.f} {home.n}
          </span>
          <span style={{
            fontSize:15,fontWeight:900,
            color: sc?.text || "#22c55e",
            padding:"3px 10px",
            background:"#1e2940",borderRadius:6,
            unicodeBidi:"isolate",
            whiteSpace:"nowrap",
          }}>{actual.h} - {actual.a}</span>
          <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9",textAlign:"left"}}>
            {away.n} {away.f}
          </span>
        </div>
      ) : (
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:8,direction:"ltr"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end",opacity:(result==="away" && showHighlight)?0.5:1}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:0}}>
            <span style={{fontSize:13,fontWeight:result==="home"?800:500,color:"#f1f5f9",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{home.n}</span>
            {fifaRank(home.n) && (
              <span style={{fontSize:9,color:"#64748b",letterSpacing:0.5,marginTop:1}}>#{fifaRank(home.n)}</span>
            )}
          </div>
          <span className="flag-wave" style={{fontSize:22}}>{home.f}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <input id={homeInputId} type="text" inputMode="numeric" value={h}
            onChange={e=>handleInput("h", e)}
            onKeyDown={e=>handleKeyDown("h", e)}
            onFocus={e=>e.target.select()}
            readOnly={isLocked}
            placeholder={isLocked?"·":"—"}
            style={{width:36,height:36,textAlign:"center",
              background: isLocked?"rgba(71,85,105,0.2)":"#1e2940",
              border:`1px solid ${isLocked?"rgba(71,85,105,0.4)":((result==="home" && showHighlight)?"#22c55e":"rgba(71,85,105,0.5)")}`,
              borderRadius:8,
              color: isLocked?"#64748b":((result==="home" && showHighlight)?"#22c55e":"#f1f5f9"),
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
              background: isLocked?"rgba(71,85,105,0.2)":"#1e2940",
              border:`1px solid ${isLocked?"rgba(71,85,105,0.4)":((result==="away" && showHighlight)?"#22c55e":"rgba(71,85,105,0.5)")}`,
              borderRadius:8,
              color: isLocked?"#64748b":((result==="away" && showHighlight)?"#22c55e":"#f1f5f9"),
              fontSize:18,fontWeight:800,fontFamily:"inherit",outline:"none",
              cursor: isLocked?"not-allowed":"text",
            }}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,opacity:(result==="home" && showHighlight)?0.5:1}}>
          <span className="flag-wave" style={{fontSize:22, animationDelay:"1.5s"}}>{away.f}</span>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",minWidth:0}}>
            <span style={{fontSize:13,fontWeight:result==="away"?800:500,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{away.n}</span>
            {fifaRank(away.n) && (
              <span style={{fontSize:9,color:"#64748b",letterSpacing:0.5,marginTop:1}}>#{fifaRank(away.n)}</span>
            )}
          </div>
        </div>
      </div>
      )}
      {/* 💡 Editable hint — only when not locked + has pick */}
      {!collapsed && !isLocked && hasResult && (
        <div style={{
          marginTop:6,fontSize:9,color:"#64748b",
          textAlign:"center",letterSpacing:1,
        }}>
          ✏️ ניתן לערוך עד שעה לפני המשחק
        </div>
      )}
      {/* 📡 Waiting for API result when match started but no actual yet */}
      {(() => {
        const matchStarted = Date.now() >= new Date(fixture.kickoff).getTime();
        const minSinceKickoff = (Date.now() - new Date(fixture.kickoff).getTime()) / (60 * 1000);
        const hasActual = actual && actual.h !== undefined && actual.h !== "";
        if (!matchStarted || hasActual || minSinceKickoff > 240) return null;
        return (
          <div style={{
            marginTop:8,paddingTop:8,
            borderTop:"1px solid rgba(71,85,105,0.3)",
          }}>
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:6,
              padding:"6px 10px",
              background:"rgba(239,68,68,0.08)",
              border:"1px solid rgba(239,68,68,0.3)",
              borderRadius:8,
              fontSize:11,color:"#fca5a5",fontWeight:700,
            }}>
              <span style={{
                width:6,height:6,borderRadius:"50%",
                background:"#ef4444",
                boxShadow:"0 0 8px #ef4444",
                animation:"livePulse 1.2s ease-in-out infinite",
                display:"inline-block",
              }}/>
              🔴 משחק חי — לחץ "🔄 רענן" לקבלת תוצאה
            </div>
          </div>
        );
      })()}
      {!collapsed && actual && actual.h !== undefined && actual.h !== "" && (() => {
        const matchStarted = Date.now() >= new Date(fixture.kickoff).getTime();
        const minSinceKickoff = (Date.now() - new Date(fixture.kickoff).getTime()) / (60 * 1000);
        // 🔴 Use the API's isLive flag if present, fallback to time-based
        const isLive = actual.isLive === true || (matchStarted && minSinceKickoff <= 120 && actual.isFinished !== true);
        return (
        <div style={{
          marginTop:8,paddingTop:8,
          borderTop:"1px solid rgba(71,85,105,0.3)",
        }}>
          <div style={{
            display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:8,
            padding:"6px 4px",direction:"ltr",
            background: sc?.bg || "rgba(36,49,80,0.5)",
            borderRadius:8,
            border: `1px solid ${sc?.border || "rgba(71,85,105,0.4)"}`,
          }}>
            <div style={{textAlign:"right",fontSize:10,color: isLive ? "#ef4444" : "#94a3b8",letterSpacing:1,fontWeight:700,display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
              {isLive && (
                <span style={{
                  width:6,height:6,borderRadius:"50%",
                  background:"#ef4444",
                  boxShadow:"0 0 8px #ef4444",
                  animation:"livePulse 1.2s ease-in-out infinite",
                  display:"inline-block",
                }}/>
              )}
              {isLive ? "LIVE" : "FINAL SCORE"}
            </div>
            <div style={{
              display:"flex",alignItems:"center",gap:4,
              background:"#1e2940",border:`1px solid ${sc?.border || (isLive ? "#ef4444" : "#22c55e")}`,
              borderRadius:6,padding:"3px 10px",justifyContent:"center",
              color: sc?.text || (isLive ? "#ef4444" : "#22c55e"),fontWeight:900,fontSize:16,
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
        );
      })()}
      {!collapsed && fixture.venue && (
        <div style={{marginTop:5,fontSize:9,color:"#475569",textAlign:"center",letterSpacing:1}}>
          📍 {fixture.venue}
        </div>
      )}

      {/* 📊 View match details button — only for finished matches with onShowDetails */}
      {!collapsed && actual && actual.h !== undefined && actual.h !== "" && onShowDetails && (
        <button
          onClick={() => onShowDetails(fixture)}
          style={{
            marginTop:10,width:"100%",
            padding:"10px 12px",
            background:"linear-gradient(135deg,rgba(168,85,247,0.15),rgba(168,85,247,0.05))",
            border:"1px solid rgba(168,85,247,0.4)",
            borderRadius:8,
            color:"#a855f7",fontSize:12,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          }}>
          ⚽ ראה מי הבקיע
        </button>
      )}

      {/* 📺 FIFA highlights button — only for finished matches */}
      {!collapsed && actual && actual.h !== undefined && actual.h !== "" && actual.isLive !== true && (
        <button
          onClick={() => {
            const query = encodeURIComponent(`${home.n} vs ${away.n} FIFA highlights`);
            window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
          }}
          style={{
            marginTop:8,width:"100%",
            padding:"10px 12px",
            background:"linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))",
            border:"1px solid rgba(239,68,68,0.4)",
            borderRadius:8,
            color:"#ef4444",fontSize:12,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          }}>
          📺 חפש את המשחק ב-YouTube
        </button>
      )}

      {/* 🧠 LEAGUE INSIGHTS: % pick distribution, shown after kickoff */}
      {!collapsed && insights && (
        <div style={{
          marginTop:10,padding:"8px 10px",
          background:"linear-gradient(135deg,rgba(168,85,247,0.08),rgba(36,49,80,0.4))",
          border:"1px solid rgba(168,85,247,0.25)",
          borderRadius:8,
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:9,color:"#a855f7",letterSpacing:2,fontWeight:700}}>🧠 {t("insights.yourLeague")}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:9,color:"#64748b"}}>{insights.total} {insights.total===1 ? t("insights.pick") : t("insights.picks")}</span>
              <button
                onClick={() => setShowAllPicks(true)}
                style={{
                  width:18,height:18,borderRadius:"50%",
                  background:"linear-gradient(135deg,#a855f7,#7c3aed)",
                  color:"#fff",border:"none",fontSize:11,fontWeight:900,
                  cursor:"pointer",fontFamily:"inherit",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  lineHeight:1,boxShadow:"0 2px 6px rgba(168,85,247,0.5)",
                }}
                title="כל הניחושים"
              >!</button>
            </div>
          </div>
          {/* Three-segment bar showing %s — order flipped in RTL so home aligns right */}
          <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:"rgba(36,49,80,0.6)",marginBottom:5,flexDirection: isRTL ? "row-reverse" : "row"}}>
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
          {/* Three-column legend — order also flipped in RTL */}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontVariantNumeric:"tabular-nums",flexDirection: isRTL ? "row-reverse" : "row"}}>
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

      {/* 🧠 All league picks modal */}
      {showAllPicks && leagueMembers && (
        <div onClick={() => setShowAllPicks(false)} style={{
          position:"fixed",inset:0,
          background:"rgba(7,13,30,0.95)",
          zIndex:9999,display:"flex",
          alignItems:"center",justifyContent:"center",padding:14,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            maxWidth:380,width:"100%",maxHeight:"85vh",overflowY:"auto",
            background:"linear-gradient(160deg,#1e293b,#0f172a)",
            borderRadius:16,padding:"18px 14px",
            border:"1px solid rgba(168,85,247,0.4)",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:900,color:"#a855f7"}}>🧠 כל הניחושים</div>
              <button onClick={() => setShowAllPicks(false)} style={{background:"transparent",border:"none",color:"#cbd5e1",fontSize:22,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{fontSize:11,color:"#94a3b8",marginBottom:10,textAlign:"center"}}>
              {home?.f} {home?.n} vs {away?.n} {away?.f}
            </div>
            {(() => {
              const rows = [];
              for (const m of leagueMembers) {
                const p = m.picks?.[fixture.id];
                if (!p || p.h === undefined || p.h === "" || p.a === undefined || p.a === "") continue;
                const ph = parseInt(p.h), pa = parseInt(p.a);
                if (isNaN(ph) || isNaN(pa)) continue;
                rows.push({ name: m.name, uid: m.uid, h: ph, a: pa });
              }
              // 🔒 Sort alphabetically for stable order across re-renders
              rows.sort((a, b) => (a.name || "").localeCompare(b.name || "", "he"));
              if (rows.length === 0) {
                return <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:20}}>אף אחד עוד לא ניחש</div>;
              }
              return (
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {rows.map((r) => {
                    const result = r.h > r.a ? "home" : r.h < r.a ? "away" : "draw";
                    return (
                      <div key={r.uid || r.name} style={{
                        display:"flex",alignItems:"center",justifyContent:"space-between",
                        background:"rgba(36,49,80,0.5)",
                        padding:"8px 12px",borderRadius:8,
                        border:"1px solid rgba(71,85,105,0.3)",
                      }}>
                        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{r.name}</div>
                        <div style={{
                          fontSize:14,fontWeight:900,
                          color: result === "home" ? "#22c55e" : result === "away" ? "#3b82f6" : "#94a3b8",
                          fontVariantNumeric:"tabular-nums",
                          background:"rgba(15,23,42,0.6)",
                          padding:"4px 10px",borderRadius:6,
                          direction:"ltr",
                          unicodeBidi:"isolate",
                        }}>{r.h} - {r.a}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
    <div style={{background:"rgba(36,49,80,0.6)",border:`1px solid ${color}33`,borderRadius:12,padding:"10px 12px",marginTop:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:10,color,letterSpacing:2,fontWeight:700}}>
          {showLive ? "📡 LIVE STANDINGS" : "🔮 PREDICTED STANDINGS"}
        </div>
        {hasActuals && (
          <div style={{display:"flex",background:"rgba(36,49,80,0.8)",borderRadius:6,padding:2,border:"1px solid rgba(71,85,105,0.4)"}}>
            <button onClick={()=>setMode("predicted")} style={{
              padding:"3px 8px",border:"none",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
              background: mode==="predicted" ? color : "transparent",
              color: mode==="predicted" ? "#1e2940" : "#94a3b8",
              fontSize:9,fontWeight:800,letterSpacing:0.5,
            }}>YOURS</button>
            <button onClick={()=>setMode("live")} style={{
              padding:"3px 8px",border:"none",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
              background: mode==="live" ? color : "transparent",
              color: mode==="live" ? "#1e2940" : "#94a3b8",
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
// 🔢 ANIMATED NUMBER — counts up smoothly when value changes
function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  useEffect(() => {
    if (display === value) return;
    fromRef.current = display;
    startRef.current = null;
    const tick = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const next = Math.round(fromRef.current + (value - fromRef.current) * eased);
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);
  return <>{display}</>;
}

// 📊 MATCH DETAILS MODAL — shows goals + stats for a finished match
function MatchDetailsModal({ fixture, apiFixtureId, onClose }) {
  const t = useT();
  const { lang } = useContext(LangContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!apiFixtureId) {
      setError("no_fixture_id");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchMatchDetails(apiFixtureId)
      .then(d => { setDetails(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [apiFixtureId]);

  const home = findTeam(fixture.home);
  const away = findTeam(fixture.away);

  // Find which API team name matches "home" vs "away"
  // (API may swap orders, so we look at details.homeTeam)
  const apiHomeIsOurHome = details?.homeTeam === fixture.home;

  // Group goals by team
  const goals = (details?.events || []).filter(e => e.type === "Goal");

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:9100,
      background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:14,animation:"goalFadeIn 0.25s ease-out",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto",
        background:"linear-gradient(160deg,#243150,#1f2942)",
        border:"1px solid rgba(71,85,105,0.4)",
        borderRadius:14,padding:"18px 16px",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header with score */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:8}}>
          <div style={{fontSize:10,color:"#94a3b8",letterSpacing:2,fontWeight:700}}>
            📊 {t("matchdetails.title")}
          </div>
          <button onClick={onClose} style={{
            background:"transparent",border:"none",color:"#94a3b8",fontSize:20,
            cursor:"pointer",fontFamily:"inherit",padding:0,
          }}>✕</button>
        </div>

        {/* Score banner */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"center",gap:10,
          padding:"14px 8px",marginBottom:16,
          background:"rgba(15,23,42,0.5)",borderRadius:10,
        }}>
          <div style={{flex:1,textAlign:lang==="he"?"left":"right"}}>
            <div style={{fontSize:13,color:"#fff",fontWeight:800}}>{home?.n}</div>
            <div style={{fontSize:24,marginTop:2}}>{home?.f}</div>
          </div>
          <div style={{
            fontSize:26,fontWeight:900,color:"#fbbf24",
            fontVariantNumeric:"tabular-nums",padding:"0 8px",letterSpacing:-1,
          }}>
            {fixture.h ?? "—"} : {fixture.a ?? "—"}
          </div>
          <div style={{flex:1,textAlign:lang==="he"?"right":"left"}}>
            <div style={{fontSize:13,color:"#fff",fontWeight:800}}>{away?.n}</div>
            <div style={{fontSize:24,marginTop:2}}>{away?.f}</div>
          </div>
        </div>

        {loading && (
          <div style={{textAlign:"center",padding:"30px 0",color:"#94a3b8",fontSize:13}}>
            ⏳ {t("matchdetails.loading")}
          </div>
        )}

        {!loading && error && (
          <div style={{
            background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:10,padding:"14px",fontSize:12,color:"#f87171",textAlign:"center",
          }}>
            {error === "no_fixture_id" ? t("matchdetails.notReady") : t("matchdetails.error")}
          </div>
        )}

        {!loading && !error && details && (
          <>
            {/* Goals */}
            {goals.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,color:"#94a3b8",letterSpacing:2,fontWeight:700,marginBottom:8}}>
                  ⚽ {t("matchdetails.goals")}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {goals.map((g, i) => {
                    const isHome = g.teamName === fixture.home || g.teamName === details.homeTeam;
                    return (
                      <div key={i} style={{
                        display:"flex",alignItems:"center",gap:8,
                        padding:"7px 10px",
                        background:"rgba(15,23,42,0.4)",borderRadius:8,
                        borderLeft: isHome ? "3px solid #22c55e" : "none",
                        borderRight: !isHome ? "3px solid #3b82f6" : "none",
                      }}>
                        <span style={{
                          fontSize:11,color:"#fbbf24",fontWeight:900,
                          minWidth:32,fontVariantNumeric:"tabular-nums",
                        }}>{g.minute}{g.extra}'</span>
                        <span style={{fontSize:14}}>⚽</span>
                        <div style={{flex:1,fontSize:12,color:"#fff",lineHeight:1.3}}>
                          <div style={{fontWeight:700}}>{g.playerName || t("matchdetails.unknown")}</div>
                          {g.assistName && (
                            <div style={{fontSize:10,color:"#94a3b8"}}>
                              {t("matchdetails.assist")}: {g.assistName}
                            </div>
                          )}
                          {g.detail && g.detail !== "Normal Goal" && (
                            <div style={{fontSize:9,color:"#fbbf24",fontStyle:"italic",marginTop:1}}>
                              {g.detail}
                            </div>
                          )}
                        </div>
                        <span style={{fontSize:16}}>{isHome ? home?.f : away?.f}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {goals.length === 0 && (
              <div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8",fontSize:12}}>
                {t("matchdetails.noGoals")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ⏰ NEXT MATCH COUNTDOWN — ticking display of time until next match
function NextMatchCountdown({ allMatches }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Find next upcoming match (kickoff in the future)
  const next = useMemo(() => {
    const future = allMatches.filter(m => {
      const k = new Date(m.kickoff).getTime();
      return k > now;
    });
    return future[0] || null;
  }, [allMatches, now]);

  if (!next) return null;

  const k = new Date(next.kickoff).getTime();
  const diff = Math.max(0, k - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  // Render team info if it's a group match (we know both teams)
  let teamLine = null;
  if (next.type === "group" && next.fixture) {
    const home = findTeam(next.fixture.home);
    const away = findTeam(next.fixture.away);
    if (home && away) {
      teamLine = (
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"center",
          gap:8,fontSize:13,color:"#fff",fontWeight:700,marginTop:4,
          direction:"ltr",
        }}>
          <span>{home.f}</span>
          <span style={{color:"#94a3b8"}}>{home.n}</span>
          <span style={{color:"#64748b",fontSize:10}}>vs</span>
          <span style={{color:"#94a3b8"}}>{away.n}</span>
          <span>{away.f}</span>
        </div>
      );
    }
  }

  const cell = (val, label) => (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",
      minWidth:48,
    }}>
      <div style={{
        fontSize:24,fontWeight:900,color:"#fbbf24",
        fontVariantNumeric:"tabular-nums",lineHeight:1,
        textShadow:"0 0 10px rgba(251,191,36,0.4)",
      }}>{String(val).padStart(2,"0")}</div>
      <div style={{
        fontSize:9,color:"#94a3b8",letterSpacing:1.5,
        fontWeight:700,marginTop:3,
      }}>{label}</div>
    </div>
  );

  return (
    <div style={{
      background:"linear-gradient(135deg,rgba(251,191,36,0.12),rgba(36,49,80,0.5))",
      border:"1px solid rgba(251,191,36,0.3)",
      borderRadius:12,padding:"12px 14px",marginBottom:14,
    }}>
      <div style={{
        fontSize:10,color:"#fbbf24",letterSpacing:2,
        fontWeight:700,textAlign:"center",marginBottom:8,
      }}>
        ⏰ {t("today.nextMatchIn")}
      </div>
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        direction:"ltr",
      }}>
        {days > 0 && (
          <>
            {cell(days, t("today.days"))}
            <div style={{color:"#475569",fontSize:18,fontWeight:900}}>:</div>
          </>
        )}
        {cell(hours, t("today.hours"))}
        <div style={{color:"#475569",fontSize:18,fontWeight:900}}>:</div>
        {cell(minutes, t("today.mins"))}
        <div style={{color:"#475569",fontSize:18,fontWeight:900}}>:</div>
        {cell(seconds, t("today.secs"))}
      </div>
      {teamLine}
    </div>
  );
}

function TodayScreen({ picks, actuals, onPick, onBack, onGoToBracket, leagueMembers = null, onRefresh, lastFetchAt, onShowDetails = null }) {
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
  const justFinishedMatches = [];
  for (const m of allMatches) {
    const k = new Date(m.kickoff).getTime();
    const minSinceKickoff = (now - k) / (60 * 1000);
    // 📡 Has a result already been recorded for this match?
    const actual = m.type === "group" ? actuals[m.fixture?.id] : null;
    const hasScore = actual && actual.h !== "" && actual.h !== undefined && actual.a !== "" && actual.a !== undefined;
    // 🏁 Truly finished — either API marked it as finished, or manually entered + past 95 mins
    const isApiFinished = actual && actual.isFinished === true;
    const isApiLive = actual && actual.isLive === true;
    const hasFinalScore = hasScore && (isApiFinished || (!isApiLive && !actual.hasOwnProperty("isLive") && minSinceKickoff > 95));
    // 🔴 LIVE: started but not yet finished
    const isLive = k <= now && (isApiLive || (hasScore && !isApiFinished && minSinceKickoff <= 120) || (!hasScore && minSinceKickoff <= 120));
    // 🏁 Just finished: has a FINAL score, AND less than 30 min since match ended
    // Match ends ~95 min after kickoff (90 + ~5 stoppage). Show window: 95→125 min after kickoff.
    const isJustFinished = hasFinalScore && minSinceKickoff < 125;
    if (isLive) {
      liveOrJustEndedMatches.push(m);
      continue;
    }
    if (isJustFinished) {
      justFinishedMatches.push(m);
      continue;
    }
    // Past matches not live → skip from main lists
    if (k < now) continue;
    // Future matches → bucket by today / tomorrow
    const isToday = k < todayStart.getTime() + 24 * 60 * 60 * 1000;
    if (isToday) todayMatches.push(m);
    else if (k < tomorrowEnd.getTime()) tomorrowMatches.push(m);
  }

  const renderMatchRow = (m, opts = {}) => {
    const isFinishedSection = opts.isFinishedSection || false;
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
          onPick={p => onPick(f.id, p)}
          showResults={hasResult}
          homeInputId={`today-h-${f.id}`}
          awayInputId={`today-a-${f.id}`}
          nextInputId={null}
          lockable={true}
          leagueMembers={leagueMembers}
          onShowDetails={hasResult ? onShowDetails : null}
          defaultCollapsed={isFinishedSection}
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8}}>
        <button onClick={onBack} style={{...ghostBtn,padding:"7px 14px",width:"auto"}}>{t("welcome.back")}</button>
        <div style={{display:"flex",gap:6}}>
          <button onClick={() => {
            try {
              const dbg = JSON.parse(localStorage.getItem("wc2026_api_debug_v1") || "null");
              const dbg2 = JSON.parse(localStorage.getItem("wc2026_api_debug2_v1") || "null");
              const stats = JSON.parse(localStorage.getItem("wc2026_api_stats_v1") || "null");
              if (!dbg && !dbg2 && !stats) {
                alert("עוד לא נקראו נתונים מה-API");
                return;
              }
              const age = dbg2 ? Math.floor((Date.now() - dbg2.ts) / 1000) : "?";
              let msg = `📡 דיבוג API\n\n`;
              if (stats) {
                msg += `📊 קריאות היום (${stats.date}): ${stats.calls || 0} / 100\n\n`;
              }
              msg += `רענון אחרון: לפני ${age} שניות\n\n`;
              if (dbg2) {
                msg += `📊 סה"כ משחקים מה-API: ${dbg2.totalReturned}\n`;
                msg += `🔢 ב-API.results: ${dbg2.results}\n\n`;
                if (dbg2.errors && Object.keys(dbg2.errors).length > 0) {
                  msg += `⚠️ שגיאות API:\n${JSON.stringify(dbg2.errors, null, 2)}\n\n`;
                }
                msg += `📋 סטטוסים:\n${JSON.stringify(dbg2.statusCounts, null, 2)}\n\n`;
                msg += `🔍 דוגמאות:\n${JSON.stringify(dbg2.sample, null, 2).slice(0, 500)}`;
              }
              alert(msg);
            } catch (e) {
              alert("שגיאה: " + e.message);
            }
          }} style={{
            padding:"7px 10px",
            background:"rgba(168,85,247,0.15)",
            border:"1px solid rgba(168,85,247,0.4)",
            borderRadius:10,
            color:"#a855f7",fontSize:11,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",
          }}>🐛 API</button>
          {onRefresh && (
            <button onClick={onRefresh} style={{
              padding:"7px 12px",
              background:"rgba(34,197,94,0.15)",
              border:"1px solid rgba(34,197,94,0.4)",
              borderRadius:10,
              color:"#22c55e",fontSize:13,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",gap:5,
            }}>
              🔄 {t("today.refresh")}
            </button>
          )}
        </div>
      </div>

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
          background:"linear-gradient(135deg,rgba(239,68,68,0.12),rgba(36,49,80,0.5))",
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

      {/* ⏰ Countdown to next upcoming match */}
      <NextMatchCountdown allMatches={allMatches} />

      {/* 🔴 LIVE matches only */}
      {liveOrJustEndedMatches.length > 0 && (
        <div style={{marginBottom:18}}>
          <div style={{
            fontSize:11,color:"#ef4444",letterSpacing:3,marginBottom:8,
            fontWeight:700,display:"flex",alignItems:"center",gap:6,
          }}>
            <span style={{
              width:8,height:8,borderRadius:"50%",
              background:"#ef4444",
              boxShadow:"0 0 8px #ef4444",
              animation:"livePulse 1.2s ease-in-out infinite",
              display:"inline-block",
            }}/>
            {t("today.liveNow")}
          </div>
          <style>{`
            @keyframes livePulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(1.2); }
            }
          `}</style>
          {liveOrJustEndedMatches.map(renderMatchRow)}
        </div>
      )}

      {/* 🏁 Just finished moved BELOW today/tomorrow */}

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
      <div style={{marginBottom:18}}>
        <div style={{fontSize:11,color:"#a78bfa",letterSpacing:3,marginBottom:8,fontWeight:700}}>
          🌅 {t("today.tomorrow")} ({tomorrowMatches.length})
        </div>
        {tomorrowMatches.length === 0
          ? renderEmptySection(t("today.noMatchesTomorrow"))
          : tomorrowMatches.map(renderMatchRow)}
      </div>

      {/* 🏁 Just finished matches — at the bottom for less clutter */}
      {justFinishedMatches.length > 0 && (
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,color:"#94a3b8",letterSpacing:3,marginBottom:8,fontWeight:700}}>
            🏁 {t("today.justFinished")}
          </div>
          {justFinishedMatches.map(m => renderMatchRow(m, { isFinishedSection: true }))}
        </div>
      )}
    </div>
  );
}

function GroupView({ group, picks, actuals, standings, bestThirds, liveStandings, liveBestThirds, hasActuals, onPick, onNext, onPrev, onJump, isFirst, isLast, showResults, scope = "p", leagueMembers = null, onShowDetails = null }) {
  const t = useT();
  const { lang } = useContext(LangContext);
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
    <div style={{padding:"16px 14px 100px",maxWidth:560,margin:"0 auto",position:"relative"}}>
      {/* Ambient color glow — top of screen tinted to group color */}
      <div style={{
        position:"absolute",
        top:0,left:"50%",
        transform:"translateX(-50%)",
        width:"100%",maxWidth:600,
        height:200,
        background:`radial-gradient(ellipse at center top, ${color}22 0%, ${color}0a 40%, transparent 70%)`,
        pointerEvents:"none",
        zIndex:0,
      }}/>
      {/* Group selector pills */}
      <div style={{
        display:"grid",gridTemplateColumns:"repeat(6, 1fr)",
        gap:6,marginBottom:14,direction:"ltr",
        position:"relative",zIndex:1,
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
                color: isCurrent ? "#1e2940" : "#cbd5e1",
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
          color: "#1e2940",
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

      {(() => {
        // 📍 Split into pending and finished, render pending first, then finished at the bottom
        const pendingMds = [];
        const finishedMatches = [];
        [1,2,3].forEach(md => {
          const mdFixtures = fixtures.filter(f => f.matchday === md);
          const pending = [];
          mdFixtures.forEach(f => {
            const actual = actuals[f.id];
            const isFinished = actual && actual.h !== undefined && actual.h !== "" && actual.isLive !== true;
            const minSince = f.kickoff ? (Date.now() - new Date(f.kickoff).getTime()) / 60000 : 0;
            if (isFinished && minSince > 95) {
              finishedMatches.push(f);
            } else {
              pending.push(f);
            }
          });
          if (pending.length > 0) pendingMds.push({ md, matches: pending });
        });

        const renderMatch = (f) => {
          const idx = orderedIds.indexOf(f.id);
          const nextId = idx >= 0 && idx < orderedIds.length - 1 ? orderedIds[idx + 1] : null;
          const actual = actuals[f.id];
          const hasFinalScore = actual && actual.h !== undefined && actual.h !== "" && actual.isLive !== true;
          const minSince = f.kickoff ? (Date.now() - new Date(f.kickoff).getTime()) / 60000 : 0;
          const shouldCollapse = hasFinalScore && minSince > 95;
          return (
            <MatchCard
              key={f.id} fixture={f} pick={picks[f.id]} actual={actuals[f.id]}
              onPick={p => onPick(f.id, p)} showResults={showResults}
              homeInputId={inputId(f.id, "h")}
              awayInputId={inputId(f.id, "a")}
              nextInputId={nextId ? inputId(nextId, "h") : null}
              lockable={scope === "p"}
              leagueMembers={scope === "p" ? leagueMembers : null}
              onShowDetails={onShowDetails}
              defaultCollapsed={shouldCollapse}
            />
          );
        };

        return (
          <>
            {pendingMds.map(({ md, matches }) => (
              <div key={md} style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"#64748b",letterSpacing:3,marginBottom:6,paddingLeft:4}}>━━ {t("match.matchday")} {md}</div>
                {matches.map(renderMatch)}
              </div>
            ))}
            {finishedMatches.length > 0 && (
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"#94a3b8",letterSpacing:3,marginBottom:6,paddingLeft:4}}>━━ 🏁 משחקים שהסתיימו</div>
                {finishedMatches.map(renderMatch)}
              </div>
            )}
          </>
        );
      })()}

      <StandingsTable group={group} standings={standings} bestThirds={bestThirds} liveStandings={liveStandings} liveBestThirds={liveBestThirds} hasActuals={hasActuals} />

      <div style={{display:"flex",gap:10,marginTop:18}}>
        <button onClick={onPrev} disabled={isFirst} style={{
          flex:1,
          padding:"13px 16px",
          background: isFirst ? "rgba(30,41,59,0.3)" : "rgba(30,41,59,0.7)",
          color: isFirst ? "#475569" : "#cbd5e1",
          border:`1px solid ${isFirst ? "rgba(71,85,105,0.2)" : "rgba(71,85,105,0.5)"}`,
          borderRadius:12,
          fontSize:13,fontWeight:700,letterSpacing:0.5,
          cursor: isFirst ? "not-allowed" : "pointer",
          fontFamily:"inherit",
          boxShadow: isFirst ? "none" : "0 2px 8px rgba(0,0,0,0.2)",
        }}>{t("group.previous")}</button>
        <button onClick={onNext} style={{
          flex:2,
          padding:"13px 18px",
          background: isLast
            ? "linear-gradient(135deg,#fbbf24,#d97706)"
            : `linear-gradient(135deg,${color}cc,${color})`,
          color: "#fff",
          border:"none",
          borderRadius:12,
          fontSize:14,fontWeight:800,letterSpacing:0.5,
          cursor:"pointer",
          fontFamily:"inherit",
          boxShadow: isLast
            ? "0 6px 18px rgba(251,191,36,0.4)"
            : `0 6px 18px ${color}55`,
          textShadow:"0 1px 2px rgba(0,0,0,0.3)",
        }}>{isLast ? t("group.toBracket") : (lang === "he" ? `← ${t("group.group")} ${GROUP_KEYS[GROUP_KEYS.indexOf(group)+1]}` : `${t("group.group")} ${GROUP_KEYS[GROUP_KEYS.indexOf(group)+1]} →`)}</button>
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
        background: ready ? "rgba(30,41,59,0.6)" : "rgba(36,49,80,0.4)",
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
                background: (isLocked || !ready) ? "rgba(71,85,105,0.2)" : "#1e2940",
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
                background: (isLocked || !ready) ? "rgba(71,85,105,0.2)" : "#1e2940",
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
          color:"#1e2940",
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
          background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(36,49,80,0.5))",
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
          background:"linear-gradient(135deg,rgba(34,197,94,0.15),rgba(36,49,80,0.5))",
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
          <div style={{fontSize:10,letterSpacing:3,color:"#1e2940",fontWeight:800,marginBottom:4}}>🏆 YOUR CHAMPION 🏆</div>
          <div style={{fontSize:38,marginBottom:2}}>{champion.flag||champion.f}</div>
          <div style={{fontSize:22,color:"#1e2940",fontWeight:900}}>{champion.name||champion.n}</div>
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
  // 🔒 Stable sort — break ties by name to prevent positions from jumping around
  everyone.sort((a,b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return (a.name || "").localeCompare(b.name || "", "he");
  });

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
                <div style={{fontSize:24,fontWeight:900,color:"#fbbf24",lineHeight:1}}><AnimatedNumber value={p.totalPoints} /></div>
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
  cardCollection,
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
  const [cardPreview, setCardPreview] = useState(null); // for previewing a friend's card
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
        }).sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return (a.uid || "").localeCompare(b.uid || "");
        });
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
              background:"linear-gradient(145deg,#1e293b,#243150)",
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
            background:"linear-gradient(135deg,rgba(59,130,246,0.18),rgba(36,49,80,0.5))",
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
            background:"linear-gradient(135deg,rgba(59,130,246,0.15),rgba(36,49,80,0.5))",
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
        cardCollection: m.cardCollection || {},
      };
    }).sort((a,b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return (a.uid || "").localeCompare(b.uid || "");
    });

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
              background:hasPick?"#1e2940":"transparent",
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
            background:ready?"rgba(30,41,59,0.6)":"rgba(36,49,80,0.4)",
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
                background: hasMemberPick && showPick ? "#1e2940" : "transparent",
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
          <button onClick={()=>{setViewing(null);setViewTab("matches");setCardPreview(null);}} style={{...ghostBtn,marginBottom:14,padding:"7px 14px",width:"auto"}}>← Back to league</button>

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
              <div style={{fontSize:10,letterSpacing:3,color:"#1e2940",fontWeight:800}}>🏆 PREDICTED CHAMPION</div>
              <div style={{fontSize:26,margin:"2px 0"}}>{champ.flag||champ.f}</div>
              <div style={{fontSize:15,color:"#1e2940",fontWeight:900}}>{champ.name||champ.n}</div>
            </div>
          )}
          {champ && !showChamp && (
            <div style={{
              background:"linear-gradient(135deg,rgba(71,85,105,0.3),rgba(36,49,80,0.5))",
              border:"1px dashed rgba(71,85,105,0.5)",
              borderRadius:12,padding:12,marginBottom:14,textAlign:"center",
            }}>
              <div style={{fontSize:10,letterSpacing:3,color:"#94a3b8",fontWeight:800}}>🔒 {t("league.hiddenPick")}</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:4}}>{t("league.hiddenUntilKickoff")}</div>
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex",background:"rgba(36,49,80,0.6)",borderRadius:10,padding:3,marginBottom:12}}>
            {[
              ["matches","⚽"],
              ["standings","📊"],
              ["bracket","🏆"],
              ["cards","🃏"],
            ].map(([tk,lbl]) => (
              <button key={tk} onClick={()=>setViewTab(tk)} style={{
                flex:1,padding:"7px 0",border:"none",borderRadius:7,cursor:"pointer",fontFamily:"inherit",
                background: viewTab===tk?"rgba(251,191,36,0.15)":"transparent",
                color: viewTab===tk?"#fbbf24":"#94a3b8",
                fontSize:13,fontWeight:700,letterSpacing:1,
              }}>{lbl}</button>
            ))}
          </div>

          {/* TAB: MATCHES — all 72 group-stage predictions */}
          {viewTab === "matches" && (
            <div>
              {GROUP_KEYS.map(g => {
                const fs = FIXTURES.filter(f => f.group === g);
                return (
                  <div key={g} style={{background:"rgba(36,49,80,0.6)",border:`1px solid ${COLORS[g]}33`,borderRadius:10,padding:"10px 10px",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{background:COLORS[g],color:"#243150",width:24,height:24,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900}}>{g}</div>
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
              background:"linear-gradient(135deg,rgba(71,85,105,0.3),rgba(36,49,80,0.5))",
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
                  <div key={g} style={{background:"rgba(36,49,80,0.6)",border:`1px solid ${COLORS[g]}33`,borderRadius:10,padding:"8px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <div style={{background:COLORS[g],color:"#243150",width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900}}>{g}</div>
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
              background:"linear-gradient(135deg,rgba(71,85,105,0.3),rgba(36,49,80,0.5))",
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

          {/* TAB: CARDS — their player card collection */}
          {viewTab === "cards" && (() => {
            // For my own profile, use my local collection (fresh).
            // For friends, use what's synced to Firebase.
            const theirCollection = m.isMe ? (cardCollection || {}) : migrateCardCollection(m.cardCollection || {});
            // Full pool = current players + legends + Israeli trash
            const fullPool = [...CARDS, ...LEGEND_CARDS, ...ISRAELI_LEGENDS];
            const ownedCards = fullPool.filter(c => (theirCollection[c.id] || 0) > 0);
            // Sort owned by rarity (legends first, then best to common, then trash)
            const rarityOrder = { X: 0, G: 1, L: 2, E: 3, R: 4, U: 5, C: 6, T: 7 };
            ownedCards.sort((a, b) => {
              const r = rarityOrder[a.rarity] - rarityOrder[b.rarity];
              if (r !== 0) return r;
              return b.name.localeCompare(a.name);
            });
            const total = fullPool.length;
            const pct = Math.round((ownedCards.length / total) * 100);
            // Highest-rated card (best brag)
            const topCard = ownedCards.length > 0
              ? ownedCards.reduce((best, c) => getPlayerRating(c) > getPlayerRating(best) ? c : best, ownedCards[0])
              : null;
            // Rarity breakdown (G/L/E/R/U/C — trash skipped in stats grid for clean look)
            const byRarity = ["G","L","E","R","U","C"].map(r => ({
              r, count: ownedCards.filter(c => c.rarity === r).length,
              total: CARDS_BY_RARITY[r]?.length || 0,
            }));

            return (
              <div>
                {ownedCards.length === 0 ? (
                  <div style={{background:"rgba(30,41,59,0.4)",border:"1px dashed rgba(71,85,105,0.4)",borderRadius:10,padding:"20px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>
                    🃏 {m.isMe ? "You don't" : "They don't"} have any cards yet.
                  </div>
                ) : (
                  <>
                    {/* Progress */}
                    <div style={{background:"rgba(36,49,80,0.6)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6}}>
                        <span style={{color:"#cbd5e1",fontWeight:700}}>{ownedCards.length} / {total} {t("collection.collected")}</span>
                        <span style={{color:"#fbbf24",fontWeight:800}}>{pct}%</span>
                      </div>
                      <div style={{height:6,background:"rgba(71,85,105,0.3)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#fbbf24,#f59e0b)",borderRadius:3,transition:"width 0.4s"}}/>
                      </div>
                    </div>

                    {/* Rarity breakdown */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(6, 1fr)",gap:4,marginBottom:14}}>
                      {byRarity.map(br => {
                        const cfg = RARITY_CONFIG[br.r];
                        return (
                          <div key={br.r} style={{
                            textAlign:"center",padding:"6px 2px",borderRadius:6,
                            background:`${cfg.color}15`,
                            border:`1px solid ${cfg.color}44`,
                          }}>
                            <div style={{fontSize:13,marginBottom:2}}>{cfg.emoji}</div>
                            <div style={{fontSize:10,color:"#fff",fontWeight:800,fontVariantNumeric:"tabular-nums"}}>
                              {br.count}<span style={{color:"#94a3b8",fontSize:8}}>/{br.total}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Best card highlight */}
                    {topCard && (
                      <div style={{marginBottom:14,textAlign:"center"}}>
                        <div style={{fontSize:9,color:"#94a3b8",letterSpacing:2,fontWeight:700,marginBottom:8}}>★ TOP CARD ★</div>
                        <button onClick={()=>setCardPreview(topCard)} style={{
                          background:"transparent",border:"none",cursor:"pointer",padding:0,
                          display:"inline-block",fontFamily:"inherit",
                        }}>
                          <PlayerCard card={topCard} size="M" animated={true} />
                        </button>
                      </div>
                    )}

                    {/* All owned cards grid — split into Players + Legends + Israel */}
                    {(() => {
                      const ownedPlayers = ownedCards.filter(c => c.rarity !== "G" && c.rarity !== "T" && c.rarity !== "F");
                      const ownedLegends = ownedCards.filter(c => c.rarity === "G");
                      const ownedFriends = ownedCards.filter(c => c.rarity === "F");
                      const ownedTrash = ownedCards.filter(c => c.rarity === "T");
                      return (
                        <>
                          {ownedPlayers.length > 0 && (
                            <>
                              <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,fontWeight:800,marginBottom:8,marginTop:4}}>
                                ⚽ שחקני המונדיאל ({ownedPlayers.length})
                              </div>
                              <div style={{
                                display:"grid",
                                gridTemplateColumns:"repeat(auto-fill, minmax(95px, 1fr))",
                                gap:8,padding:"4px",marginBottom:14,
                              }}>
                                {ownedPlayers.map(card => {
                                  const count = theirCollection[card.id] || 0;
                                  return (
                                    <button key={card.id} onClick={()=>setCardPreview(card)} className="card-tilt"
                                      style={{position:"relative",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
                                      <PlayerCard card={card} size="S" animated={true} />
                                      {count > 1 && (
                                        <div style={{position:"absolute",top:4,right:4,background:"#fbbf24",color:"#1e2940",fontSize:9,fontWeight:900,borderRadius:8,padding:"2px 5px",border:"1px solid #1e2940"}}>×{count}</div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                          {ownedLegends.length > 0 && (
                            <>
                              <div style={{fontSize:10,color:"#22c55e",letterSpacing:2,fontWeight:800,marginBottom:8,marginTop:4}}>
                                🟢 אגדות ({ownedLegends.length})
                              </div>
                              <div style={{
                                display:"grid",
                                gridTemplateColumns:"repeat(auto-fill, minmax(95px, 1fr))",
                                gap:8,padding:"4px",marginBottom:14,
                              }}>
                                {ownedLegends.map(card => {
                                  const count = theirCollection[card.id] || 0;
                                  return (
                                    <button key={card.id} onClick={()=>setCardPreview(card)} className="card-tilt"
                                      style={{position:"relative",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
                                      <PlayerCard card={card} size="S" animated={true} />
                                      {count > 1 && (
                                        <div style={{position:"absolute",top:4,right:4,background:"#22c55e",color:"#0a0a0a",fontSize:9,fontWeight:900,borderRadius:8,padding:"2px 5px",border:"1px solid #0a0a0a"}}>×{count}</div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                          {ownedTrash.length > 0 && (
                            <>
                              <div style={{fontSize:10,color:"#a16207",letterSpacing:2,fontWeight:800,marginBottom:8,marginTop:4}}>
                                🗑️ 🇮🇱 נבחרת ישראל 🇮🇱 🗑️ ({ownedTrash.length})
                              </div>
                              <div style={{
                                display:"grid",
                                gridTemplateColumns:"repeat(auto-fill, minmax(95px, 1fr))",
                                gap:8,padding:"4px",
                              }}>
                                {ownedTrash.map(card => {
                                  const count = theirCollection[card.id] || 0;
                                  return (
                                    <button key={card.id} onClick={()=>setCardPreview(card)} className="card-tilt"
                                      style={{position:"relative",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
                                      <PlayerCard card={card} size="S" animated={true} />
                                      {count > 1 && (
                                        <div style={{position:"absolute",top:4,right:4,background:"#a16207",color:"#fff",fontSize:9,fontWeight:900,borderRadius:8,padding:"2px 5px",border:"1px solid #1e2940"}}>×{count}</div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                          {ownedFriends.length > 0 && (
                            <>
                              <div style={{fontSize:10,color:"#ec4899",letterSpacing:2,fontWeight:800,marginBottom:8,marginTop:4}}>
                                🎴 חברי הליגה ({ownedFriends.length})
                              </div>
                              <div style={{
                                display:"grid",
                                gridTemplateColumns:"repeat(auto-fill, minmax(95px, 1fr))",
                                gap:8,padding:"4px",
                              }}>
                                {ownedFriends.map(card => {
                                  const count = theirCollection[card.id] || 0;
                                  return (
                                    <button key={card.id} onClick={()=>setCardPreview(card)} className="card-tilt"
                                      style={{position:"relative",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
                                      <PlayerCard card={card} size="S" animated={true} />
                                      {count > 1 && (
                                        <div style={{position:"absolute",top:4,right:4,background:"#fbbf24",color:"#1e2940",fontSize:9,fontWeight:900,borderRadius:8,padding:"2px 5px",border:"1px solid #1e2940"}}>×{count}</div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })()}

          {/* Preview a card by tapping it */}
          {cardPreview && (
            <div onClick={e => e.stopPropagation()}>
              <CardRevealModal
                result={{ card: cardPreview, isDuplicate: false, refund: 0 }}
                onClose={() => setCardPreview(null)}
              />
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
                background:"linear-gradient(135deg,rgba(34,197,94,0.06),rgba(36,49,80,0.4))",
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
                background:"linear-gradient(135deg,rgba(239,68,68,0.06),rgba(36,49,80,0.4))",
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
                  background:"linear-gradient(135deg,rgba(34,197,94,0.15),rgba(36,49,80,0.5))",
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
                  background:"linear-gradient(135deg,rgba(239,68,68,0.12),rgba(36,49,80,0.5))",
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
            ? `linear-gradient(135deg, ${podiumGlow}, rgba(36,49,80,0.4))`
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
                }}><AnimatedNumber value={p.totalPoints} /></div>
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
          background:"linear-gradient(135deg,rgba(34,197,94,0.08),rgba(36,49,80,0.5))",
          border:"1px solid rgba(34,197,94,0.3)",
          borderRadius:14,padding:14,marginTop:18,marginBottom:6,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <span style={{fontSize:18}}>📣</span>
            <span style={{fontSize:12,fontWeight:800,color:"#22c55e",letterSpacing:1}}>{t("league.inviteFriends")}</span>
          </div>
          {/* Code display */}
          <div style={{display:"flex",alignItems:"center",gap:6,background:"#1e2940",borderRadius:8,padding:"8px 10px",border:"1px dashed rgba(71,85,105,0.5)",marginBottom:8}}>
            <span style={{fontSize:10,color:"#64748b",letterSpacing:1}}>{t("league.code")}</span>
            <span style={{flex:1,fontFamily:"monospace",fontSize:13,color:"#fbbf24",letterSpacing:1,fontWeight:700,wordBreak:"break-all"}}>{leagueCode}</span>
            <button onClick={copy} title={t("league.copyTooltip")} style={{background:copied?"#22c55e":"#fbbf24",color:"#1e2940",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
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
              background:"linear-gradient(135deg,rgba(59,130,246,0.15),rgba(36,49,80,0.5))",
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
              background:"linear-gradient(145deg,#2c3956,#243150)",
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
                  background:"#1e2940",border:"1px solid rgba(251,191,36,0.4)",
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
              background:"linear-gradient(145deg,#2c3956,#243150)",
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
    list.sort((a,b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return (a.name || "").localeCompare(b.name || "", "he");
    });
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
            <div style={{fontSize:10,letterSpacing:3,color:"#1e2940",fontWeight:800}}>🏆 PREDICTED CHAMPION</div>
            <div style={{fontSize:30,margin:"4px 0"}}>{champ.flag||champ.f}</div>
            <div style={{fontSize:16,color:"#1e2940",fontWeight:900}}>{champ.name||champ.n}</div>
          </div>
        )}

        <div style={{fontSize:11,color:"#94a3b8",letterSpacing:3,marginBottom:8,textAlign:"center"}}>GROUP STANDINGS</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
          {GROUP_KEYS.map(g => {
            const winner = member.standings[g][0];
            const runner = member.standings[g][1];
            return (
              <div key={g} style={{background:"rgba(36,49,80,0.6)",border:`1px solid ${COLORS[g]}33`,borderRadius:10,padding:"8px 10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div style={{background:COLORS[g],color:"#243150",width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900}}>{g}</div>
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
                style={{flex:1,padding:"5px 8px",background:"rgba(36,49,80,0.8)",border:"1px solid rgba(251,191,36,0.5)",borderRadius:6,color:"#f1f5f9",fontSize:15,fontFamily:"inherit",outline:"none"}}/>
              <button onClick={()=>{setLeagueName(leagueDraft.trim()||"My Crew");setEditingLeague(false);}} style={{background:"#fbbf24",color:"#1e2940",border:"none",borderRadius:6,padding:"0 10px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>OK</button>
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
      <div style={{display:"flex",background:"rgba(36,49,80,0.6)",borderRadius:10,padding:3,marginBottom:14}}>
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
                      <div style={{fontSize:22,fontWeight:900,color:"#fbbf24",lineHeight:1}}><AnimatedNumber value={p.totalPoints} /></div>
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
          <div style={{background:"linear-gradient(145deg,#1e293b,#243150)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:14,marginBottom:12}}>
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
                    background:"#1e2940",border:"1px dashed rgba(251,191,36,0.4)",
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
            <div style={{background:"linear-gradient(145deg,#1e293b,#243150)",border:"1px solid rgba(251,191,36,0.4)",borderRadius:14,padding:14,marginTop:6}}>
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
  // 👑 Admin-sent JSON backup format (from "League Admin → Send backup to member")
  // Shape: {"version":"wc2026-backup-v1","leagueCode":...,"name":...,"picks":{},"koPicks":{},...}
  if (c.startsWith("{") && c.includes("wc2026-backup-v1")) {
    try {
      const obj = JSON.parse(c);
      if (obj && obj.version === "wc2026-backup-v1") {
        return {
          name: obj.name || "",
          userId: obj.userId || null,
          picks: obj.picks || {},
          koPicks: obj.koPicks || {},
          koWinners: obj.koWinners || {},
          winnerPick: obj.winnerPick || null,
          topScorerPick: obj.topScorerPick || null,
          leagueCodes: obj.leagueCode ? [obj.leagueCode] : [],
          leagueCode: obj.leagueCode || "",
          activeLeagueCode: obj.leagueCode || "",
          // Optional advanced restore fields (some may not be supported by onRestore)
          cardCollection: obj.cardCollection || {},
          coinBalance: obj.coinBalance,
          unlockedAchievements: obj.unlockedAchievements || [],
          pickedAtHours: obj.pickedAtHours || [],
        };
      }
    } catch { /* fall through */ }
    return null;
  }
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
        background:"linear-gradient(145deg,#2c3956,#243150)",
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
                background:"#1e2940",
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
      <div style={{background:"linear-gradient(145deg,#2c3956,#243150)",border:"1px solid rgba(251,191,36,0.4)",borderRadius:18,padding:"22px 20px",maxWidth:440,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{margin:0,fontSize:18,color:"#fbbf24"}}>💾 Backup & Restore</h2>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#94a3b8",fontSize:22,cursor:"pointer",fontFamily:"inherit",lineHeight:1}}>✕</button>
        </div>

        <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 14px",lineHeight:1.5}}>
          Your progress auto-saves on this device. For extra safety, or to move to another device, copy your backup code somewhere safe (notes, email yourself).
        </p>

        <div style={{display:"flex",background:"rgba(36,49,80,0.6)",borderRadius:10,padding:3,marginBottom:14}}>
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
                background:"#1e2940",border:"1px dashed rgba(71,85,105,0.4)",
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
  
  const [screen, setScreen] = useState(saved?.name ? "today" : "welcome");
  const [name, setName] = useState(saved?.name || "");
  const [picks, setPicks] = useState(saved?.picks || {});
  // One-time migration: mark all existing picks as "seen" so reactions don't replay on load
  useEffect(() => {
    try {
      const migrated = localStorage.getItem("wc2026_reactions_migrated_v1");
      if (migrated) return;
      let seenReactions = {};
      try {
        const raw = localStorage.getItem("wc2026_reactions_v1");
        if (raw) seenReactions = JSON.parse(raw);
      } catch {}
      for (const fid in (saved?.picks || {})) {
        const p = saved.picks[fid];
        if (p?.h !== "" && p?.h !== undefined && p?.a !== "" && p?.a !== undefined) {
          seenReactions[`${fid}:${p.h}-${p.a}`] = 1;
        }
      }
      localStorage.setItem("wc2026_reactions_v1", JSON.stringify(seenReactions));
      localStorage.setItem("wc2026_reactions_migrated_v1", "1");
    } catch {}
  }, []); // eslint-disable-line
  const [koWinners, setKoWinners] = useState(saved?.koWinners || {});
  // NEW (Stage 1): koPicks holds score predictions for each knockout match.
  // Format: { "R32-1": { h: "2", a: "1" }, ... }. Parallel to `picks` for groups.
  const [koPicks, setKoPicks] = useState(saved?.koPicks || {});
  const [groupIdx, setGroupIdx] = useState(saved?.groupIdx || 0);
  const [friends, setFriends] = useState(saved?.friends || []);
  const [actuals, setActuals] = useState(saved?.actuals || {});
  // 📡 Latest liveData fetched from API — stored so we can look up fixture IDs for details
  const [liveData, setLiveData] = useState(null);
  // 🎯 Which fixture's details modal is open
  const [matchDetailsFor, setMatchDetailsFor] = useState(null);
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
  const [showWrapped, setShowWrapped] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAdminGift, setShowAdminGift] = useState(false);
  const [showGlobalAdmin, setShowGlobalAdmin] = useState(false);
  const [giftToast, setGiftToast] = useState(null); // {amount, reason}
  const [dailyBonusToast, setDailyBonusToast] = useState(null); // {amount}
  const [wheelPopupShown, setWheelPopupShown] = useState(false); // shown once per session

  // Track unlocked badge IDs (persisted in localStorage)
  // 💰 COINS — earned from correct predictions, spent on roulette spins
  // Format: { balance, earnedFromIds, gotStartingBonus }
  const [coins, setCoins] = useState(() => {
    try {
      const raw = localStorage.getItem("wc2026_coins_v7");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Grant the starting bonus to users who upgraded from an earlier version
        if (!parsed.gotStartingBonus) {
          const updated = { ...parsed, balance: (parsed.balance || 0) + COINS.STARTING_BONUS, gotStartingBonus: true };
          try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
          return updated;
        }
        return parsed;
      }
    } catch {}
    // Brand-new user: starts with the bonus
    const initial = { balance: COINS.STARTING_BONUS, earnedFromIds: {}, gotStartingBonus: true };
    try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(initial)); } catch {}
    return initial;
  });
  // Pop-up notification for newly earned coins
  const [coinFlash, setCoinFlash] = useState(null); // { amount, type, key }

  // 🃏 Card collection — stores which cards the user owns (and counts of duplicates)
  // Format: { [cardId]: count }
  const [cardCollection, setCardCollection] = useState(() => {
    try {
      const raw = localStorage.getItem("wc2026_cards_v2");
      if (raw) {
        // 🔄 Migrate old-style IDs (card-{post-filter-index}) to new stable IDs
        const parsed = JSON.parse(raw);
        const migrated = migrateCardCollection(parsed);
        // Persist migrated form so we only do this once
        if (migrated !== parsed) {
          try { localStorage.setItem("wc2026_cards_v2", JSON.stringify(migrated)); } catch {}
        }
        return migrated;
      }
    } catch {}
    return {};
  });

  // 🎬 Compute the weekly Wrapped stats from current data
  const wrappedStats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    // Count predictions made (we don't have timestamps per pick, so count all completed)
    let totalPicks = 0;
    let exactCount = 0;
    let winnerCount = 0;
    let coinsEarned = 0;
    for (const fid in picks) {
      const p = picks[fid];
      if (!p || p.h === "" || p.a === "") continue;
      totalPicks++;
      const a = actuals[fid];
      if (a && a.h !== "" && a.a !== "") {
        const ph = parseInt(p.h), pa = parseInt(p.a);
        const ah = parseInt(a.h), aa = parseInt(a.a);
        if (!isNaN(ph) && !isNaN(pa) && !isNaN(ah) && !isNaN(aa)) {
          if (ph === ah && pa === aa) { exactCount++; coinsEarned += 200; }
          else if (Math.sign(ph - pa) === Math.sign(ah - aa)) { winnerCount++; coinsEarned += 100; }
        }
      }
    }
    // Cards this week — count owned cards (proxy for this week if app is new)
    const cardsOwned = Object.values(cardCollection || {}).reduce((a,b)=>a+b, 0);
    const cardsThisWeek = Math.min(cardsOwned, 20); // cap for display
    // Best card by rating
    let bestCard = null;
    let bestRating = 0;
    for (const cid in (cardCollection || {})) {
      if (cardCollection[cid] > 0) {
        const card = CARDS.find(c => c.id === cid);
        if (card) {
          const r = getPlayerRating(card);
          if (r > bestRating) { bestRating = r; bestCard = card; }
        }
      }
    }
    // Closing quote — based on performance
    let quote = "Keep playing! 🎮";
    if (exactCount >= 3) quote = "🔥 You're a legend!";
    else if (exactCount >= 1) quote = "⭐ Pretty impressive!";
    else if (winnerCount >= 5) quote = "👏 Consistent!";
    else if (totalPicks >= 10) quote = "💪 Showing up!";
    else if (totalPicks > 0) quote = "🌱 Just getting started!";
    return {
      name: name || "You",
      totalPicks, exactCount, winnerCount,
      coinsEarned, cardsThisWeek,
      bestCard, quote,
    };
  }, [picks, actuals, cardCollection, name]);

  // 🎬 Auto-show Wrapped on Sunday morning, once per week
  useEffect(() => {
    if (!name) return;
    const d = new Date();
    if (d.getDay() !== 0) return; // not Sunday (0 = Sunday)
    if (wrappedStats.totalPicks === 0) return; // skip if user did nothing
    try {
      const lastShown = localStorage.getItem("wc2026_wrapped_lastshown_v1");
      const todayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (lastShown === todayKey) return;
      // Wait a moment then show
      const t = setTimeout(() => {
        setShowWrapped(true);
        localStorage.setItem("wc2026_wrapped_lastshown_v1", todayKey);
      }, 1500);
      return () => clearTimeout(t);
    } catch {}
  }, [name, wrappedStats.totalPicks]);
  // 🎰 Roulette UI state
  const [showRoulette, setShowRoulette] = useState(false);  // is the roulette screen open?
  // 🪙 Coin Flip + Wheel — 5 plays per day + admin-granted extras
  const [showCoinWheel, setShowCoinWheel] = useState(false);
  const [coinWheelPlaysToday, setCoinWheelPlaysToday] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem("wc2026_coinwheel_plays_v1") || "{}");
      const today = new Date().toISOString().slice(0, 10);
      return data.date === today ? (data.plays || 0) : 0;
    } catch { return 0; }
  });
  const [coinWheelExtraSpins, setCoinWheelExtraSpins] = useState(() => {
    try { return parseInt(localStorage.getItem("wc2026_coinwheel_extra_v1") || "0", 10) || 0; }
    catch { return 0; }
  });
  const coinWheelAvailable = useMemo(() =>
    coinWheelPlaysToday < 5 || coinWheelExtraSpins > 0,
    [coinWheelPlaysToday, coinWheelExtraSpins]);
  // Compute when the next play is available (midnight tonight if used both)
  const coinWheelNextAvailable = useMemo(() => {
    if (coinWheelAvailable) return null;
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0); // midnight
    return tomorrow.getTime();
  }, [coinWheelAvailable]);

  // 🎴 Higher/Lower game — 5 free plays per day, then 50 coins per play
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [hlBestStreak, setHlBestStreak] = useState(() => {
    try { return parseInt(localStorage.getItem("wc2026_hl_best_v1") || "0", 10) || 0; }
    catch { return 0; }
  });
  const [hlPlaysToday, setHlPlaysToday] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem("wc2026_hl_plays_v1") || "{}");
      const today = new Date().toISOString().slice(0, 10);
      return data.date === today ? (data.plays || 0) : 0;
    } catch { return 0; }
  });
  const [luckyWheelExtraSpins, setLuckyWheelExtraSpins] = useState(() => {
    try { return parseInt(localStorage.getItem("wc2026_wheel_extra_v1") || "0", 10) || 0; }
    catch { return 0; }
  });
  // Wheel available means user has free plays left today OR extra tickets from admin
  const wheelAvailable = useMemo(() => hlPlaysToday < 5 || luckyWheelExtraSpins > 0, [hlPlaysToday, luckyWheelExtraSpins]);
  const [spinResult, setSpinResult] = useState(null);       // the card just won
  const [isSpinning, setIsSpinning] = useState(false);      // animation playing
  const [pendingCard, setPendingCard] = useState(null);     // card chosen upfront; reels stop on it
  // 🟢 Legends spin counter — every 5 regular spins → 1 free Legends spin
  const [spinCount, setSpinCount] = useState(() => {
    try { return parseInt(localStorage.getItem("wc2026_spin_count_v1") || "0", 10) || 0; }
    catch { return 0; }
  });
  const [legendsSpinAvailable, setLegendsSpinAvailable] = useState(() => {
    try { return localStorage.getItem("wc2026_legends_spin_v1") === "1"; }
    catch { return false; }
  });
  // 🛡️ Belt-and-suspenders: write to localStorage on every change, so reload always picks it up
  useEffect(() => {
    try { localStorage.setItem("wc2026_spin_count_v1", String(spinCount)); } catch {}
  }, [spinCount]);
  useEffect(() => {
    try {
      if (legendsSpinAvailable) localStorage.setItem("wc2026_legends_spin_v1", "1");
      else localStorage.removeItem("wc2026_legends_spin_v1");
    } catch {}
  }, [legendsSpinAvailable]);
  const [showCollection, setShowCollection] = useState(false); // collection viewer
  // 🌌 GALAXY TEST MODE — admin-only, persists for the session
  const [galaxyTestMode, setGalaxyTestMode] = useState(() => {
    try { return localStorage.getItem("wc2026_galaxy_test_v1") === "1"; }
    catch { return false; }
  });
  useEffect(() => {
    try {
      if (galaxyTestMode) localStorage.setItem("wc2026_galaxy_test_v1", "1");
      else localStorage.removeItem("wc2026_galaxy_test_v1");
    } catch {}
  }, [galaxyTestMode]);

  // Spend coins, roll a card, save to collection
  const handleSpin = () => {
    if (coins.balance < COINS.SPIN || isSpinning) return;
    // Roll the card UPFRONT — the reels need to know what to stop on
    const card = rollOneCard();
    setPendingCard(card);
    setIsSpinning(true);
    setSpinResult(null);
    // Deduct coins immediately
    const newBalance = coins.balance - COINS.SPIN;
    const updatedCoins = { ...coins, balance: newBalance };
    setCoins(updatedCoins);
    try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updatedCoins)); } catch {}
    // 🟢 Increment spin counter — every 5 regular spins unlocks a free Legends Spin
    const newCount = spinCount + 1;
    setSpinCount(newCount);
    try { localStorage.setItem("wc2026_spin_count_v1", String(newCount)); } catch {}
    if (newCount >= 5 && !legendsSpinAvailable) {
      setLegendsSpinAvailable(true);
      try { localStorage.setItem("wc2026_legends_spin_v1", "1"); } catch {}
    }
    // After all reels have stopped (5 seconds total), reveal the card
    setTimeout(() => {
      const isDuplicate = (cardCollection[card.id] || 0) > 0;
      // Add to collection (or increment count for duplicates)
      const newCollection = { ...cardCollection, [card.id]: (cardCollection[card.id] || 0) + 1 };
      setCardCollection(newCollection);
      try { localStorage.setItem("wc2026_cards_v2", JSON.stringify(newCollection)); } catch {}
      // If duplicate, refund coins based on rarity
      let refund = 0;
      if (isDuplicate) {
        refund = RARITY_CONFIG[card.rarity]?.coins || 0;
        const refundedBalance = newBalance + refund;
        const withRefund = { ...updatedCoins, balance: refundedBalance };
        setCoins(withRefund);
        try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(withRefund)); } catch {}
      }
      setSpinResult({ card, isDuplicate, refund });
      setIsSpinning(false);
      setPendingCard(null);
      // Haptic feedback by rarity
      try {
        if (card.rarity === "L") navigator.vibrate?.([30, 50, 30, 50, 80, 50, 120]);
        else if (card.rarity === "E") navigator.vibrate?.([20, 40, 50]);
        else navigator.vibrate?.(20);
      } catch {}
    }, 8000);
  };

  // 🟢 Legends Spin — FREE spin, only Legend cards. Available every 5 regular spins.
  const handleLegendsSpin = () => {
    if (!legendsSpinAvailable || isSpinning) return;
    // 40% chance of Israeli "trash legend" instead of a real one (for laughs)
    // Roll the card pool:
    //   15% Friend cards (🎴 white) — was 5%, bumped per user request
    //   35% Israeli trash (🗑️)
    //   50% Real legend (🟢)
    const roll = Math.random();
    let pool;
    if (roll < 0.15) {
      pool = CARDS_BY_RARITY.F || [];
    } else if (roll < 0.50) {
      pool = CARDS_BY_RARITY.T || [];
    } else {
      pool = CARDS_BY_RARITY.G || [];
    }
    if (pool.length === 0) return;
    const card = pool[Math.floor(Math.random() * pool.length)];
    setPendingCard(card);
    setIsSpinning(true);
    setSpinResult(null);
    // Consume the legends spin + reset spin counter
    setLegendsSpinAvailable(false);
    setSpinCount(0);
    try {
      localStorage.removeItem("wc2026_legends_spin_v1");
      localStorage.setItem("wc2026_spin_count_v1", "0");
    } catch {}
    // After reels stop, reveal
    setTimeout(() => {
      const isDuplicate = (cardCollection[card.id] || 0) > 0;
      const newCollection = { ...cardCollection, [card.id]: (cardCollection[card.id] || 0) + 1 };
      setCardCollection(newCollection);
      try { localStorage.setItem("wc2026_cards_v2", JSON.stringify(newCollection)); } catch {}
      let refund = 0;
      if (isDuplicate) {
        refund = card.rarity === "T" ? RARITY_CONFIG.T.coins
               : card.rarity === "F" ? COINS.DUP_FRIEND
               : COINS.DUP_LEGEND;
        const refundedBalance = (coins?.balance || 0) + refund;
        const withRefund = { ...coins, balance: refundedBalance };
        setCoins(withRefund);
        try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(withRefund)); } catch {}
      }
      setSpinResult({ card, isDuplicate, refund });
      setIsSpinning(false);
      setPendingCard(null);
      // Trash gets a sad short buzz, legend gets the full pattern
      try {
        if (card.rarity === "T") navigator.vibrate?.(80);
        else navigator.vibrate?.([40, 60, 40, 60, 100, 60, 150]);
      } catch {}
    }, 8000);
  };

  const handleGalaxySpin = () => {
    if (isSpinning) return;
    const isTest = galaxyTestMode;
    const cost = 1000;
    if (!isTest && (coins?.balance || 0) < cost) return;

    // 🎲 Galaxy Spin odds:
    // 5% GALAXY (top 25/26)
    // 15% LEGENDARY  | 30% EPIC  | 30% RARE  | 20% UNCOMMON
    const roll = Math.random() * 100;
    let pool;
    if (roll < 5) {
      pool = CARDS_BY_RARITY.X || [];
    } else if (roll < 20) {
      pool = CARDS_BY_RARITY.L || [];
    } else if (roll < 50) {
      pool = CARDS_BY_RARITY.E || [];
    } else if (roll < 80) {
      pool = CARDS_BY_RARITY.R || [];
    } else {
      pool = CARDS_BY_RARITY.U || [];
    }
    if (!pool || pool.length === 0) pool = CARDS;
    const card = pool[Math.floor(Math.random() * pool.length)];

    // Deduct cost (skip in test mode)
    if (!isTest) {
      const newBalance = (coins?.balance || 0) - cost;
      const next = { ...coins, balance: newBalance };
      setCoins(next);
      try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(next)); } catch {}
    }

    setPendingCard(card);
    setIsSpinning(true);
    setSpinResult(null);
    setTimeout(() => {
      const isDuplicate = (cardCollection[card.id] || 0) > 0;
      const newCollection = { ...cardCollection, [card.id]: (cardCollection[card.id] || 0) + 1 };
      setCardCollection(newCollection);
      try { localStorage.setItem("wc2026_cards_v2", JSON.stringify(newCollection)); } catch {}
      let refund = 0;
      if (isDuplicate) {
        refund = card.rarity === "X" ? RARITY_CONFIG.X.coins
               : RARITY_CONFIG[card.rarity]?.coins || 50;
        const refundedBalance = (coins?.balance || 0) - (isTest ? 0 : cost) + refund;
        const withRefund = { ...coins, balance: refundedBalance };
        setCoins(withRefund);
        try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(withRefund)); } catch {}
      }
      setSpinResult({ card, isDuplicate, refund });
      setIsSpinning(false);
      setPendingCard(null);
      try {
        if (card.rarity === "X") navigator.vibrate?.([50, 60, 50, 60, 80, 80, 150, 100, 200]);
        else navigator.vibrate?.([30, 60, 90]);
      } catch {}
    }, 8000);
  };

  const closeSpinResult = () => {
    // If this was a stolen card, close the roulette too
    if (spinResult?.stolen) {
      setShowRoulette(false);
    }
    setSpinResult(null);
  };

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
  const [userId, setUserId] = useState(() => saved?.userId || `u_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
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

  // 🎁 ADMIN GIFTS — when a new gift arrives in leagueData.gifts, add coins
  // and show a toast. Track claimed gift IDs in localStorage so we never apply twice.
  useEffect(() => {
    if (!leagueData?.gifts || !Array.isArray(leagueData.gifts)) return;
    let claimed;
    try {
      claimed = new Set(JSON.parse(localStorage.getItem("wc2026_claimed_gifts_v1") || "[]"));
    } catch { claimed = new Set(); }

    // Filter:
    //   - new gifts not yet claimed
    //   - if gift has a targetUid, only apply if it matches my userId
    const newGifts = leagueData.gifts.filter(g =>
      g && g.id && !claimed.has(g.id) &&
      (!g.targetUid || g.targetUid === userId)
    );
    if (newGifts.length === 0) return;

    // Apply each new gift
    let totalAdded = 0;
    let lastReason = "";
    let ticketsAdded = 0;
    let coinWheelsAdded = 0;
    for (const g of newGifts) {
      if (g.kind === "scratch") {
        // 🎴 Higher/Lower extra play
        const n = Math.max(1, Math.floor(g.amount || 1));
        ticketsAdded += n;
        lastReason = g.reason || "משחק נוסף!";
      } else if (g.kind === "coinwheel") {
        // 🪙 Coin wheel extra spin
        const n = Math.max(1, Math.floor(g.amount || 1));
        coinWheelsAdded += n;
        lastReason = g.reason || "גלגל הגורל!";
      } else {
        const amount = Math.max(0, Math.floor(g.amount || 0));
        if (amount > 0) {
          totalAdded += amount;
          lastReason = g.reason || "מתנה!";
        }
      }
      claimed.add(g.id);
    }

    if (totalAdded > 0) {
      setCoins(prev => {
        const updated = { ...prev, balance: (prev?.balance || 0) + totalAdded };
        try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
        return updated;
      });
      setGiftToast({ amount: totalAdded, reason: lastReason });
      setTimeout(() => setGiftToast(null), 5000);
    }

    if (ticketsAdded > 0) {
      setLuckyWheelExtraSpins(prev => {
        const n = (prev || 0) + ticketsAdded;
        try { localStorage.setItem("wc2026_wheel_extra_v1", String(n)); } catch {}
        return n;
      });
      setGiftToast({ amount: ticketsAdded, reason: `🎴 ${ticketsAdded} משחקי גבוה או נמוך מתנה!` });
      setTimeout(() => setGiftToast(null), 5000);
    }

    if (coinWheelsAdded > 0) {
      setCoinWheelExtraSpins(prev => {
        const n = (prev || 0) + coinWheelsAdded;
        try { localStorage.setItem("wc2026_coinwheel_extra_v1", String(n)); } catch {}
        return n;
      });
      setGiftToast({ amount: coinWheelsAdded, reason: `🪙 ${coinWheelsAdded} גלגלי הגורל מתנה!` });
      setTimeout(() => setGiftToast(null), 5000);
    }

    try {
      localStorage.setItem("wc2026_claimed_gifts_v1", JSON.stringify(Array.from(claimed)));
    } catch {}
  }, [leagueData?.gifts, userId]);

  // 🎴 Show wheel popup ONCE per day (stored in localStorage)
  const wheelPopupOncePerSessionRef = useRef(false);
  useEffect(() => {
    if (!name || !wheelAvailable || showLuckyWheel) return;
    if (wheelPopupOncePerSessionRef.current) return; // already shown this session
    // Check if already shown today
    const today = new Date().toISOString().slice(0, 10);
    try {
      const lastShown = localStorage.getItem("wc2026_hl_popup_last_v1");
      if (lastShown === today) {
        wheelPopupOncePerSessionRef.current = true; // mark as shown this session too
        return;
      }
    } catch {}
    const timer = setTimeout(() => {
      wheelPopupOncePerSessionRef.current = true;
      setWheelPopupShown(true);
      try { localStorage.setItem("wc2026_hl_popup_last_v1", today); } catch {}
    }, 3000);
    return () => clearTimeout(timer);
  }, [name, wheelAvailable, showLuckyWheel]);

  // 🎁 DAILY BONUS — give 500 coins once per calendar day (Israel time)
  // Uses ISO date string "YYYY-MM-DD" so it resets at midnight local time.
  useEffect(() => {
    if (!name) return; // don't fire on welcome screen
    let lastClaim = "";
    try { lastClaim = localStorage.getItem("wc2026_daily_bonus_last_v1") || ""; } catch {}
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    if (lastClaim === today) return; // already claimed today

    // Claim it
    try { localStorage.setItem("wc2026_daily_bonus_last_v1", today); } catch {}
    // Small delay so user sees the bonus arriving (not instantly with app load)
    const timer = setTimeout(() => {
      setCoins(prev => {
        const updated = { ...prev, balance: (prev?.balance || 0) + COINS.DAILY_BONUS };
        try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
        return updated;
      });
      setDailyBonusToast({ amount: COINS.DAILY_BONUS });
      setTimeout(() => setDailyBonusToast(null), 5000);
    }, 1500);
    return () => clearTimeout(timer);
  }, [name]);

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

  // 🛡️ Track whether we've already done restore from cloud (per league code)
  // Without this, restore would loop with the push effect.
  const restoredFromCloudRef = useRef(new Set());

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

          // 🛡️ RESTORE BACKUP — only ONCE per league per session
          if (code === activeLeagueCode && data.members && userId && !restoredFromCloudRef.current.has(code)) {
            restoredFromCloudRef.current.add(code);
            const myEntry = data.members[userId];
            if (myEntry) {
              // Restore coins if local balance is 0 and remote has more
              if (myEntry.coinBalance != null && myEntry.coinBalance > 0) {
                setCoins(prev => {
                  if ((prev?.balance || 0) !== 0) return prev;
                  const updated = { ...prev, balance: myEntry.coinBalance };
                  try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
                  return updated;
                });
              }
              // Restore card collection if empty locally (with ID migration)
              if (myEntry.cardCollection && Object.keys(myEntry.cardCollection).length > 0) {
                const migrated = migrateCardCollection(myEntry.cardCollection);
                setCardCollection(prev => Object.keys(prev || {}).length === 0 ? migrated : prev);
              }
              // Restore picks
              if (myEntry.picks && Object.keys(myEntry.picks).length > 0) {
                setPicks(prev => Object.keys(prev || {}).length === 0 ? myEntry.picks : prev);
              }
              // Restore koPicks
              if (myEntry.koPicks && Object.keys(myEntry.koPicks).length > 0) {
                setKoPicks(prev => Object.keys(prev || {}).length === 0 ? myEntry.koPicks : prev);
              }
              // Restore koWinners
              if (myEntry.koWinners && Object.keys(myEntry.koWinners).length > 0) {
                setKoWinners(prev => Object.keys(prev || {}).length === 0 ? myEntry.koWinners : prev);
              }
              // Restore bonus picks
              if (myEntry.winnerPick) setWinnerPick(prev => prev || myEntry.winnerPick);
              if (myEntry.topScorerPick) setTopScorerPick(prev => prev || myEntry.topScorerPick);
              // Restore achievements
              if (Array.isArray(myEntry.unlockedAchievements) && myEntry.unlockedAchievements.length > 0) {
                setUnlockedAchievements(prev => prev.size === 0 ? new Set(myEntry.unlockedAchievements) : prev);
              }
            }
          }
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
  // 🛡️ Includes a full backup: picks, koPicks, koWinners, bonus picks, card collection,
  // coins, achievements, and pickedAtHours. If a user loses their device or clears
  // localStorage, they can restore by rejoining the same league with the same name.
  useEffect(() => {
    if (!leagueCodes.length || !name) return;
    const handle = setTimeout(() => {
      leagueCodes.forEach(code => {
        updateMyPicks(code, userId, name, picks, koWinners, {
          winnerPick,
          topScorerPick,
          koPicks,
          cardCollection: cardCollection || {},
          // 🛡️ Backup fields — restored on re-login
          coinBalance: coins?.balance || 0,
          unlockedAchievements: Array.from(unlockedAchievements || []),
          pickedAtHours: pickedAtHours || [],
          hlBestStreak: hlBestStreak || 0, // 🎴 Higher/Lower record
        })
          .catch(err => console.error(`Failed to push picks to ${code}:`, err));
      });
    }, 800);
    return () => clearTimeout(handle);
  }, [leagueCodes.join("|"), userId, name, picks, koWinners, winnerPick, topScorerPick, cardCollection, coins?.balance, unlockedAchievements, pickedAtHours, hlBestStreak]);

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
        winnerPick, topScorerPick, koPicks, totalPoints: total, cardCollection, hlBestStreak,
      }).catch(err => console.error("Failed to push global profile:", err));
    }, 1200);
    return () => clearTimeout(handle);
  }, [userId, name, picks, koWinners, koPicks, winnerPick, topScorerPick, actuals, actualKoScores, actualWinner, actualTopScorer, cardCollection, hlBestStreak]);

  // ─── LIVE RESULTS AUTO-FETCH ───────────────────────────────────────────────
  // Poll API-Football every 5 min for new match results
  // 🎯 Helper: check if there's any match worth fetching live data for
  // (currently in progress OR finished in the last 2 hours)
  const shouldFetchLive = () => {
    const now = Date.now();
    const WINDOW_BEFORE = 5 * 60 * 1000;      // 5 min before kickoff
    const WINDOW_AFTER  = 3 * 60 * 60 * 1000; // 3 hours after kickoff
    for (const f of FIXTURES) {
      const k = new Date(f.kickoff || 0).getTime();
      if (!k) continue;
      // Is this match currently active or just ended?
      if (now >= k - WINDOW_BEFORE && now <= k + WINDOW_AFTER) {
        return true;
      }
    }
    return false;
  };

  const fetchAndApplyLive = async (force = false) => {
    // 🛡️ Skip API call when no match is active (saves quota)
    if (!force && !shouldFetchLive()) {
      console.log("[API] Skipped — no active matches");
      return;
    }
    try {
      const data = await fetchLiveResults();
      console.log("[API] Raw response:", data);
      setLiveData(data);
      const mapped = mapResultsToFixtures(data, FIXTURES);
      console.log("[API] Mapped to fixtures:", mapped);
      // Save debug info
      try {
        localStorage.setItem("wc2026_api_debug_v1", JSON.stringify({
          ts: Date.now(),
          rawHasGroup: !!data?.group,
          rawHasKnockout: !!data?.knockout,
          rawGroupCount: data?.group ? Object.keys(data.group).length : 0,
          mappedCount: Object.keys(mapped).length,
          sample: data?.group ? Object.values(data.group).slice(0, 3) : [],
        }));
      } catch {}
      // Only let manually-entered actuals override API mapped data
      // (skip empty actuals so they don't blank out API results)
      const meaningfulActuals = {};
      for (const k of Object.keys(actuals || {})) {
        const a = actuals[k];
        if (a && a.h !== "" && a.h !== undefined && a.a !== "" && a.a !== undefined) {
          meaningfulActuals[k] = a;
        }
      }
      const newActuals = Object.keys(mapped).length > 0
        ? { ...mapped, ...meaningfulActuals } // manual entries win over auto
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
  const fetchAndApplyTopScorers = async (force = false) => {
    if (!force && !shouldFetchLive()) {
      console.log("[API] Skipped top scorers — no active matches");
      return;
    }
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

  const didInitialFetch = useRef(false);
  useEffect(() => {
    if (!name) return;
    if (didInitialFetch.current) return;
    didInitialFetch.current = true;
    const initial = setTimeout(() => { fetchAndApplyLive(); fetchAndApplyTopScorers(); }, 3000);
    return () => clearTimeout(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // 🔴 Auto-poll every 90 seconds during live matches (saves API quota when no matches)
  useEffect(() => {
    if (!name) return;
    const interval = setInterval(() => {
      // shouldFetchLive() is defined inside fetchAndApplyLive and will skip if no active matches
      fetchAndApplyLive();
    }, 90 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

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
        return { uid: m.uid, name: m.name, total };
      }).sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return (a.uid || "").localeCompare(b.uid || "");
      });
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
      cardCollection,
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
  }, [picks, actuals, koWinners, koPicks, actualKoScores, winnerPick, topScorerPick, actualWinner, actualTopScorer, myTotalPoints, leagueCodes.join("|"), leagueData, pickedAtHours, cardCollection]);

  // ─── 💰 COIN REWARDS ──────────────────────────────────────────────────
  // Whenever a new match result appears, scan for predictions that just
  // became scorable. Award coins ONCE per match (tracked in earnedFromIds).
  useEffect(() => {
    let totalNew = 0;
    let newType = null;
    const newEarned = { ...coins.earnedFromIds };
    // Group-stage matches
    for (const f of FIXTURES) {
      if (newEarned[f.id] != null) continue; // already paid
      const p = picks[f.id], a = actuals[f.id];
      if (!p || !a) continue;
      if (a.h === "" || a.h === undefined) continue;
      const s = scoreMatch(p, a);
      let reward = 0;
      if (s.type === "exact") { reward = COINS.EXACT; newType = newType || "exact"; }
      else if (s.type === "result") { reward = COINS.RESULT; newType = newType || "result"; }
      else if (s.type === "wrong") { /* no coins for wrong, but mark as processed */ }
      newEarned[f.id] = reward;
      totalNew += reward;
    }
    // Knockout matches (use ID directly since not in FIXTURES)
    Object.keys(actualKoScores || {}).forEach(id => {
      if (newEarned[id] != null) return;
      const p = koPicks?.[id], a = actualKoScores[id];
      if (!p || !a) return;
      if (a.h === "" || a.h === undefined) return;
      const s = scoreKoMatch(p, a);
      let reward = 0;
      if (s.type === "exact") { reward = COINS.KO_EXACT; newType = newType || "exact"; }
      else if (s.type === "result") { reward = COINS.KO_RESULT; newType = newType || "result"; }
      newEarned[id] = reward;
      totalNew += reward;
    });
    if (totalNew > 0) {
      const updated = { balance: coins.balance + totalNew, earnedFromIds: newEarned };
      setCoins(updated);
      try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
      setCoinFlash({ amount: totalNew, type: newType, key: Date.now() });
    }
  }, [picks, actuals, koPicks, actualKoScores]);

  // Auto-dismiss the coin flash after 3 seconds
  useEffect(() => {
    if (!coinFlash) return;
    const t = setTimeout(() => setCoinFlash(null), 3000);
    return () => clearTimeout(t);
  }, [coinFlash]);
  // Bonus picks (winner + top scorer) lock once the first match has kicked off
  const bonusLocked = (() => {
    const firstKick = Math.min(...FIXTURES.filter(f => f.kickoff).map(f => new Date(f.kickoff).getTime()));
    return Number.isFinite(firstKick) && Date.now() >= firstKick;
  })();

  const handleStart = (n) => { setName(n); setScreen("today"); };
  const handleImport = (d) => {
    // If the user pasted their own full JSON backup, restore everything (no "'s copy")
    if (d.coinBalance != null || (d.cardCollection && Object.keys(d.cardCollection).length > 0)) {
      handleRestore(d);
      return;
    }
    // Otherwise — this is a friend's pick code, make a copy
    setName(d.name + "'s copy");
    setPicks(d.picks);
    setKoWinners(d.koWinners);
    setScreen("today");
  };
  const handleRestore = (restored) => {
    // 🛡️ If restoring an account on a fresh browser, the local state and userId are
    // brand new (random). Pushing them to Firebase first would create a duplicate
    // member entry. Save everything to localStorage directly and reload — that way
    // the app boots up clean with the restored userId from the start.
    try {
      // 🆔 Save the FULL state to localStorage so the next page-load picks it up
      saveState({
        name: restored.name || "",
        picks: restored.picks || {},
        koWinners: restored.koWinners || {},
        koPicks: restored.koPicks || {},
        winnerPick: restored.winnerPick || null,
        topScorerPick: restored.topScorerPick || null,
        leagueName: restored.leagueName || "",
        leagueCodes: Array.isArray(restored.leagueCodes) ? restored.leagueCodes
                    : restored.leagueCode ? [restored.leagueCode] : [],
        leagueCode: restored.leagueCode || "",
        activeLeagueCode: restored.activeLeagueCode || restored.leagueCode || "",
        userId: restored.userId || userId,
        groupIdx: 0, friends: [], actuals: {}, actualKo: {}, actualKoScores: {},
        actualWinner: "", actualTopScorer: null,
      });
      // Coins
      if (typeof restored.coinBalance === "number" && restored.coinBalance > 0) {
        const newCoins = { balance: restored.coinBalance, earnedFromIds: {}, gotStartingBonus: true };
        try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(newCoins)); } catch {}
      }
      // Cards
      if (restored.cardCollection && Object.keys(restored.cardCollection).length > 0) {
        const migrated = migrateCardCollection(restored.cardCollection);
        try { localStorage.setItem("wc2026_cards_v2", JSON.stringify(migrated)); } catch {}
      }
      // Achievements
      if (Array.isArray(restored.unlockedAchievements) && restored.unlockedAchievements.length > 0) {
        try { localStorage.setItem("wc2026_achv_v1", JSON.stringify(restored.unlockedAchievements)); } catch {}
      }
      // 🎁 Mark all existing league gifts as already claimed (the coinBalance includes them)
      const code = restored.leagueCode || restored.activeLeagueCode || (restored.leagueCodes?.[0]);
      if (code && allLeagueData[code]?.gifts) {
        const existingIds = (allLeagueData[code].gifts || []).map(g => g?.id).filter(Boolean);
        if (existingIds.length > 0) {
          localStorage.setItem("wc2026_claimed_gifts_v1", JSON.stringify(existingIds));
        }
      }
      // Mark today's daily bonus as already claimed
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("wc2026_daily_bonus_last_v1", today);
    } catch (e) {
      console.error("Restore save failed:", e);
    }
    // 🔄 Reload — boots with restored data, no duplicate Firebase record
    window.location.reload();
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
        setName(""); setPicks({}); setKoWinners({}); setKoPicks({}); setCoins({ balance: COINS.STARTING_BONUS, earnedFromIds: {}, gotStartingBonus: true }); setCardCollection({}); setGroupIdx(0);
        setFriends([]); setActuals({}); setActualKo({}); setActualKoScores({}); setLeagueName(""); setLeagueCode(""); setLeagueCodes([]); setActiveLeagueCode(""); setAllLeagueData({}); setWinnerPick(null); setTopScorerPick(null); setCelebratedIds(new Set()); setLastSeenGoals(0); setSeenActualIds(new Set()); setShowOnboarding(true); try { localStorage.removeItem("wc2026_celebrated_v1"); localStorage.removeItem("wc2026_lastseen_goals_v1"); localStorage.removeItem("wc2026_seen_actuals_v1"); localStorage.removeItem("wc2026_onboarded_v1"); localStorage.removeItem("wc2026_world_v2"); localStorage.removeItem("wc2026_achv_v1"); localStorage.removeItem("wc2026_pickhours_v1"); localStorage.removeItem("wc2026_coins_v7"); localStorage.removeItem("wc2026_cards_v2"); } catch {}
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
      setName(""); setPicks({}); setKoWinners({}); setKoPicks({}); setCoins({ balance: COINS.STARTING_BONUS, earnedFromIds: {}, gotStartingBonus: true }); setCardCollection({}); setGroupIdx(0);
      setFriends([]); setActuals({}); setActualKo({}); setActualKoScores({}); setLeagueName(""); setLeagueCode(""); setLeagueCodes([]); setActiveLeagueCode(""); setAllLeagueData({}); setWinnerPick(null); setTopScorerPick(null); setCelebratedIds(new Set()); setLastSeenGoals(0); setSeenActualIds(new Set()); setShowOnboarding(true); try { localStorage.removeItem("wc2026_celebrated_v1"); localStorage.removeItem("wc2026_lastseen_goals_v1"); localStorage.removeItem("wc2026_seen_actuals_v1"); localStorage.removeItem("wc2026_onboarded_v1"); localStorage.removeItem("wc2026_world_v2"); localStorage.removeItem("wc2026_achv_v1"); localStorage.removeItem("wc2026_pickhours_v1"); localStorage.removeItem("wc2026_coins_v7"); localStorage.removeItem("wc2026_cards_v2"); } catch {}
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
        setName(""); setPicks({}); setKoWinners({}); setKoPicks({}); setCoins({ balance: COINS.STARTING_BONUS, earnedFromIds: {}, gotStartingBonus: true }); setCardCollection({}); setGroupIdx(0);
        setFriends([]); setActuals({}); setActualKo({}); setActualKoScores({}); setLeagueName(""); setLeagueCode(""); setLeagueCodes([]); setActiveLeagueCode(""); setAllLeagueData({}); setWinnerPick(null); setTopScorerPick(null); setCelebratedIds(new Set()); setLastSeenGoals(0); setSeenActualIds(new Set()); setShowOnboarding(true); try { localStorage.removeItem("wc2026_celebrated_v1"); localStorage.removeItem("wc2026_lastseen_goals_v1"); localStorage.removeItem("wc2026_seen_actuals_v1"); localStorage.removeItem("wc2026_onboarded_v1"); localStorage.removeItem("wc2026_world_v2"); localStorage.removeItem("wc2026_achv_v1"); localStorage.removeItem("wc2026_pickhours_v1"); localStorage.removeItem("wc2026_coins_v7"); localStorage.removeItem("wc2026_cards_v2"); } catch {}
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
    <style>{`
      /* ─── Global polish: button taps, number bumps, smooth transitions ─── */
      button {
        transition: transform 0.12s ease-out, box-shadow 0.12s ease-out, opacity 0.12s ease-out;
      }
      button:not(:disabled):active {
        transform: translateY(2px) scale(0.98);
        filter: brightness(0.92);
      }
      @keyframes numBump {
        0% { transform: scale(1); }
        40% { transform: scale(1.25); }
        100% { transform: scale(1); }
      }
      .num-bump { animation: numBump 0.4s ease-out; }
      @keyframes screenSlideIn {
        from { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(4px); }
        to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      }
      .screen-enter { animation: screenSlideIn 0.45s cubic-bezier(0.2, 0.7, 0.3, 1); }
      @keyframes cardLift {
        from { opacity: 0; transform: translateY(12px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .card-lift { animation: cardLift 0.4s cubic-bezier(0.2, 0.7, 0.3, 1); }
      @keyframes flagWave {
        0%, 100% { transform: rotate(-3deg) scale(1); }
        50% { transform: rotate(3deg) scale(1.02); }
      }
      .flag-wave {
        display: inline-block;
        animation: flagWave 3s ease-in-out infinite;
        transform-origin: center bottom;
      }
      .card-tilt {
        transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
      }
      .card-tilt:hover {
        transform: perspective(800px) rotateY(8deg) rotateX(-4deg) scale(1.03);
      }
      .card-tilt:active {
        transform: perspective(800px) rotateY(0deg) rotateX(0deg) scale(0.97);
      }
    `}</style>
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1a2235 0%,#1f2942 50%,#243150 100%)",color:"#f1f5f9",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",position:"relative",overflow:"hidden",direction:lang==="he"?"rtl":"ltr"}}>
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
            color: lang==="en" ? "#1e2940" : "#94a3b8",
            fontSize:10,fontWeight:800,letterSpacing:1,
          }}>EN</button>
          <button onClick={()=>setLang("he")} style={{
            padding:"4px 10px",border:"none",borderRadius:16,cursor:"pointer",fontFamily:"inherit",
            background: lang==="he" ? "#fbbf24" : "transparent",
            color: lang==="he" ? "#1e2940" : "#94a3b8",
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
        <div style={{position:"sticky",top:0,zIndex:20,background:"rgba(30,41,64,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(71,85,105,0.3)"}}>
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

            {/* 💰 Coin balance (always visible) */}
            {(
              <div style={{
                display:"flex",alignItems:"center",gap:3,
                background:"rgba(251,191,36,0.12)",
                border:"1px solid rgba(251,191,36,0.3)",
                borderRadius:6,padding:"2px 7px",
                fontSize:11,fontWeight:800,color:"#fbbf24",
                fontVariantNumeric:"tabular-nums",
              }}>
                <span style={{fontSize:11}}>🪙</span>
                <span key={coins.balance} className="num-bump">{coins.balance}</span>
              </div>
            )}

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

      {/* Main screens — wrapped so each one slides in on screen change */}
      <div key={screen + (screen==="group"?String(groupIdx):"")} className="screen-enter">

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
          onShowDetails={(fix) => setMatchDetailsFor(fix)}
        />
      )}

      {screen === "today" && (
        <TodayScreen
          picks={picks}
          actuals={actuals}
          onPick={(fid, pick) => setPicks(p => ({ ...p, [fid]: { ...p[fid], ...pick } }))}
          onBack={()=>setScreen("group")}
          onGoToBracket={()=>setScreen("bracket")}
          leagueMembers={leagueData ? Object.values(leagueData.members || {}) : null}
          onRefresh={() => { showToast(t("toast.refreshing"), "info"); fetchAndApplyLive(true); fetchAndApplyTopScorers(true); }}
          onShowDetails={(fix) => setMatchDetailsFor(fix)}
        />
      )}

      {/* 📊 Match details modal (goal scorers) */}
      {matchDetailsFor && (
        <MatchDetailsModal
          fixture={matchDetailsFor}
          apiFixtureId={getApiFixtureId(liveData, matchDetailsFor)}
          onClose={() => setMatchDetailsFor(null)}
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
          cardCollection={cardCollection}
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

      </div>{/* end of .screen-enter wrapper */}

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
        coinBalance={coins.balance}
        onShowProfile={()=>setShowProfile(true)}
        onShowRules={()=>setShowRules(true)}
        onShowBackup={()=>setShowBackup(true)}
        onShowTutorial={()=>setShowOnboarding(true)}
        onShowAchievements={()=>setShowAchievements(true)}
        onShowRoulette={()=>setShowRoulette(true)}
        onShowWrapped={()=>setShowWrapped(true)}
        onShowAdmin={leagueData?.createdBy === name ? () => setShowAdmin(true) : null}
        onShowAdminGift={leagueData?.createdBy === name && activeLeagueCode ? () => setShowAdminGift(true) : null}
        onShowGlobalAdmin={()=>setShowGlobalAdmin(true)}
        onShowLuckyWheel={()=>setShowLuckyWheel(true)}
        onShowCoinWheel={()=>setShowCoinWheel(true)}
        coinWheelAvailable={coinWheelAvailable}
        wheelAvailable={wheelAvailable}
        hlPlaysToday={hlPlaysToday}
        onLogout={handleLogout}
        onReset={handleReset}
      />

      {/* 👑 League Admin */}
      {showAdmin && leagueData && (
        <LeagueAdminModal
          leagueData={leagueData}
          leagueCode={activeLeagueCode}
          onClose={()=>setShowAdmin(false)}
        />
      )}

      {/* 🎁 Admin Gift to League */}
      {showAdminGift && activeLeagueCode && (
        <AdminGiftModal
          leagueCode={activeLeagueCode}
          userName={name}
          onClose={()=>setShowAdminGift(false)}
        />
      )}

      {/* 🌍 Global Admin (secret code) */}
      {showGlobalAdmin && (
        <GlobalAdminModal
          onClose={()=>setShowGlobalAdmin(false)}
          galaxyTestMode={galaxyTestMode}
          setGalaxyTestMode={setGalaxyTestMode}
          onGiveCoins={(amount) => {
            const newBal = (coins?.balance || 0) + amount;
            const next = { ...coins, balance: newBal };
            setCoins(next);
            try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(next)); } catch {}
          }}
        />
      )}

      {/* 🪙 Coin Flip + Wheel of Fortune */}
      {showCoinWheel && (
        <CoinFlipWheelModal
          onClose={() => setShowCoinWheel(false)}
          isAvailable={coinWheelAvailable}
          coinBalance={coins?.balance || 0}
          cardCollection={cardCollection}
          onConsumeSpin={() => {
            // Consume extra spin first if any, else daily count
            if (coinWheelExtraSpins > 0) {
              const newExtra = coinWheelExtraSpins - 1;
              setCoinWheelExtraSpins(newExtra);
              try { localStorage.setItem("wc2026_coinwheel_extra_v1", String(newExtra)); } catch {}
            } else {
              const today = new Date().toISOString().slice(0, 10);
              const newPlays = coinWheelPlaysToday + 1;
              setCoinWheelPlaysToday(newPlays);
              try {
                localStorage.setItem("wc2026_coinwheel_plays_v1", JSON.stringify({ date: today, plays: newPlays }));
              } catch {}
            }
          }}
          nextAvailableTs={coinWheelNextAvailable}
          playsLeft={Math.max(0, 5 - coinWheelPlaysToday) + coinWheelExtraSpins}
          onApplyPrize={(prize) => {
            // Returns a Hebrew message describing what happened
            if (prize.type === "coins") {
              setCoins(prev => {
                const updated = { ...prev, balance: (prev?.balance || 0) + prize.amount };
                try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
                return updated;
              });
              return `+${prize.amount} 🪙`;
            }
            if (prize.type === "card") {
              const pool = CARDS_BY_RARITY[prize.rarity] || [];
              if (pool.length > 0) {
                const card = pool[Math.floor(Math.random() * pool.length)];
                const newCollection = { ...cardCollection, [card.id]: (cardCollection[card.id] || 0) + 1 };
                setCardCollection(newCollection);
                try { localStorage.setItem("wc2026_cards_v2", JSON.stringify(newCollection)); } catch {}
                // 🎰 Defer roulette trigger until popup closes
                return {
                  message: `🎴 קלף ${prize.label}`,
                  deferred: () => {
                    setShowCoinWheel(false);
                    setShowRoulette(true);
                    setPendingCard(card);
                    setIsSpinning(true);
                    setTimeout(() => {
                      setIsSpinning(false);
                      setPendingCard(null);
                      setSpinResult({ card, isDuplicate: (cardCollection[card.id] || 0) > 0, refund: 0 });
                    }, 4200);
                  }
                };
              }
              return "🎴 קלף";
            }
            if (prize.type === "nothing") {
              return "😵 כלום!";
            }
            if (prize.type === "penalty") {
              const actualLoss = Math.min(prize.amount, coins?.balance || 0);
              setCoins(prev => {
                const updated = { ...prev, balance: (prev?.balance || 0) - actualLoss };
                try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
                return updated;
              });
              return `-${actualLoss} 🪙`;
            }
            if (prize.type === "trash") {
              const pool = CARDS_BY_RARITY.T || [];
              if (pool.length > 0) {
                const card = pool[Math.floor(Math.random() * pool.length)];
                const newCollection = { ...cardCollection, [card.id]: (cardCollection[card.id] || 0) + 1 };
                setCardCollection(newCollection);
                try { localStorage.setItem("wc2026_cards_v2", JSON.stringify(newCollection)); } catch {}
                return {
                  message: "🗑️ קלף ישראלי...",
                  deferred: () => {
                    setShowCoinWheel(false);
                    setShowRoulette(true);
                    setPendingCard(card);
                    setIsSpinning(true);
                    setTimeout(() => {
                      setIsSpinning(false);
                      setPendingCard(null);
                      setSpinResult({ card, isDuplicate: (cardCollection[card.id] || 0) > 0, refund: 0 });
                    }, 4200);
                  }
                };
              }
              return "🗑️ ישראלי";
            }
            if (prize.type === "steal") {
              // Try to steal a card at the target tier, else step down
              const tiers = ["L", "E", "R", "U", "C"];
              const startIdx = tiers.indexOf(prize.tier);
              for (let i = startIdx; i < tiers.length; i++) {
                const tier = tiers[i];
                const owned = Object.entries(cardCollection).filter(([id, count]) => {
                  if (count <= 0) return false;
                  const allCards = [...CARDS, ...LEGEND_CARDS];
                  const card = allCards.find(c => c.id === id);
                  return card && card.rarity === tier;
                });
                if (owned.length > 0) {
                  const [stolenId] = owned[Math.floor(Math.random() * owned.length)];
                  const allCards = [...CARDS, ...LEGEND_CARDS];
                  const stolenCardObj = allCards.find(c => c.id === stolenId);
                  const newCollection = { ...cardCollection };
                  newCollection[stolenId] = (newCollection[stolenId] || 1) - 1;
                  if (newCollection[stolenId] <= 0) delete newCollection[stolenId];
                  setCardCollection(newCollection);
                  try { localStorage.setItem("wc2026_cards_v2", JSON.stringify(newCollection)); } catch {}
                  return {
                    message: `💔 קלף ${tier === "L" ? "LEGENDARY" : tier === "E" ? "Epic" : tier === "R" ? "Rare" : tier === "U" ? "Uncommon" : "Common"} נגנב!`,
                    deferred: () => {
                      setShowCoinWheel(false);
                      setShowRoulette(true);
                      setPendingCard(stolenCardObj);
                      setIsSpinning(true);
                      setTimeout(() => {
                        setIsSpinning(false);
                        setPendingCard(null);
                        setSpinResult({ card: stolenCardObj, isDuplicate: false, refund: 0, stolen: true });
                      }, 4200);
                    }
                  };
                }
              }
              // No cards to steal — fallback to coin penalty
              const fallback = Math.min(200, coins?.balance || 0);
              setCoins(prev => {
                const updated = { ...prev, balance: (prev?.balance || 0) - fallback };
                try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
                return updated;
              });
              return `💸 אין קלף — הפסדת ${fallback} 🪙`;
            }
            return prize.label;
          }}
        />
      )}

      {/* 🎴 Higher/Lower Game */}
      {showLuckyWheel && (() => {
        // Compute league top score (include self for instant updates)
        const members = leagueData?.members ? Object.entries(leagueData.members) : [];
        let leagueRecord = { name: "—", streak: 0 };
        for (const [uid, m] of members) {
          // Use local hlBestStreak for ourselves (instant), Firebase value for others
          const memberStreak = uid === userId ? Math.max(hlBestStreak, m.hlBestStreak || 0) : (m.hlBestStreak || 0);
          if (memberStreak > leagueRecord.streak) {
            leagueRecord = { name: m.name || "—", streak: memberStreak };
          }
        }
        // Fallback if we're not in any league member entries yet
        if (hlBestStreak > leagueRecord.streak) {
          leagueRecord = { name: name || "אני", streak: hlBestStreak };
        }
        return (
        <LuckyWheelModal
          onClose={()=>setShowLuckyWheel(false)}
          onWin={(amount) => {
            setCoins(prev => {
              const updated = { ...prev, balance: (prev?.balance || 0) + amount };
              try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
              return updated;
            });
          }}
          onUpdateBestStreak={(streak) => {
            if (streak > hlBestStreak) {
              setHlBestStreak(streak);
              try { localStorage.setItem("wc2026_hl_best_v1", String(streak)); } catch {}
            }
          }}
          personalBest={hlBestStreak}
          leagueRecord={leagueRecord}
          freePlaysLeft={Math.max(0, 5 - hlPlaysToday) + luckyWheelExtraSpins}
          coinBalance={coins?.balance || 0}
          onUseFree={() => {
            // Consume extra ticket first if available, otherwise daily play
            if (luckyWheelExtraSpins > 0) {
              const newExtra = luckyWheelExtraSpins - 1;
              setLuckyWheelExtraSpins(newExtra);
              try { localStorage.setItem("wc2026_wheel_extra_v1", String(newExtra)); } catch {}
            } else {
              const today = new Date().toISOString().slice(0, 10);
              const newPlays = hlPlaysToday + 1;
              setHlPlaysToday(newPlays);
              try {
                localStorage.setItem("wc2026_hl_plays_v1", JSON.stringify({ date: today, plays: newPlays }));
              } catch {}
            }
          }}
          onPayPlay={() => {
            setCoins(prev => {
              const updated = { ...prev, balance: (prev?.balance || 0) - 50 };
              try { localStorage.setItem("wc2026_coins_v7", JSON.stringify(updated)); } catch {}
              return updated;
            });
          }}
        />
        );
      })()}

      {/* 🎡 Wheel available popup — shows once per session */}
      {wheelPopupShown && wheelAvailable && !showLuckyWheel && (
        <div onClick={() => setWheelPopupShown(false)} style={{
          position:"fixed",inset:0,background:"rgba(7,13,30,0.85)",
          zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",
          padding:20,
          animation:"fadeIn 0.3s ease",
        }}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes wheelBounce {
              0% { transform: scale(0.5) rotate(-180deg); opacity: 0; }
              60% { transform: scale(1.1) rotate(20deg); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
          `}</style>
          <div onClick={e=>e.stopPropagation()} style={{
            maxWidth:340,width:"100%",
            background:"linear-gradient(160deg,#1e293b,#0f172a)",
            borderRadius:20,padding:"28px 24px",
            border:"2px solid #fbbf24",
            boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(251,191,36,0.4)",
            textAlign:"center",
            animation:"wheelBounce 0.7s cubic-bezier(0.2,0.7,0.3,1)",
          }}>
            <div style={{fontSize:64,marginBottom:14}}>🎴</div>
            <div style={{fontSize:20,fontWeight:900,color:"#fbbf24",marginBottom:8,letterSpacing:1}}>
              גבוה או נמוך זמין!
            </div>
            <div style={{fontSize:13,color:"#cbd5e1",marginBottom:20,lineHeight:1.5}}>
              🎁 יש לך {Math.max(0, 5 - hlPlaysToday)} משחקים חינם היום!
            </div>
            <button onClick={() => {
              setWheelPopupShown(false);
              setShowLuckyWheel(true);
            }} style={{
              width:"100%",padding:"14px",borderRadius:12,
              background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
              color:"#1e2940",border:"none",
              fontSize:15,fontWeight:900,cursor:"pointer",
              fontFamily:"inherit",letterSpacing:1,
              boxShadow:"0 8px 24px rgba(251,191,36,0.4)",
              marginBottom:10,
            }}>🎴 שחק עכשיו!</button>
            <button onClick={() => setWheelPopupShown(false)} style={{
              padding:"10px",
              background:"transparent",color:"#94a3b8",border:"none",
              fontSize:12,cursor:"pointer",fontFamily:"inherit",
            }}>אולי אחר כך</button>
          </div>
        </div>
      )}

      {/* 🎁 Gift received toast */}
      {giftToast && (
        <>
          <style>{`@keyframes giftToastIn { from { opacity: 0; transform: translate(-50%, -30px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
          <div style={{
            position:"fixed",top:20,left:"50%",
            zIndex:10000,
            background:"linear-gradient(135deg,#fbbf24,#d97706)",
            color:"#0a0a0a",
            padding:"14px 22px",borderRadius:14,
            boxShadow:"0 12px 40px rgba(0,0,0,0.5), 0 0 40px rgba(251,191,36,0.4)",
            fontSize:14,fontWeight:900,
            animation:"giftToastIn 0.4s cubic-bezier(0.2,0.7,0.3,1) forwards",
            maxWidth:"90vw",textAlign:"center",direction:"rtl",
            transform:"translateX(-50%)",
          }}>
            <div style={{fontSize:24,marginBottom:4}}>🎁</div>
            <div style={{fontSize:18,fontWeight:900}}>+{giftToast.amount} 🪙</div>
            <div style={{fontSize:12,fontWeight:700,marginTop:4,opacity:0.85}}>{giftToast.reason}</div>
          </div>
        </>
      )}

      {/* 🎁 Daily Bonus Toast */}
      {dailyBonusToast && (
        <>
          <style>{`@keyframes dailyBonusIn { 0% { opacity: 0; transform: translate(-50%, -40px) scale(0.85); } 60% { transform: translate(-50%, 8px) scale(1.05); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }`}</style>
          <div style={{
            position:"fixed",top:24,left:"50%",
            zIndex:10000,
            background:"linear-gradient(135deg,#22c55e,#16a34a)",
            color:"#fff",
            padding:"16px 24px",borderRadius:14,
            boxShadow:"0 12px 40px rgba(0,0,0,0.5), 0 0 40px rgba(34,197,94,0.5)",
            fontSize:14,fontWeight:900,
            animation:"dailyBonusIn 0.6s cubic-bezier(0.2,0.7,0.3,1) forwards",
            maxWidth:"90vw",textAlign:"center",direction:"rtl",
            transform:"translateX(-50%)",
            border:"2px solid rgba(255,255,255,0.3)",
          }}>
            <div style={{fontSize:28,marginBottom:4}}>☀️</div>
            <div style={{fontSize:11,letterSpacing:2,fontWeight:800,opacity:0.85}}>בונוס יומי!</div>
            <div style={{fontSize:22,fontWeight:900,marginTop:4}}>+{dailyBonusToast.amount} 🪙</div>
            <div style={{fontSize:11,fontWeight:700,marginTop:4,opacity:0.85}}>תחזור מחר לעוד!</div>
          </div>
        </>
      )}

      {/* 🎬 Sunday Wrapped */}
      {showWrapped && (
        <WrappedModal
          stats={wrappedStats}
          onClose={()=>setShowWrapped(false)}
        />
      )}

      {/* 🎰 Roulette */}
      {showRoulette && !spinResult && (
        <RouletteModal
          coins={coins}
          isSpinning={isSpinning}
          pendingCard={pendingCard}
          onSpin={handleSpin}
          onLegendsSpin={handleLegendsSpin}
          legendsSpinAvailable={legendsSpinAvailable}
          onGalaxySpin={handleGalaxySpin}
          galaxyTestMode={galaxyTestMode}
          spinCount={spinCount}
          onClose={()=>setShowRoulette(false)}
          onShowCollection={()=>setShowCollection(true)}
        />
      )}

      {/* 🎉 Card reveal — appears OVER the roulette */}
      {spinResult && (
        <CardRevealModal
          result={spinResult}
          onClose={closeSpinResult}
        />
      )}

      {/* 🃏 Collection viewer */}
      {showCollection && (
        <CollectionModal
          collection={cardCollection}
          onClose={()=>setShowCollection(false)}
        />
      )}

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

      {/* 💰 Coin flash — appears top-right when coins are earned */}
      {coinFlash && (
        <div key={coinFlash.key} style={{
          position:"fixed",top:60,insetInlineEnd:14,zIndex:9400,
          pointerEvents:"none",
        }}>
          <style>{`
            @keyframes coinFlashIn {
              0% { transform: translateX(80px) scale(0.5); opacity: 0; }
              30% { transform: translateX(0) scale(1.15); opacity: 1; }
              60% { transform: translateX(0) scale(1); opacity: 1; }
              100% { transform: translateX(0) scale(1); opacity: 0; }
            }
            @keyframes coinSparkle {
              0%, 100% { transform: rotate(0deg) scale(1); }
              50% { transform: rotate(15deg) scale(1.1); }
            }
          `}</style>
          <div style={{
            background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
            color:"#1e2940",
            borderRadius:12,padding:"10px 16px",
            display:"flex",alignItems:"center",gap:8,
            boxShadow:"0 8px 24px rgba(251,191,36,0.4)",
            animation:"coinFlashIn 3s ease-out forwards",
            fontWeight:900,fontSize:16,
          }}>
            <span style={{fontSize:22,animation:"coinSparkle 0.6s ease-in-out"}}>🪙</span>
            <span>+{coinFlash.amount}</span>
          </div>
        </div>
      )}
      </div>
    </div>
    </ToastProvider>
    </LangContext.Provider>
  );
}
