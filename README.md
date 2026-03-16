# 📊 FII & DII Data — India Institutional Flow Tracker (V2)

> **Track exactly what Foreign & Domestic big money is doing in the Indian stock market — updated live every day after market close.**

Built by [Mr. Chartist](https://twitter.com/mr_chartist) · Free · Open Source · No login required

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Twitter Follow](https://img.shields.io/twitter/follow/mr_chartist?style=social)](https://twitter.com/mr_chartist)

---

## 🤔 What Is This?

This is a **Node.js-powered dashboard** that shows you:
- **FII (Foreign Institutional Investors)** — Are foreigners buying or selling Indian stocks today?
- **DII (Domestic Institutional Investors)** — Are Indian mutual funds & institutions buying or selling?
- **Derivatives Positioning (F&O)** — Granular long/short ratios for Index Futures, Stock Futures, Calls, and Puts.
- Historical data going back **14 years**
- Visual patterns, streaks, heatmaps, and charts — all in one place

**Why does this matter?** When FIIs sell heavily, markets usually fall. When DIIs absorb that selling, it cushions the fall. Options and futures positioning reveal *how* they expect the market to move. This dashboard tells you exactly who is doing what, in real-time.

---

## 🚀 How to Run It 

The entire backend and extraction pipeline was rewritten in V2 to run on a single, powerful **Node.js** architecture featuring autonomous `node-cron` fetching.

### Option A: Local Development (Requires Node.js)
1. Install [Node.js](https://nodejs.org/) on your machine.
2. Clone this repository or download the ZIP.
3. Open a terminal in the project folder and run:
   ```bash
   npm install
   npm start
   ```
4. Open your browser to `http://localhost:5000`. You're done! The server will automatically hit the NSE at 18:30 IST daily to fetch new CSV records so you never have to.

### Option B: Cloud Deployment (Vercel / Hostinger / Render)
Because V2 includes a `vercel.json` routing configuration, deploying this permanently is a 1-click process.
1. Create an account on [Vercel](https://vercel.com/) or another modern serverless host.
2. Connect your GitHub repository.
3. Deploy! Vercel will automatically read `package.json`, install the dependencies, and map `/api/data` to the Node.js backend while serving the HTML dashboard seamlessly.

---

## 🟢 Understanding the Status Pill (Top Right)

| What You See | What It Means |
|---|---|
| 🟢 **LIVE • Refresh in 04:55** | ✅ Live tracking active. Yahoo Finance fetches NIFTY/VIX every 5 mins. |
| 🟡 **LOCAL ARCHIVE** | Markets are closed or NSE data is not yet published. Shows last known Cash/F&O data. |

---

## 📊 What's On the Dashboard

### Hero Section (Top)
- **FII Net** — Total net buying/selling by foreign investors today (in ₹ Crore).
- **DII Net** — Total net buying/selling by domestic funds today.
- **Combined Liquidity** — The net overall impact on market liquidity.
- **Flow Strength Meter** — Shows who is the bigger force today (FII or DII).
- **Live Tickers**: Live intraday prices for NIFTY 50 and INDIA VIX powered quietly in the background by Yahoo Finance.

### Derivatives Matrix (F&O)
A complete 4-column visual breakdown of institutional positioning:
- **Index Futures**: Directional market bets.
- **Stock Futures**: Broad individual equity bets (New in V2!).
- **Index Calls & Puts**: Option skew and hedging behavior.
- *Visual Bars*: Beautiful Long vs. Short red/green progress bars instantly show the net ratio.

### Tabs at the Bottom
| Tab | What's Inside |
|---|---|
| **Databases & Matrices** | Daily, Weekly, Monthly & Annual data tables with smart filters |
| **Visual Flow Heatmaps** | 45-day color grid — spot patterns at a glance |
| **Historical Charts** | 12-month bar chart & 14-year cumulative divergence chart |
| **Documentation** | Full feature guide |

---

## 💾 Exporting & Sharing

- **📷 Export any card** — Hover over any card → click the 📷 camera icon → saves as PNG with watermark
- **📸 Snapshot Full Page** — Header button → saves the entire dashboard as one image
- **𝕏 Post to X** — Pre-fills a tweet with today's flow data. One click to share your analysis.

---

## 🛠️ Tech Stack & Automation (V2)

With the V2 upgrade, the stack has moved entirely into modern Javascript:

| Technology | Purpose |
|---|---|
| Node.js / Express | Local API server and Vercel edge runtime |
| `node-cron` | Autonomous internal scheduler (No bash scripts needed) |
| GitHub Actions | Backup CI/CD for scheduled Git commits of extracted NSE datasets |
| Vanilla HTML/CSS/JS | Dashboard UI — lightweight, fast, dark mode native |
| Chart.js | Interactive historical charts |

### Fully Automated "Hands-Free" Data 
You never have to run a fetch script manually again. 
1. `server.js` starts a cron job watching the Indian time zone.
2. At 18:30 IST, it reaches out to the NSE Cash endpoints AND the daily Participant F&O CSVs. 
3. It natively extracts, cross-references, and calculates the matrices, updating `latest.json`.

---

## 🤝 Contributing
PRs and issues are very welcome!

Ideas:
- [ ] Sector-wise FII flow breakdown
- [ ] Export to CSV directly from the frontend data matrix
- [ ] Integration with specific Stock Futures tickers (e.g. HDFC Bank FII positions)

---

## 📜 License
MIT — use it, fork it, share it freely. Attribution appreciated.

---

## 👋 Author
Made with ❤️ by [Mr. Chartist](https://twitter.com/mr_chartist)

If this helps your trading, a ⭐ star on GitHub means a lot!

*⚠️ Disclaimer: This tool is for educational and informational purposes only. Not financial advice. Always do your own research.*
