// ============================================================
//  INITECH: THE GAME — CLIENT-SIDE ENGINE
//  All game state and logic — no server needed.
//  "What would you say... you DO here?"
// ============================================================

const GameEngine = (() => {

// ---- game state --------------------------------------------
const STATE = {
  player: "Peter Gibbons",
  day: new Date().toLocaleDateString("en-US", { weekday: "long" }),
  isMonday: new Date().getDay() === 1,
  morale: 3,
  suspicion: 0,
  skimBalance: 0,
  tpsReportsFiled: 0,
  tpsCoverSheets: 0,
  tpsRequested: 0,
  staplerSecured: false,
  flairCount: 15,
  printerAlive: true,
  printerJams: 0,
  printerErrors: [],
  buildingIntact: true,
  hypnotized: false,
  jumpToConclusions: false,
  visited: [],
  inventory: [],
  turnCount: 0,
  weatherData: null,
  systemRecon: null,
  messageLog: [],
  ending: null,
  score: 0,
  scoreLog: [],
  achievements: [],
  tasks: [],
  tasksCompleted: 0,
  tasksFailed: 0,
  comboStreak: 0,
  bestCombo: 0,
  miltonAnger: 0,
  coffeeCups: 0,
  printerAttempts: 0,
  clockHour: 8,
  clockMinute: 0,
  gameOver: false,
  gameOverReason: null,
  lawrenceBeers: 0,
};

function resetState() {
  Object.assign(STATE, {
    player: "Peter Gibbons",
    day: new Date().toLocaleDateString("en-US", { weekday: "long" }),
    isMonday: new Date().getDay() === 1,
    morale: 3, suspicion: 0, skimBalance: 0,
    tpsReportsFiled: 0, tpsCoverSheets: 0, tpsRequested: 0,
    staplerSecured: false, flairCount: 15, printerAlive: true,
    printerJams: 0, printerErrors: [], buildingIntact: true,
    hypnotized: false, jumpToConclusions: false,
    visited: [], inventory: [], turnCount: 0,
    weatherData: null, systemRecon: null, messageLog: [], ending: null,
    score: 0, scoreLog: [], achievements: [],
    tasks: [], tasksCompleted: 0, tasksFailed: 0,
    comboStreak: 0, bestCombo: 0, miltonAnger: 0,
    coffeeCups: 0, printerAttempts: 0,
    clockHour: 8, clockMinute: 0,
    gameOver: false, gameOverReason: null, lawrenceBeers: 0,
  });
}

// ---- helpers -----------------------------------------------
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function visit(room) {
  if (!STATE.visited.includes(room)) STATE.visited.push(room);
}

function addItem(item) {
  if (!STATE.inventory.includes(item)) STATE.inventory.push(item);
}

function addScore(points, reason) {
  STATE.score += points;
  STATE.scoreLog.push({ points, reason, turn: STATE.turnCount });
  return { points, reason };
}

// ---- ACHIEVEMENTS ------------------------------------------
const ACHIEVEMENT_DEFS = {
  first_tps:       { name: "📋 First TPS Report",       desc: "Filed your first TPS report", pts: 50 },
  cover_sheet:     { name: "📄 Memo Received",           desc: "Used the NEW cover sheet", pts: 25 },
  rebel_report:    { name: "🚫 Cover Sheet Rebel",       desc: "Filed without a cover sheet", pts: 75 },
  tps_5:           { name: "📋 TPS Veteran",             desc: "Filed 5 TPS reports", pts: 100 },
  tps_10:          { name: "📋 TPS Machine",             desc: "Filed 10 TPS reports", pts: 250 },
  printer_jam:     { name: "🖨️ PC LOAD LETTER",          desc: "Experienced your first printer jam", pts: 25 },
  printer_3_jams:  { name: "🖨️ Jam Session",             desc: "Survived 3 printer jams", pts: 75 },
  printer_destroy: { name: "🏏 Damn It Feels Good",      desc: "Destroyed the printer", pts: 500 },
  printer_5_tries: { name: "🖨️ Definition of Insanity",  desc: "Tried to print 5 times", pts: 100 },
  stapler:         { name: "📎 Swingline Secured",        desc: "Took Milton's red stapler", pts: 150 },
  fire:            { name: "🔥 Arsonist's Accomplice",    desc: "Building burned down", pts: 666 },
  flair_37:        { name: "✨ Brian-Level Flair",         desc: "Reached 37 pieces of flair", pts: 200 },
  flair_zero:      { name: "💢 Flair Revolt",             desc: "Stripped all flair off", pts: 150 },
  hypnotized:      { name: "🌀 Permanently Relaxed",      desc: "Got hypnotized", pts: 300 },
  skim_first:      { name: "💰 Superman III",             desc: "Ran your first skim cycle", pts: 100 },
  skim_dollar:     { name: "💰 Decimal Point Error",      desc: "Skim balance exceeded $1.00", pts: 250 },
  skim_5_dollar:   { name: "💰💰 Way More Than A Penny", desc: "Skim exceeded $5.00", pts: 500 },
  bob_honest:      { name: "😎 Radical Honesty",          desc: "Told the Bobs the truth", pts: 200 },
  jump_mat:        { name: "🤸 Jump to Conclusions",      desc: "Got Tom's mat prototype", pts: 100 },
  combo_3:         { name: "🔥 Combo x3",                 desc: "Completed 3 tasks in a row", pts: 150 },
  combo_5:         { name: "🔥🔥 Combo x5",              desc: "Completed 5 tasks in a row", pts: 300 },
  combo_10:        { name: "🔥🔥🔥 UNSTOPPABLE",         desc: "Completed 10 tasks in a row", pts: 750 },
  visited_all:     { name: "🏢 Office Explorer",          desc: "Visited every location", pts: 200 },
  coffee_5:        { name: "☕ Caffeine Addict",           desc: "Drank 5 cups of coffee", pts: 100 },
  do_nothing:      { name: "😐 15 Minutes of Work",       desc: "Chose to do nothing", pts: 50 },
  motivation:      { name: "💼 Motivated!",               desc: "Read a corporate motivation quote", pts: 25 },
  monday:          { name: "😒 Case of the Mondays",      desc: "Played on an actual Monday", pts: 100 },
  task_10:         { name: "📬 Task Master",              desc: "Completed 10 tasks from Lumbergh", pts: 300 },
  susp_50:         { name: "👀 Under Surveillance",       desc: "Suspicion reached 50%", pts: 0 },
  susp_80:         { name: "🚨 Full Audit Mode",          desc: "Suspicion reached 80%", pts: 0 },
  night_owl:       { name: "🦉 Night Owl",               desc: "Playing after midnight", pts: 100 },
  lawrence_beer:   { name: "🍺 Patio Philosopher",        desc: "Had a beer with Lawrence", pts: 75 },
  lawrence_3:      { name: "🍺🍺🍺 Two Chicks",          desc: "Drank 3 beers with Lawrence", pts: 200 },
  survived_day:    { name: "🕐 Clock Puncher",            desc: "Survived until 5 PM", pts: 500 },
};

function unlockAchievement(id) {
  if (STATE.achievements.includes(id)) return null;
  const def = ACHIEVEMENT_DEFS[id];
  if (!def) return null;
  STATE.achievements.push(id);
  if (def.pts) addScore(def.pts, `🏆 ${def.name}`);
  return def;
}

function checkAchievements() {
  const unlocked = [];
  const u = (id) => { const r = unlockAchievement(id); if (r) unlocked.push(r); };
  if (STATE.tpsReportsFiled >= 1) u("first_tps");
  if (STATE.tpsReportsFiled >= 5) u("tps_5");
  if (STATE.tpsReportsFiled >= 10) u("tps_10");
  if (STATE.tpsCoverSheets >= 1) u("cover_sheet");
  if (STATE.printerJams >= 1) u("printer_jam");
  if (STATE.printerJams >= 3) u("printer_3_jams");
  if (STATE.printerAttempts >= 5) u("printer_5_tries");
  if (!STATE.printerAlive) u("printer_destroy");
  if (STATE.staplerSecured) u("stapler");
  if (!STATE.buildingIntact) u("fire");
  if (STATE.flairCount >= 37) u("flair_37");
  if (STATE.flairCount === 0) u("flair_zero");
  if (STATE.hypnotized) u("hypnotized");
  if (STATE.skimBalance > 0) u("skim_first");
  if (STATE.skimBalance > 1) u("skim_dollar");
  if (STATE.skimBalance > 5) u("skim_5_dollar");
  if (STATE.jumpToConclusions) u("jump_mat");
  if (STATE.comboStreak >= 3) u("combo_3");
  if (STATE.comboStreak >= 5) u("combo_5");
  if (STATE.comboStreak >= 10) u("combo_10");
  if (STATE.coffeeCups >= 5) u("coffee_5");
  if (STATE.tasksCompleted >= 10) u("task_10");
  if (STATE.suspicion >= 50) u("susp_50");
  if (STATE.suspicion >= 80) u("susp_80");
  if (STATE.isMonday) u("monday");
  if (new Date().getHours() >= 0 && new Date().getHours() < 5) u("night_owl");
  if (STATE.lawrenceBeers >= 1) u("lawrence_beer");
  if (STATE.lawrenceBeers >= 3) u("lawrence_3");
  if (STATE.gameOverReason === "survived") u("survived_day");
  const allLocations = ["cubicle","printer","bobs","milton","chotchkies","tom","bolton","hypno","scheme","fishing","audit","motivation","lawrence"];
  if (allLocations.every(l => STATE.visited.includes(l))) u("visited_all");
  return unlocked;
}

// ---- PRINTER ERRORS ----------------------------------------
const PRINTER_ERRORS = [
  "PC LOAD LETTER","PAPER JAM IN TRAY 2","ERR 0x4F46464943455350414345",
  "TONER LOW (replace never)","FEED ME A STRAY CAT",
  "GURU MEDITATION #00000004.0000AAC0","PRINTER ON FIRE","ERROR: SUCCESS",
  "TASK FAILED SUCCESSFULLY","OUT OF CYAN (you were printing black & white)",
  "WARMING UP... (since 1999)","DRIVER NOT FOUND (it was right there a second ago)",
  "SPOOLING... SPOOLING... SPOOLING...","COVER OPEN (it's not)",
  "REPLACE DRUM UNIT (good luck finding one)","ERR: LUMBERGH_PRIORITY_OVERRIDE",
  "JAM IN SECTION 2B... THE BUILDING SECTION","FATAL: INSUFFICIENT FLAIR",
  "ABORT, RETRY, FAIL?","GENERAL PROTECTION FAULT",
];

function generatePrinterError() {
  const err = PRINTER_ERRORS[Math.floor(Math.random() * PRINTER_ERRORS.length)];
  STATE.printerErrors.push(err);
  STATE.printerJams++;
  return err;
}

// ---- TASK QUEUE --------------------------------------------
const TASK_TEMPLATES = [
  { type: "tps",    text: "file a TPS report with the NEW cover sheet",       scene: "cubicle",     pts: 50,  susp: -2 },
  { type: "tps",    text: "file a TPS report",                                scene: "cubicle",     pts: 30,  susp: -1 },
  { type: "print",  text: "print the Q3 projections",                         scene: "printer",     pts: 40,  susp: -2 },
  { type: "print",  text: "print 5 copies of the memo",                       scene: "printer",     pts: 40,  susp: -1 },
  { type: "flair",  text: "add more flair at Chotchkie's",                    scene: "chotchkies",  pts: 35,  susp: -1 },
  { type: "bobs",   text: "speak with the Bobs about your role",              scene: "bobs",        pts: 60,  susp: -3 },
  { type: "audit",  text: "run the system audit for the consultants",         scene: "audit",       pts: 45,  susp: -2 },
  { type: "motivation", text: "read today's motivational message",            scene: "motivation",  pts: 20,  susp: 0 },
  { type: "milton", text: "check on Milton in the basement",                  scene: "milton",      pts: 30,  susp: 0 },
  { type: "tps",    text: "re-file TPS-0001 (cover sheet was wrong)",         scene: "cubicle",     pts: 60,  susp: -2 },
  { type: "print",  text: "print the new cover sheet memo for distribution",  scene: "printer",     pts: 50,  susp: -2 },
  { type: "tps",    text: "file a RUSH TPS report — Lumbergh needs it by 5pm",scene: "cubicle",    pts: 80,  susp: -5 },
];

function generateTask() {
  const template = TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)];
  const id = `TASK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const task = { id, ...template, assigned: STATE.turnCount, deadline: STATE.turnCount + 4 + Math.floor(Math.random() * 3), status: "pending" };
  STATE.tasks.push(task);
  STATE.tpsRequested++;
  return task;
}

function checkExpiredTasks() {
  const expired = [];
  STATE.tasks.forEach(t => {
    if (t.status === "pending" && STATE.turnCount > t.deadline) {
      t.status = "expired";
      STATE.tasksFailed++;
      STATE.comboStreak = 0;
      STATE.suspicion += 5;
      STATE.morale--;
      addScore(-25, `❌ Task expired: ${t.text}`);
      expired.push(t);
    }
  });
  return expired;
}

function completeTask(scene) {
  const task = STATE.tasks.find(t => t.status === "pending" && t.scene === scene);
  if (!task) return null;
  task.status = "completed";
  STATE.tasksCompleted++;
  STATE.comboStreak++;
  if (STATE.comboStreak > STATE.bestCombo) STATE.bestCombo = STATE.comboStreak;
  STATE.suspicion = Math.max(0, STATE.suspicion + task.susp);
  const combo = STATE.comboStreak > 1 ? ` (COMBO x${STATE.comboStreak}!)` : "";
  const bonus = STATE.comboStreak > 1 ? STATE.comboStreak * 10 : 0;
  addScore(task.pts + bonus, `✅ ${task.text}${combo}`);
  return { task, combo: STATE.comboStreak, bonus };
}

// ---- QUOTES ------------------------------------------------
const LUMBERGH = [
  "Yeahhh... if you could go ahead and {{A}}, that would be greeeaat.",
  "Yeahhh... I'm gonna need you to go ahead and {{A}}.",
  "Mmmkay? So if you could just go ahead and {{A}}, that'd be terrific.",
  "Oh, and I almost forgot... I'm also gonna need you to {{A}}. Mmmkay?",
  "Hi, Peter. What's happening? Listen, I'm gonna need you to {{A}}.",
  "Hello, Peter. What's happening? Ummm, I'm gonna need you to go ahead and {{A}}.",
];
function lumbergh(action) {
  return LUMBERGH[Math.floor(Math.random() * LUMBERGH.length)].replace("{{A}}", action);
}

const MILTON = [
  "I was told I could listen to the radio at a reasonable volume from nine to eleven.",
  "I believe you have my stapler.","Excuse me, I believe you have my stapler...",
  "I could set the building on fire.","The ratio of people to cake is too big.",
  "They moved my desk four times already this year...","Have you seen my stapler?","Last straw...",
];
function miltonQuote() { return MILTON[Math.floor(Math.random() * MILTON.length)]; }

const BOB_Q = [
  "What would you say... you DO here?",
  "So you physically take the specifications from the customer?",
  "Looks like you've been missing quite a bit of work lately.",
  "Would you say you do anything here that someone else couldn't do?",
  "Let me ask you something. When you come in on Monday and you're not feeling real well... does anyone ever say to you, 'Sounds like someone has a case of the Mondays'?",
  "So tell me... what drives you?",
];

const EVENTS = [
  { t: "📠 The fax machine jams for the 47th time today.", m: -1, s: 0 },
  { t: "☕ Someone took the last cup of coffee.", m: -1, s: 0 },
  { t: "🎂 There's cake in the break room! But the ratio of people to cake is too big.", m: 0, s: 0 },
  { t: "📋 Lumbergh left a voicemail about TPS reports. On a Saturday.", m: 0, s: 2 },
  { t: "🔊 Michael Bolton is blasting gangsta rap at his desk.", m: 1, s: 0 },
  { t: "😤 Someone mispronounced Samir's name. Again. 'Naga... Naga... Not gonna work here anymore.'", m: 0, s: 0 },
  { t: "🏝️ You stare out the window and think about fishing.", m: 1, s: 0 },
  { t: "📞 Tom Smykowski reminds everyone he's a PEOPLE PERSON.", m: 0, s: 0 },
  { t: "🍽️ Drew asks if you're coming to Chotchkie's after work.", m: 0, s: 0 },
  { t: "🖨️ PC LOAD LETTER?! What the f*** does THAT mean?!", m: -2, s: 0 },
  { t: "💼 Nina walks by. 'Corporate accounts payable, Nina speaking. Just a moment...'", m: 0, s: 0 },
  { t: "📎 Dom Portwood mentions synergizing backward overflow.", m: -1, s: 0 },
];

function randomEvent() {
  if (Math.random() < 0.35) {
    const e = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    STATE.morale += e.m;
    STATE.suspicion += e.s;
    return e.t;
  }
  return null;
}

// ---- REAL-WORLD SPIKES (browser-side) ----------------------

async function fetchWeather() {
  try {
    const res = await fetch("https://wttr.in/?format=j1");
    const j = await res.json();
    const cur = j.current_condition[0];
    STATE.weatherData = {
      tempF: cur.temp_F, tempC: cur.temp_C,
      desc: cur.weatherDesc[0].value,
      humidity: cur.humidity, windMph: cur.windspeedMiles,
      feelsLikeF: cur.FeelsLikeF,
      area: j.nearest_area?.[0]?.areaName?.[0]?.value || "Unknown",
    };
    return STATE.weatherData;
  } catch { return null; }
}

function getSystemRecon() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || "Unknown";
  const cores = navigator.hardwareConcurrency || "?";
  const mem = navigator.deviceMemory ? navigator.deviceMemory + " GB (approx)" : "Unknown";
  STATE.systemRecon = {
    hostname: location.hostname || "intranet.initech.com",
    platform: platform,
    arch: ua.includes("x64") || ua.includes("Win64") ? "x64" : ua.includes("ARM") ? "ARM" : "x86",
    cpus: cores,
    totalMemGB: mem,
    freeMemGB: "classified",
    uptime: "since 1999",
    user: "pgibbons",
    homeDir: "C:\\Users\\pgibbons",
    nodeVersion: "Browser Edition",
    browser: ua,
  };
  return STATE.systemRecon;
}

function createTPSReport(withCover) {
  const num = STATE.tpsReportsFiled + 1;
  STATE.tpsReportsFiled++;
  if (withCover) STATE.tpsCoverSheets++;
  const reportId = `TPS-${String(num).padStart(4, "0")}`;
  return reportId;
}

function runSkimCycle(periods) {
  const emps = [
    { s: 49000 }, { s: 52000 }, { s: 51000 }, { s: 38000 }, { s: 95000 },
    { s: 47000 }, { s: 31000 }, { s: 44000 }, { s: 41000 }, { s: 72000 },
  ];
  let total = 0;
  for (let p = 0; p < periods; p++) {
    for (const e of emps) {
      const gross = e.s / 26 + (Math.random() - 0.5) * 20;
      const net = gross * (1 - 0.0765 - 0.0312);
      const rounded = Math.floor(net * 100) / 100;
      total += +(net - rounded).toFixed(6);
    }
  }
  STATE.skimBalance += total;
  STATE.skimBalance = +STATE.skimBalance.toFixed(6);
  STATE.suspicion += periods * 3;
  return +total.toFixed(6);
}

async function fetchMotivation() {
  try {
    const res = await fetch("https://api.chucknorris.io/jokes/random");
    const j = await res.json();
    return j.value;
  } catch {
    return "The printer is jammed. Motivation unavailable.";
  }
}

function saveGame() {
  try {
    localStorage.setItem("initech_save", JSON.stringify({ ...STATE, savedAt: new Date().toISOString() }));
    return "localStorage";
  } catch { return null; }
}

function determineEnding() {
  if (STATE.suspicion >= 80 && STATE.skimBalance > 0) {
    return { title: "THE AUDIT", text: "The Bobs found the penny-fraction scheme. You panic. You write a letter and slide it under Lumbergh's door. Luckily, Milton burns down the building before anyone reads it. Insurance covers everything. The money disappears.\n\n\"I think... we got away with it.\"", type: "bad" };
  }
  if (!STATE.buildingIntact) {
    return { title: "THE FIRE", text: "Milton, pushed beyond his limits, sets the building on fire. He's later seen on a tropical beach. With a red stapler. And... is that a coconut drink? And YOUR skim money?!\n\n\"I was told I could listen to the radio...\"", type: "bad" };
  }
  if (STATE.hypnotized && STATE.morale >= 8) {
    return { title: "THE ENLIGHTENMENT", text: "After hypnotherapy, you stopped caring. You started showing up in a Hawaiian shirt. You gutted fish at your desk. The Bobs promoted you to VP of Product Refactoring.\n\n\"I wouldn't say I've been missing it, Bob.\"", type: "good" };
  }
  if (STATE.tpsReportsFiled >= 10 && STATE.tpsCoverSheets >= 10) {
    return { title: "THE CORPORATE DRONE", text: "You filed every TPS report. With cover sheets. Every time. Lumbergh is thrilled. You get a 3% raise and a parking spot. You die inside a little more each day.\n\n\"Yeahhh... that would be greeeaat.\"", type: "neutral" };
  }
  if (STATE.skimBalance > 1.0) {
    return { title: "THE SALAMI SLICER", text: `You successfully skimmed $${STATE.skimBalance.toFixed(6)} in penny fractions. It's not a lot. But it's dishonest work. Peter's Off-Shore Coconut Fund thanks you. 🥥\n\n"We're not gonna do anything ILLEGAL..."`, type: "good" };
  }
  return { title: "THE QUITTER", text: "You walk out the front door of Initech. The fluorescents fade behind you. You get a construction job. Manual labor. Fresh air. You've never been happier.\n\n\"Frickin' A.\"", type: "neutral" };
}

// ---- POST ACTION (runs after every action) -----------------
function postAction() {
  STATE.morale = clamp(STATE.morale, 0, 10);
  STATE.suspicion = clamp(STATE.suspicion, 0, 100);
  STATE.turnCount++;

  STATE.clockMinute += 30;
  if (STATE.clockMinute >= 60) {
    STATE.clockHour += Math.floor(STATE.clockMinute / 60);
    STATE.clockMinute = STATE.clockMinute % 60;
  }

  const evt = randomEvent();
  let newTask = null;
  const pendingCount = STATE.tasks.filter(t => t.status === "pending").length;
  if (Math.random() < 0.4 && pendingCount < 5) newTask = generateTask();
  const expired = checkExpiredTasks();
  const newAchievements = checkAchievements();

  let printerError = null;
  if (STATE.printerAlive && Math.random() < 0.2) printerError = generatePrinterError();

  if (STATE.staplerSecured) STATE.miltonAnger += 0.5;
  if (STATE.suspicion > 50) STATE.miltonAnger += 0.3;
  STATE.miltonAnger = clamp(STATE.miltonAnger, 0, 10);

  let gameOverData = null;

  if (STATE.suspicion >= 100 && !STATE.gameOver) {
    STATE.gameOver = true; STATE.gameOverReason = "fired";
    gameOverData = { title: "🚨 YOU'RE FIRED", text: "The Bobs have reviewed your file. Your suspicion level hit 100%.\n\nBob Slydell: \"So, Peter... we're gonna have to go ahead and let you go.\"\nBob Porter: \"Yeah... it's just not working out.\"\n\nSecurity escorts you out. Your red stapler privileges have been revoked.\n\n\"I knew this would happen. I told them. They didn't listen.\" — Milton", type: "fired" };
  }
  if (STATE.morale <= 0 && !STATE.gameOver) {
    STATE.gameOver = true; STATE.gameOverReason = "breakdown";
    gameOverData = { title: "💀 MENTAL BREAKDOWN", text: "Your morale has hit rock bottom. You can't take it anymore.\n\nYou stand up in your cubicle. The fluorescent lights buzz. You look at the TPS reports, the printer, the fax machine, Lumbergh's coffee cup...\n\n\"I HAVE PEOPLE SKILLS! I AM GOOD AT DEALING WITH PEOPLE! WHAT THE HELL IS WRONG WITH YOU PEOPLE?!\"\n\nYou've become Tom Smykowski. HR has been called.", type: "breakdown" };
  }
  if (STATE.miltonAnger >= 10 && STATE.buildingIntact && !STATE.gameOver) {
    STATE.gameOver = true; STATE.gameOverReason = "fire"; STATE.buildingIntact = false;
    gameOverData = { title: "🔥 MILTON BURNED IT DOWN", text: "Milton has reached his breaking point.\n\n\"I was told I could listen to the radio at a reasonable volume from nine to eleven. I told Bill that if Sandra is going to listen to her headphones while she's filing then I should be able to listen to the radio while I'm collating so I don't see why I should have to turn down the radio because I enjoy listening at a reasonable volume from nine to eleven...\"\n\nThe building is on fire. Milton is gone. So is your stapler.\n\nSomewhere on a beach, a man with a red stapler orders a drink with a little umbrella.", type: "fire" };
  }
  if (STATE.clockHour >= 17 && !STATE.gameOver) {
    STATE.gameOver = true; STATE.gameOverReason = "survived";
    addScore(500, "🏆 Survived the entire workday!");
    gameOverData = { title: "🕐 5:00 PM — YOU MADE IT", text: determineEnding().text, type: "survived", ending: determineEnding() };
  }

  return {
    state: STATE, event: evt, newTask, expired, newAchievements,
    printerError, pendingTasks: STATE.tasks.filter(t => t.status === "pending"),
    achievementDefs: ACHIEVEMENT_DEFS, gameOverData,
  };
}

// ============================================================
//  ROUTE HANDLERS (called directly by app.js)
// ============================================================

async function init() {
  resetState();
  const weather = await fetchWeather();
  getSystemRecon();

  const msgs = [];
  msgs.push({ type: "system", text: `Today is ${STATE.day}.` });
  if (STATE.isMonday) {
    msgs.push({ type: "warning", text: "⚠️ Looks like somebody's got a case of the Mondays!" });
    STATE.morale = Math.max(STATE.morale - 2, 0);
  }
  if (weather) {
    msgs.push({ type: "system", text: `🌤️ Weather: ${weather.desc}, ${weather.tempF}°F in ${weather.area}` });
    if (parseInt(weather.tempF) > 70 && !weather.desc.toLowerCase().includes("rain")) {
      msgs.push({ type: "good", text: "🎣 Perfect fishing weather. Peter would approve." });
    } else {
      msgs.push({ type: "warning", text: "🎣 Not great fishing weather. Guess you're stuck at Initech." });
    }
  } else {
    msgs.push({ type: "warning", text: "🌤️ Weather unavailable. The Bobs must have cut the internet budget." });
  }
  msgs.push({ type: "system", text: `📡 System recon: ${STATE.systemRecon.hostname} | ${STATE.systemRecon.cpus} CPUs | ${STATE.systemRecon.totalMemGB} RAM` });
  msgs.push({ type: "lumbergh", text: lumbergh("come in on Saturday") });
  const firstTask = generateTask();
  msgs.push({ type: "warning", text: `📬 First assignment: "${firstTask.text}" (Go to: ${firstTask.scene})` });

  return { state: STATE, msgs, achievementDefs: ACHIEVEMENT_DEFS, pendingTasks: STATE.tasks.filter(t => t.status === "pending") };
}

function cubicle(choice) {
  visit("cubicle");
  const msgs = [];
  if (choice === 1) {
    const reportId = createTPSReport(true);
    addScore(30, "📋 TPS Report filed (with cover)");
    const tc = completeTask("cubicle");
    msgs.push({ type: "good", text: `✅ TPS Report ${reportId} filed WITH cover sheet. (+30 pts)` });
    msgs.push({ type: "quote", text: '"Good, good. Did you get the memo about the cover sheets?"' });
    if (tc) msgs.push({ type: "good", text: `📬 Task complete! +${tc.task.pts + tc.bonus} pts${tc.combo > 1 ? " COMBO x" + tc.combo + "!" : ""}` });
    STATE.morale--;
  } else if (choice === 2) {
    const reportId = createTPSReport(false);
    addScore(40, "🚫 TPS Report filed (rebel — no cover)");
    const tc = completeTask("cubicle");
    msgs.push({ type: "bad", text: `⚠️ TPS Report ${reportId} filed WITHOUT cover sheet! (+40 pts — rebel bonus)` });
    msgs.push({ type: "lumbergh", text: lumbergh("use the NEW cover sheets on your TPS reports") });
    if (tc) msgs.push({ type: "good", text: `📬 Task complete! +${tc.task.pts + tc.bonus} pts${tc.combo > 1 ? " COMBO x" + tc.combo + "!" : ""}` });
    STATE.suspicion += 5;
    STATE.morale++;
    unlockAchievement("rebel_report");
  } else {
    addScore(15, "😐 Did nothing (Peter energy)");
    unlockAchievement("do_nothing");
    msgs.push({ type: "quote", text: '"I\'d say in a given week I probably only do about fifteen minutes of actual, real work." (+15 pts)' });
    STATE.morale++;
    STATE.suspicion += 2;
  }
  return { ...postAction(), msgs };
}

function printer(choice) {
  visit("printer");
  const msgs = [];
  if (!STATE.printerAlive) {
    msgs.push({ type: "system", text: "There's just debris here. And a field. And gangsta rap echoing in the distance." });
    msgs.push({ type: "quote", text: '"Damn it feels good to be a gangsta."' });
    return { ...postAction(), msgs };
  }
  STATE.printerAttempts++;
  if (choice === 1) {
    const err = generatePrinterError();
    addScore(10, "🖨️ Tried to print (it failed, obviously)");
    const tc = completeTask("printer");
    msgs.push({ type: "bad", text: err });
    msgs.push({ type: "bad", text: "The printer jams. Of course it does." });
    msgs.push({ type: "system", text: `Printer errors today: ${STATE.printerJams} | Lifetime attempts: ${STATE.printerAttempts}` });
    if (tc) msgs.push({ type: "good", text: `📬 Task complete! +${tc.task.pts + tc.bonus} pts${tc.combo > 1 ? " COMBO x" + tc.combo + "!" : ""}` });
    STATE.morale -= 2;
  } else if (choice === 2) {
    msgs.push({ type: "system", text: '🎵 "Still" by Geto Boys starts playing... 🎵' });
    msgs.push({ type: "action", text: "💥 WHAM! — Baseball bat." });
    msgs.push({ type: "action", text: "💥 CRACK! — Another swing." });
    msgs.push({ type: "action", text: "💥 SMASH! — Samir kicks it." });
    msgs.push({ type: "action", text: "💥 BOOM! — It's done. It's finally done." });
    msgs.push({ type: "good", text: '"Damn it feels good to be a gangsta."' });
    STATE.printerAlive = false;
    STATE.morale += 5;
    STATE.suspicion += 10;
    addScore(200, "🏏 Destroyed the printer");
    addItem("Printer Debris");
  } else {
    msgs.push({ type: "system", text: "You walk away. The printer wins. Again." });
  }
  return { ...postAction(), msgs };
}

function bobs(choice) {
  visit("bobs");
  const msgs = [];
  const q = BOB_Q[Math.floor(Math.random() * BOB_Q.length)];
  msgs.push({ type: "bob", text: `Bob Slydell: "${q}"` });
  if (choice === 1) {
    msgs.push({ type: "quote", text: '"I\'d say in a given week I probably only do about fifteen minutes of actual, real work."' });
    msgs.push({ type: "bob", text: 'Bob Porter: "You\'re honest. I like that. We\'re letting people GO, but you... you\'ve got upper management written all over you."' });
    addScore(80, "😎 Radical honesty with the Bobs");
    unlockAchievement("bob_honest");
    const tc = completeTask("bobs");
    if (tc) msgs.push({ type: "good", text: `📬 Task complete! +${tc.task.pts + tc.bonus} pts` });
    STATE.suspicion -= 10;
    STATE.morale += 2;
  } else if (choice === 2) {
    msgs.push({ type: "quote", text: '"I HAVE PEOPLE SKILLS! I AM GOOD AT DEALING WITH PEOPLE! WHAT THE HELL IS WRONG WITH YOU PEOPLE?!"' });
    msgs.push({ type: "system", text: "— Tom Smykowski energy. The Bobs exchange a glance." });
    STATE.suspicion += 5;
  } else if (choice === 3) {
    msgs.push({ type: "quote", text: '"See, we take fractions of a penny from each transaction... like Superman III."' });
    msgs.push({ type: "bob", text: 'Bob Slydell: "...Superman III?"' });
    msgs.push({ type: "bob", text: 'Bob Porter: "I\'ve never even seen that movie."' });
    msgs.push({ type: "bad", text: "⚠️ Suspicion MASSIVELY increased!" });
    STATE.suspicion += 25;
    addScore(-50, "🤫 Told the Bobs about the scheme");
  } else {
    msgs.push({ type: "system", text: "You mutter something and back out of the room." });
  }
  return { ...postAction(), msgs };
}

function milton(choice) {
  visit("milton");
  const msgs = [];
  msgs.push({ type: "milton", text: `Milton: "${miltonQuote()}"` });
  if (choice === 1) {
    msgs.push({ type: "action", text: "You take the red Swingline stapler." });
    msgs.push({ type: "milton", text: 'Milton: "I... I could set the building on fire..."' });
    STATE.staplerSecured = true;
    STATE.suspicion += 5;
    addScore(100, "📎 Secured the red Swingline stapler");
    addItem("Red Swingline Stapler");
    const tc = completeTask("milton");
    if (tc) msgs.push({ type: "good", text: `📬 Task complete! +${tc.task.pts + tc.bonus} pts` });
    if (STATE.suspicion > 70) {
      msgs.push({ type: "bad", text: "🔥 Milton has reached his breaking point. You smell smoke." });
      STATE.buildingIntact = false;
    }
  } else if (choice === 2) {
    msgs.push({ type: "system", text: '"They said they\'d fix my paycheck but they never did..." You nod sympathetically.' });
    STATE.morale--;
  } else {
    msgs.push({ type: "system", text: "Smart. Never corner a man and his stapler." });
  }
  return { ...postAction(), msgs };
}

function chotchkies(choice) {
  visit("chotchkies");
  const msgs = [];
  msgs.push({ type: "quote", text: `Stan: "We need to talk about your flair. You have ${STATE.flairCount} pieces. The minimum is 15. Brian has 37."` });
  if (choice === 1) {
    STATE.flairCount += 5;
    addScore(20, `✨ Added flair (now ${STATE.flairCount})`);
    const tc = completeTask("chotchkies");
    msgs.push({ type: "good", text: `You now have ${STATE.flairCount} pieces of flair. (+20 pts)` });
    if (STATE.flairCount >= 37) msgs.push({ type: "good", text: "🏆 You've matched Brian! 37 pieces of flair!" });
    if (tc) msgs.push({ type: "good", text: `📬 Task complete! +${tc.task.pts + tc.bonus} pts` });
  } else if (choice === 2) {
    msgs.push({ type: "quote", text: '"Why don\'t you just make the minimum 37 pieces of flair?"' });
    msgs.push({ type: "action", text: "Joanna removes all flair, walks out. \"**** this.\"" });
    STATE.flairCount = 0;
    STATE.morale += 3;
    addScore(75, "💢 Stripped all flair — Joanna energy");
  } else {
    STATE.coffeeCups++;
    addScore(5, "☕ Coffee (terrible, but still coffee)");
    msgs.push({ type: "system", text: `The coffee is terrible. But you didn't come here for the coffee. (Cup #${STATE.coffeeCups})` });
  }
  return { ...postAction(), msgs };
}

function scheme(choice) {
  visit("scheme");
  const msgs = [];
  if (choice >= 1 && choice <= 3) {
    const periods = choice === 1 ? 1 : choice === 2 ? 5 : 26;
    const skimmed = runSkimCycle(periods);
    addScore(periods * 25, `💰 Skim cycle (${periods} period${periods > 1 ? "s" : ""})`);
    msgs.push({ type: "good", text: `💰 Skimmed: $${skimmed.toFixed(6)} across ${periods} period(s) (+${periods * 25} pts)` });
    msgs.push({ type: "system", text: `Total balance: $${STATE.skimBalance.toFixed(6)}` });
    if (STATE.skimBalance > 0.5) {
      msgs.push({ type: "bad", text: '"I think... we messed up the decimal point."' });
      msgs.push({ type: "bad", text: '"We sure did. This is WAY more than a penny."' });
    }
    if (STATE.suspicion > 80) {
      msgs.push({ type: "bad", text: "⚠️ THE BOBS ARE AUDITING YOUR TRANSACTIONS!" });
    }
  } else if (choice === 4) {
    msgs.push({ type: "system", text: `Total skimmed: $${STATE.skimBalance.toFixed(6)}` });
    msgs.push({ type: "system", text: "Ledger saved to browser storage." });
  } else {
    msgs.push({ type: "quote", text: '"We should be careful. Very careful."' });
  }
  return { ...postAction(), msgs };
}

async function fishing() {
  visit("fishing");
  const msgs = [];
  msgs.push({ type: "quote", text: '"What would you do if you had a million dollars?" "I\'d go fishing."' });
  if (!STATE.weatherData) await fetchWeather();
  if (STATE.weatherData) {
    const w = STATE.weatherData;
    msgs.push({ type: "system", text: `🌡️ ${w.tempF}°F (${w.tempC}°C) | ${w.desc} | Wind: ${w.windMph}mph | Humidity: ${w.humidity}% | ${w.area}` });
    const temp = parseInt(w.tempF);
    const wind = parseInt(w.windMph);
    const rainy = /rain|storm/i.test(w.desc);
    let score = 0;
    if (temp >= 60 && temp <= 85) score += 3; else if (temp >= 50) score += 1;
    if (wind < 15) score += 2;
    if (!rainy) score += 3; else score -= 2;
    if (parseInt(w.humidity) < 80) score += 1;
    score = clamp(score, 0, 10);
    msgs.push({ type: "system", text: `🎣 Fishing Score: ${"🐟".repeat(score)}${"·".repeat(10 - score)} ${score}/10` });
    if (score >= 7) { msgs.push({ type: "good", text: '"That\'s it. I\'m not going to work today."' }); STATE.morale += 3; }
    else if (score >= 4) { msgs.push({ type: "warning", text: '"Ehh... it\'s okay. But the Bobs..."' }); STATE.morale += 1; }
    else { msgs.push({ type: "bad", text: '"Terrible fishing weather. Even Peter would stay."' }); STATE.morale--; }
  } else {
    msgs.push({ type: "warning", text: "Weather unavailable. You stare out the window and imagine the lake." });
    STATE.morale++;
  }
  return { ...postAction(), msgs };
}

function lawrence(choice) {
  visit("lawrence");
  const msgs = [];
  const LAWRENCE_QUOTES = [
    "Hey, Peter, man! Check out channel 9! Check out this chick!",
    "Doesn't it bother you that you have to get up in the morning and go to some job you hate?",
    "No. No, man. Shit, no, man. I believe you'd get your ass kicked saying something like that, man.",
    "Hey! Peter, man! Check out channel 9!",
    "Well, what about you now? What would YOU do?",
  ];
  msgs.push({ type: "system", text: "You're on the patio at your apartment complex. Lawrence is in the lawn chair next to you." });
  msgs.push({ type: "quote", text: `Lawrence: "${LAWRENCE_QUOTES[Math.floor(Math.random() * LAWRENCE_QUOTES.length)]}"` });
  if (choice === 1) {
    msgs.push({ type: "quote", text: 'You: "What would you do if you had a million dollars?"' });
    msgs.push({ type: "quote", text: "Lawrence: \"I'll tell you what I'd do, man. Two chicks at the same time, man.\"" });
    msgs.push({ type: "quote", text: 'You: "That\'s it? If you had a million dollars, you\'d do two chicks at the same time?"' });
    msgs.push({ type: "quote", text: "Lawrence: \"Damn straight. I always wanted to do that, man. And I think if I were a millionaire, I could hook that up, too. 'Cause chicks dig dudes with money.\"" });
    msgs.push({ type: "quote", text: 'You: "Well, not ALL chicks."' });
    msgs.push({ type: "quote", text: "Lawrence: \"Well, the type of chicks that'd double up on a dude like me do.\"" });
    msgs.push({ type: "quote", text: 'You: "Good point."' });
    addScore(60, "🍺 Million dollar question");
    STATE.morale += 2;
  } else if (choice === 2) {
    STATE.lawrenceBeers++;
    STATE.coffeeCups = 0;
    msgs.push({ type: "good", text: `🍺 You crack open a beer with Lawrence. (Beer #${STATE.lawrenceBeers})` });
    if (STATE.lawrenceBeers === 1) {
      msgs.push({ type: "quote", text: "Lawrence: \"Hey, Peter, man. Doesn't it bother you that you have to get up in the morning and just go to some building and do some job you really don't care about?\"" });
      msgs.push({ type: "quote", text: "You: \"It's not just that I'm being lazy. It's that I just don't care.\"" });
    } else if (STATE.lawrenceBeers === 2) {
      msgs.push({ type: "quote", text: "Lawrence: \"My neighbor's a real a-hole. Not you. The one on the other side. He plays this god-awful music all weekend.\"" });
    } else if (STATE.lawrenceBeers === 3) {
      msgs.push({ type: "quote", text: "Lawrence: \"Hey Peter, you know what I'd do? Nothin'.\"" });
      msgs.push({ type: "quote", text: "You: \"Nothing, huh?\"" });
      msgs.push({ type: "quote", text: "Lawrence: \"I'd relax. Sit on my ass all day. I'd do nothing.\"" });
      msgs.push({ type: "quote", text: "You: \"That's what I'd do too. I'd do nothing.\"" });
    } else {
      msgs.push({ type: "quote", text: `Lawrence: "Hey Peter, you're on beer ${STATE.lawrenceBeers}. Don't you have like... a job or something?"` });
      msgs.push({ type: "quote", text: "You: \"Well, I generally come in at least fifteen minutes late. I use the side door so Lumbergh can't see me.\"" });
    }
    addScore(30 + STATE.lawrenceBeers * 10, `🍺 Beer #${STATE.lawrenceBeers} with Lawrence`);
    STATE.morale += 1;
    STATE.suspicion += 3;
  } else if (choice === 3) {
    msgs.push({ type: "quote", text: "Lawrence: \"Hey Peter, man! Check out channel 9! Check out this chick!\"" });
    msgs.push({ type: "system", text: "You both stare at a breast exam infomercial in silence." });
    msgs.push({ type: "quote", text: "Lawrence: \"...Doesn't that chick look like Anne?\"" });
    addScore(20, "📺 Watched channel 9");
    STATE.morale += 1;
  } else {
    msgs.push({ type: "system", text: "Lawrence cracks another beer. \"Frickin' A, man.\"" });
    msgs.push({ type: "system", text: "You head back inside." });
    STATE.morale += 1;
  }
  return { ...postAction(), msgs };
}

function tom(choice) {
  visit("tom");
  const msgs = [];
  msgs.push({ type: "quote", text: 'Tom: "I HAVE PEOPLE SKILLS! WHAT THE HELL IS WRONG WITH YOU PEOPLE?!"' });
  if (choice === 1) {
    msgs.push({ type: "quote", text: 'Tom: "It\'s a mat. With CONCLUSIONS on it. That you can JUMP to!"' });
    msgs.push({ type: "quote", text: '"That\'s the worst idea I\'ve ever heard in my life."' });
    STATE.jumpToConclusions = true;
    addScore(50, "🤸 Got the Jump to Conclusions Mat");
    addItem("Jump to Conclusions Mat");
    msgs.push({ type: "good", text: "📦 Jump to Conclusions Mat added to inventory! (+50 pts)" });
  } else if (choice === 2) {
    msgs.push({ type: "system", text: 'Tom looks slightly reassured. He goes back to taking specifications from the customers.' });
  } else {
    msgs.push({ type: "system", text: "You back away from the existential crisis." });
  }
  return { ...postAction(), msgs };
}

function audit() {
  visit("audit");
  const s = STATE.systemRecon || getSystemRecon();
  STATE.suspicion += 3;
  addScore(35, "📊 Ran system audit");
  const tc = completeTask("audit");
  const msgs = [
    { type: "bob", text: 'Bob Slydell: "We\'re just here to get a sense of what everyone does around here."' },
    { type: "bob", text: `Bob Slydell: "${s.cpus} CPUs and ${s.totalMemGB} RAM... and they're using it for TPS reports."` },
  ];
  if (tc) msgs.push({ type: "good", text: `📬 Task complete! +${tc.task.pts + tc.bonus} pts` });
  return { ...postAction(), recon: s, msgs };
}

async function motivation() {
  visit("motivation");
  const quote = await fetchMotivation();
  addScore(15, "💼 Read motivational quote");
  unlockAchievement("motivation");
  const tc = completeTask("motivation");
  const msgs = [
    { type: "system", text: "Every Thursday, management emails an inspirational quote. Today's:" },
    { type: "motivation", text: quote },
    { type: "quote", text: '"That has nothing to do with our jobs." "Yeah, but it came from corporate, so..." (+15 pts)' },
  ];
  if (tc) msgs.push({ type: "good", text: `📬 Task complete! +${tc.task.pts + tc.bonus} pts` });
  return { ...postAction(), msgs };
}

function bolton(choice) {
  visit("bolton");
  const msgs = [];
  msgs.push({ type: "quote", text: 'Michael: "There WAS nothing wrong with my name until that no-talent ass clown became famous and started winning Grammys."' });
  if (choice === 1) {
    msgs.push({ type: "quote", text: 'Michael: "No way! Why should I change? He\'s the one who sucks."' });
  } else if (choice === 2) {
    msgs.push({ type: "quote", text: 'Michael: "EXACTLY! THANK you!"' });
    STATE.morale += 2;
  } else if (choice === 3) {
    msgs.push({ type: "quote", text: "Michael: \"We're just gonna take fractions of a penny... like in Superman III.\"" });
    msgs.push({ type: "system", text: `Samir: "I thought it was more like that movie..."` });
    msgs.push({ type: "system", text: `Michael: "This is real code. Running in your browser. On ${STATE.systemRecon?.hostname || 'this machine'}."` });
    STATE.suspicion += 5;
  } else {
    msgs.push({ type: "system", text: "You leave Michael to his aggressive lip-syncing." });
  }
  return { ...postAction(), msgs };
}

function hypno(choice) {
  visit("hypno");
  const msgs = [];
  if (STATE.hypnotized) {
    msgs.push({ type: "system", text: "You've already been hypnotized. You feel... great, actually." });
    msgs.push({ type: "quote", text: '"I just don\'t care anymore. And it\'s not that I\'m being lazy. It\'s that I just... don\'t... care."' });
    return { ...postAction(), msgs };
  }
  STATE.hypnotized = true;
  STATE.morale = 10;
  addScore(200, "🌀 Got hypnotized");
  msgs.push({ type: "system", text: "Dr. Swanson snaps his fingers. Then he has a heart attack. He dies." });
  msgs.push({ type: "good", text: "✨ HYPNOTIZED! Morale permanently boosted. You no longer care about anything. (+200 pts)" });
  if (choice === 1) {
    msgs.push({ type: "quote", text: '"Nothing." You\'re going to do absolutely nothing. And it\'s going to be everything.' });
  } else if (choice === 2) {
    msgs.push({ type: "quote", text: `Fishing every day. (Currently: ${STATE.weatherData ? STATE.weatherData.desc + " in " + STATE.weatherData.area : "unknown weather"})` });
  } else {
    msgs.push({ type: "quote", text: '"Interesting. Let\'s explore that impulse in our next—" *dies*' });
    STATE.suspicion += 10;
  }
  return { ...postAction(), msgs };
}

function save() {
  const result = saveGame();
  const msgs = result
    ? [{ type: "good", text: "💾 Game saved to browser storage!" }]
    : [{ type: "bad", text: "💾 Save failed — browser storage unavailable." }];
  return { ...postAction(), msgs };
}

function end() {
  const ending = determineEnding();
  saveGame();
  return { state: STATE, ending, achievementDefs: ACHIEVEMENT_DEFS };
}

// ---- PUBLIC API --------------------------------------------
return {
  init, cubicle, printer, bobs, milton, chotchkies, scheme, fishing,
  lawrence, tom, audit, motivation, bolton, hypno, save, end,
  getState: () => STATE,
  getAchievementDefs: () => ACHIEVEMENT_DEFS,
};

})();
