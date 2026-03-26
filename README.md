# ✨ Incanto

> **Real-time 1v1 spell-drawing battle.** Draw a spell, name it, and let an AI oracle decide who wins.

🔗 **Live Demo:** [https://incanto.onrender.com](https://incanto.onrender.com)

---

## 🎮 How It Works

1. Enter your wizard name
2. Create a private room, join by code, or match with a stranger
3. Both players have **60 seconds** to draw a spell and name it
4. **Gemini AI** sees both drawings and judges the clash with dramatic flair
5. Outcomes: you lose a life · opponent loses · both lose · stalemate · foul spell
6. **7 rounds · 3 lives each** — most lives remaining wins!

---

## 🚀 Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in the env file
cp .env
# → Add your GEMINI_API_KEY

# 3. Run in development (auto-restart)
npm run dev

# 4. Open http://localhost:3000
# To test two players: open two browser tabs
```

---

## 🌐 Deploy to Render (Free Tier)

### Step-by-step

1. **Push your repo to GitHub**
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/incanto.git
   git push -u origin main
   ```

2. **Create a new Web Service on [render.com](https://render.com)**
   - Connect your GitHub repo
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

3. **Add Environment Variables** in the Render dashboard under *Environment*:

   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | your Google AI API key |
   | `DRAW_TIME` | `60` |
   | `MAX_ROUNDS` | `7` |
   | `STARTING_LIVES` | `3` |
   | `NEXT_ROUND_DELAY` | `10` |

4. **Deploy** — Render auto-deploys on every push to `main`

> **Free tier note:** The server sleeps after 15 min of inactivity. First request after sleep takes ~30s to wake up. Upgrade to Starter ($7/mo) for always-on.

### Get a Gemini API Key

1. Visit [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google → **Get API key** → Create key in new project
3. Free tier is more than sufficient for this game

---

## 📁 Project Structure

```
incanto/
├── server/
│   ├── index.js                 # Express + Socket.IO entry point
│   ├── socket/
│   │   └── socketHandler.js     # All socket events & game flow
│   ├── game/
│   │   ├── gameState.js         # In-memory room & state management
│   │   └── roundTimer.js        # Per-room countdown timers
│   └── ai/
│       └── geminiJudge.js       # Gemini 2.5 Flash integration
│
├── client/
│   ├── index.html               # Single HTML — pages shown/hidden by JS
│   ├── app.js                   # Entry — wires pages + socket routing
│   ├── styles/
│   │   └── theme.css            # Neo-brutalism design system
│   ├── pages/
│   │   ├── socketClient.js      # Singleton socket connection
│   │   ├── lobby.js             # Room creation & joining UI
│   │   ├── game.js              # Drawing arena, timer, spell submit
│   │   └── gameOver.js          # Final results screen
│   └── components/
│       ├── drawingCanvas.js     # Whiteboard with color picker & brushes
│       ├── timer.js             # Circular SVG countdown
│       ├── lives.js             # Heart display
│       └── toast.js             # Notification banners
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Server | Node.js + Express |
| Real-time | Socket.IO 4 |
| AI Judge | Google Gemini 2.5 Flash (vision) |
| Frontend | Vanilla JS ES Modules |
| Design | Neo-brutalism (marieooq/neo-brutalism-ui-library) |
| State | In-memory (no database needed) |
| Deploy | Render |

---

## ⚙️ Configuration

All values are optional — sensible defaults are built in.

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | **Required.** Google AI API key |
| `PORT` | `3000` | Server port |
| `DRAW_TIME` | `60` | Seconds per drawing phase |
| `MAX_ROUNDS` | `7` | Rounds per match |
| `STARTING_LIVES` | `3` | Lives each player starts with |
| `NEXT_ROUND_DELAY` | `10` | Seconds on result screen before next round |

---

## 🤖 AI Judge Details

Gemini 2.5 Flash receives both canvas images + spell names and returns a structured JSON verdict with:
- **Outcome type** (who loses, stalemate, or inappropriate content)
- **Dramatic reason** (max 15 words)
- **Battle narrative** (2 vivid sentences)

Three-tier fallback guarantees the game never freezes:
1. Vision judge (sees drawings)
2. Text-only judge (spell names only)
3. Deterministic random outcome

---

## 📜 License

MIT
