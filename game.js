const readline = require("readline");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

// ============================================================
//  INITECH: THE GAME
//  "What would you say... you DO here?"
//
//  An interactive text-adventure / simulation game soaked in
//  Office Space references that also functions as a real-world
//  spike — pulling live dates, weather, system info, creating
//  actual files, and running the penny-fraction skim for real.
//
//  100% fictional company. No real money. No real Initech.
//  But some of the code… is very real.
// ============================================================

// ---- state -------------------------------------------------

const STATE = {
  player: "Peter Gibbons",
  day: new Date().toLocaleDateString("en-US", { weekday: "long" }),
  isMonday: new Date().getDay() === 1,
  morale: 3,            // 1-10
  suspicion: 0,         // 0-100  (the Bobs are watching)
  skimBalance: 0,       // fractions of a penny
  tpsReportsFiled: 0,
  tpsCoverSheets: 0,
  staplerSecured: false,
  flairCount: 15,       // minimum is 15, but 37 is the goal
  printerAlive: true,
  buildingIntact: true,
  hypnotized: false,
  jumpToConclusions: false,
  visited: new Set(),
  inventory: [],
  turnCount: 0,
  endings: [],
  // real-world spike data
  weatherData: null,
  systemRecon: null,
};

// ---- ANSI colors -------------------------------------------

const C = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  dim:   "\x1b[2m",
  red:   "\x1b[31m",
  green: "\x1b[32m",
  yellow:"\x1b[33m",
  blue:  "\x1b[34m",
  magenta:"\x1b[35m",
  cyan:  "\x1b[36m",
  white: "\x1b[37m",
  bg: {
    red:   "\x1b[41m",
    green: "\x1b[42m",
    yellow:"\x1b[43m",
  },
};

// ---- quotes ------------------------------------------------

const LUMBERGH_QUOTES = [
  'Yeahhh... if you could go ahead and {{ACTION}}, that would be greeeaat.',
  'Yeahhh... I\'m gonna need you to go ahead and {{ACTION}}.',
  'Mmmkay? So if you could just go ahead and {{ACTION}}, that\'d be terrific.',
  'Oh, and I almost forgot... I\'m also gonna need you to {{ACTION}}. Mmmkay?',
  'Yeahhh... we\'re gonna need to go ahead and {{ACTION}}. Mmmkay, thaaanks.',
  'Hi, Peter. What\'s happening? Listen, I\'m gonna need you to {{ACTION}}.',
  'Hello, Peter. What\'s happening? Ummm, I\'m gonna need you to go ahead and {{ACTION}}.',
];

const MILTON_QUOTES = [
  "I was told I could listen to the radio at a reasonable volume from nine to eleven.",
  "I believe you have my stapler.",
  "Excuse me, I believe you have my stapler...",
  "I could set the building on fire.",
  "And I said, I don't care if they lay me off either, because I told, I told Bill that if they move my desk one more time, then, then I'm, I'm quitting.",
  "The ratio of people to cake is too big.",
  "I was told I could keep my stapler.",
  "They moved my desk four times already this year, and I used to be over by the window...",
  "Have you seen my stapler?",
  "Last straw...",
];

const BOB_QUESTIONS = [
  "What would you say... you DO here?",
  "So you physically take the specifications from the customer?",
  "Well, then I just have to ask why couldn't the customers just take them directly to the software people?",
  "Looks like you've been missing quite a bit of work lately.",
  "Would you say you do anything here that someone else couldn't do?",
  "Let me ask you something. When you come in on Monday, and you're not feeling too well, does anyone ever say to you, 'Sounds like someone has a case of the Mondays'?",
  "So tell me... what drives you?",
];

const RANDOM_EVENTS = [
  { text: "📠 The fax machine jams for the 47th time today.", effect: () => { STATE.morale--; } },
  { text: "☕ Someone took the last cup of coffee. Classic.", effect: () => { STATE.morale--; } },
  { text: "🎂 There's cake in the break room! But the ratio of people to cake is too big.", effect: () => {} },
  { text: "📋 Lumbergh left a voicemail about TPS reports. On a Saturday.", effect: () => { STATE.suspicion += 2; } },
  { text: "🔊 Michael Bolton is blasting gangsta rap at his desk again.", effect: () => { STATE.morale++; } },
  { text: "😤 Someone mispronounced Samir's last name. Again. 'Naga... Naga... Not gonna work here anymore.'", effect: () => {} },
  { text: "🏝️ You stare out the window and think about fishing.", effect: () => { STATE.morale++; } },
  { text: "📞 Tom Smykowski reminds everyone he's a PEOPLE PERSON.", effect: () => {} },
  { text: "🍽️ Drew asks if you're coming to Chotchkie's after work.", effect: () => {} },
  { text: "🖨️ PC LOAD LETTER?! What the f*** does THAT mean?!", effect: () => { STATE.morale -= 2; } },
  { text: "💼 Nina walks by. 'Corporate accounts payable, Nina speaking. Just a moment...'", effect: () => {} },
  { text: "📎 Dom Portwood mentions synergizing backward overflow once more.", effect: () => { STATE.morale--; } },
];

// ---- readline setup ----------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt) {
  return new Promise((resolve) => {
    rl.question(`${C.cyan}${prompt}${C.reset} `, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

function pause() {
  return new Promise((resolve) => {
    rl.question(`${C.dim}[Press ENTER to continue]${C.reset}`, () => resolve());
  });
}

// ---- helpers -----------------------------------------------

function say(text) { console.log(`\n  ${text}`); }
function sayBold(text) { console.log(`\n  ${C.bold}${text}${C.reset}`); }
function divider() { console.log(`\n  ${C.dim}${"─".repeat(56)}${C.reset}`); }

function lumbergh(action) {
  const q = LUMBERGH_QUOTES[Math.floor(Math.random() * LUMBERGH_QUOTES.length)];
  say(`${C.yellow}☕ Lumbergh: ${C.reset}${C.dim}"${q.replace("{{ACTION}}", action)}"${C.reset}`);
}

function milton() {
  const q = MILTON_QUOTES[Math.floor(Math.random() * MILTON_QUOTES.length)];
  say(`${C.red}📎 Milton: ${C.reset}${C.dim}"${q}"${C.reset}`);
}

function randomEvent() {
  if (Math.random() < 0.35) {
    const e = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    say(e.text);
    e.effect();
  }
}

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

function statusBar() {
  STATE.morale = clamp(STATE.morale, 0, 10);
  STATE.suspicion = clamp(STATE.suspicion, 0, 100);
  const moraleBar = "█".repeat(STATE.morale) + "░".repeat(10 - STATE.morale);
  const suspBar = STATE.suspicion > 60 ? C.red : STATE.suspicion > 30 ? C.yellow : C.green;
  divider();
  say(`${C.bold}Day:${C.reset} ${STATE.day}  |  ${C.bold}Turn:${C.reset} ${STATE.turnCount}  |  ${C.bold}Morale:${C.reset} [${moraleBar}]`);
  say(`${C.bold}Suspicion:${C.reset} ${suspBar}${STATE.suspicion}%${C.reset}  |  ${C.bold}Skim:${C.reset} $${STATE.skimBalance.toFixed(6)}  |  ${C.bold}Flair:${C.reset} ${STATE.flairCount} pieces`);
  say(`${C.bold}TPS Filed:${C.reset} ${STATE.tpsReportsFiled}  |  ${C.bold}Cover Sheets:${C.reset} ${STATE.tpsCoverSheets}  |  ${C.bold}Inventory:${C.reset} [${STATE.inventory.join(", ")}]`);
  divider();
}

// ---- REAL-WORLD SPIKES -------------------------------------

// Spike 1: Day-of-week awareness (Case of the Mondays)
function checkMonday() {
  const d = new Date();
  STATE.day = d.toLocaleDateString("en-US", { weekday: "long" });
  STATE.isMonday = d.getDay() === 1;
  if (STATE.isMonday) {
    say(`${C.bg.yellow}${C.bold} ⚠️  Looks like somebody's got a case of the Mondays! ${C.reset}`);
    STATE.morale = Math.max(STATE.morale - 2, 0);
  }
}

// Spike 2: Weather API (for fishing conditions — Peter's dream)
function fetchWeather() {
  return new Promise((resolve) => {
    // wttr.in — free, no API key, public domain weather
    const url = "https://wttr.in/?format=j1";
    https.get(url, { headers: { "User-Agent": "InitechGame/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const j = JSON.parse(data);
          const cur = j.current_condition[0];
          STATE.weatherData = {
            tempF: cur.temp_F,
            tempC: cur.temp_C,
            desc: cur.weatherDesc[0].value,
            humidity: cur.humidity,
            windMph: cur.windspeedMiles,
            feelsLikeF: cur.FeelsLikeF,
            area: j.nearest_area?.[0]?.areaName?.[0]?.value || "Unknown",
          };
          resolve(STATE.weatherData);
        } catch {
          STATE.weatherData = null;
          resolve(null);
        }
      });
    }).on("error", () => {
      STATE.weatherData = null;
      resolve(null);
    });
  });
}

// Spike 3: System recon (like the consultants cataloging everything)
function systemRecon() {
  STATE.systemRecon = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemGB: (os.totalmem() / 1073741824).toFixed(1),
    freeMemGB: (os.freemem() / 1073741824).toFixed(1),
    uptime: (os.uptime() / 3600).toFixed(1) + " hours",
    user: os.userInfo().username,
    homeDir: os.homedir(),
    nodeVersion: process.version,
  };
  return STATE.systemRecon;
}

// Spike 4: Create actual TPS report files on disk
function createTPSReport(withCoverSheet = false) {
  const reportNum = STATE.tpsReportsFiled + 1;
  const dir = path.join(process.cwd(), "tps_reports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const content = {
    report: `TPS-${String(reportNum).padStart(4, "0")}`,
    date: new Date().toISOString(),
    author: STATE.player,
    coverSheet: withCoverSheet,
    coverSheetType: withCoverSheet ? "NEW cover sheet (per memo 2/19)" : "MISSING — DID YOU GET THE MEMO?",
    status: withCoverSheet ? "COMPLIANT" : "NON-COMPLIANT",
    description: "Testing Procedure Specification — a very real document that exists on your actual file system now.",
    body: [
      "1. Objective: Verify rounding procedures in payroll module.",
      "2. Environment: Node.js " + process.version + " on " + os.platform(),
      "3. Test Data: Fractional cent calculations across " + (STATE.tpsReportsFiled * 10 + 10) + " transactions.",
      "4. Expected Result: All fractions accounted for. No pennies harmed.",
      `5. Actual Result: ${STATE.skimBalance.toFixed(6)} accumulated in offshore coconut fund.`,
      "6. Conclusion: Everything is fine. Nothing to see here.",
    ],
    _meta: {
      realMachine: os.hostname(),
      realUser: os.userInfo().username,
      realTimestamp: Date.now(),
    },
  };

  const filePath = path.join(dir, `TPS-${String(reportNum).padStart(4, "0")}.json`);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  STATE.tpsReportsFiled++;
  if (withCoverSheet) STATE.tpsCoverSheets++;
  return filePath;
}

// Spike 5: The actual penny-fraction skim (from index.js logic)
function runSkimCycle(periods = 1) {
  const employees = [
    { id: "E001", name: "Peter Gibbons",   salary: 49000 },
    { id: "E002", name: "Michael Bolton",  salary: 52000 },
    { id: "E003", name: "Samir Nagheenanajar", salary: 51000 },
    { id: "E004", name: "Milton Waddams",  salary: 38000 },
    { id: "E005", name: "Bill Lumbergh",   salary: 95000 },
    { id: "E006", name: "Tom Smykowski",   salary: 47000 },
    { id: "E007", name: "Joanna",          salary: 31000 },
    { id: "E008", name: "Drew",            salary: 44000 },
    { id: "E009", name: "Nina",            salary: 41000 },
    { id: "E010", name: "Dom Portwood",    salary: 72000 },
  ];

  let totalFractions = 0;
  const details = [];

  for (let p = 0; p < periods; p++) {
    for (const emp of employees) {
      const gross = emp.salary / 26 + (Math.random() - 0.5) * 20;
      const net = gross * (1 - 0.0765 - 0.0312);
      const rounded = Math.floor(net * 100) / 100;
      const fraction = +(net - rounded).toFixed(6);
      totalFractions += fraction;
      details.push({ employee: emp.name, fraction });
    }
  }

  STATE.skimBalance += totalFractions;
  STATE.skimBalance = +STATE.skimBalance.toFixed(6);
  STATE.suspicion += periods * 3;

  return { totalFractions: +totalFractions.toFixed(6), periods, details };
}

// Spike 6: Fetch a random Chuck Norris joke (as "motivation" from management)
function fetchMotivation() {
  return new Promise((resolve) => {
    const url = "https://api.chucknorris.io/jokes/random";
    https.get(url, { headers: { "User-Agent": "InitechGame/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const j = JSON.parse(data);
          resolve(j.value);
        } catch {
          resolve("Michael Bolton doesn't need motivation. He IS motivation.");
        }
      });
    }).on("error", () => {
      resolve("The printer is jammed. Motivation unavailable.");
    });
  });
}

// Spike 7: Write game save state to disk
function saveGame() {
  const savePath = path.join(process.cwd(), "initech_save.json");
  const saveData = {
    ...STATE,
    visited: [...STATE.visited],
    savedAt: new Date().toISOString(),
    disclaimer: "Initech Save File — This is a game. All data is fictional except the system metadata.",
  };
  fs.writeFileSync(savePath, JSON.stringify(saveData, null, 2));
  return savePath;
}

// ---- ROOMS / SCENES ----------------------------------------

async function intro() {
  console.clear();
  console.log(`
${C.bold}${C.red}
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║       ██╗███╗   ██╗██╗████████╗███████╗ ██████╗██╗  ██╗  ║
  ║       ██║████╗  ██║██║╚══██╔══╝██╔════╝██╔════╝██║  ██║  ║
  ║       ██║██╔██╗ ██║██║   ██║   █████╗  ██║     ███████║  ║
  ║       ██║██║╚██╗██║██║   ██║   ██╔══╝  ██║     ██╔══██║  ║
  ║       ██║██║ ╚████║██║   ██║   ███████╗╚██████╗██║  ██║  ║
  ║       ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝  ║
  ║                                                          ║
  ║              T H E   G A M E   (v1.0.0)                  ║
  ║                                                          ║
  ║     "I wouldn't say I've been MISSING it, Bob."          ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
${C.reset}`);

  say(`${C.dim}An interactive text adventure & real-world spike.`);
  say(`All Initech operations are fictional. Some code is very real.${C.reset}`);
  say("");
  say(`${C.bold}Today is ${STATE.day}.${C.reset}`);

  checkMonday();

  say("");
  say(`${C.dim}Loading real-world data feeds...${C.reset}`);

  // Parallel real-world spikes
  const [weather] = await Promise.all([
    fetchWeather(),
  ]);
  systemRecon();

  if (weather) {
    say(`${C.green}🌤️  Weather loaded:${C.reset} ${weather.desc}, ${weather.tempF}°F in ${weather.area}`);
    if (parseInt(weather.tempF) > 70 && !weather.desc.toLowerCase().includes("rain")) {
      say(`${C.green}🎣 Perfect fishing weather. Peter would approve.${C.reset}`);
    } else {
      say(`${C.yellow}🎣 Not great fishing weather. Guess you're stuck at Initech.${C.reset}`);
    }
  } else {
    say(`${C.yellow}🌤️  Weather unavailable. The Bobs must have cut the internet budget.${C.reset}`);
  }

  say(`${C.dim}📡 System recon complete: ${STATE.systemRecon.hostname} | ${STATE.systemRecon.cpus} CPUs | ${STATE.systemRecon.totalMemGB} GB RAM${C.reset}`);

  say("");
  sayBold("You are Peter Gibbons. Software engineer at Initech.");
  say("You sit in your gray cubicle. The fluorescent lights hum.");
  say("Your neighbor Milton is mumbling about his stapler.");
  say("Lumbergh is approaching with a coffee mug.");
  say("");
  lumbergh("come in on Saturday");
  say("");

  await pause();
}

async function mainMenu() {
  STATE.turnCount++;
  randomEvent();
  statusBar();

  say(`${C.bold}What do you want to do?${C.reset}`);
  say("");
  say(`  ${C.cyan}1${C.reset} — Go to your cubicle (file TPS reports)`);
  say(`  ${C.cyan}2${C.reset} — Visit the printer room`);
  say(`  ${C.cyan}3${C.reset} — Talk to the Bobs (interview)`);
  say(`  ${C.cyan}4${C.reset} — Check on Milton`);
  say(`  ${C.cyan}5${C.reset} — Go to Chotchkie's (flair management)`);
  say(`  ${C.cyan}6${C.reset} — Run the penny-fraction scheme 💰`);
  say(`  ${C.cyan}7${C.reset} — Check fishing conditions 🎣`);
  say(`  ${C.cyan}8${C.reset} — Visit Tom Smykowski's desk`);
  say(`  ${C.cyan}9${C.reset} — System recon (the Bobs' audit) 📊`);
  say(`  ${C.cyan}10${C.reset} — Get management motivation 💼`);
  say(`  ${C.cyan}11${C.reset} — Michael Bolton's desk (name rant)`);
  say(`  ${C.cyan}12${C.reset} — Hypnotherapist's office`);
  say(`  ${C.cyan}13${C.reset} — Save game 💾`);
  say(`  ${C.cyan}0${C.reset} — ${C.red}Quit (leave Initech forever)${C.reset}`);
  say("");

  const choice = await ask("Choose [0-13]: ");

  switch (choice) {
    case "1": return cubicle();
    case "2": return printerRoom();
    case "3": return theBobs();
    case "4": return miltonDesk();
    case "5": return chotchkies();
    case "6": return pennyScheme();
    case "7": return fishing();
    case "8": return tomSmykowski();
    case "9": return systemAudit();
    case "10": return motivation();
    case "11": return michaelBolton();
    case "12": return hypnotherapist();
    case "13": return saveGameAction();
    case "0": return endGame();
    default:
      say(`${C.yellow}That's not a valid option. Lumbergh would not approve.${C.reset}`);
      return mainMenu();
  }
}

// ---- SCENE: Cubicle (TPS Reports) -------------------------

async function cubicle() {
  STATE.visited.add("cubicle");
  say(`${C.bold}📋 YOUR CUBICLE${C.reset}`);
  say("You sit down at your desk. The walls close in slightly.");
  say("There's a memo on your desk about the NEW cover sheets for TPS reports.");
  say("");
  lumbergh("put cover sheets on all your TPS reports");
  say("");
  say(`  ${C.cyan}1${C.reset} — File a TPS report (WITH new cover sheet)`);
  say(`  ${C.cyan}2${C.reset} — File a TPS report (without cover sheet... rebel)`);
  say(`  ${C.cyan}3${C.reset} — Stare at your screen and do nothing`);
  say(`  ${C.cyan}4${C.reset} — Go back`);
  say("");

  const choice = await ask("Choose: ");

  switch (choice) {
    case "1": {
      const filePath = createTPSReport(true);
      say(`${C.green}✅ TPS Report filed WITH cover sheet.${C.reset}`);
      say(`${C.dim}Real file created: ${filePath}${C.reset}`);
      say('"Good, good. Did you get the memo about the cover sheets?"');
      STATE.morale--;
      break;
    }
    case "2": {
      const filePath = createTPSReport(false);
      say(`${C.red}⚠️  TPS Report filed WITHOUT cover sheet!${C.reset}`);
      say(`${C.dim}Real file created: ${filePath}${C.reset}`);
      lumbergh("use the NEW cover sheets on your TPS reports");
      say('"Did you get the memo? I\'ll make sure you get another copy of that memo."');
      STATE.suspicion += 5;
      STATE.morale++;
      break;
    }
    case "3": {
      say('"I\'d say in a given week I probably only do about fifteen minutes of actual, real work."');
      STATE.morale++;
      STATE.suspicion += 2;
      break;
    }
    default:
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: Printer Room ----------------------------------

async function printerRoom() {
  STATE.visited.add("printer");
  say(`${C.bold}🖨️  THE PRINTER ROOM${C.reset}`);

  if (!STATE.printerAlive) {
    say("There's just... debris here. And a field. And gangsta rap echoing in the distance.");
    say('"Damn it feels good to be a gangsta."');
    await pause();
    return mainMenu();
  }

  say("The printer sits there. Mocking you. The display reads: PC LOAD LETTER.");
  say('"What the f*** does that mean?!"');
  say("");
  say(`  ${C.cyan}1${C.reset} — Try to print normally`);
  say(`  ${C.cyan}2${C.reset} — Take the printer to a field 🏏`);
  say(`  ${C.cyan}3${C.reset} — Walk away`);
  say("");

  const choice = await ask("Choose: ");

  switch (choice) {
    case "1":
      say(`${C.red}PC LOAD LETTER${C.reset}`);
      say(`${C.red}PC LOAD LETTER${C.reset}`);
      say(`${C.red}PC LOAD LETTER${C.reset}`);
      say("The printer jams. Of course it does.");
      STATE.morale -= 2;
      break;
    case "2":
      say("");
      say(`${C.bold}🎵 "Still" by Geto Boys starts playing... 🎵${C.reset}`);
      say("");
      say("You, Michael, and Samir carry the printer to an open field.");
      await pause();
      say(`${C.red}💥 WHAM!${C.reset} — Baseball bat.`);
      say(`${C.red}💥 CRACK!${C.reset} — Another swing.`);
      say(`${C.red}💥 SMASH!${C.reset} — Samir kicks it.`);
      say(`${C.red}💥 BOOM!${C.reset} — It's done. It's finally done.`);
      say("");
      say('"Damn it feels good to be a gangsta."');
      STATE.printerAlive = false;
      STATE.morale += 5;
      STATE.suspicion += 10;
      if (!STATE.inventory.includes("Printer Debris")) STATE.inventory.push("Printer Debris");
      break;
    default:
      say("You walk away. The printer wins. Again.");
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: The Bobs --------------------------------------

async function theBobs() {
  STATE.visited.add("bobs");
  say(`${C.bold}👔👔 THE BOBS' CONFERENCE ROOM${C.reset}`);
  say("Two consultants in matching suits sit across from you.");
  say("They have your file. They have everyone's file.");
  say("");

  const q = BOB_QUESTIONS[Math.floor(Math.random() * BOB_QUESTIONS.length)];
  say(`${C.magenta}Bob Slydell:${C.reset} "${q}"`);
  say("");
  say(`  ${C.cyan}1${C.reset} — Answer honestly ("I do nothing. Like, fifteen minutes of real work.")`);
  say(`  ${C.cyan}2${C.reset} — Bullshit them ("I'm a people person! I have people skills!")`);
  say(`  ${C.cyan}3${C.reset} — Describe the penny-fraction scheme to them`);
  say(`  ${C.cyan}4${C.reset} — Leave awkwardly`);
  say("");

  const choice = await ask("Choose: ");

  switch (choice) {
    case "1":
      say('"I\'d say in a given week I probably only do about fifteen minutes of actual, real work."');
      say("");
      say(`${C.magenta}Bob Porter:${C.reset} "Heh. You're... you're honest. I like that. Let me tell you something..."`);
      say(`${C.magenta}Bob Porter:${C.reset} "We're actually gonna be letting some people GO. But you... you've got upper management written all over you."`);
      STATE.suspicion -= 10;
      STATE.morale += 2;
      break;
    case "2":
      say('"I HAVE PEOPLE SKILLS! I AM GOOD AT DEALING WITH PEOPLE!');
      say(' CAN\'T YOU UNDERSTAND THAT?! WHAT THE HELL IS WRONG WITH YOU PEOPLE?!"');
      say("");
      say("— Tom Smykowski energy. The Bobs exchange a glance.");
      STATE.suspicion += 5;
      break;
    case "3":
      say('"See, we take the fraction of a penny from each transaction... like Superman III."');
      say("");
      say(`${C.magenta}Bob Slydell:${C.reset} "...Superman III?"`);
      say(`${C.magenta}Bob Porter:${C.reset} "I've never even seen that movie."`);
      STATE.suspicion += 25;
      say(`${C.red}⚠️  Suspicion MASSIVELY increased!${C.reset}`);
      break;
    default:
      say("You mutter something and back out of the room.");
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: Milton's Desk ---------------------------------

async function miltonDesk() {
  STATE.visited.add("milton");
  say(`${C.bold}📎 MILTON'S DESK${C.reset}`);
  say("Milton is sitting at his desk, which has been moved to the basement.");
  say("Next to a cockroach. The red stapler glows under the flickering light.");
  say("");
  milton();
  say("");
  say(`  ${C.cyan}1${C.reset} — Take Milton's stapler`);
  say(`  ${C.cyan}2${C.reset} — Promise Milton you'll look into his paycheck situation`);
  say(`  ${C.cyan}3${C.reset} — Back away slowly`);
  say("");

  const choice = await ask("Choose: ");

  switch (choice) {
    case "1":
      say(`${C.red}You take the red Swingline stapler.${C.reset}`);
      say("Milton stares at you. His eye twitches.");
      say('"I... I could set the building on fire..."');
      STATE.staplerSecured = true;
      STATE.suspicion += 5;
      if (!STATE.inventory.includes("Red Swingline Stapler")) STATE.inventory.push("Red Swingline Stapler");
      // Easter egg: if you take the stapler AND suspicion is high, Milton's threat becomes real
      if (STATE.suspicion > 70) {
        say("");
        say(`${C.bg.red}${C.bold} 🔥 Milton has reached his breaking point. 🔥 ${C.reset}`);
        say("You smell smoke.");
        STATE.buildingIntact = false;
        STATE.endings.push("FIRE");
      }
      break;
    case "2":
      say('"They... they moved my desk and they said they\'d fix my paycheck but they never did..."');
      say("You nod sympathetically but we both know nothing will change.");
      STATE.morale--;
      break;
    default:
      say("Smart. Never corner a man and his stapler.");
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: Chotchkie's -----------------------------------

async function chotchkies() {
  STATE.visited.add("chotchkies");
  say(`${C.bold}🍽️  CHOTCHKIE'S RESTAURANT${C.reset}`);
  say("The walls are covered in kitschy memorabilia. Your server has 37 pieces of flair.");
  say(`You currently have ${C.yellow}${STATE.flairCount} pieces of flair${C.reset}.`);
  say("");
  say(`${C.magenta}Stan (Manager):${C.reset} "Look. We need to talk about your flair."`);
  say(`${C.magenta}Stan:${C.reset} "People can get a cheeseburger anywhere, okay?`);
  say(`  They come to Chotchkie's for the atmosphere and the attitude.`);
  say(`  Now I count only ${STATE.flairCount} pieces of flair. The minimum is 15.`);
  say(`  Now Brian, for example, has 37 pieces of flair."`);
  say("");
  say(`  ${C.cyan}1${C.reset} — Add more flair (buy 5 pieces)`);
  say(`  ${C.cyan}2${C.reset} — "You know what, Stan, if you want me to wear 37 pieces of flair..."`);
  say(`  ${C.cyan}3${C.reset} — Order a coffee and leave`);
  say("");

  const choice = await ask("Choose: ");

  switch (choice) {
    case "1":
      STATE.flairCount += 5;
      say(`You now have ${STATE.flairCount} pieces of flair. Stan nods approvingly.`);
      if (STATE.flairCount >= 37) {
        say(`${C.green}🏆 You've matched Brian! 37 pieces of flair! The MAXIMUM flair achievement!${C.reset}`);
        say('"People person" unlocked. Tom Smykowski would be proud.');
      }
      break;
    case "2":
      say('"...like your pretty boy over there, Brian, why don\'t you just make the minimum 37 pieces of flair?"');
      say("");
      say(`${C.magenta}Stan:${C.reset} "Well, I thought I remembered you saying you wanted to express yourself."`);
      say(`${C.magenta}Joanna:${C.reset} "**** this." *removes flair, walks out*`);
      STATE.flairCount = 0;
      STATE.morale += 3;
      break;
    default:
      say("The coffee is terrible. But you didn't come here for the coffee.");
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: Penny Scheme -----------------------------------

async function pennyScheme() {
  STATE.visited.add("scheme");
  say(`${C.bold}💰 THE PENNY-FRACTION SCHEME${C.reset}`);
  say('"It\'s not even really stealing. We\'re just taking fractions of a penny.');
  say(' It\'s like Superman III. Or that — that — what\'s that movie?"');
  say('"Office Space?"');
  say('"...no."');
  say("");
  say(`Current skim balance: ${C.green}$${STATE.skimBalance.toFixed(6)}${C.reset}`);
  say("");
  say(`  ${C.cyan}1${C.reset} — Run 1 pay period (low risk)`);
  say(`  ${C.cyan}2${C.reset} — Run 5 pay periods (medium risk)`);
  say(`  ${C.cyan}3${C.reset} — Run ALL 26 periods (full year — HIGH RISK)`);
  say(`  ${C.cyan}4${C.reset} — View the skim ledger`);
  say(`  ${C.cyan}5${C.reset} — Go back`);
  say("");

  const choice = await ask("Choose: ");

  switch (choice) {
    case "1": case "2": case "3": {
      const periods = choice === "1" ? 1 : choice === "2" ? 5 : 26;
      say(`${C.dim}Running penny-fraction skim for ${periods} pay period(s)...${C.reset}`);
      const result = runSkimCycle(periods);
      say(`${C.green}💰 Skimmed: $${result.totalFractions.toFixed(6)} across ${periods} period(s)${C.reset}`);
      say(`${C.bold}Total balance: $${STATE.skimBalance.toFixed(6)}${C.reset}`);

      if (STATE.skimBalance > 0.5) {
        say("");
        say(`${C.red}"I think... we messed up the decimal point."${C.reset}`);
        say(`${C.red}"We sure did. This is way more than a penny."${C.reset}`);
      }

      if (STATE.suspicion > 80) {
        say("");
        say(`${C.bg.red}${C.bold} ⚠️  THE BOBS ARE AUDITING YOUR TRANSACTIONS! ⚠️ ${C.reset}`);
        STATE.endings.push("AUDIT");
      }
      break;
    }
    case "4": {
      // Write current state to report
      const reportPath = path.join(process.cwd(), "skim_ledger.json");
      const ledger = {
        disclaimer: "FICTIONAL. This is a game. No real money.",
        totalSkimmed: STATE.skimBalance,
        destination: "Peter's Off-Shore Coconut Fund 🥥",
        generated: new Date().toISOString(),
        suspicionLevel: STATE.suspicion,
        tpsReportsFiled: STATE.tpsReportsFiled,
      };
      fs.writeFileSync(reportPath, JSON.stringify(ledger, null, 2));
      say(`${C.dim}Ledger written to: ${reportPath}${C.reset}`);
      say(`Total skimmed: $${STATE.skimBalance.toFixed(6)}`);
      break;
    }
    default:
      say('"We should be careful. Very careful."');
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: Fishing Conditions -----------------------------

async function fishing() {
  STATE.visited.add("fishing");
  say(`${C.bold}🎣 FISHING CONDITIONS CHECK${C.reset}`);
  say('"Peter, what would you do if you had a million dollars?"');
  say('"I\'ll tell you what I\'d do, man. Two chicks at the same time... nah,');
  say(' I\'d probably just go fishing."');
  say("");

  if (STATE.weatherData) {
    const w = STATE.weatherData;
    say(`${C.bold}Current Conditions (${w.area}):${C.reset}`);
    say(`  🌡️  Temperature: ${w.tempF}°F (${w.tempC}°C)`);
    say(`  🌤️  Conditions:  ${w.desc}`);
    say(`  💨 Wind:        ${w.windMph} mph`);
    say(`  💧 Humidity:    ${w.humidity}%`);
    say(`  🤒 Feels Like:  ${w.feelsLikeF}°F`);
    say("");

    const temp = parseInt(w.tempF);
    const wind = parseInt(w.windMph);
    const rainy = w.desc.toLowerCase().includes("rain") || w.desc.toLowerCase().includes("storm");

    let fishScore = 0;
    if (temp >= 60 && temp <= 85) fishScore += 3;
    else if (temp >= 50) fishScore += 1;
    if (wind < 15) fishScore += 2;
    if (!rainy) fishScore += 3;
    else fishScore -= 2;
    if (parseInt(w.humidity) < 80) fishScore += 1;

    fishScore = clamp(fishScore, 0, 10);
    const bar = "🐟".repeat(fishScore) + "  ".repeat(10 - fishScore);

    say(`${C.bold}Fishing Score:${C.reset} [${bar}] ${fishScore}/10`);

    if (fishScore >= 7) {
      say(`${C.green}"That's it. I'm not going to work today."${C.reset}`);
      say(`${C.green}"I'm gonna go fishing."${C.reset}`);
      STATE.morale += 3;
    } else if (fishScore >= 4) {
      say(`${C.yellow}"Ehh... it's okay. I COULD go. But the Bobs..."${C.reset}`);
      STATE.morale += 1;
    } else {
      say(`${C.red}"Terrible fishing weather. Even Peter would stay at Initech today."${C.reset}`);
      STATE.morale--;
    }
  } else {
    say(`${C.yellow}Weather data unavailable. The Bobs probably cut the budget.${C.reset}`);
    say("You stare out the window and imagine the lake anyway.");
    STATE.morale++;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: Tom Smykowski ----------------------------------

async function tomSmykowski() {
  STATE.visited.add("tom");
  say(`${C.bold}📞 TOM SMYKOWSKI'S DESK${C.reset}`);
  say("Tom is sweating. He heard the Bobs are letting people go.");
  say("");
  say(`${C.magenta}Tom:${C.reset} "I HAVE PEOPLE SKILLS! I am good at dealing with PEOPLE!`);
  say('  Can\'t you understand that?! WHAT THE HELL IS WRONG WITH YOU PEOPLE?!"');
  say("");
  say(`  ${C.cyan}1${C.reset} — Ask Tom about the Jump to Conclusions mat`);
  say(`  ${C.cyan}2${C.reset} — Reassure Tom about his job`);
  say(`  ${C.cyan}3${C.reset} — Leave`);
  say("");

  const choice = await ask("Choose: ");

  switch (choice) {
    case "1":
      say(`${C.magenta}Tom:${C.reset} "It's a mat. With CONCLUSIONS on it. That you can JUMP to!"`);
      say('"That\'s the worst idea I\'ve ever heard in my life."');
      say('"Yes! This is horrible, this idea."');
      say("");
      say("...Tom looks deflated.");
      say("");
      say(`But wait — ${C.bold}he gives you the prototype!${C.reset}`);
      STATE.jumpToConclusions = true;
      if (!STATE.inventory.includes("Jump to Conclusions Mat")) STATE.inventory.push("Jump to Conclusions Mat");
      say(`${C.green}📦 Jump to Conclusions Mat added to inventory!${C.reset}`);
      break;
    case "2":
      say('"It\'s... it\'s gonna be fine, Tom."');
      say(`${C.magenta}Tom:${C.reset} "I\'m a people person, dammit!"`);
      say("Tom looks slightly reassured. He goes back to dealing with the customers.");
      say('(He takes the specifications from the customers and brings them down to the software people.)');
      say("(The customers could do that themselves, but let's not tell Tom that.)");
      break;
    default:
      say("You back away from the existential crisis.");
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: System Audit -----------------------------------

async function systemAudit() {
  STATE.visited.add("audit");
  say(`${C.bold}📊 SYSTEM RECON — THE BOBS' INFRASTRUCTURE AUDIT${C.reset}`);
  say('"We\'re just here to get a sense of what everyone does around here."');
  say("");

  const s = STATE.systemRecon || systemRecon();

  say(`${C.bold}Hostname:${C.reset}      ${s.hostname}`);
  say(`${C.bold}Platform:${C.reset}      ${s.platform} (${s.arch})`);
  say(`${C.bold}CPUs:${C.reset}          ${s.cpus}`);
  say(`${C.bold}Total RAM:${C.reset}     ${s.totalMemGB} GB`);
  say(`${C.bold}Free RAM:${C.reset}      ${s.freeMemGB} GB`);
  say(`${C.bold}Uptime:${C.reset}        ${s.uptime}`);
  say(`${C.bold}User:${C.reset}          ${s.user}`);
  say(`${C.bold}Home Dir:${C.reset}      ${s.homeDir}`);
  say(`${C.bold}Node Version:${C.reset}  ${s.nodeVersion}`);
  say("");
  say(`${C.magenta}Bob Slydell:${C.reset} "So what you do is you take the specifications from the customer..."`);
  say(`${C.magenta}Bob Porter:${C.reset} "...and you bring them down to the software people?"`);
  say(`${C.magenta}Bob Slydell:${C.reset} "Interesting. ${s.cpus} CPUs and ${s.totalMemGB} GB of RAM and they're using it to file TPS reports."`);

  STATE.suspicion += 3;

  await pause();
  return mainMenu();
}

// ---- SCENE: Motivation -------------------------------------

async function motivation() {
  STATE.visited.add("motivation");
  say(`${C.bold}💼 CORPORATE MOTIVATION (from management)${C.reset}`);
  say('"Every Thursday, management emails an inspirational quote. Today\'s:"');
  say("");

  const quote = await fetchMotivation();
  say(`${C.yellow}  "${quote}"${C.reset}`);
  say("");
  say(`${C.dim}— Management Motivational Feed™ (real API: api.chucknorris.io)${C.reset}`);
  say("");
  say('"That has nothing to do with our jobs."');
  say('"Yeah, but it came from corporate, so..."');

  await pause();
  return mainMenu();
}

// ---- SCENE: Michael Bolton's Desk --------------------------

async function michaelBolton() {
  STATE.visited.add("bolton");
  say(`${C.bold}🎤 MICHAEL BOLTON'S DESK${C.reset}`);
  say("Michael is listening to music with his headphones on.");
  say("He's mouthing lyrics aggressively. It's definitely gangsta rap.");
  say("");
  say(`${C.magenta}Michael:${C.reset} "There WAS nothing wrong with my name... until I was about 12 years old`);
  say('  and that no-talent ass clown became famous and started winning Grammys."');
  say("");
  say(`  ${C.cyan}1${C.reset} — "Why don't you just go by Mike?"`);
  say(`  ${C.cyan}2${C.reset} — "Why should I change? He's the one who sucks."`);
  say(`  ${C.cyan}3${C.reset} — Ask Michael about the virus (the penny scheme)`);
  say(`  ${C.cyan}4${C.reset} — Leave`);
  say("");

  const choice = await ask("Choose: ");

  switch (choice) {
    case "1":
      say(`${C.magenta}Michael:${C.reset} "No way! Why should I change? He's the one who sucks."`);
      break;
    case "2":
      say(`${C.magenta}Michael:${C.reset} "EXACTLY! THANK you! That's what I keep telling people!"`);
      STATE.morale += 2;
      break;
    case "3":
      say(`${C.magenta}Michael:${C.reset} "We're not gonna do anything illegal...`);
      say('  we\'re just gonna take fractions of a penny from each transaction.');
      say('  Like in Superman III."');
      say("");
      say(`${C.magenta}Samir:${C.reset} "I thought it was more like that movie... what's it called?"`);
      say(`${C.magenta}Michael:${C.reset} "Yeah, but this is real code. On a real machine. Running on Node ${process.version}."`);
      say(`${C.magenta}Michael:${C.reset} "And we're writing real files to ${process.cwd()}."`);
      STATE.suspicion += 5;
      break;
    default:
      say("You leave Michael to his aggressive lip-syncing.");
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: Hypnotherapist ---------------------------------

async function hypnotherapist() {
  STATE.visited.add("hypno");
  say(`${C.bold}🌀 DR. SWANSON'S HYPNOTHERAPY OFFICE${C.reset}`);

  if (STATE.hypnotized) {
    say("You've already been hypnotized. You feel... great, actually.");
    say('"I just don\'t care anymore. And it\'s not that I\'m being lazy.');
    say(' It\'s that I just... don\'t... care."');
    await pause();
    return mainMenu();
  }

  say("Dr. Swanson is a large, calming man with a soothing voice.");
  say('"Peter, when you\'re in your most relaxed state...');
  say(' what is it that you really want to do?"');
  say("");
  say(`  ${C.cyan}1${C.reset} — "Nothing."  `);
  say(`  ${C.cyan}2${C.reset} — "I want to go fishing every day."`);
  say(`  ${C.cyan}3${C.reset} — "I want to take fractions of a penny from Initech." `);
  say("");

  const choice = await ask("Choose: ");

  STATE.hypnotized = true;
  say("");
  say("Dr. Swanson snaps his fingers. Then he... has a heart attack. He dies.");
  say("But you feel amazing. Best you've felt in years.");
  say("");
  say(`${C.green}✨ HYPNOTIZED! Morale permanently boosted. You no longer care about anything.${C.reset}`);
  STATE.morale = 10;

  switch (choice) {
    case "1":
      say('"Nothing." You\'re going to do absolutely nothing. And it\'s going to be everything.');
      break;
    case "2":
      say("Fishing it is. Every day. Whether the weather is good or not.");
      say(`(But right now it's ${STATE.weatherData ? STATE.weatherData.desc + " in " + STATE.weatherData.area : "unknown weather"})`);
      break;
    case "3":
      say('"Interesting. Let\'s explore that impulse in our next—" *dies*');
      say("Looks like you'll have to figure out the ethics yourself.");
      STATE.suspicion += 10;
      break;
    default:
      say("Dr. Swanson passes peacefully regardless of your answer.");
      break;
  }

  await pause();
  return mainMenu();
}

// ---- SCENE: Save Game --------------------------------------

async function saveGameAction() {
  const savePath = saveGame();
  say(`${C.green}💾 Game saved to: ${savePath}${C.reset}`);
  say('"I\'d like to save my game... I mean, my TPS reports."');
  say(`${C.dim}(Real file written to disk with your game state.)${C.reset}`);

  await pause();
  return mainMenu();
}

// ---- END GAME ----------------------------------------------

async function endGame() {
  say("");
  divider();
  say(`${C.bold}${C.red}GAME OVER — FINAL REPORT${C.reset}`);
  divider();
  say("");
  say(`${C.bold}Player:${C.reset}           ${STATE.player}`);
  say(`${C.bold}Turns Taken:${C.reset}      ${STATE.turnCount}`);
  say(`${C.bold}Final Morale:${C.reset}     ${STATE.morale}/10`);
  say(`${C.bold}Suspicion:${C.reset}        ${STATE.suspicion}%`);
  say(`${C.bold}Total Skimmed:${C.reset}    $${STATE.skimBalance.toFixed(6)}`);
  say(`${C.bold}TPS Reports:${C.reset}      ${STATE.tpsReportsFiled} (${STATE.tpsCoverSheets} with cover sheets)`);
  say(`${C.bold}Flair:${C.reset}            ${STATE.flairCount} pieces`);
  say(`${C.bold}Printer Status:${C.reset}   ${STATE.printerAlive ? "Still jammed" : "DESTROYED 🏏"}`);
  say(`${C.bold}Building:${C.reset}         ${STATE.buildingIntact ? "Intact" : "🔥 BURNED DOWN 🔥"}`);
  say(`${C.bold}Stapler:${C.reset}          ${STATE.staplerSecured ? "SECURED (Red Swingline)" : "Still Milton's"}`);
  say(`${C.bold}Hypnotized:${C.reset}       ${STATE.hypnotized ? "Yes (feeling great)" : "No"}`);
  say(`${C.bold}Rooms Visited:${C.reset}    ${[...STATE.visited].join(", ") || "None"}`);
  say(`${C.bold}Inventory:${C.reset}        ${STATE.inventory.join(", ") || "Empty"}`);
  say("");

  // Determine ending
  let ending = "";
  if (STATE.suspicion >= 80 && STATE.skimBalance > 0) {
    ending = "THE AUDIT";
    say(`${C.bold}${C.red}ENDING: THE AUDIT${C.reset}`);
    say("The Bobs found the penny-fraction scheme. You panic.");
    say("You write a letter and slide it under Lumbergh's door.");
    say("Luckily, Milton burns down the building before anyone reads it.");
    say("Insurance covers everything. The money disappears.");
    say(`${C.dim}"I think... we got away with it."${C.reset}`);
  } else if (!STATE.buildingIntact) {
    ending = "THE FIRE";
    say(`${C.bold}${C.red}ENDING: THE FIRE${C.reset}`);
    say("Milton, pushed beyond his limits, sets the building on fire.");
    say("He's later seen on a tropical beach. With a red stapler.");
    say("And... is that a coconut drink? And YOUR skim money?!");
    say(`${C.dim}"I was told I could listen to the radio..."${C.reset}`);
  } else if (STATE.hypnotized && STATE.morale >= 8) {
    ending = "THE ENLIGHTENMENT";
    say(`${C.bold}${C.green}ENDING: THE ENLIGHTENMENT${C.reset}`);
    say("After hypnotherapy, you stopped caring. You started showing up");
    say("in a Hawaiian shirt. You gutted fish at your desk.");
    say("The Bobs promoted you to VP of Product Refactoring.");
    say(`${C.dim}"I wouldn't say I've been missing it, Bob."${C.reset}`);
  } else if (STATE.tpsReportsFiled >= 10 && STATE.tpsCoverSheets >= 10) {
    ending = "THE CORPORATE DRONE";
    say(`${C.bold}${C.yellow}ENDING: THE CORPORATE DRONE${C.reset}`);
    say("You filed every TPS report. With cover sheets. Every time.");
    say("Lumbergh is thrilled. You get a 3% raise and a parking spot.");
    say("You die inside a little more each day. But at least you have flair.");
    say(`${C.dim}"Yeahhh... that would be greeeaat."${C.reset}`);
  } else if (STATE.skimBalance > 1.0) {
    ending = "THE SALAMI SLICER";
    say(`${C.bold}${C.green}ENDING: THE SALAMI SLICER (Superman III)${C.reset}`);
    say(`You successfully skimmed $${STATE.skimBalance.toFixed(6)} in penny fractions.`);
    say("It's not a lot. But it's honest... well, no, it's dishonest work.");
    say("Peter's Off-Shore Coconut Fund thanks you. 🥥");
    say(`${C.dim}"We're not gonna do anything ILLEGAL..."${C.reset}`);
  } else {
    ending = "THE QUITTER";
    say(`${C.bold}${C.blue}ENDING: THE QUITTER${C.reset}`);
    say("You walk out the front door of Initech. The fluorescents fade behind you.");
    say("You get a construction job. Manual labor. Fresh air.");
    say("You've never been happier. Lawrence was right.");
    say(`${C.dim}"Frickin' A."${C.reset}`);
  }

  divider();
  say("");
  say(`${C.dim}Files created during this session:${C.reset}`);
  const tpsDir = path.join(process.cwd(), "tps_reports");
  if (fs.existsSync(tpsDir)) {
    const files = fs.readdirSync(tpsDir);
    files.forEach(f => say(`${C.dim}  📄 tps_reports/${f}${C.reset}`));
  }
  if (fs.existsSync(path.join(process.cwd(), "skim_ledger.json"))) {
    say(`${C.dim}  📄 skim_ledger.json${C.reset}`);
  }
  if (fs.existsSync(path.join(process.cwd(), "initech_save.json"))) {
    say(`${C.dim}  📄 initech_save.json${C.reset}`);
  }
  if (fs.existsSync(path.join(process.cwd(), "initech_report.json"))) {
    say(`${C.dim}  📄 initech_report.json${C.reset}`);
  }

  say("");
  say(`${C.bold}Thanks for playing INITECH: THE GAME.${C.reset}`);
  say(`${C.dim}"Fractions of a penny. Nobody will notice."${C.reset}`);
  say("");

  // Save final state
  saveGame();

  rl.close();
  process.exit(0);
}

// ---- MAIN --------------------------------------------------

async function main() {
  try {
    await intro();
    await mainMenu();
  } catch (err) {
    if (err.code === "ERR_USE_AFTER_CLOSE") {
      // User ctrl+c'd — that's fine
      process.exit(0);
    }
    console.error("Something went wrong at Initech:", err);
    process.exit(1);
  }
}

main();
