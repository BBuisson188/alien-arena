import { firebaseConfig, hasFirebaseConfig } from "./firebase-config.js";

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const stageLabel = document.querySelector("#stageLabel");
const healthLabel = document.querySelector("#healthLabel");
const scoreLabel = document.querySelector("#scoreLabel");
const restartButton = document.querySelector("#restartButton");
const leftButton = document.querySelector("#leftButton");
const rightButton = document.querySelector("#rightButton");
const shootButton = document.querySelector("#shootButton");
const leaderboardButton = document.querySelector("#leaderboardButton");
const leaderboardOverlay = document.querySelector("#leaderboardOverlay");
const leaderboardTitle = document.querySelector("#leaderboardTitle");
const leaderboardList = document.querySelector("#leaderboardList");
const recentScoreText = document.querySelector("#recentScoreText");
const scoreForm = document.querySelector("#scoreForm");
const playerNameInput = document.querySelector("#playerName");
const closeLeaderboardButton = document.querySelector("#closeLeaderboardButton");
const playAgainButton = document.querySelector("#playAgainButton");

const W = canvas.width;
const H = canvas.height;
const MID = W / 2;
const ENEMY_GOAL = 10;
const MAX_HEALTH = 3;
const ARCADE_FONT = '"Arial Black", Impact, "Trebuchet MS", sans-serif';
const LEADERBOARD_KEY = "alienArenaLeaderboard";
const PENDING_GLOBAL_SCORES_KEY = "alienArenaPendingGlobalScores";
const LEADERBOARD_LIMIT = 10;
const GAME_ID = "alien-arena";
const FIRESTORE_LEADERBOARD_PATH = ["leaderboards", GAME_ID, "scores"];

const firebaseState = {
  enabled: false,
  db: null,
  error: "",
  loading: null,
  api: null,
};

async function initFirebase() {
  if (firebaseState.enabled && firebaseState.db) return firebaseState;
  if (firebaseState.loading) return firebaseState.loading;
  if (!hasFirebaseConfig(firebaseConfig)) {
    firebaseState.error = "Firebase config missing; using local leaderboard.";
    return firebaseState;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    firebaseState.error = "Offline; using local leaderboard.";
    return firebaseState;
  }

  firebaseState.loading = Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
  ])
    .then(([appModule, firestoreModule]) => {
      const app = appModule.initializeApp(firebaseConfig);
      firebaseState.api = firestoreModule;
      firebaseState.db = firestoreModule.getFirestore(app);
      firebaseState.enabled = true;
      firebaseState.error = "";
      return firebaseState;
    })
    .catch((error) => {
      firebaseState.enabled = false;
      firebaseState.db = null;
      firebaseState.api = null;
      firebaseState.error = `Firebase unavailable; using local leaderboard. ${error.message || error}`;
      return firebaseState;
    })
    .finally(() => {
      firebaseState.loading = null;
    });

  return firebaseState.loading;
}

function asset(path) {
  const img = new Image();
  img.src = path;
  return img;
}

const sprites = {
  ufos: [
    { name: "Lime Saucer", img: asset("assets/sprites/ufo-lime.png"), glow: "#9cff22" },
    { name: "Plasma Saucer", img: asset("assets/sprites/ufo-plasma.png"), glow: "#f13dff" },
    { name: "Rocket Saucer", img: asset("assets/sprites/ufo-rocket.png"), glow: "#ffad18" },
  ],
  aliens: [
    { name: "Zig", img: asset("assets/sprites/alien-zig.png"), tint: "#9cff28" },
    { name: "Blink", img: asset("assets/sprites/alien-blink.png"), tint: "#22d9ff" },
    { name: "Nomi", img: asset("assets/sprites/alien-nomi.png"), tint: "#a14dff" },
  ],
  archers: [
    { img: asset("assets/sprites/archer-blue.png") },
    { img: asset("assets/sprites/archer-green.png") },
    { img: asset("assets/sprites/archer-red.png") },
  ],
  beachBoys: [
    { img: asset("assets/sprites/boy-blue.png") },
    { img: asset("assets/sprites/boy-green.png") },
    { img: asset("assets/sprites/boy-red.png") },
  ],
  penguins: [
    { img: asset("assets/sprites/peng-blue.png") },
    { img: asset("assets/sprites/peng-green.png") },
    { img: asset("assets/sprites/peng-red.png") },
  ],
  kings: [
    { img: asset("assets/sprites/evil-king.png") },
    { img: asset("assets/sprites/evil-king-left.png") },
    { img: asset("assets/sprites/evil-king-right.png") },
    { img: asset("assets/sprites/evil-king-throw.png") },
  ],
  ceo: { img: asset("assets/sprites/evil-boss.png") },
  bear: { img: asset("assets/sprites/evil-bear.png") },
};

const LEVELS = [
  {
    name: "Corn Maze",
    runLabel: "Archers",
    bossLabel: "King",
    clearText: "Castle Conquered",
    enemySprites: sprites.archers,
    enemyProjectile: "arrow",
    bossSprites: sprites.kings,
    bossProjectile: "axe",
    scenery: "corn",
  },
  {
    name: "Beach Siege",
    runLabel: "Beach Boys",
    bossLabel: "CEO",
    clearText: "Beach Bought Back",
    enemySprites: sprites.beachBoys,
    enemyProjectile: "umbrella",
    bossSprites: [sprites.ceo],
    bossProjectile: "umbrella",
    scenery: "beach",
  },
  {
    name: "Snow Peak",
    runLabel: "Penguins",
    bossLabel: "Polar Bear",
    clearText: "Peak Liberated",
    enemySprites: sprites.penguins,
    enemyProjectile: "snowball",
    bossSprites: [sprites.bear],
    bossProjectile: "sharkAxe",
    scenery: "snow",
  },
];

const allImages = [
  ...sprites.ufos.map((s) => s.img),
  ...sprites.aliens.map((s) => s.img),
  ...sprites.archers.map((s) => s.img),
  ...sprites.beachBoys.map((s) => s.img),
  ...sprites.penguins.map((s) => s.img),
  ...sprites.kings.map((s) => s.img),
  sprites.ceo.img,
  sprites.bear.img,
];

const state = {
  mode: "alien",
  level: 0,
  alien: 0,
  ufo: 0,
  lane: 1,
  targetLane: 1,
  health: MAX_HEALTH,
  score: 0,
  distance: 0,
  enemyKills: 0,
  bossHits: 0,
  bossX: MID,
  bossPrevX: MID,
  bossDodge: 0,
  bossThrow: 1,
  bossPlayerX: MID,
  bossTargetX: MID,
  bossTelegraph: 0,
  kingDefeatTimer: 0,
  kingDefeatX: MID,
  screenShake: 0,
  defeatScene: "maze",
  cooldown: 0,
  invincible: 0,
  enemies: [],
  enemyProjectiles: [],
  axes: [],
  lasers: [],
  particles: [],
  flash: 0,
  lastTime: 0,
  gameOverHandled: false,
  pendingLeaderboardScore: null,
  recentLeaderboardScore: null,
  leaderboardSource: "local",
};

let pointerStart = null;
let leaderboardRequestId = 0;

function reset(mode = "alien") {
  Object.assign(state, {
    mode,
    level: 0,
    lane: 1,
    targetLane: 1,
    health: MAX_HEALTH,
    score: 0,
    distance: 0,
    enemyKills: 0,
    bossHits: 0,
    bossX: MID,
    bossPrevX: MID,
    bossDodge: 0,
    bossThrow: 1,
    bossPlayerX: MID,
    bossTargetX: MID,
    bossTelegraph: 0,
    kingDefeatTimer: 0,
    kingDefeatX: MID,
    screenShake: 0,
    defeatScene: "maze",
    cooldown: 0,
    invincible: 0,
    enemies: [],
    enemyProjectiles: [],
    axes: [],
    lasers: [],
    particles: [],
    flash: 0,
    lastTime: performance.now(),
    gameOverHandled: false,
    pendingLeaderboardScore: null,
    recentLeaderboardScore: null,
    leaderboardSource: "local",
  });
  hideLeaderboard();
  updateHud();
}

function levelConfig() {
  return LEVELS[state.level] || LEVELS[0];
}

function updateHud() {
  const level = levelConfig();
  const names = {
    alien: "Choose Alien",
    ufo: "Choose UFO",
    maze: `L${state.level + 1} ${level.runLabel} ${state.enemyKills}/${ENEMY_GOAL}`,
    boss: `L${state.level + 1} ${level.bossLabel} ${state.bossHits}/3`,
    kingDefeated: `${level.bossLabel} Down!`,
    win: state.level >= LEVELS.length - 1 ? "Arena Cleared" : "Level Cleared",
    lose: "Hull Breached",
  };
  stageLabel.textContent = names[state.mode];
  healthLabel.textContent = `${state.health}/${MAX_HEALTH}`;
  scoreLabel.textContent = state.score;
}

function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const scores = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(scores)) return [];
    return scores
      .filter((entry) => entry && typeof entry.score === "number")
      .map((entry) => ({
        name: normalizePlayerName(entry.name),
        score: sanitizeScore(entry.score),
        date: entry.date || "",
      }))
      .sort(compareScores)
      .slice(0, LEADERBOARD_LIMIT);
  } catch {
    return [];
  }
}

function saveLeaderboard(scores) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores.slice(0, LEADERBOARD_LIMIT)));
}

function submitScore(name, score) {
  const scores = getLeaderboard();
  scores.push({
    name: normalizePlayerName(name),
    score: sanitizeScore(score),
    date: new Date().toISOString(),
  });
  scores.sort(compareScores);
  saveLeaderboard(scores);
}

function normalizePlayerName(name) {
  return (name || "ACE").trim().toUpperCase().slice(0, 20) || "ACE";
}

function sanitizeScore(score) {
  return Math.max(0, Math.min(1000000, Math.round(Number(score) || 0)));
}

function compareScores(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return String(a.date || "").localeCompare(String(b.date || ""));
}

function getPendingGlobalScores() {
  try {
    const raw = localStorage.getItem(PENDING_GLOBAL_SCORES_KEY);
    const scores = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(scores)) return [];
    return scores
      .filter((entry) => entry && typeof entry.score === "number")
      .map((entry) => ({
        id: String(entry.id || `${entry.date || Date.now()}-${entry.score}`),
        name: normalizePlayerName(entry.name),
        score: sanitizeScore(entry.score),
        date: entry.date || new Date().toISOString(),
      }))
      .sort(compareScores)
      .slice(0, LEADERBOARD_LIMIT);
  } catch {
    return [];
  }
}

function savePendingGlobalScores(scores) {
  localStorage.setItem(PENDING_GLOBAL_SCORES_KEY, JSON.stringify(scores.sort(compareScores).slice(0, LEADERBOARD_LIMIT)));
}

function queuePendingGlobalScore(name, score) {
  const pending = getPendingGlobalScores();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: normalizePlayerName(name),
    score: sanitizeScore(score),
    date: new Date().toISOString(),
  };
  pending.push(entry);
  savePendingGlobalScores(pending);
  return entry;
}

async function firestoreScoresCollection() {
  await initFirebase();
  if (!firebaseState.enabled || !firebaseState.db) return null;
  return firebaseState.api.collection(firebaseState.db, ...FIRESTORE_LEADERBOARD_PATH);
}

async function getGlobalLeaderboard() {
  const scoresRef = await firestoreScoresCollection();
  if (!scoresRef) throw new Error(firebaseState.error || "Firebase is not configured.");
  const { getDocs, limit, orderBy, query } = firebaseState.api;

  const readSnapshot = async (withTieBreaker) => {
    const q = withTieBreaker
      ? query(scoresRef, orderBy("score", "desc"), orderBy("createdAt", "asc"), limit(LEADERBOARD_LIMIT))
      : query(scoresRef, orderBy("score", "desc"), limit(LEADERBOARD_LIMIT));
    return getDocs(q);
  };

  let snapshot;
  try {
    snapshot = await readSnapshot(true);
  } catch (error) {
    console.warn("Global leaderboard tie-break query failed, retrying score-only query.", error);
    snapshot = await readSnapshot(false);
  }

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        name: normalizePlayerName(data.playerName),
        score: sanitizeScore(data.score),
        date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : "",
      };
    })
    .filter((entry) => entry.score >= 0)
    .sort(compareScores)
    .slice(0, LEADERBOARD_LIMIT);
}

let syncingPendingScores = false;

async function syncPendingGlobalScores() {
  const pending = getPendingGlobalScores();
  if (!pending.length || syncingPendingScores) return { synced: 0, skipped: 0 };
  const scoresRef = await firestoreScoresCollection();
  if (!scoresRef) throw new Error(firebaseState.error || "Firebase is not configured.");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Offline; pending scores will sync later.");
  }
  const { addDoc, serverTimestamp } = firebaseState.api;

  syncingPendingScores = true;
  try {
    let globalScores = await getGlobalLeaderboard();
    const remaining = [];
    let synced = 0;
    let skipped = 0;

    for (const entry of pending.sort(compareScores)) {
      if (!scoreQualifiesForList(entry.score, globalScores)) {
        skipped += 1;
        continue;
      }

      try {
        await addDoc(scoresRef, {
          playerName: entry.name,
          score: entry.score,
          gameId: GAME_ID,
          createdAt: serverTimestamp(),
        });
        synced += 1;
        globalScores = [...globalScores, entry].sort(compareScores).slice(0, LEADERBOARD_LIMIT);
      } catch (error) {
        remaining.push(entry);
        console.warn("Pending global score sync failed; keeping it queued.", error);
      }
    }

    savePendingGlobalScores(remaining);
    if (synced || skipped) firebaseState.error = "";
    return { synced, skipped };
  } finally {
    syncingPendingScores = false;
  }
}

async function getBestLeaderboard() {
  try {
    await syncPendingGlobalScores();
    const scores = await getGlobalLeaderboard();
    firebaseState.error = "";
    return { source: "global", scores };
  } catch (error) {
    firebaseState.error = error.message || "Global leaderboard unavailable.";
    console.warn("Global leaderboard unavailable; using local leaderboard.", error);
    return { source: "local", scores: getLeaderboard() };
  }
}

function scoreQualifiesForList(score, scores) {
  return scores.length < LEADERBOARD_LIMIT || score > scores[scores.length - 1].score;
}

function renderLeaderboardList(scores = getLeaderboard()) {
  leaderboardList.innerHTML = "";
  if (scores.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No scores yet";
    leaderboardList.appendChild(empty);
    return;
  }
  scores.forEach((entry) => {
    const item = document.createElement("li");
    const line = document.createElement("div");
    line.className = "score-line";
    const name = document.createElement("span");
    name.textContent = entry.name;
    const score = document.createElement("span");
    score.textContent = entry.score.toString();
    line.append(name, score);
    item.appendChild(line);
    leaderboardList.appendChild(item);
  });
}

async function showLeaderboard({
  score = null,
  decideNameEntry = false,
  fromMenu = false,
  forceLocal = false,
} = {}) {
  const requestId = ++leaderboardRequestId;
  state.pendingLeaderboardScore = null;
  state.recentLeaderboardScore = score;
  leaderboardTitle.textContent = "Leaderboard";
  scoreForm.hidden = true;
  recentScoreText.textContent = "Loading leaderboard...";
  leaderboardList.innerHTML = "";
  leaderboardOverlay.hidden = false;

  const result = forceLocal ? { source: "local", scores: getLeaderboard() } : await getBestLeaderboard();
  if (requestId !== leaderboardRequestId || leaderboardOverlay.hidden) return;

  const canEnterName = decideNameEntry
    && score !== null
    && scoreQualifiesForList(score, result.scores);
  state.pendingLeaderboardScore = canEnterName ? score : null;
  state.recentLeaderboardScore = canEnterName ? null : score;
  state.leaderboardSource = result.source;
  leaderboardTitle.textContent = canEnterName
    ? "New High Score"
    : result.source === "global"
      ? "Global Leaderboard"
      : "Local Leaderboard";
  scoreForm.hidden = !canEnterName;

  recentScoreText.textContent = result.source === "global" ? "Global top 10" : "Local top 10 on this device";
  if (score !== null && !canEnterName) {
    recentScoreText.textContent = `New score: ${score} - not top 10 (${result.source})`;
  }
  if (fromMenu) {
    recentScoreText.textContent = result.source === "global" ? "Global top 10" : "Local top 10 on this device";
  }
  if (firebaseState.error && result.source === "local") {
    recentScoreText.textContent += ` - ${firebaseState.error}`;
  }
  renderLeaderboardList(result.scores);
  if (canEnterName) {
    playerNameInput.value = "";
    playerNameInput.focus();
  }
}

function hideLeaderboard() {
  if (!leaderboardOverlay) return;
  leaderboardRequestId += 1;
  leaderboardOverlay.hidden = true;
  scoreForm.hidden = true;
  state.pendingLeaderboardScore = null;
}

async function handleGameEnd() {
  if (state.gameOverHandled) return;
  state.gameOverHandled = true;
  const finalScore = state.score;
  await showLeaderboard({ score: finalScore, decideNameEntry: true });
}

function drawSprite(sprite, x, y, w, h, flip = false) {
  ctx.save();
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }
  ctx.drawImage(sprite.img, x, y, w, h);
  ctx.restore();
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPixelText(text, x, y, size, fill = "#fff04a", stroke = "#121326", align = "center") {
  ctx.save();
  ctx.textAlign = align;
  ctx.font = `900 ${size}px ${ARCADE_FONT}`;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(5, size * 0.16);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x + 4, y + 5);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawScanlines(alpha = 0.08) {
  ctx.save();
  ctx.fillStyle = `rgba(8, 10, 28, ${alpha})`;
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 2);
  }
  ctx.restore();
}

function drawArcadeFrame(t) {
  ctx.save();
  const pulse = 0.4 + Math.sin(t * 6) * 0.12;
  ctx.strokeStyle = `rgba(255, 240, 74, ${pulse})`;
  ctx.lineWidth = 10;
  roundedRect(14, 14, W - 28, H - 28, 14);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 72, 176, 0.7)";
  ctx.lineWidth = 4;
  roundedRect(29, 29, W - 58, H - 58, 10);
  ctx.stroke();
  ctx.restore();
  drawScanlines(0.07);
}

function drawCheckerBand(y, height, t, colorA, colorB) {
  const cell = 32;
  for (let row = 0; row < Math.ceil(height / cell); row++) {
    for (let col = 0; col < Math.ceil(W / cell) + 2; col++) {
      const x = ((col * cell - (t * 72) % (cell * 2)) | 0) - cell;
      ctx.fillStyle = (row + col) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(x, y + row * cell, cell, cell);
    }
  }
}

function drawTitle(text, subtext) {
  const gradient = ctx.createRadialGradient(MID, 210, 60, MID, 260, 760);
  gradient.addColorStop(0, "#1bfff2");
  gradient.addColorStop(0.25, "#342486");
  gradient.addColorStop(0.68, "#151138");
  gradient.addColorStop(1, "#050712");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  drawCheckerBand(0, 96, performance.now() / 1000, "#ff47aa", "#fff04a");
  drawCheckerBand(H - 86, 86, -performance.now() / 1000, "#31ff6b", "#202058");
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 120; i++) {
    const x = (i * 137 + Math.sin(i) * 30) % W;
    const y = 118 + ((i * 67) % 492);
    ctx.fillRect(x, y, i % 5 === 0 ? 5 : 3, i % 5 === 0 ? 5 : 3);
  }
  drawPixelText(text.toUpperCase(), MID, 72, 58, "#fff04a", "#11162f");
  drawPixelText(subtext.toUpperCase(), MID, 125, 25, "#31ff6b", "#121326");
  drawScanlines(0.06);
}

function drawSelection(kind) {
  const options = kind === "alien" ? sprites.aliens : sprites.ufos;
  const selected = kind === "alien" ? state.alien : state.ufo;
  drawTitle("Alien Arena", kind === "alien" ? "Pick your pilot" : "Pick your UFO");
  options.forEach((item, i) => {
    const cardW = 320;
    const cardH = 390;
    const x = 110 + i * 425;
    const y = 180;
    ctx.save();
    ctx.shadowColor = selected === i ? item.tint || item.glow : "rgba(0,0,0,0.35)";
    ctx.shadowBlur = selected === i ? 30 : 8;
    roundedRect(x, y, cardW, cardH, 8);
    ctx.fillStyle = selected === i ? "rgba(255, 72, 176, 0.78)" : "rgba(15, 18, 52, 0.88)";
    ctx.fill();
    ctx.strokeStyle = selected === i ? "#fff04a" : "rgba(49,255,107,0.55)";
    ctx.lineWidth = selected === i ? 7 : 3;
    ctx.stroke();
    ctx.restore();
    const spriteW = kind === "alien" ? 210 : 282;
    const spriteH = kind === "alien" ? 280 : 214;
    drawSprite(item, x + (cardW - spriteW) / 2, y + 40, spriteW, spriteH);
    drawPixelText(item.name.toUpperCase(), x + cardW / 2, y + cardH - 46, 24, "#ffffff", "#10112a");
  });
  drawPixelText("CHOOSE YOUR LOADOUT", MID, 654, 22, "#1bfff2", "#11162f");
}

function laneX(lane) {
  return MID + (lane - 1) * 260;
}

function addParticles(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 420,
      vy: (Math.random() - 0.5) * 320,
      life: 0.55 + Math.random() * 0.25,
      color,
    });
  }
}

function startMaze() {
  state.mode = "maze";
  state.lastTime = performance.now();
  state.flash = 0.5;
  updateHud();
}

function startLevel(levelIndex) {
  state.level = levelIndex;
  Object.assign(state, {
    mode: "maze",
    lane: 1,
    targetLane: 1,
    health: MAX_HEALTH,
    distance: 0,
    enemyKills: 0,
    bossHits: 0,
    bossX: MID,
    bossPrevX: MID,
    bossDodge: 0,
    bossThrow: 1,
    bossPlayerX: MID,
    bossTargetX: MID,
    bossTelegraph: 0,
    kingDefeatTimer: 0,
    kingDefeatX: MID,
    screenShake: 0,
    defeatScene: "maze",
    cooldown: 0,
    invincible: 0,
    enemies: [],
    enemyProjectiles: [],
    axes: [],
    lasers: [],
    particles: [],
    flash: 0.5,
    lastTime: performance.now(),
    gameOverHandled: false,
    pendingLeaderboardScore: null,
    recentLeaderboardScore: null,
    leaderboardSource: "local",
  });
  hideLeaderboard();
  updateHud();
}

function advanceSelection() {
  if (state.mode === "alien") {
    state.mode = "ufo";
  } else if (state.mode === "ufo") {
    startLevel(0);
  } else if (state.mode === "win") {
    if (state.level < LEVELS.length - 1) startLevel(state.level + 1);
    else reset();
  } else if (state.mode === "lose") {
    reset();
  }
  updateHud();
}

function drawCornMaze(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#17104f");
  sky.addColorStop(0.34, "#2e7bdc");
  sky.addColorStop(0.56, "#f4d64d");
  sky.addColorStop(1, "#2a2016");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#7bbf29";
  ctx.fillRect(0, 350, W, 370);
  ctx.fillStyle = "#2d1d17";
  ctx.beginPath();
  ctx.moveTo(MID - 120, 360);
  ctx.lineTo(MID + 120, 360);
  ctx.lineTo(MID + 265, H);
  ctx.lineTo(MID - 265, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff04a";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 240, 74, 0.85)";
  ctx.lineWidth = 6;
  for (let i = 0; i < 18; i++) {
    const y = 360 + ((i * 48 + t * 150) % 390);
    const width = 120 + (y - 360) * 0.66;
    ctx.beginPath();
    ctx.moveTo(MID - width, y);
    ctx.lineTo(MID - 245, H);
    ctx.moveTo(MID + width, y);
    ctx.lineTo(MID + 245, H);
    ctx.stroke();
  }

  drawCornWall(-1, t);
  drawCornWall(1, t);
  drawForegroundCorn(t);
}

function drawCornWall(side, t) {
  const baseX = side < 0 ? 180 : W - 180;
  for (let row = 0; row < 8; row++) {
    for (let i = 0; i < 16; i++) {
      const y = -80 + ((i * 62 + row * 23 + t * (135 + row * 12)) % 860);
      const depth = Math.max(0, y / H);
      const x = baseX + side * (row * 45 + Math.sin(i * 1.7 + t * 2) * 20 + depth * 235);
      drawCornStalk(x, y, 96 + depth * 140, 1 + depth * 0.8);
    }
  }
}

function drawForegroundCorn(t) {
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 8; i++) {
      const y = 430 + ((i * 54 + t * 220) % 330);
      const x = side < 0 ? 36 + i * 24 : W - 36 - i * 24;
      drawCornStalk(x, y, 170, 1.25);
    }
  }
}

function drawCornStalk(x, y, s, thickness = 1) {
  ctx.save();
  ctx.strokeStyle = "#101818";
  ctx.lineWidth = Math.max(11, s * 0.12 * thickness);
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(x - s * 0.04, y + s * 0.3, x + s * 0.05, y - s * 0.3, x, y - s);
  ctx.stroke();
  ctx.strokeStyle = "#27a53e";
  ctx.lineWidth = Math.max(7, s * 0.08 * thickness);
  ctx.stroke();
  ctx.fillStyle = "#fff04a";
  ctx.strokeStyle = "#101818";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x + s * 0.16, y - s * 0.08, s * 0.15, s * 0.34, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#53e441";
  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(side * 0.2);
    ctx.beginPath();
    ctx.ellipse(side * s * 0.24, s * 0.04, s * 0.16, s * 0.62, side * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#103010";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawPlayer(dt) {
  state.lane += (state.targetLane - state.lane) * Math.min(1, dt * 8);
  state.bossPlayerX += (state.bossTargetX - state.bossPlayerX) * Math.min(1, dt * 10);
  const pos = playerPosition();
  const x = pos.x;
  const y = pos.y;
  const bossLean = (state.bossTargetX - state.bossPlayerX) / 520;
  const sway = state.mode === "boss" ? -bossLean : (state.targetLane - state.lane) * -0.32;
  const bob = Math.sin(performance.now() / 130) * 5;
  const ufo = sprites.ufos[state.ufo];
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(sway);
  ctx.shadowColor = ufo.glow;
  ctx.shadowBlur = 26;
  ctx.fillStyle = ufo.glow;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  ctx.ellipse(0, 78, 80, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawSprite(ufo, -122, -84, 244, 176);
  drawPilotInCanopy();
  ctx.restore();
}

function drawPilotInCanopy() {
  const alien = sprites.aliens[state.alien];
  const tint = alien.tint || "#9cff28";
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -35, 47, 38, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.ellipse(0, -28, 28, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(16, 33, 50, 0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-13, -49);
  ctx.lineTo(-29, -70);
  ctx.moveTo(13, -49);
  ctx.lineTo(29, -70);
  ctx.stroke();
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.arc(-31, -73, 8, 0, Math.PI * 2);
  ctx.arc(31, -73, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.36;
  ctx.fillStyle = "#91ecff";
  ctx.beginPath();
  ctx.ellipse(0, -36, 51, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function playerPosition() {
  if (state.mode === "boss" || state.mode === "kingDefeated" || state.mode === "win" || (state.mode === "lose" && state.defeatScene === "boss")) {
    return { x: state.bossPlayerX, y: 595 };
  }
  return { x: laneX(state.lane), y: 545 };
}

function spawnEnemy() {
  const level = levelConfig();
  const lane = Math.floor(Math.random() * 3);
  state.enemies.push({
    lane,
    y: -90,
    sprite: Math.floor(Math.random() * level.enemySprites.length),
    shoot: 1.1,
    hp: 1,
  });
}

function fireLaser() {
  if (state.cooldown > 0 || (state.mode !== "maze" && state.mode !== "boss")) return;
  state.cooldown = 0.24;
  const player = playerPosition();
  if (state.mode === "boss") {
    const target = { x: state.bossX, y: 245 };
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    state.lasers.push({ x: player.x, y: player.y - 40, vx: (dx / dist) * 880, vy: (dy / dist) * 880, pulse: 0, boss: true });
  } else {
    state.lasers.push({ x: player.x, y: 500, vx: 0, vy: -760, pulse: 0, boss: false });
  }
}

function hitPlayer() {
  if (state.invincible > 0) return;
  state.health -= 1;
  state.invincible = 1.2;
  state.flash = 0.32;
  const player = playerPosition();
  addParticles(player.x, player.y, "#fffb8f", 20);
  if (state.health <= 0) {
    const currentScene = state.mode === "boss" ? "boss" : "maze";
    state.mode = "lose";
    state.defeatScene = currentScene;
  }
  updateHud();
}

function updateMaze(dt) {
  state.distance += dt * 18;
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.invincible = Math.max(0, state.invincible - dt);
  state.flash = Math.max(0, state.flash - dt);

  const complete = state.enemyKills >= ENEMY_GOAL;
  if (!complete && state.enemies.length < 3 && Math.random() < dt * 1.25) spawnEnemy();
  if (complete && state.enemies.length === 0) {
    state.mode = "boss";
    state.bossX = MID;
    state.bossPrevX = MID;
    state.bossDodge = 0;
    state.bossThrow = 0.9;
    state.bossPlayerX = MID;
    state.bossTargetX = MID;
    state.bossTelegraph = 0;
    state.flash = 0.5;
    state.enemyProjectiles = [];
    state.lasers = [];
    updateHud();
  }

  state.enemies.forEach((enemy) => {
    enemy.y += dt * 170;
    enemy.shoot -= dt;
    if (enemy.shoot <= 0) {
      enemy.shoot = 1.25 + Math.random() * 0.5;
      state.enemyProjectiles.push({
        x: laneX(enemy.lane),
        y: enemy.y + 96,
        lane: enemy.lane,
        vy: 350,
        kind: levelConfig().enemyProjectile,
        spin: 0,
      });
    }
  });
  state.enemies = state.enemies.filter((enemy) => enemy.y < 690 && enemy.hp > 0);
  updateProjectiles(dt);
}

function updateProjectiles(dt) {
  state.lasers.forEach((laser) => {
    laser.x += (laser.vx || 0) * dt;
    laser.y += laser.vy * dt;
    laser.pulse += dt * 12;
  });
  state.enemyProjectiles.forEach((projectile) => {
    projectile.y += projectile.vy * dt;
    projectile.spin = (projectile.spin || 0) + dt * 8;
  });

  state.lasers.forEach((laser) => {
    state.enemies.forEach((enemy) => {
      if (Math.abs(laser.x - laneX(enemy.lane)) < 86 && Math.abs(laser.y - (enemy.y + 95)) < 90) {
        enemy.hp = 0;
        laser.y = -100;
        state.enemyKills = Math.min(ENEMY_GOAL, state.enemyKills + 1);
        state.score += 100;
        addParticles(laneX(enemy.lane), enemy.y + 100, "#9cff22");
        updateHud();
      }
    });
  });

  state.enemyProjectiles.forEach((projectile) => {
    if (projectile.y > 495 && projectile.y < 620 && Math.abs(projectile.x - laneX(state.lane)) < 86) {
      projectile.y = 900;
      hitPlayer();
    }
  });

  state.lasers = state.lasers.filter((laser) => laser.y > -120 && laser.y < H + 120 && laser.x > -160 && laser.x < W + 160);
  state.enemyProjectiles = state.enemyProjectiles.filter((projectile) => projectile.y < 760);
  updateParticles(dt);
}

function updateParticles(dt) {
  state.particles.forEach((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
    p.life -= dt;
  });
  state.particles = state.particles.filter((p) => p.life > 0);
}

function drawProjectiles() {
  state.lasers.forEach((laser) => {
    const color = Math.sin(laser.pulse) > 0 ? "#9cff22" : "#bc40ff";
    const speed = Math.hypot(laser.vx || 0, laser.vy || -1) || 1;
    const tailX = laser.x - ((laser.vx || 0) / speed) * 64;
    const tailY = laser.y - (laser.vy / speed) * 64;
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  state.enemyProjectiles.forEach((projectile) => {
    drawEnemyProjectile(projectile);
  });

  state.axes.forEach((axe) => {
    if (axe.kind === "umbrella") {
      drawUmbrella(axe.x, axe.y, axe.spin);
      return;
    }
    ctx.save();
    ctx.translate(axe.x, axe.y);
    ctx.rotate(axe.spin);
    ctx.shadowColor = "rgba(255, 240, 74, 0.55)";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#101228";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(42, 0);
    ctx.stroke();
    ctx.strokeStyle = "#7a3e14";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(42, 0);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#dfe7ef";
    ctx.strokeStyle = "#101228";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-44, -32);
    ctx.lineTo(-30, -4);
    ctx.lineTo(-44, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 4);
    ctx.lineTo(44, 32);
    ctx.lineTo(30, 4);
    ctx.lineTo(44, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (axe.kind === "sharkAxe") {
      ctx.fillStyle = "#fffaf1";
      ctx.strokeStyle = "#101228";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const toothX = -35 + i * 14;
        ctx.beginPath();
        ctx.moveTo(toothX, -18);
        ctx.lineTo(toothX + 7, -36);
        ctx.lineTo(toothX + 14, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toothX + 8, 18);
        ctx.lineTo(toothX + 15, 36);
        ctx.lineTo(toothX + 22, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#ff4747";
    ctx.strokeStyle = "#fff04a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  state.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawEnemyProjectile(projectile) {
  if (projectile.kind === "umbrella") {
    drawUmbrella(projectile.x, projectile.y, projectile.spin || 0);
    return;
  }
  if (projectile.kind === "snowball") {
    drawSnowball(projectile.x, projectile.y, projectile.spin || 0);
    return;
  }
  drawArrow(projectile.x, projectile.y);
}

function drawArrow(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  ctx.strokeStyle = "#6a3b19";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-42, 0);
  ctx.lineTo(42, 0);
  ctx.stroke();
  ctx.fillStyle = "#e9edf3";
  ctx.beginPath();
  ctx.moveTo(48, 0);
  ctx.lineTo(24, -10);
  ctx.lineTo(24, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawUmbrella(x, y, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.strokeStyle = "#101228";
  ctx.lineWidth = 5;
  ctx.fillStyle = "#ff47aa";
  ctx.beginPath();
  ctx.arc(0, 0, 34, Math.PI, Math.PI * 2);
  ctx.lineTo(34, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(-34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fff04a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 46);
  ctx.stroke();
  ctx.fillStyle = "#1bfff2";
  ctx.fillRect(-7, -8, 14, 16);
  ctx.restore();
}

function drawSnowball(x, y, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.shadowColor = "rgba(180, 240, 255, 0.85)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#f6fbff";
  ctx.strokeStyle = "#74b8df";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(116, 184, 223, 0.55)";
  ctx.beginPath();
  ctx.arc(-8, -7, 5, 0, Math.PI * 2);
  ctx.arc(9, 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArchers() {
  const level = levelConfig();
  state.enemies.forEach((enemy) => {
    const scale = 0.55 + enemy.y / H * 0.7;
    const w = 118 * scale;
    const h = 130 * scale;
    drawSprite(level.enemySprites[enemy.sprite], laneX(enemy.lane) - w / 2, enemy.y, w, h);
  });
}

function updateBoss(dt) {
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.invincible = Math.max(0, state.invincible - dt);
  state.flash = Math.max(0, state.flash - dt);
  state.bossTelegraph = Math.max(0, state.bossTelegraph - dt);
  state.bossDodge += dt;
  state.bossThrow -= dt;
  state.bossPrevX = state.bossX;
  state.bossX = MID + Math.sin(state.bossDodge * 1.55) * 215 + Math.sin(state.bossDodge * 3.5) * 36;

  if (state.bossThrow <= 0) {
    state.bossThrow = 1.15 + Math.random() * 0.38;
    state.bossTelegraph = 0.28;
    const player = playerPosition();
    const dx = player.x - state.bossX;
    const dy = player.y - 245;
    const dist = Math.hypot(dx, dy) || 1;
    state.axes.push({
      x: state.bossX,
      y: 250,
      vx: (dx / dist) * 430,
      vy: (dy / dist) * 430,
      spin: 0,
      kind: levelConfig().bossProjectile,
    });
  }

  state.lasers.forEach((laser) => {
    if (state.mode !== "boss") return;
    const bossSize = bossDrawSize();
    const bossBottom = bossSize.y + bossSize.h * 0.85;
    if (laser.boss && laser.y < bossBottom && laser.y > bossSize.y - 20 && Math.abs(laser.x - state.bossX) < bossSize.w * 0.46) {
      laser.y = -100;
      state.bossHits += 1;
      state.score += 300;
      state.flash = 0.2;
      addParticles(state.bossX, 238, state.bossHits >= 3 ? "#ffe66a" : "#bc40ff", 28);
      if (state.bossHits >= 3) startKingDefeat();
      updateHud();
    }
  });

  if (state.mode === "kingDefeated") {
    state.axes = [];
    updateProjectiles(dt);
    return;
  }

  state.axes.forEach((axe) => {
    axe.x += axe.vx * dt;
    axe.y += axe.vy * dt;
    axe.spin += dt * 9;
    const player = playerPosition();
    if (Math.hypot(axe.x - player.x, axe.y - player.y) < 62) {
      axe.y = H + 100;
      hitPlayer();
    }
  });
  state.axes = state.axes.filter((axe) => axe.y < H + 80 && axe.x > -120 && axe.x < W + 120);
  updateProjectiles(dt);
}

function startKingDefeat() {
  state.mode = "kingDefeated";
  state.kingDefeatTimer = 0;
  state.kingDefeatX = state.bossX;
  state.screenShake = 0.9;
  state.axes = [];
  state.lasers = [];
  addParticles(state.bossX, 245, "#fff04a", 38);
  addParticles(state.bossX, 285, "#ff47aa", 32);
  playKingDefeatSound();
}

function updateKingDefeat(dt) {
  state.kingDefeatTimer += dt;
  state.screenShake = Math.max(0, state.screenShake - dt);
  state.flash = Math.max(0, state.flash - dt);
  updateParticles(dt);
  if (state.kingDefeatTimer >= 2.25) {
    state.mode = "win";
    updateHud();
  }
}

function playKingDefeatSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const audio = playKingDefeatSound.audio || new AudioCtx();
  playKingDefeatSound.audio = audio;
  if (audio.state === "suspended") audio.resume();
  [520, 390, 260].forEach((frequency, i) => {
    const start = audio.currentTime + i * 0.16;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.62, start + 0.13);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.16);
  });
}

function drawBossScene(t) {
  drawBossArena(t);
  if (state.mode === "kingDefeated" || state.mode === "win") drawDefeatedKing(t);
  else drawActiveKing(t);
  ctx.fillStyle = "#fff";
  drawPixelText(`${levelConfig().bossLabel.toUpperCase()} ${state.bossHits}/3`, MID, 42, 25, "#fff04a", "#101228");
}

function drawActiveKing(t) {
  const frame = kingFrame();
  const size = bossDrawSize();
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 14;
  drawSprite(frame, state.bossX - size.w / 2, size.y + Math.sin(t * 5) * 3, size.w, size.h);
  ctx.restore();
  ctx.strokeStyle = state.bossTelegraph > 0 ? "rgba(255, 92, 92, 0.9)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = state.bossTelegraph > 0 ? 7 : 4;
  ctx.beginPath();
  ctx.ellipse(state.bossX, 270, 86, 116, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDefeatedKing(t) {
  const boss = bossFrameForDefeat();
  const size = bossDrawSize();
  const progress = Math.min(1, state.kingDefeatTimer / 1.2);
  const squash = Math.sin(progress * Math.PI);
  const scaleX = 1 + squash * 0.95;
  const scaleY = 1 - squash * 0.78;
  const y = size.y + size.h * 0.8 * squash + Math.sin(t * 36) * (1 - progress) * 8;
  ctx.save();
  ctx.translate(state.kingDefeatX, y + size.h / 2);
  ctx.scale(scaleX, Math.max(0.18, scaleY));
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 16;
  drawSprite(boss, -size.w / 2, -size.h / 2, size.w, size.h);
  ctx.restore();
  ctx.fillStyle = "rgba(255, 240, 74, 0.8)";
  ctx.beginPath();
  ctx.ellipse(state.kingDefeatX, 405, 55 + squash * 85, 12 + squash * 13, 0, 0, Math.PI * 2);
  ctx.fill();
  if (state.kingDefeatTimer < 1.25) {
    drawPixelText("BLOOP!", state.kingDefeatX, 138 - state.kingDefeatTimer * 30, 28, "#31ff6b", "#101228");
  }
}

function kingFrame() {
  const level = levelConfig();
  if (level.bossSprites !== sprites.kings) return level.bossSprites[0];
  if (state.bossTelegraph > 0) return sprites.kings[3];
  const velocity = state.bossX - state.bossPrevX;
  if (velocity < -2) return sprites.kings[1];
  if (velocity > 2) return sprites.kings[2];
  return sprites.kings[0];
}

function bossFrameForDefeat() {
  const level = levelConfig();
  return level.bossSprites === sprites.kings ? sprites.kings[3] : level.bossSprites[0];
}

function bossDrawSize() {
  const scenery = levelConfig().scenery;
  if (scenery === "beach") return { w: 170, h: 245, y: 145 };
  if (scenery === "snow") return { w: 190, h: 260, y: 132 };
  return { w: 158, h: 236, y: 150 };
}

function drawBossArena(t) {
  const scenery = levelConfig().scenery;
  if (scenery === "beach") {
    drawBeachBossArena(t);
    return;
  }
  if (scenery === "snow") {
    drawSnowBossArena(t);
    return;
  }
  drawCastleArena(t);
}

function drawCastleArena(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#160c3f");
  sky.addColorStop(0.38, "#3331a5");
  sky.addColorStop(0.66, "#c94c32");
  sky.addColorStop(1, "#3b2416");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  drawCheckerBand(0, 84, t * 0.4, "rgba(255, 240, 74, 0.18)", "rgba(255, 72, 176, 0.18)");
  ctx.fillStyle = "#4fc237";
  ctx.fillRect(0, 420, W, 300);
  ctx.fillStyle = "#5c6379";
  ctx.fillRect(MID - 295, 72, 590, 330);
  ctx.strokeStyle = "#101228";
  ctx.lineWidth = 8;
  ctx.strokeRect(MID - 295, 72, 590, 330);
  ctx.fillStyle = "#b7bed4";
  for (let i = 0; i < 8; i++) ctx.fillRect(MID - 295 + i * 84, 38, 54, 72);
  ctx.fillStyle = "#252034";
  ctx.fillRect(MID - 75, 285, 150, 118);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 4;
  for (let r = 0; r < 8; r++) {
    ctx.beginPath();
    ctx.moveTo(MID - 295, 120 + r * 38);
    ctx.lineTo(MID + 295, 120 + r * 38);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255, 240, 74, 0.48)";
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.ellipse(MID, 570, 410, 92, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(40, 30, 20, 0.32)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const x = MID - 360 + i * 180;
    ctx.beginPath();
    ctx.moveTo(x, 455);
    ctx.lineTo(x + 48, H);
    ctx.stroke();
  }
  drawArenaCorn(t);
}

function drawBeachBossArena(t) {
  drawBeachRun(t * 0.35);
  ctx.fillStyle = "#c48a46";
  ctx.strokeStyle = "#101228";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(MID - 265, 365);
  ctx.lineTo(MID - 230, 190);
  ctx.lineTo(MID - 150, 190);
  ctx.lineTo(MID - 110, 125);
  ctx.lineTo(MID - 35, 125);
  ctx.lineTo(MID, 70);
  ctx.lineTo(MID + 35, 125);
  ctx.lineTo(MID + 110, 125);
  ctx.lineTo(MID + 150, 190);
  ctx.lineTo(MID + 230, 190);
  ctx.lineTo(MID + 265, 365);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f0c070";
  for (let i = 0; i < 28; i++) {
    ctx.fillRect(MID - 235 + (i % 7) * 78, 205 + Math.floor(i / 7) * 36, 48, 16);
  }
  ctx.fillStyle = "#6d4a2c";
  ctx.fillRect(MID - 55, 290, 110, 76);
  drawPixelText("CEO BEACH", MID, 100, 28, "#1bfff2", "#101228");
}

function drawSnowBossArena(t) {
  drawSnowRun(t * 0.35);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "#74b8df";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(MID, 390, 340, 88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d8f3ff";
  ctx.strokeStyle = "#101228";
  ctx.lineWidth = 6;
  for (let i = 0; i < 7; i++) {
    const x = MID - 330 + i * 110;
    ctx.beginPath();
    ctx.moveTo(x, 382);
    ctx.lineTo(x + 55, 210 - (i % 2) * 45);
    ctx.lineTo(x + 116, 382);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  drawPixelText("ICE CAVE", MID, 98, 30, "#fff04a", "#101228");
}

function drawArenaCorn(t) {
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 10; i++) {
      const x = side < 0 ? 38 + i * 24 : W - 38 - i * 24;
      const y = 130 + ((i * 57 + t * 45) % 575);
      drawCornStalk(x, y, 145, 1.1);
    }
  }
}

function drawMazeScene(t) {
  drawRunScene(t);
  drawArchers();
}

function drawRunScene(t) {
  const scenery = levelConfig().scenery;
  if (scenery === "beach") {
    drawBeachRun(t);
    return;
  }
  if (scenery === "snow") {
    drawSnowRun(t);
    return;
  }
  drawCornMaze(t);
}

function drawBeachRun(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1bfff2");
  sky.addColorStop(0.42, "#2e7bdc");
  sky.addColorStop(0.56, "#fff04a");
  sky.addColorStop(1, "#d7923c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#23b3ff";
  ctx.fillRect(0, 285, W, 120);
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 ? "rgba(255,255,255,0.55)" : "rgba(27,255,242,0.45)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    const y = 310 + i * 18 + Math.sin(t * 3 + i) * 5;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(300, y + 18, 580, y - 18, W, y + 8);
    ctx.stroke();
  }
  ctx.fillStyle = "#f6c978";
  ctx.fillRect(0, 390, W, 330);
  drawScrollingTrack(t, "#b9743d", "#fff04a");
  drawPalmWall(-1, t);
  drawPalmWall(1, t);
}

function drawPalmWall(side, t) {
  for (let i = 0; i < 10; i++) {
    const y = 40 + ((i * 86 + t * 130) % 760);
    const depth = Math.max(0.25, y / H);
    const x = side < 0 ? 90 + depth * 70 : W - 90 - depth * 70;
    drawPalmTree(x, y, side, 0.55 + depth * 0.9);
  }
}

function drawPalmTree(x, y, side, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#101228";
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(0, 120);
  ctx.bezierCurveTo(side * -18, 70, side * 16, 30, 0, -25);
  ctx.stroke();
  ctx.strokeStyle = "#8a4a1f";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = "#31ff6b";
  ctx.strokeStyle = "#101228";
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i - 2.5) * 0.55 + side * 0.2);
    ctx.beginPath();
    ctx.ellipse(side * 28, -34, 18, 62, side * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawSnowRun(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0c1c5a");
  sky.addColorStop(0.44, "#5aa9ff");
  sky.addColorStop(0.7, "#eaf8ff");
  sky.addColorStop(1, "#bfe9ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  drawMountainRange(t, 170, "#d8f3ff", "#74b8df");
  drawMountainRange(t * 0.7, 245, "#ffffff", "#97cdef");
  ctx.fillStyle = "#effbff";
  ctx.fillRect(0, 365, W, 355);
  drawScrollingTrack(t, "#9bcce8", "#ffffff");
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = i % 3 ? "rgba(255,255,255,0.85)" : "rgba(27,255,242,0.8)";
    ctx.beginPath();
    ctx.arc((i * 71 + t * 55) % W, (i * 47 + t * 120) % H, i % 4 === 0 ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMountainRange(t, baseY, snow, shade) {
  for (let i = -1; i < 8; i++) {
    const x = i * 190 - ((t * 18) % 190);
    ctx.fillStyle = "#101228";
    ctx.beginPath();
    ctx.moveTo(x - 90, baseY + 175);
    ctx.lineTo(x + 48, baseY - 82);
    ctx.lineTo(x + 190, baseY + 175);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(x - 80, baseY + 170);
    ctx.lineTo(x + 48, baseY - 70);
    ctx.lineTo(x + 178, baseY + 170);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.moveTo(x + 48, baseY - 70);
    ctx.lineTo(x + 15, baseY - 8);
    ctx.lineTo(x + 48, baseY - 25);
    ctx.lineTo(x + 82, baseY - 8);
    ctx.closePath();
    ctx.fill();
  }
}

function drawScrollingTrack(t, line, highlight) {
  ctx.fillStyle = "rgba(45, 29, 23, 0.22)";
  ctx.beginPath();
  ctx.moveTo(MID - 120, 360);
  ctx.lineTo(MID + 120, 360);
  ctx.lineTo(MID + 265, H);
  ctx.lineTo(MID - 265, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 6;
  for (let i = 0; i < 18; i++) {
    const y = 360 + ((i * 48 + t * 150) % 390);
    const width = 120 + (y - 360) * 0.66;
    ctx.strokeStyle = i % 2 ? line : highlight;
    ctx.beginPath();
    ctx.moveTo(MID - width, y);
    ctx.lineTo(MID - 245, H);
    ctx.moveTo(MID + width, y);
    ctx.lineTo(MID + 245, H);
    ctx.stroke();
  }
}

function drawHealthIndicator() {
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = `900 22px ${ARCADE_FONT}`;
  ctx.fillStyle = "rgba(12, 10, 35, 0.82)";
  roundedRect(24, 22, 228, 72, 6);
  ctx.fill();
  ctx.strokeStyle = "#fff04a";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = "#101228";
  ctx.lineWidth = 4;
  ctx.strokeText("Hull", 44, 52);
  ctx.fillStyle = "#1bfff2";
  ctx.fillText("Hull", 44, 52);
  for (let i = 0; i < MAX_HEALTH; i++) {
    const x = 105 + i * 42;
    ctx.fillStyle = i < state.health ? "#31ff6b" : "rgba(255,255,255,0.14)";
    ctx.strokeStyle = i < state.health ? "#fff04a" : "rgba(255,255,255,0.28)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 42);
    ctx.lineTo(x + 22, 42);
    ctx.lineTo(x + 31, 57);
    ctx.lineTo(x + 22, 72);
    ctx.lineTo(x, 72);
    ctx.lineTo(x - 9, 57);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawOverlay(text, subtext) {
  ctx.fillStyle = "rgba(4, 8, 18, 0.78)";
  ctx.fillRect(0, 0, W, H);
  drawCheckerBand(250, 118, performance.now() / 1000, "rgba(255, 71, 170, 0.42)", "rgba(255, 240, 74, 0.36)");
  drawPixelText(text.toUpperCase(), MID, 304, 62, "#fff04a", "#101228");
  drawPixelText(subtext.toUpperCase(), MID, 356, 22, "#1bfff2", "#101228");
  drawScanlines(0.08);
}

function render(time = performance.now()) {
  const dt = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;

  if (!imagesReady()) {
    ctx.fillStyle = "#11192a";
    ctx.fillRect(0, 0, W, H);
    requestAnimationFrame(render);
    return;
  }

  if (state.mode === "alien") {
    drawSelection("alien");
  } else if (state.mode === "ufo") {
    drawSelection("ufo");
  } else {
    const t = time / 1000;
    if (state.mode === "maze") updateMaze(dt);
    if (state.mode === "boss") updateBoss(dt);
    if (state.mode === "kingDefeated") updateKingDefeat(dt);

    const shake = state.screenShake > 0 ? Math.sin(time * 0.08) * state.screenShake * 10 : 0;
    ctx.save();
    ctx.translate(shake, -shake * 0.45);
    if (state.mode === "boss" || state.mode === "kingDefeated" || state.mode === "win" || (state.mode === "lose" && state.defeatScene === "boss")) drawBossScene(t);
    else drawMazeScene(t);
    drawProjectiles();
    if (state.mode !== "win" && state.mode !== "kingDefeated") drawPlayer(dt);
    drawArcadeFrame(t);
    ctx.restore();
    drawHealthIndicator();
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (state.mode === "win") {
      const finalLevel = state.level >= LEVELS.length - 1;
      drawOverlay(levelConfig().clearText, finalLevel ? "Press Restart or Fire to play again" : "Press Fire for next level");
      if (finalLevel) handleGameEnd();
    }
    if (state.mode === "lose") {
      drawOverlay("UFO Down", "Press Restart or Fire to try again");
      handleGameEnd();
    }
  }

  requestAnimationFrame(render);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function chooseAt(point) {
  if (state.mode !== "alien" && state.mode !== "ufo") return false;
  for (let i = 0; i < 3; i++) {
    const x = 110 + i * 425;
    if (point.x >= x && point.x <= x + 320 && point.y >= 180 && point.y <= 570) {
      if (state.mode === "alien") state.alien = i;
      else state.ufo = i;
      advanceSelection();
      return true;
    }
  }
  return false;
}

canvas.addEventListener("pointerdown", (event) => {
  if (!leaderboardOverlay.hidden) return;
  pointerStart = canvasPoint(event);
});

canvas.addEventListener("pointerup", (event) => {
  if (!leaderboardOverlay.hidden) {
    pointerStart = null;
    return;
  }
  const point = canvasPoint(event);
  if (chooseAt(point)) return;
  if (!pointerStart) return;
  const dx = point.x - pointerStart.x;
  const dy = point.y - pointerStart.y;
  if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
    movePlayer(Math.sign(dx));
  } else {
    fireLaser();
  }
  pointerStart = null;
});

function movePlayer(direction) {
  if (state.mode === "boss") {
    state.bossTargetX = Math.max(250, Math.min(W - 250, state.bossTargetX + direction * 180));
  } else {
    state.targetLane = Math.max(0, Math.min(2, state.targetLane + direction));
  }
}

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (!leaderboardOverlay.hidden) return;
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    if (state.mode === "alien") state.alien = (state.alien + 2) % 3;
    else if (state.mode === "ufo") state.ufo = (state.ufo + 2) % 3;
    else movePlayer(-1);
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    if (state.mode === "alien") state.alien = (state.alien + 1) % 3;
    else if (state.mode === "ufo") state.ufo = (state.ufo + 1) % 3;
    else movePlayer(1);
  }
  if (event.key === " " || event.key === "Enter") {
    if (state.mode === "alien" || state.mode === "ufo" || state.mode === "win" || state.mode === "lose") advanceSelection();
    else fireLaser();
  }
});

function handleFireControl() {
  if (state.mode === "alien" || state.mode === "ufo" || state.mode === "win" || state.mode === "lose") advanceSelection();
  else fireLaser();
}

function bindGameButton(button, action, { repeat = false } = {}) {
  let repeatTimer = null;
  const clearPress = () => {
    button.classList.remove("is-pressed");
    if (repeatTimer) {
      window.clearInterval(repeatTimer);
      repeatTimer = null;
    }
  };

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    button.classList.add("is-pressed");
    action();
    if (repeat) {
      repeatTimer = window.setInterval(action, 155);
    }
  });

  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    clearPress();
  });
  button.addEventListener("pointercancel", clearPress);
  button.addEventListener("lostpointercapture", clearPress);
  button.addEventListener("click", (event) => {
    event.preventDefault();
  });
  button.addEventListener("dblclick", (event) => {
    event.preventDefault();
  });
}

bindGameButton(leftButton, () => movePlayer(-1), { repeat: true });
bindGameButton(rightButton, () => movePlayer(1), { repeat: true });
bindGameButton(shootButton, handleFireControl);
restartButton.addEventListener("click", () => reset());
leaderboardButton.addEventListener("click", () => {
  showLeaderboard({ fromMenu: true });
});
closeLeaderboardButton.addEventListener("click", () => {
  hideLeaderboard();
});
playAgainButton.addEventListener("click", () => {
  reset();
});
scoreForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.pendingLeaderboardScore === null) return;
  const requestId = leaderboardRequestId;
  const name = normalizePlayerName(playerNameInput.value);
  const score = sanitizeScore(state.pendingLeaderboardScore);
  submitScore(name, score);
  queuePendingGlobalScore(name, score);
  state.pendingLeaderboardScore = null;
  scoreForm.hidden = true;
  recentScoreText.textContent = "Saving score...";
  syncPendingGlobalScores()
    .then(({ synced }) => {
      if (requestId !== leaderboardRequestId || leaderboardOverlay.hidden) return;
      recentScoreText.textContent = synced ? "Score synced!" : "Score saved locally";
      showLeaderboard({ fromMenu: false });
    })
    .catch((error) => {
      firebaseState.error = `Global sync pending; local score saved. ${error.message || error}`;
      console.warn("Global score sync failed; local score was queued.", error);
      if (requestId !== leaderboardRequestId || leaderboardOverlay.hidden) return;
      showLeaderboard({ fromMenu: false, forceLocal: true });
    });
});

window.addEventListener("online", () => {
  initFirebase().then(() => {
    syncPendingGlobalScores().catch((error) => {
      firebaseState.error = `Global sync pending. ${error.message || error}`;
    });
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Offline app cache registration failed.", error);
    });
  });
}

function boot() {
  reset();
  requestAnimationFrame(render);
}

function imagesReady() {
  return allImages.every((img) => img.complete && img.naturalWidth > 0);
}

let remainingImages = allImages.length;
allImages.forEach((img) => {
  if (img.complete) remainingImages -= 1;
  else img.addEventListener("load", () => {
    remainingImages -= 1;
    if (remainingImages === 0) boot();
  });
});

if (remainingImages === 0) boot();
