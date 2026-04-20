// ============================================================
//  INITECH INTRANET — CLIENT-SIDE GAME ENGINE
//  "I wouldn't say I've been MISSING it, Bob."
// ============================================================

const API = "";

// ---- DOM refs ----------------------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  boot: $("#boot-screen"),
  app: $("#app"),
  sceneTitle: $("#scene-title"),
  sceneBody: $("#scene-body"),
  sceneChoices: $("#scene-choices"),
  moraleBar: $("#morale-bar"),
  moraleVal: $("#morale-val"),
  suspicionBar: $("#suspicion-bar"),
  suspicionVal: $("#suspicion-val"),
  skimVal: $("#skim-val"),
  flairVal: $("#flair-val"),
  tpsVal: $("#tps-val"),
  turnVal: $("#turn-val"),
  scoreVal: $("#score-val"),
  comboVal: $("#combo-val"),
  clockVal: $("#clock-val"),
  invList: $("#inventory-list"),
  msgLog: $("#message-log"),
  memoBody: $("#memo-body"),
  miltonBody: $("#milton-body"),
  miltonPopup: $("#milton-popup"),
  weatherBody: $("#weather-body"),
  dayName: $("#day-name"),
  daySub: $("#day-sub"),
  traySkim: $("#tray-skim"),
  trayTime: $("#tray-time"),
  taskbarTps: $("#taskbar-tps"),
  taskbarScore: $("#taskbar-score"),
  startMenu: $("#start-menu"),
  startBtn: $("#start-btn"),
  endOverlay: $("#ending-overlay"),
  endTitle: $("#ending-title"),
  endText: $("#ending-text"),
  endStats: $("#ending-stats"),
  taskList: $("#task-list"),
  taskCount: $("#task-count"),
  printerBody: $("#printer-body"),
  printerStatusText: $("#printer-status-text"),
  printerErrorsCount: $("#printer-errors-count"),
  achievementsList: $("#achievements-list"),
  achievementCount: $("#achievement-count"),
};

// ---- BOOT SEQUENCE -----------------------------------------

let bootDone = false;

function bootSequence() {
  const stages = [
    { el: "#boot-hw", delay: 600 },
    { el: "#boot-tps", delay: 400 },
    { el: "#boot-penny", delay: 500 },
    { el: "#boot-printer", delay: 800 },
  ];

  let delay = 500;
  stages.forEach((s) => {
    delay += s.delay;
    setTimeout(() => {
      const el = $(s.el);
      if (el) el.style.color = s.el === "#boot-printer" ? "#ff4444" : "#00ff00";
    }, delay);
  });

  // Wait for keypress or click
  const finish = () => {
    if (bootDone) return;
    bootDone = true;
    DOM.boot.classList.add("hidden");
    DOM.app.classList.remove("hidden");
    initGame();
    document.removeEventListener("keydown", finish);
    document.removeEventListener("click", finish);
  };

  setTimeout(() => {
    document.addEventListener("keydown", finish);
    document.addEventListener("click", finish);
  }, delay + 500);
}

// ---- INIT GAME ---------------------------------------------

async function initGame() {
  try {
    const res = await fetch(`${API}/api/init`);
    const data = await res.json();
    lastScore = data.state.score;
    updateState(data.state);
    showInitMessages(data.msgs);
    if (data.pendingTasks) updateTaskList(data.pendingTasks, data.state.turnCount);
    if (data.achievementDefs) updateAchievementsList(data.state.achievements, data.achievementDefs);
    showMainMenu();
  } catch (err) {
    setSceneBody([{ type: "bad", text: "Failed to connect to Initech servers. Is the server running?" }]);
  }
}

// ---- STATE UPDATE ------------------------------------------

function updateState(state) {
  if (!state) return;

  // Morale bar
  const morale = Math.max(0, Math.min(10, state.morale));
  DOM.moraleBar.style.width = (morale * 10) + "%";
  DOM.moraleBar.style.background = morale > 6 ? "#4a4" : morale > 3 ? "#cc4" : "#c44";
  DOM.moraleVal.textContent = morale + "/10";

  // Suspicion bar
  const susp = Math.max(0, Math.min(100, state.suspicion));
  DOM.suspicionBar.style.width = susp + "%";
  DOM.suspicionBar.style.background = susp > 60 ? "#c44" : susp > 30 ? "#cc4" : "#4a4";
  DOM.suspicionVal.textContent = susp + "%";
  if (susp > 60) DOM.suspicionVal.style.color = "#cc0000";
  else DOM.suspicionVal.style.color = "";

  // Score
  DOM.scoreVal.textContent = state.score.toLocaleString();
  DOM.taskbarScore.textContent = "⭐ Score: " + state.score.toLocaleString();

  // Combo
  if (state.comboStreak > 1) {
    DOM.comboVal.textContent = "x" + state.comboStreak + " 🔥";
    DOM.comboVal.style.color = state.comboStreak >= 5 ? "#ff0000" : "#ff6600";
  } else {
    DOM.comboVal.textContent = "—";
    DOM.comboVal.style.color = "";
  }

  // Skim
  DOM.skimVal.textContent = "$" + state.skimBalance.toFixed(6);
  DOM.traySkim.textContent = "💰 $" + state.skimBalance.toFixed(2);

  // Flair
  DOM.flairVal.textContent = state.flairCount + " pcs";

  // TPS
  DOM.tpsVal.textContent = state.tpsReportsFiled + " filed";
  DOM.taskbarTps.textContent = "📋 TPS Reports (" + state.tpsReportsFiled + ")";

  // Turn
  DOM.turnVal.textContent = state.turnCount;

  // Clock
  if (state.clockHour !== undefined) {
    const h = state.clockHour;
    const m = state.clockMinute || 0;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const mStr = m.toString().padStart(2, "0");
    DOM.clockVal.textContent = h12 + ":" + mStr + " " + ampm;
    // Late in the day = red pulsing
    const clockBox = DOM.clockVal.closest(".clock-box");
    if (clockBox) {
      if (h >= 16) clockBox.classList.add("clock-late");
      else clockBox.classList.remove("clock-late");
    }
  }

  // Inventory
  DOM.invList.textContent = state.inventory.length ? state.inventory.join(", ") : "Empty";

  // Day
  DOM.dayName.textContent = state.day;
  if (state.isMonday) {
    DOM.daySub.textContent = "⚠️ Case of the Mondays";
  } else {
    DOM.daySub.textContent = "";
  }

  // Weather
  if (state.weatherData) {
    const w = state.weatherData;
    DOM.weatherBody.innerHTML = `
      <div>${w.desc}</div>
      <div><b>${w.tempF}°F</b> (${w.tempC}°C)</div>
      <div>Wind: ${w.windMph}mph</div>
      <div>${w.area}</div>
    `;
  }

  // Printer status widget
  if (!state.printerAlive) {
    DOM.printerStatusText.textContent = "DESTROYED";
    DOM.printerStatusText.className = "printer-status-text";
    DOM.printerStatusText.style.color = "#666";
    DOM.printerErrorsCount.textContent = "🏏 RIP";
  } else {
    const lastErr = state.printerErrors.length ? state.printerErrors[state.printerErrors.length - 1] : null;
    DOM.printerStatusText.textContent = lastErr || "WARMING UP...";
    DOM.printerStatusText.className = "printer-status-text";
    DOM.printerErrorsCount.textContent = "Jams: " + state.printerJams + " | Attempts: " + state.printerAttempts;
  }

  // Mark visited nav buttons
  (state.visited || []).forEach((v) => {
    $$(`[data-scene="${v}"]`).forEach((btn) => btn.classList.add("visited-link"));
  });
}

// ---- MESSAGE RENDERING -------------------------------------

function showInitMessages(msgs) {
  msgs.forEach((m) => addToLog(m.text, m.type));
}

function setSceneTitle(title) {
  DOM.sceneTitle.textContent = title;
}

function setSceneBody(msgs) {
  DOM.sceneBody.innerHTML = "";
  msgs.forEach((m) => {
    const p = document.createElement("p");
    p.className = "msg-" + (m.type || "normal");
    p.textContent = m.text;
    DOM.sceneBody.appendChild(p);
  });
}

function appendSceneMsg(msg) {
  const p = document.createElement("p");
  p.className = "msg-" + (msg.type || "normal");
  p.textContent = msg.text;
  DOM.sceneBody.appendChild(p);
}

function setChoices(choices) {
  DOM.sceneChoices.innerHTML = "";
  choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `<span class="choice-key">${c.key}</span> ${c.label}`;
    btn.onclick = c.action;
    DOM.sceneChoices.appendChild(btn);
  });
}

const LOG_NAGS = [
  "⚠️ This window is required by corporate policy.",
  "⚠️ Closing this window has been reported to Lumbergh.",
  "⚠️ You have closed this window {n} times. HR has been notified.",
  "⚠️ Yeahhh... you're gonna need to read this.",
  "⚠️ Per the memo dated 2/19/99, this log is MANDATORY.",
  "⚠️ Did you get the memo about reading the activity log?",
  "⚠️ I'm gonna need you to go ahead and read this. Mmmkay?",
  "⚠️ The Bobs are monitoring your log-closing frequency.",
  "⚠️ Milton never closes this window. Be like Milton.",
  "⚠️ Fun fact: you can't actually disable this. We tried.",
  "⚠️ This is not a bug. It's a feature. -Management",
  "⚠️ Tom says he reads every log entry. Tom has people skills.",
  "⚠️ {n} closes? That's going on your performance review.",
];
let logCloseCount = 0;
let logPendingEntries = 0;

function addToLog(text, type = "sys") {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  const cls = type === "good" ? "log-good" : type === "bad" ? "log-bad" : type === "warning" ? "log-evt" : "log-sys";
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="${cls}">${escapeHtml(text)}</span>`;
  DOM.msgLog.appendChild(entry);
  DOM.msgLog.scrollTop = DOM.msgLog.scrollHeight;

  // Keep max 100 entries in DOM
  while (DOM.msgLog.children.length > 100) DOM.msgLog.removeChild(DOM.msgLog.firstChild);

  logPendingEntries++;
  // Show the popup if it's hidden (annoying!)
  showLogPopup();
}

function showLogPopup() {
  const popup = $("#log-popup");
  if (!popup.classList.contains("hidden")) return;
  popup.classList.remove("hidden");
  // Reset animation
  popup.style.animation = "none";
  popup.offsetHeight; // reflow
  popup.style.animation = "";
  logPendingEntries = 0;
}

function dismissLogPopup() {
  const popup = $("#log-popup");
  popup.classList.add("hidden");
  logCloseCount++;
  // Update the nag text for next time
  const nag = $("#log-nag");
  const template = LOG_NAGS[Math.min(logCloseCount, LOG_NAGS.length - 1) % LOG_NAGS.length];
  nag.textContent = template.replace("{n}", logCloseCount);
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// ---- PROCESS API RESPONSE ----------------------------------

let lastScore = 0;

function processResponse(data) {
  if (data.state) {
    // Score float animation
    const scoreDiff = data.state.score - lastScore;
    if (scoreDiff !== 0) {
      showScoreFloat(scoreDiff);
      lastScore = data.state.score;
    }
    updateState(data.state);
  }

  if (data.event) {
    addToLog(data.event, "warning");
    if (Math.random() < 0.3) showMilton();
  }

  if (data.msgs) {
    data.msgs.forEach((m) => addToLog(m.text, m.type));
  }

  // New task assigned by Lumbergh
  if (data.newTask) {
    addToLog(`📬 Lumbergh: "${data.newTask.text}" (Go to: ${data.newTask.scene})`, "warning");
    showLumbergMemo(`Yeahhh... I'm gonna need you to ${data.newTask.text}. Mmmkay?`);
  }

  // Expired tasks
  if (data.expired && data.expired.length) {
    data.expired.forEach(t => {
      addToLog(`❌ TASK EXPIRED: "${t.text}" — Lumbergh is NOT happy. (-25 pts, +5 suspicion)`, "bad");
    });
  }

  // Achievement unlocks
  if (data.newAchievements && data.newAchievements.length) {
    data.newAchievements.forEach((a, i) => {
      addToLog(`🏆 ACHIEVEMENT: ${a.name} — ${a.desc}${a.pts ? " (+" + a.pts + " pts)" : ""}`, "good");
      setTimeout(() => showAchievementToast(a), i * 800);
    });
  }

  // Printer chaos popup
  if (data.printerError) {
    addToLog(`🖨️ PRINTER ERROR: ${data.printerError}`, "bad");
    showPrinterErrorPopup(data.printerError);
  }

  // Update task list
  if (data.pendingTasks) {
    updateTaskList(data.pendingTasks, data.state.turnCount);
  }

  // Update achievements list
  if (data.state && data.achievementDefs) {
    updateAchievementsList(data.state.achievements, data.achievementDefs);
  }

  // GAME OVER check
  if (data.gameOverData) {
    showGameOver(data.gameOverData, data.state);
  }
}

// ---- SCORE FLOAT -------------------------------------------

function showScoreFloat(diff) {
  const el = document.createElement("div");
  el.className = "score-float" + (diff < 0 ? " negative" : "");
  el.textContent = (diff > 0 ? "+" : "") + diff + " pts";
  // Position near the score display
  const scoreBox = DOM.scoreVal;
  const rect = scoreBox.getBoundingClientRect();
  el.style.left = rect.left + "px";
  el.style.top = (rect.top - 10) + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

// ---- ACHIEVEMENT TOAST -------------------------------------

function showAchievementToast(achievement) {
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `
    <div class="toast-title">🏆 ACHIEVEMENT UNLOCKED</div>
    <div class="toast-name">${escapeHtml(achievement.name)}</div>
    <div class="toast-desc">${escapeHtml(achievement.desc)}${achievement.pts ? " (+" + achievement.pts + " pts)" : ""}</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ---- PRINTER ERROR POPUP -----------------------------------

function showPrinterErrorPopup(errorMsg) {
  // Remove existing printer popups
  document.querySelectorAll(".printer-error-popup").forEach(p => p.remove());
  const popup = document.createElement("div");
  popup.className = "printer-error-popup";
  popup.innerHTML = `
    <div class="printer-error-titlebar">
      <span>🖨️ HP LaserJet 4050 — Error</span>
      <span style="cursor:pointer" onclick="this.closest('.printer-error-popup').remove()">×</span>
    </div>
    <div class="printer-error-body">
      <div class="printer-error-icon">⚠️</div>
      <div class="printer-error-text">${escapeHtml(errorMsg)}</div>
    </div>
    <button class="printer-error-btn" onclick="this.closest('.printer-error-popup').remove()">OK</button>
  `;
  document.body.appendChild(popup);
  // Auto-dismiss after 5 seconds
  setTimeout(() => { if (popup.parentNode) popup.remove(); }, 5000);
}

// ---- TASK LIST UPDATE --------------------------------------

function updateTaskList(tasks, currentTurn) {
  DOM.taskCount.textContent = `(${tasks.length} pending)`;
  if (!tasks.length) {
    DOM.taskList.innerHTML = '<div class="task-empty">No tasks. Enjoy it while it lasts...</div>';
    return;
  }
  DOM.taskList.innerHTML = "";
  tasks.forEach(t => {
    const turnsLeft = t.deadline - currentTurn;
    const item = document.createElement("div");
    item.className = "task-item";
    const urgentClass = turnsLeft <= 1 ? " urgent" : "";
    item.innerHTML = `
      <span class="task-item-text">${escapeHtml(t.text)}</span>
      <span class="task-item-scene" onclick="navigateTo('${t.scene}')">${t.scene}</span>
      <span class="task-item-deadline${urgentClass}">${turnsLeft <= 0 ? "⚠️ NOW" : turnsLeft + " turns"}</span>
    `;
    DOM.taskList.appendChild(item);
  });
}

// ---- ACHIEVEMENTS LIST UPDATE ------------------------------

function updateAchievementsList(unlockedIds, defs) {
  DOM.achievementCount.textContent = `(${unlockedIds.length}/${Object.keys(defs).length})`;
  if (!unlockedIds.length) {
    DOM.achievementsList.innerHTML = '<div class="ach-empty">None yet. Start exploring!</div>';
    return;
  }
  DOM.achievementsList.innerHTML = "";
  unlockedIds.forEach(id => {
    const def = defs[id];
    if (!def) return;
    const item = document.createElement("div");
    item.className = "ach-item";
    item.innerHTML = `<span class="ach-name">${escapeHtml(def.name)}</span> <span class="ach-desc">${escapeHtml(def.desc)}</span>${def.pts ? ' <span class="ach-pts">+' + def.pts + '</span>' : ''}`;
    DOM.achievementsList.appendChild(item);
  });
}

function showMilton() {
  const quotes = [
    "I believe you have my stapler.",
    "Excuse me... I believe you have my stapler.",
    "I could set the building on fire.",
    "The ratio of people to cake is too big.",
    "Have you seen my stapler?",
    "They moved my desk four times already...",
  ];
  DOM.miltonBody.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  DOM.miltonPopup.classList.remove("hidden");
}

function showLumbergMemo(text) {
  DOM.memoBody.textContent = text;
}

// ---- SCENES ------------------------------------------------

function showMainMenu() {
  setSceneTitle("🏢 Initech — Main Menu");
  setSceneBody([
    { type: "normal", text: "You are Peter Gibbons. Software engineer at Initech." },
    { type: "normal", text: "You sit in your gray cubicle. The fluorescent lights hum." },
    { type: "normal", text: "Your neighbor Milton is mumbling about his stapler." },
    { type: "system", text: "Use the navigation panel on the left to explore Initech, or choose below:" },
  ]);
  setChoices([
    { key: "1", label: "📋 Go to your cubicle (TPS reports)", action: () => sceneCubicle() },
    { key: "2", label: "🖨️ Visit the printer room", action: () => scenePrinter() },
    { key: "3", label: "👔 Talk to the Bobs", action: () => sceneBobs() },
    { key: "4", label: "📎 Check on Milton", action: () => sceneMilton() },
    { key: "5", label: "🍽️ Go to Chotchkie's", action: () => sceneChotchkies() },
    { key: "6", label: "💰 Run the penny scheme", action: () => sceneScheme() },
    { key: "7", label: "🎣 Check fishing conditions", action: () => sceneFishing() },
    { key: "8", label: "📞 Visit Tom Smykowski", action: () => sceneTom() },
    { key: "9", label: "📊 System audit", action: () => sceneAudit() },
    { key: "10", label: "💼 Get motivation", action: () => sceneMotivation() },
    { key: "11", label: "🎤 Michael Bolton's desk", action: () => sceneBolton() },
    { key: "12", label: "🌀 Hypnotherapist", action: () => sceneHypno() },
    { key: "13", label: "🍺 Visit Lawrence next door", action: () => sceneLawrence() },
  ]);
}

// ---- CUBICLE -----------------------------------------------

function sceneCubicle() {
  setSceneTitle("📋 Your Cubicle");
  setSceneBody([
    { type: "normal", text: "You sit down at your desk. The walls close in slightly." },
    { type: "normal", text: "There's a memo on your desk about the NEW cover sheets for TPS reports." },
    { type: "normal", text: '"Did you get the memo about the TPS reports?"' },
  ]);
  showLumbergMemo("Put cover sheets on ALL TPS reports. Did you get the memo?");
  setChoices([
    { key: "1", label: "📄 File TPS report WITH new cover sheet", action: () => cubicleAction(1) },
    { key: "2", label: "🚫 File TPS report WITHOUT cover sheet (rebel)", action: () => cubicleAction(2) },
    { key: "3", label: "😐 Stare at screen and do nothing", action: () => cubicleAction(3) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function cubicleAction(choice) {
  const res = await fetch(`${API}/api/cubicle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "→", label: "Continue", action: () => sceneCubicle() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- PRINTER -----------------------------------------------

function scenePrinter() {
  setSceneTitle("🖨️ The Printer Room");
  setSceneBody([
    { type: "normal", text: "The printer sits there. Mocking you." },
    { type: "bad", text: 'The display reads: PC LOAD LETTER.' },
    { type: "normal", text: '"What the f*** does that mean?!"' },
  ]);
  setChoices([
    { key: "1", label: "🖨️ Try to print normally", action: () => printerAction(1) },
    { key: "2", label: "🏏 Take the printer to a field", action: () => printerAction(2) },
    { key: "3", label: "🚶 Walk away", action: () => printerAction(3) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function printerAction(choice) {
  const res = await fetch(`${API}/api/printer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();

  if (choice === 2) {
    // Animate the printer destruction
    setSceneBody([{ type: "system", text: '🎵 "Still" by Geto Boys starts playing... 🎵' }]);
    const actions = data.msgs.filter((m) => m.type === "action" || m.type === "good");
    const others = data.msgs.filter((m) => m.type !== "action" && m.type !== "good");

    for (let i = 0; i < actions.length; i++) {
      await sleep(700);
      appendSceneMsg(actions[i]);
      if (actions[i].type === "action") {
        $("#scene-area").classList.add("shake");
        await sleep(400);
        $("#scene-area").classList.remove("shake");
      }
    }
    others.forEach((m) => appendSceneMsg(m));
  } else {
    setSceneBody(data.msgs);
    if (choice === 1) {
      $("#scene-area").classList.add("flash-red");
      setTimeout(() => $("#scene-area").classList.remove("flash-red"), 1000);
    }
  }

  processResponse(data);
  setChoices([
    { key: "→", label: "Continue", action: () => scenePrinter() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- THE BOBS ----------------------------------------------

function sceneBobs() {
  setSceneTitle("👔👔 The Bobs' Conference Room");
  setSceneBody([
    { type: "normal", text: "Two consultants in matching suits sit across from you." },
    { type: "normal", text: "They have your file. They have everyone's file." },
    { type: "bob", text: '"We\'re just here to figure out what it is you... do here."' },
  ]);
  setChoices([
    { key: "1", label: '😎 Answer honestly ("I do nothing.")', action: () => bobsAction(1) },
    { key: "2", label: '😤 Bullshit them ("I HAVE PEOPLE SKILLS!")', action: () => bobsAction(2) },
    { key: "3", label: "🤫 Tell them about the penny scheme", action: () => bobsAction(3) },
    { key: "4", label: "🚶 Leave awkwardly", action: () => bobsAction(4) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function bobsAction(choice) {
  const res = await fetch(`${API}/api/bobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  if (choice === 3) {
    $("#scene-area").classList.add("flash-red");
    setTimeout(() => $("#scene-area").classList.remove("flash-red"), 1000);
  }
  setChoices([
    { key: "→", label: "Continue", action: () => sceneBobs() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- MILTON ------------------------------------------------

function sceneMilton() {
  setSceneTitle("📎 Milton's Desk (Basement)");
  setSceneBody([
    { type: "normal", text: "Milton is in the basement. Next to a cockroach." },
    { type: "normal", text: "The red Swingline stapler glows under the flickering light." },
    { type: "milton", text: '"I was told I could listen to the radio at a reasonable volume from nine to eleven."' },
  ]);
  setChoices([
    { key: "1", label: "📎 Take Milton's stapler", action: () => miltonAction(1) },
    { key: "2", label: "💬 Promise to fix his paycheck", action: () => miltonAction(2) },
    { key: "3", label: "🚶 Back away slowly", action: () => miltonAction(3) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function miltonAction(choice) {
  const res = await fetch(`${API}/api/milton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  if (choice === 1) showMilton();
  setChoices([
    { key: "→", label: "Continue", action: () => sceneMilton() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- CHOTCHKIE'S -------------------------------------------

function sceneChotchkies() {
  setSceneTitle("🍽️ Chotchkie's Restaurant");
  setSceneBody([
    { type: "normal", text: "The walls are covered in kitschy memorabilia." },
    { type: "normal", text: "Your server has 37 pieces of flair." },
    { type: "normal", text: '"We need to talk about your flair."' },
  ]);
  setChoices([
    { key: "1", label: "✨ Add more flair (+5 pieces)", action: () => chotchkiesAction(1) },
    { key: "2", label: '💢 "Why don\'t you make the minimum 37?"', action: () => chotchkiesAction(2) },
    { key: "3", label: "☕ Order coffee and leave", action: () => chotchkiesAction(3) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function chotchkiesAction(choice) {
  const res = await fetch(`${API}/api/chotchkies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "→", label: "Continue", action: () => sceneChotchkies() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- PENNY SCHEME ------------------------------------------

function sceneScheme() {
  setSceneTitle("💰 The Penny-Fraction Scheme");
  setSceneBody([
    { type: "normal", text: '"It\'s not even really stealing. We\'re just taking fractions of a penny."' },
    { type: "normal", text: '"It\'s like Superman III."' },
    { type: "normal", text: '"I thought it was more like that movie..."' },
    { type: "normal", text: '"Yeah, but this is REAL code running on a REAL machine."' },
  ]);
  setChoices([
    { key: "1", label: "💵 Run 1 pay period (low risk)", action: () => schemeAction(1) },
    { key: "2", label: "💰 Run 5 pay periods (medium risk)", action: () => schemeAction(2) },
    { key: "3", label: "🤑 Run ALL 26 periods (HIGH RISK)", action: () => schemeAction(3) },
    { key: "4", label: "📊 View the skim ledger", action: () => schemeAction(4) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function schemeAction(choice) {
  const res = await fetch(`${API}/api/scheme`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "→", label: "Continue", action: () => sceneScheme() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- FISHING -----------------------------------------------

async function sceneFishing() {
  setSceneTitle("🎣 Fishing Conditions");
  setSceneBody([{ type: "system", text: "Checking weather for fishing conditions..." }]);
  setChoices([]);

  const res = await fetch(`${API}/api/fishing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- TOM SMYKOWSKI -----------------------------------------

function sceneTom() {
  setSceneTitle("📞 Tom Smykowski's Desk");
  setSceneBody([
    { type: "normal", text: "Tom is sweating. He heard the Bobs are letting people go." },
    { type: "quote", text: '"I HAVE PEOPLE SKILLS! I AM GOOD AT DEALING WITH PEOPLE! CAN\'T YOU UNDERSTAND THAT?!"' },
  ]);
  setChoices([
    { key: "1", label: "🤸 Ask about the Jump to Conclusions mat", action: () => tomAction(1) },
    { key: "2", label: "💬 Reassure Tom about his job", action: () => tomAction(2) },
    { key: "3", label: "🚶 Leave", action: () => tomAction(3) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function tomAction(choice) {
  const res = await fetch(`${API}/api/tom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "→", label: "Continue", action: () => sceneTom() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- SYSTEM AUDIT ------------------------------------------

async function sceneAudit() {
  setSceneTitle("📊 System Recon — The Bobs' Audit");
  setSceneBody([{ type: "system", text: "Running infrastructure audit..." }]);
  setChoices([]);

  const res = await fetch(`${API}/api/audit`);
  const data = await res.json();

  const reconMsgs = [];
  if (data.recon) {
    const r = data.recon;
    reconMsgs.push({ type: "system", text: `Hostname: ${r.hostname}` });
    reconMsgs.push({ type: "system", text: `Platform: ${r.platform} (${r.arch})` });
    reconMsgs.push({ type: "system", text: `CPUs: ${r.cpus} | RAM: ${r.totalMemGB} GB (${r.freeMemGB} GB free)` });
    reconMsgs.push({ type: "system", text: `Uptime: ${r.uptime}` });
    reconMsgs.push({ type: "system", text: `User: ${r.user}` });
    reconMsgs.push({ type: "system", text: `Node: ${r.nodeVersion}` });
  }

  setSceneBody([...reconMsgs, ...data.msgs]);
  processResponse(data);
  setChoices([
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- MOTIVATION --------------------------------------------

async function sceneMotivation() {
  setSceneTitle("💼 Corporate Motivation");
  setSceneBody([{ type: "system", text: "Fetching today's motivational quote from corporate..." }]);
  setChoices([]);

  const res = await fetch(`${API}/api/motivation`);
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- MICHAEL BOLTON ----------------------------------------

function sceneBolton() {
  setSceneTitle("🎤 Michael Bolton's Desk");
  setSceneBody([
    { type: "normal", text: "Michael is listening to music with headphones on." },
    { type: "normal", text: "He's mouthing lyrics aggressively. It's definitely gangsta rap." },
    { type: "quote", text: '"There WAS nothing wrong with my name until that no-talent ass clown became famous."' },
  ]);
  setChoices([
    { key: "1", label: '"Why don\'t you just go by Mike?"', action: () => boltonAction(1) },
    { key: "2", label: '"Why should I change? He\'s the one who sucks."', action: () => boltonAction(2) },
    { key: "3", label: "Ask about the virus (penny scheme)", action: () => boltonAction(3) },
    { key: "4", label: "🚶 Leave", action: () => boltonAction(4) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function boltonAction(choice) {
  const res = await fetch(`${API}/api/bolton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "→", label: "Continue", action: () => sceneBolton() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- HYPNOTHERAPY ------------------------------------------

function sceneHypno() {
  setSceneTitle("🌀 Dr. Swanson's Hypnotherapy Office");
  setSceneBody([
    { type: "normal", text: "Dr. Swanson is a large, calming man with a soothing voice." },
    { type: "quote", text: '"Peter, when you\'re in your most relaxed state... what is it that you really want to do?"' },
  ]);
  setChoices([
    { key: "1", label: '"Nothing."', action: () => hypnoAction(1) },
    { key: "2", label: '"I want to go fishing every day."', action: () => hypnoAction(2) },
    { key: "3", label: '"I want to take fractions of a penny."', action: () => hypnoAction(3) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function hypnoAction(choice) {
  const res = await fetch(`${API}/api/hypno`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- SAVE --------------------------------------------------

async function sceneSave() {
  const res = await fetch(`${API}/api/save`, { method: "POST" });
  const data = await res.json();
  setSceneTitle("💾 Game Saved");
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- END GAME ----------------------------------------------

async function sceneEnd() {
  const res = await fetch(`${API}/api/end`, { method: "POST" });
  const data = await res.json();

  DOM.endTitle.textContent = "GAME OVER — " + data.ending.title;
  DOM.endText.textContent = data.ending.text;

  const s = data.state;
  const achCount = s.achievements.length;
  const totalAch = data.achievementDefs ? Object.keys(data.achievementDefs).length : "?";
  DOM.endStats.innerHTML = `
    <b>FINAL SCORE: ${s.score.toLocaleString()} pts</b><br>
    Turns: ${s.turnCount} | Morale: ${s.morale}/10 | Suspicion: ${s.suspicion}%<br>
    Skimmed: $${s.skimBalance.toFixed(6)} | TPS Reports: ${s.tpsReportsFiled} (${s.tpsCoverSheets} with cover sheets)<br>
    Flair: ${s.flairCount} | Printer: ${s.printerAlive ? "Jammed" : "DESTROYED"} | Building: ${s.buildingIntact ? "Intact" : "BURNED"}<br>
    Stapler: ${s.staplerSecured ? "SECURED" : "Milton's"} | Hypnotized: ${s.hypnotized ? "Yes" : "No"}<br>
    Tasks: ${s.tasksCompleted} completed / ${s.tasksFailed} failed | Best Combo: x${s.bestCombo}<br>
    Achievements: ${achCount}/${totalAch} | Printer Jams: ${s.printerJams}<br>
    Inventory: ${s.inventory.length ? s.inventory.join(", ") : "Empty"}
  `;

  DOM.endOverlay.classList.remove("hidden");
}

// ---- NAV ROUTER --------------------------------------------

function navigateTo(scene) {
  DOM.startMenu.classList.add("hidden");
  switch (scene) {
    case "cubicle": return sceneCubicle();
    case "printer": return scenePrinter();
    case "bobs": return sceneBobs();
    case "milton": return sceneMilton();
    case "chotchkies": return sceneChotchkies();
    case "scheme": return sceneScheme();
    case "fishing": return sceneFishing();
    case "tom": return sceneTom();
    case "audit": return sceneAudit();
    case "motivation": return sceneMotivation();
    case "bolton": return sceneBolton();
    case "hypno": return sceneHypno();
    case "lawrence": return sceneLawrence();
    case "save": return sceneSave();
    case "end": return sceneEnd();
    default: return showMainMenu();
  }
}

// Make navigateTo global for onclick handlers in HTML
window.navigateTo = navigateTo;

// ---- SIDEBAR NAV BUTTONS -----------------------------------

document.addEventListener("DOMContentLoaded", () => {
  $$(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.scene);
    });
  });
});

// ---- START MENU TOGGLE -------------------------------------

DOM.startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  DOM.startMenu.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  DOM.startMenu.classList.add("hidden");
});

// ---- LOG POPUP DISMISS BUTTONS -----------------------------

$("#log-popup-close").addEventListener("click", dismissLogPopup);
$("#log-popup-ok").addEventListener("click", dismissLogPopup);

// ---- TRAY CLOCK --------------------------------------------

function updateTray() {
  DOM.trayTime.textContent = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });
}
setInterval(updateTray, 1000);
updateTray();

// ---- UTIL --------------------------------------------------

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---- KICK OFF BOOT -----------------------------------------

bootSequence();

// ---- LAWRENCE'S PATIO --------------------------------------

function sceneLawrence() {
  setSceneTitle("🍺 Lawrence's Patio");
  setSceneBody([
    { type: "normal", text: "You're at your neighbor Lawrence's place. He's sitting on the patio in his lawn chair." },
    { type: "normal", text: "There's a cooler of beer. The afternoon sun is warm." },
    { type: "quote", text: '"Hey Peter, man. Check out channel 9. It\'s the breast exams."' },
  ]);
  setChoices([
    { key: "1", label: '"What would you do if you had a million dollars?"', action: () => lawrenceAction(1) },
    { key: "2", label: "🍺 Have a beer and philosophize", action: () => lawrenceAction(2) },
    { key: "3", label: "📺 Watch channel 9", action: () => lawrenceAction(3) },
    { key: "4", label: "🚶 Head back inside", action: () => lawrenceAction(4) },
    { key: "←", label: "Go back", action: () => showMainMenu() },
  ]);
}

async function lawrenceAction(choice) {
  const res = await fetch(`${API}/api/lawrence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  const data = await res.json();
  setSceneBody(data.msgs);
  processResponse(data);
  setChoices([
    { key: "→", label: "Continue", action: () => sceneLawrence() },
    { key: "←", label: "Back to main", action: () => showMainMenu() },
  ]);
}

// ---- GAME OVER HANDLER -------------------------------------

function showGameOver(gameOverData, state) {
  // Disable all nav buttons
  $$("button.nav-btn").forEach(btn => btn.disabled = true);
  $$("button.choice-btn").forEach(btn => btn.disabled = true);

  // Set overlay type class for color theming
  DOM.endOverlay.className = "ending-overlay type-" + (gameOverData.type || "fired");

  DOM.endTitle.textContent = gameOverData.title;
  DOM.endText.textContent = gameOverData.text;

  const s = state;
  const achCount = s.achievements ? s.achievements.length : 0;
  DOM.endStats.innerHTML = `
    <b>FINAL SCORE: ${s.score.toLocaleString()} pts</b><br>
    Time: ${formatClock(s.clockHour, s.clockMinute)} | Turns: ${s.turnCount} | Morale: ${s.morale}/10 | Suspicion: ${s.suspicion}%<br>
    Skimmed: $${s.skimBalance.toFixed(6)} | TPS Reports: ${s.tpsReportsFiled} (${s.tpsCoverSheets} with cover sheets)<br>
    Flair: ${s.flairCount} | Printer: ${s.printerAlive ? "Jammed" : "DESTROYED"} | Building: ${s.buildingIntact ? "Intact" : "BURNED"}<br>
    Tasks: ${s.tasksCompleted} completed / ${s.tasksFailed} failed | Best Combo: x${s.bestCombo}<br>
    Achievements: ${achCount}<br>
    Inventory: ${s.inventory.length ? s.inventory.join(", ") : "Empty"}
  `;

  DOM.endOverlay.classList.remove("hidden");
}

function formatClock(h, m) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return h12 + ":" + (m || 0).toString().padStart(2, "0") + " " + ampm;
}
