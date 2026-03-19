# FII & DII Data — India Institutional Flow Tracker

> **Track exactly what Foreign & Domestic big money is doing in the Indian stock market — updated automatically every trading day after market close.**

Built by [Mr. Chartist](https://twitter.com/mr_chartist) · Free · Open Source · No login required

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Twitter Follow](https://img.shields.io/twitter/follow/mr_chartist?style=social)](https://twitter.com/mr_chartist)

---

## Table of Contents

1. [What Is This & Why It Matters](#1-what-is-this--why-it-matters)
2. [Data Sources — Where the Numbers Come From](#2-data-sources--where-the-numbers-come-from)
3. [How the Data Pipeline Works](#3-how-the-data-pipeline-works)
4. [Every Feature Explained](#4-every-feature-explained)
5. [How to Run It](#5-how-to-run-it)
6. [Project Structure](#6-project-structure)
7. [API Reference](#7-api-reference)
8. [Tech Stack](#8-tech-stack)
9. [Automation — How Data Updates Itself](#9-automation--how-data-updates-itself)
10. [Contributing](#10-contributing)

---

## 1. What Is This & Why It Matters

### Who Are FIIs and DIIs?

**FII / FPI (Foreign Institutional Investors / Foreign Portfolio Investors)**
These are large foreign funds — hedge funds, sovereign wealth funds, global asset managers — that invest in Indian equity markets. They are regulated by SEBI and must report all their trades to Indian depositories (NSDL/CDSL) daily. FIIs move massive amounts of capital and are historically the biggest driver of short-term market direction. When FIIs sell aggressively, Nifty typically falls. When they buy, the market usually rises.

**DII (Domestic Institutional Investors)**
These are Indian institutions — mutual funds (SIPs pooled into large AUM), insurance companies like LIC, and pension funds. DIIs act as the market's shock absorber. When FIIs panic-sell, DIIs step in and buy, cushioning the fall. Since 2020, DII buying has become structurally massive due to SIP inflows of ₹25,000–26,500 Cr every month.

### Why Track Them?

| Scenario | Market Implication |
|---|---|
| FII buying + DII buying | Strong bull run — both forces aligned |
| FII selling + DII buying | Market falls less — DII absorbs the pressure |
| FII selling + DII also selling | Sharp correction — both forces aligned downward |
| FII buying + DII selling | Mixed — often happens at distribution tops |

Beyond cash, their **Derivatives (F&O) positioning** reveals *how they expect the market to move*:
- Heavy FII long futures = they expect the market to rise
- Heavy FII put buying = they are hedging against (or betting on) a fall
- FII short futures increasing = they are actively shorting the market

This dashboard gives you all of this — cash + derivatives — automatically updated every trading day.

---

## 2. Data Sources — Where the Numbers Come From

The dashboard pulls from **four distinct official data sources**, all free and public:

---

### Source 1 — NSE Cash Market API
**URL:** `https://www.nseindia.com/api/fiidiiTradeReact`
**Updated:** Every trading day after 5:00 PM IST (approximately)
**Format:** JSON array
**Used for:** FII Gross Buy, FII Gross Sell, FII Net, DII Gross Buy, DII Gross Sell, DII Net — all in ₹ Crore

This is NSE's official live endpoint. It returns the cash segment participation data categorized as FII/FPI and DII. Each entry includes:
- `category` — e.g., "FII/FPI" or "DII"
- `buyValue` — gross purchases in ₹ Crore
- `sellValue` — gross sales in ₹ Crore
- `netValue` — net = buy minus sell
- `date` — trading date in `DD-Mon-YYYY` format (e.g., `18-Mar-2026`)

The pipeline fetches this first to get the date, then uses that date to build the F&O CSV URL.

---

### Source 2 — NSE Participant-Wise F&O Open Interest CSV
**URL pattern:** `https://nsearchives.nseindia.com/content/nsccl/fao_participant_oi_DDMMYYYY.csv`
**Example:** `fao_participant_oi_18032026.csv`
**Updated:** Every trading day, usually by 6:00 PM IST
**Format:** CSV with comma-separated values
**Used for:** FII Index Futures Long/Short, FII Stock Futures Long/Short, FII Index Call Long/Short, FII Index Put Long/Short, DII Index Futures Long/Short, DII Stock Futures Long/Short

This is the NSCCL (NSE Clearing) participant-wise open interest report. It shows the total open interest held by each category of participant (FII, DII, Pro, Client) broken down by instrument type. Columns in order:
1. Participant Type
2. Index Futures Long (contracts)
3. Index Futures Short (contracts)
4. Stock Futures Long (contracts)
5. Stock Futures Short (contracts)
6. Index Call Long
7. Index Call Short
8. Index Put Long
9. Index Put Short

The pipeline tries two URL variants: the primary (`fao_participant_oi_DDMMYYYY.csv`) and a fallback (`fao_participant_oi_DDMMYYYY_b.csv`), since NSE occasionally publishes with both naming conventions.

---

### Source 3 — NSDL Fortnightly FPI Sector Reports
**Via:** Screener.in / C-MOTS aggregated data (BSE 22-sector classification)
**Updated:** Every ~15 days (fortnightly)
**Used for:** Sector-Wise FII/FPI Allocation tab

SEBI mandates all Foreign Portfolio Investors to hold Indian securities through Indian depositories (NSDL/CDSL). Depositories publish sector-wise Assets Under Custody (AUC) fortnightly. The dashboard uses this data to show:
- Each sector's share of total FPI equity holdings in India (% of AUM)
- Net FPI inflow/outflow per sector over the last 15-day reporting window
- Rolling 12-month net flow per sector
- Sectors are classified using BSE's ~22-sector system covering ~4,800 issuers

This data is embedded in the dashboard as a static snapshot and refreshed each time the HTML is updated.

---

### Source 4 — Yahoo Finance (NIFTY 50 & India VIX Live Prices)
**URL pattern:** `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d`
**Tickers used:** `^NSEI` (Nifty 50) and `^INDIAVIX` (India VIX)
**Updated:** Live intraday, every 5 minutes while market is open
**Format:** JSON
**Used for:** The NIFTY and VIX live price widgets in the header area

Yahoo Finance exposes a CORS-safe endpoint that works directly from the browser. The dashboard polls this every 5 minutes to display live Nifty 50 level and VIX value with intraday change. This is completely separate from the institutional flow data and runs client-side only.

---

## 3. How the Data Pipeline Works

The entire backend data pipeline is automated. Here is exactly what happens, step by step:

```
GitHub Actions triggers at 12:30 UTC (6:00 PM IST) → Mon–Fri
        │
        ▼
scripts/fetch_data.js runs
        │
        ├─ 1. Fetch NSE Cash API (with 3 retries + backoff)
        │      → Extracts FII buy/sell/net, DII buy/sell/net, trading date
        │
        ├─ 2. Build F&O CSV URL using the trading date
        │      → Try primary URL, then fallback URL (with 3 retries each)
        │      → Parse CSV: extract FII and DII rows only
        │      → Map column indices to long/short values
        │
        ├─ 3. Transform & validate
        │      → Merge cash + F&O into flat JSON object
        │      → Validate: net must equal buy − sell (±1 Cr tolerance)
        │      → Stamp _updated_at timestamp and _source
        │
        ├─ 4. Write to data/latest.json (atomic write — temp file + rename)
        │
        ├─ 5. Update data/history.json
        │      → Load existing history (up to 60 entries)
        │      → Deduplicate by date (idempotent — safe to run twice)
        │      → Prepend today's data, trim to 60 entries
        │      → Write atomically
        │
        └─ 6. Exit 0 on success, Exit 1 on any fatal error
                → GitHub Actions marks the step failed visibly on error
                → Commit step only runs if fetch step succeeded
```

### Atomic Writes
All file writes use a write-to-temp-then-rename pattern. This means if the process crashes mid-write, the existing file is never left in a corrupted state. The rename is atomic at the OS level.

### Retry Logic
Every network request (NSE API, F&O CSV) has up to 3 attempts with exponential backoff: 2 seconds after the first failure, 4 seconds after the second. This handles transient NSE server slowness or temporary 5xx errors without failing the entire pipeline.

### Data Validation
Before writing any file, the pipeline validates:
- `date` field is non-empty
- All cash values are finite numbers
- `fii_net ≈ fii_buy − fii_sell` (within ₹1 Cr floating-point tolerance)
- Same check for DII

If validation fails, the pipeline throws an error and exits with code 1 — the old data files are left untouched.

---

## 4. Every Feature Explained

### Header Bar

**Status Pill (top right)**
Shows the current data state:
| Indicator | Meaning |
|---|---|
| Green dot + "LIVE • Updated HH:MM" | Data was successfully fetched today |
| Orange dot + "LOCAL ARCHIVE" | Market closed or NSE data not yet published — shows last known data |

**Dark Mode button**
Toggles between the default Sand White (light) theme and the OLED Matte Black (dark) theme. Chart.js colors re-render automatically. Theme preference is not stored between sessions — page always opens in light mode.

**Force Sync button**
Manually triggers the `fetchLiveNSE()` function — tries all data sources in order and updates the dashboard without waiting for the automatic schedule.

**Snapshot Full Page button**
Uses `html2canvas` to capture the entire dashboard body as a PNG and downloads it to your device. Includes a watermark.

**Post to X button**
Opens Twitter/X with a pre-filled tweet containing today's FII and DII net values and a link to the dashboard.

---

### Hero Section — Latest Extracted Session

The largest card on the page. Shows the most recent trading session's data.

**FII / FPI NET** — Net buying or selling by all foreign funds in the cash equity segment, in ₹ Crore. Red = net selling (outflow). Green = net buying (inflow).

**DII NET** — Net buying or selling by all domestic funds in the cash equity segment. DII is almost always net positive (buying) due to continuous SIP inflows.

**Momentum Badge** — A computed label based on the magnitude of the net values:
| Badge | Condition |
|---|---|
| Aggressive Selling | FII net < −₹5,000 Cr |
| Moderate Selling | FII net between −₹5,000 and −₹1,000 Cr |
| Mild Selling | FII net between −₹1,000 and 0 |
| Mild Buying | FII net between 0 and +₹1,000 Cr |
| Buying | FII net > +₹1,000 Cr |
| Strong Accumulation | FII net > +₹5,000 Cr |

**Flow Strength Meter** — A horizontal bar split between FII and DII pressure. The width of each side is calculated as each party's absolute net value divided by the sum of both absolute values. This shows who is the bigger force today, regardless of direction.

Formula: `FII% = |fii_net| / (|fii_net| + |dii_net|) × 100`

**Combined Liquidity** — `fii_net + dii_net` — the total net impact on market liquidity for the day. If both are buying, this is strongly positive. If FII sells more than DII buys, this goes negative — meaning net money left the equity market that day.

---

### Side Widgets (Right Column)

**FII Streak** — How many consecutive sessions FII has been net positive or net negative. Computed from `history.json`. If FII has been selling for 8 straight days, streak shows "8 Days Selling". The animated border color changes red/green based on direction.

**Streak Velocity** — The average net value per session over the current streak (total streak value ÷ streak length). This tells you if the selling/buying is intensifying or slowing down.

**5-Day FII Net Velocity** — Sum of FII net values over the last 5 trading sessions. Tells you the total directional pressure this week.

**DII Streak** — Same as FII streak but for DII. Because SIP flows make DII almost always positive, a DII selling streak is rare and significant.

---

### Structural Insight Cards (4-card row)

These show longer-term context derived from hardcoded historical research data (not live-fetched):

| Card | What It Shows |
|---|---|
| FII 5-Year Cumulative | Total net FII outflow/inflow over the last 5 years in ₹ Lakh Crore |
| DII 5-Year Cumulative | Total net DII buying over 5 years — the "domestic fortress" number |
| SIP Monthly Run-Rate | Current monthly SIP inflow figure (updated manually per AMFI data) |
| FII NSE500 Ownership | FII's current % ownership of NSE500 companies (updated manually per NSDL reports) |

---

### Derivatives Positioning (F&O)

This section uses data from the NSE NSCCL participant-wise OI CSV (Source 2 above).

All values are in **number of contracts** (not ₹ value). Each contract for Nifty represents 50 units.

**FII Index Futures**
- Long = FII has open long positions in Nifty/Bank Nifty futures (bullish bet)
- Short = FII has open short positions (bearish bet / hedge)
- The green/red bar shows the ratio: wider green = more long than short

**FII Stock Futures**
- Same concept but for individual stock futures across all NSE F&O stocks
- FII stock futures positions reflect their hedging of large equity portfolios — a high short stock futures position alongside heavy cash buying is often a hedge, not a directional bet

**FII Index Calls (Bullish vs Bearish)**
- Long Calls = FII is buying calls (bullish directional bet or speculation)
- Short Calls = FII is writing/selling calls (collecting premium, expects market to stay below strike)

**FII Index Puts (Bearish vs Bullish)**
- Long Puts = FII buying protection (bearish hedge or directional bet — the red bar is shown here because puts long = bearish)
- Short Puts = FII selling puts (bullish — they collect premium and profit if market stays above strike)

**DII Index & Stock Futures**
DIIs primarily use Index Futures for portfolio hedging. They rarely write options. Their F&O positions tend to be smaller in magnitude than FII's.

**F&O Sentiment Badge** — A computed overall reading from all FII derivatives positions combined:
- If FII is net long futures AND net short puts (writing puts) = Bullish
- If FII is net short futures AND net long puts (buying protection) = Bearish
- Mixed signals = Neutral/Hedging

---

### Market Strength Meter

An always-visible section (above the tabs) that computes a composite **Flow Score™** from 0–100 using the last 10 days of data from `history.json`.

**How the score is calculated:**

The score has multiple components derived from the rolling history:

| Component | What It Measures | Weight |
|---|---|---|
| FII 10-Day Avg Net | Average daily FII net flow over 10 sessions | Primary |
| DII 10-Day Avg Net | Average daily DII net flow over 10 sessions | Secondary |
| Net Positive Sessions | Out of last 10 days, how many had positive combined liquidity | Momentum |
| DII Absorption % | How much of FII selling DII covered (DII net / |FII net|) | Confidence |

**Score Zones:**
| Score | Zone Label | Color |
|---|---|---|
| 0–20 | Deep Bear | Red |
| 20–40 | Bear | Orange |
| 40–60 | Neutral | Yellow |
| 60–80 | Bull | Light Green |
| 80–100 | Strong Bull | Teal/Green |

The gauge needle animates using a CSS cubic-bezier spring transition.

**Signal Cards (bottom of meter section):**
- **Regime Signal** — Combines score with streak to give a regime label (e.g., "Sustained Outflow", "Recovery Phase")
- **FII/DII Divergence** — Whether FII and DII are moving in the same or opposite directions
- **FII Sell Pressure** — Magnitude of FII selling relative to historical average
- **DII Absorption** — How effectively DII is covering FII outflows (DII net / |FII net| × 100%)

**Last 10 Sessions Table** — A clean table showing each of the last 10 trading days with FII Net, DII Net, Combined Liquidity, and the day's signal.

---

### Tabs

#### Tab 1 — Databases & Matrices

Four sub-tabs of data tables, all computed from `history.json`:

**Daily (Last 15)**
Shows the last 15 trading sessions with full detail:
- Trading Date
- FII Gross Buy, Gross Sell, Net (in ₹ Crore)
- DII Gross Buy, Gross Sell, Net
- Total Liquidity (FII net + DII net)

Filter buttons:
- **All Data** — show all rows
- **FII Bloodbath (< −₹5k Cr)** — filter to sessions where FII sold more than ₹5,000 Cr net
- **DII Absorption (> +₹5k Cr)** — filter to sessions where DII bought aggressively
- **Extreme Divergence** — sessions where FII and DII moved strongly in opposite directions

Date range picker: filter any custom date range from the history.

**Download CSV button** — exports whatever rows are currently visible to a CSV file, downloadable directly from your browser.

**Weekly (12 Weeks)**
Aggregates daily data into ISO weeks (Monday–Friday). Shows the last 12 weeks with a weekly trend signal (Bull/Bear/Neutral) based on whether combined weekly flow is positive or negative.

**Monthly (24 Months)**
Aggregates daily history by calendar month. Shows up to 24 months. The `Nifty Market Chg` column shows the approximate Nifty 50 return for that month (embedded static data cross-referenced with live history).

**Annual Tracker**
A full year-by-year breakdown going back to 2010. This data is a mix of live history (recent years) and embedded historical data (earlier years sourced from NSE annual reports and SEBI FPI data). Shows:
- Calendar Year
- FII Equities Net (₹ Crore)
- DII Equities Net (₹ Crore)
- Total Institutional Flow
- Domestic Multiplier (DII net ÷ |FII net|) — values > 1 mean DII bought more than FII sold

---

#### Tab 2 — Visual Flow Heatmaps

Two side-by-side GitHub-contribution-style heatmap grids covering the **last 45 trading sessions**.

**FII 45-Day Concentration Matrix**
Each cell represents one trading session. Color intensity shows the magnitude and direction of FII net flow:
| Cell Color | Meaning |
|---|---|
| Dark Red (c-r4) | Extreme selling (< −₹8,000 Cr) |
| Red (c-r3) | Heavy selling (−₹4,000 to −₹8,000 Cr) |
| Light Red (c-r2) | Moderate selling (−₹1,500 to −₹4,000 Cr) |
| Very Light Red (c-r1) | Mild selling (0 to −₹1,500 Cr) |
| Very Light Green (c-g1) | Mild buying (0 to +₹1,500 Cr) |
| Light Green (c-g2) | Moderate buying (+₹1,500 to +₹4,000 Cr) |
| Green (c-g3) | Heavy buying (+₹4,000 to +₹8,000 Cr) |
| Dark Green (c-g4) | Extreme buying (> +₹8,000 Cr) |

Hover over any cell to see the tooltip with exact date and value.

**DII 45-Day Buffer Matrix**
Same grid concept but for DII. Because DII is structurally bullish (SIP-driven), the scale is shifted — a red cell for DII means unusually low buying, not necessarily net selling.

---

#### Tab 3 — Historical Charts

Two Chart.js bar charts:

**Monthly Net Flows (Last 12 Months)**
A grouped bar chart showing FII net (red/green bars) and DII net (blue/teal bars) for each of the last 12 calendar months. Computed by aggregating `history.json`. Colors flip based on whether the value is positive or negative.

**Multi-Year Cumulative Divergence**
A line chart showing the cumulative running total of FII net flow vs DII net flow going back to 2010. This is the most powerful chart — it shows the structural divergence between foreign extraction and domestic injection over time. The gap between the two lines represents how much domestic institutions have counterbalanced foreign selling over 14+ years.

Both charts are interactive (hover tooltips) and re-render in the correct color scheme when switching between light and dark mode.

---

#### Tab 4 — Documentation

The in-app user manual (same content as this README, formatted for the dashboard). Covers glossary, how to read each widget, data sources, and FAQ.

---

#### Tab 5 — Sector Flow

**Source:** NSDL Fortnightly FPI Reports, BSE 22-sector classification

Shows FPI (Foreign Portfolio Investor) allocation across all major sectors of the Indian economy. Each sector card displays:
- Sector name and icon
- % of total FPI equity AUM allocated to this sector
- An AUM progress bar (relative to the largest sector)
- Net flow over the last 15-day reporting window (₹ Crore)
- 1-year net flow (₹ Crore)
- Bull/Bear badge based on recent flow direction

Sort options: by Total AUM, by Fortnight Change, by 1-Year Flow, or alphabetically.

This data updates every ~15 days when NSDL publishes new fortnightly reports.

---

### Export Features

| Feature | How to Use | What You Get |
|---|---|---|
| Card Export | Hover any card → click the 📷 icon | PNG of that card only, with watermark |
| Full Dashboard Snapshot | Header → "📸 Snapshot Full Page" | PNG of the entire page |
| Post to X | Header → "Post to X" | Pre-filled tweet with today's data |
| Download CSV | Daily tab → "⬇ Download CSV" | CSV of currently visible rows |

Card exports use `html2canvas` to render the DOM element directly to a canvas, then save as PNG. The watermark is overlaid before saving.

---

## 5. How to Run It

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or newer
- npm (comes with Node.js)

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/MrChartist/fii-dii-data.git
cd fii-dii-data

# 2. Install dependencies
npm install

# 3. Fetch today's data manually (optional — data already in data/)
npm run fetch

# 4. Start the local server
npm start
```

Open `http://localhost:5000` in your browser.

The server exposes:
- `http://localhost:5000/` — Dashboard
- `http://localhost:5000/api/data` — Latest JSON data
- `http://localhost:5000/api/history` — Full 60-day history JSON
- `http://localhost:5000/health` — Health check

### Run Just the Data Fetch (No Server)

```bash
npm run fetch
```

This runs `scripts/fetch_data.js` directly. It will fetch from NSE, update `data/latest.json` and `data/history.json`, and exit. Useful for testing the pipeline or running it manually on a schedule.

### Deploy to Vercel (Recommended)

1. Fork this repository on GitHub.
2. Create an account on [Vercel](https://vercel.com/).
3. Click "New Project" → import your fork.
4. Vercel reads `vercel.json` automatically — no additional configuration needed.
5. The dashboard is live.

The GitHub Actions workflow handles daily data updates — it runs every weekday at 6:00 PM IST, commits the new JSON files to your repo, and Vercel re-deploys automatically.

### Deploy to GitHub Pages (Static Only)

For a static-only deploy (no Express server, dashboard reads from the committed JSON files):
1. Enable GitHub Pages in your repository settings → deploy from `main` branch root.
2. The dashboard's Tier 0 data source (`./data/latest.json`) will serve the committed data directly.
3. The GitHub Actions workflow still runs and commits fresh data daily.

---

## 6. Project Structure

```
fii-dii-data/
│
├── fii_dii_india_flows_dashboard.html  # Complete single-file dashboard (HTML + CSS + JS)
├── server.js                           # Express server — serves dashboard + API endpoints
├── sw.js                               # Service Worker — PWA offline support
├── manifest.json                       # PWA manifest (installability metadata)
├── vercel.json                         # Vercel deployment routing config
├── package.json                        # npm scripts and dependencies
├── package-lock.json                   # Lockfile — ensures reproducible installs
│
├── scripts/
│   └── fetch_data.js                   # Data fetch + transform + write pipeline
│
├── data/
│   ├── latest.json                     # Most recent trading session (auto-updated daily)
│   └── history.json                    # Rolling 60-day history (auto-updated daily)
│
├── icons/
│   ├── icon-192.png                    # PWA icon (192×192)
│   └── icon-512.png                    # PWA icon (512×512)
│
└── .github/
    └── workflows/
        └── update_data.yml             # GitHub Actions — daily automated data fetch
```

### Key File Roles

**`fii_dii_india_flows_dashboard.html`**
The entire frontend. CSS variables for theming, all JavaScript logic, and all HTML markup in one file. It self-contains everything the browser needs to render the dashboard. On load, it tries multiple data sources in priority order (local server → local JSON file → GitHub raw → CORS proxies → NSE direct) and renders whatever it finds.

**`scripts/fetch_data.js`**
The backend data pipeline. Runs in Node.js. Does three things: (1) fetches from NSE, (2) parses and transforms, (3) writes to `data/`. Has retry logic, atomic writes, and data validation. Exits with code 1 on fatal error so GitHub Actions marks the run as failed.

**`server.js`**
Minimal Express server. Serves the HTML file at `/` and exposes `/api/data`, `/api/history`, and `/health`. Used for local development and Vercel deployment.

**`data/latest.json`**
A single flat JSON object with all fields for the most recent trading session. Structure:
```json
{
  "date": "18-Mar-2026",
  "fii_buy": 12345.67,
  "fii_sell": 23456.78,
  "fii_net": -11111.11,
  "dii_buy": 9876.54,
  "dii_sell": 3456.78,
  "dii_net": 6419.76,
  "fii_idx_fut_long": 234567,
  "fii_idx_fut_short": 198765,
  "fii_idx_fut_net": 35802,
  "dii_idx_fut_long": 45678,
  "dii_idx_fut_short": 56789,
  "dii_idx_fut_net": -11111,
  "fii_stk_fut_long": 123456,
  "fii_stk_fut_short": 134567,
  "fii_stk_fut_net": -11111,
  "dii_stk_fut_long": 23456,
  "dii_stk_fut_short": 12345,
  "dii_stk_fut_net": 11111,
  "fii_idx_call_long": 345678,
  "fii_idx_call_short": 234567,
  "fii_idx_call_net": 111111,
  "fii_idx_put_long": 456789,
  "fii_idx_put_short": 234567,
  "fii_idx_put_net": 222222,
  "_updated_at": "18 Mar 2026, 6:45 pm IST",
  "_source": "fetch-pipeline"
}
```

Cash values (`fii_buy`, `fii_sell`, etc.) are in **₹ Crore**.
F&O values (`fii_idx_fut_long`, etc.) are in **number of contracts**.

**`data/history.json`**
An array of up to 60 objects, newest first. Each object has the same structure as `latest.json`. The dashboard uses this for streaks, velocity, heatmaps, trend tables, and charts.

---

## 7. API Reference

When running locally (`npm start`), the server exposes these endpoints:

### `GET /api/data`
Returns the latest trading session data.

**Response:** The `latest.json` object (see structure above).

**Error responses:**
- `404` — Data not yet fetched (run `npm run fetch` first)
- `500` — File read error

---

### `GET /api/history`
Returns the last 60 trading sessions as a JSON array, newest first.

**Response:**
```json
[
  { "date": "18-Mar-2026", "fii_net": -11111.11, ... },
  { "date": "17-Mar-2026", "fii_net": 3456.78, ... },
  ...
]
```

---

### `GET /health`
Health check endpoint. Safe to use as a monitoring probe.

**Response:**
```json
{
  "status": "ok",
  "latestDataDate": "18-Mar-2026",
  "ts": "2026-03-18T18:45:00.000Z"
}
```

---

### `GET /`
Serves the dashboard HTML file.

---

## 8. Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime for pipeline and server |
| Express | ^4.19 | HTTP server and routing |
| axios | ^1.6.8 | HTTP client for NSE API requests |
| csv-parse | ^5.5.5 | Parsing NSE F&O CSV files |
| cors | ^2.8.5 | Cross-origin headers for the API |
| Chart.js | 3.9.1 (CDN) | Interactive historical charts |
| html2canvas | 1.4.1 (CDN) | Card and page screenshot export |
| GitHub Actions | — | Automated daily data fetching |
| Vercel | — | Serverless deployment |

The frontend uses **zero frameworks** — pure vanilla HTML, CSS, and JavaScript. No React, no Vue, no bundler. This keeps the dashboard fast, dependency-free, and easy to fork and modify.

---

## 9. Automation — How Data Updates Itself

The GitHub Actions workflow (`.github/workflows/update_data.yml`) runs automatically on every weekday at **12:30 UTC (6:00 PM IST)** — after NSE publishes end-of-day data.

### What the Workflow Does

```
1. Checkout the repository
2. Set up Node.js 20 (with npm cache)
3. Install dependencies: npm ci (reproducible, uses lockfile)
4. Run: npm run fetch (scripts/fetch_data.js)
   → If this fails (exit code 1), step is marked failed
   → Commit step is skipped (data files untouched)
5. If fetch succeeded:
   → git add data/latest.json data/history.json
   → If files changed: commit + push
   → If no change: log "No new data today" (market closed)
```

### Manual Trigger
You can trigger the workflow manually at any time from the **Actions tab** on GitHub → select "Auto-Update FII & DII Data" → click "Run workflow". Useful for catching up after a missed run.

### What Happens on Holidays / Weekends
- The workflow only runs Monday–Friday (cron: `1-5`)
- NSE returns empty or market-closed data on holidays
- The pipeline detects an empty date and exits cleanly with code 0
- No commit is made; the existing data remains unchanged
- The dashboard shows the last known data with the "LOCAL ARCHIVE" indicator

---

## 10. Contributing

PRs and issues are welcome. Ideas for future features:

- [ ] Export to CSV from Weekly/Monthly/Yearly tabs (Daily tab already has this)
- [ ] Integration with specific stock futures tickers (e.g., HDFC Bank FII positions)
- [ ] Email/webhook alerts when FII crosses a threshold (e.g., > ₹5,000 Cr single-day selling)
- [ ] Add CDSL custody data for a more complete FPI picture
- [ ] Historical F&O data (currently only today's F&O is fetched — no historical OI trend)

---

## License

MIT — use it, fork it, share it freely. Attribution appreciated.

---

## Author

Made with care by [Mr. Chartist](https://twitter.com/mr_chartist)

If this helps your trading, a star on GitHub means a lot.

*Disclaimer: This tool is for educational and informational purposes only. Not financial advice. Always do your own research before making investment decisions.*
