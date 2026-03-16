# 📈 Mr. Chartist: India Flow Intelligence
**Elite Institutional Money Tracker & Flow Dashboard (V2 Node.js Architecture)**

Welcome to the ultimate FII/DII tracking dashboard. This tool is designed to provide crystal-clear insights into institutional liquidity flows within the Indian equity markets. It combines automated data extraction with visually stunning matrices, heatmaps, and momentum indicators.

---

## 🌟 Core Features

### 1. Fully Autonomous Data Synchronization
The dashboard features a robust Node.js backend (`server.js`) equipped with an automated `node-cron` scheduler.
*   **Auto-Sync**: The server automatically hits the NSE FII/DII APIs and parses the F&O CSVs natively at 18:30 IST every weekday. A fallback mechanism runs at 19:30 IST in case of NSE delays.
*   **Live Indices**: The frontend continuously streams live NIFTY 50 and INDIA VIX data using a robust, CORS-safe Yahoo Finance fetcher, updating every 5 minutes in your browser.

### 2. Deep Derivatives Positioning (F&O) & Stock Futures
V2 aggressively expanded into the F&O segment.
*   **4-Column Matrices**: Instantly analyze Index Futures, Index Calls, Index Puts, and the newly added **Stock Futures** for both FII and DII.
*   **Granular Visuals**: The Long vs. Short positioning for every instrument is elegantly visualized with custom red/green ratio bars.

### 3. The Flow Strength Meter
Located right in the Hero Section, under the net cash liquidity numbers.
*   **What it does:** Calculates the total absolute flow (FII Volume + DII Volume) and visually maps the percentage of aggression.
*   **Why it matters:** If FIIs sell ₹10,000 Cr and DIIs buy ₹9,000 Cr, the meter will show FIIs dominating the liquidity pool at ~52%. It helps you understand *who is pushing the market harder* today.

### 4. Light & Dark Themes (Matte UI)
The entire dashboard is built on a custom "Matte" design system that eliminates overly-glassy distractions in favor of clean, professional data visualization.
*   **Dark Mode (Default)**: Uses the `Night` background, `Cyprus` green cards, and high-visibility `Sand` text. Best for low-light trading environments.
*   **Light Mode**: Click the **Light Mode** button to instantly invert the theme. The cards turn crisp white, maintaining perfect contrast ratios for daytime analysis. Chart grids and fonts adapt automatically.

### 5. 𝕏 (Twitter) Integration & Snappable Components
This dashboard is highly shareable. 
*   **Snapshot Full Page**: Exports the entire visible screen into a high-DPI `.png` image.
*   **Micro-Exports (📷)**: Hover over *any* specific widget (like the Momentum card or the Heatmaps). A small camera icon will appear. Clicking this exports ONLY that specific widget, beautifully watermarked with `"by Mr. Chartist"` for sharing on social media. 
*   **Post to 𝕏**: Generates a pre-filled tweet containing the latest Net Flow numbers, ready for you to attach your exported snapshot.

---

## 🔍 Analytical Views

### 🗄️ Databases & Matrices Tab
*   **Daily Flow Ledger**: A clean table showing the exact Buy/Sell/Net numbers for the last 15 sessions. Includes visual proportion bars so you can see the scale of the flows instantly. Filters allow you to isolate heavily FII Sold days or Divergence days (FII selling while DII buys).
*   **Weekly & Monthly Rollups**: Aggregated data to help you spot medium-to-long term trends in accumulation or distribution.

### 🌡️ Visual Flow Heatmaps Tab
*   **45-Day Concentration**: A visual "GitHub style" contribution graph. Dark Red means extreme selling pressure, Bright Green means heavy accumulation.
*   Allows you to scan 1.5 months of data in 2 seconds to see the *density* of sell-offs or buying streaks without looking at a single number.

### 📊 Historical Charts Tab
*   **Monthly Trajectory**: A 12-month bar chart comparing FII (Red) and DII (Green) forces side-by-side.
*   **Long-Term Year-over-Year (YoY)**: A line chart showing the brutal, multi-year divergence spanning all the way back to 2013.

Enjoy the Elite Institutional Money Tracker!
*- Engine by Antigravity*
