# 🏢 Office Space: The Game

A browser-based Office Space (1999) simulator built with Node.js and Express. Relive the soul-crushing glory of Initech — complete with TPS reports, a penny-fraction scheme, a malfunctioning printer, and Milton's stapler.

![Windows 98 / IE5 aesthetic](https://img.shields.io/badge/aesthetic-Windows%2098-008080) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## 🎮 How to Play

### Quick Start

```bash
git clone https://github.com/krisschumacher365-ctrl/office-space-game.git
cd office-space-game
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

### CLI Version

There's also a text-adventure CLI version:

```bash
npm run cli
```

### Original Simulator

The raw penny-fraction payroll simulator that started it all:

```bash
npm run sim
```

## 🕹️ Gameplay

You are **Peter Gibbons**, software engineer at Initech. Your workday runs from **8:00 AM to 5:00 PM** (each action = 30 minutes). Survive the day without getting fired, having a breakdown, or letting Milton burn the building down.

### Locations

| Location | What Happens |
|---|---|
| 📋 Your Cubicle | File TPS reports (with or without the new cover sheets) |
| 🖨️ Printer Room | Battle the printer. Or take it to a field. |
| 👔 The Bobs | Convince two consultants you have value |
| 📎 Milton's Desk | Risk the stapler. Risk the fire. |
| 🍽️ Chotchkie's | Flair management and coffee |
| 💰 Penny Scheme | Run the salami-slicing virus on real payroll data |
| 🎣 Fishing Report | Live weather-based fishing conditions |
| 📞 Tom Smykowski | Jump to Conclusions mat |
| 🎤 Michael Bolton | "Why should I change? He's the one who sucks." |
| 🌀 Hypnotherapist | Reach your most relaxed state |
| 🍺 Lawrence's Patio | Beer, philosophy, and "two chicks at the same time" |
| 📊 System Audit | Real system recon of the host machine |

### Win / Lose Conditions

- **🏆 Win:** Survive to 5:00 PM
- **❌ Fired:** Suspicion reaches 100%
- **😵 Breakdown:** Morale hits 0
- **🔥 Fire:** Milton's anger maxes out — he burns the building down

### Scoring & Achievements

30+ achievements to unlock across all locations. Score points by completing Lumbergh's task queue, making risky choices, and keeping your combo streak alive.

## 🖥️ Features

- **Windows 98 / IE5 aesthetic** — title bar, taskbar with Start menu, address bar, scrollbars, the works
- **Real-world API integrations** — live weather from wttr.in, motivational quotes from Chuck Norris API, actual OS system recon
- **Penny-fraction engine** — runs real payroll math with salami-slicing on 1,000 employees
- **Printer chaos** — 20 different error messages, destruction sequence with screen shake
- **Annoying activity log popup** — corporate-mandated, escalating passive-aggressive nag messages when dismissed
- **Day clock system** — 8 AM to 5 PM, 30 min per action, time pressure
- **Task queue** — Lumbergh assigns tasks with deadlines; miss them and suspicion rises
- **Save system** — writes game state to disk

## 📁 Project Structure

```
office-space-game/
├── server.js          # Express API server (all game logic)
├── game.js            # CLI text adventure (standalone)
├── index.js           # Original penny-fraction simulator
├── public/
│   ├── index.html     # 1999 intranet UI
│   ├── style.css      # Full Win98 aesthetic
│   └── app.js         # Client-side game engine
├── package.json
└── initech_report.json
```

## 🛠️ Requirements

- Node.js 18+
- npm

## 📜 License

MIT — Do whatever you want. Just use the new cover sheets.

---

*"I wouldn't say I've been MISSING it, Bob."*
