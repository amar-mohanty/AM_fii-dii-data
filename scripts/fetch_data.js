const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// ── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
    NSE_API: "https://www.nseindia.com/api/fiidiiTradeReact",
    FAO_BASE: "https://nsearchives.nseindia.com/content/nsccl",
    TIMEOUTS: { cash: 25000, fao: 15000 },
    RETRY: { attempts: 3, baseDelayMs: 2000 },
    HISTORY_MAX: 60,
    DATA_DIR: path.join(__dirname, '..', 'data'),
};

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive"
};

// ── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry(fn, label) {
    let lastError;
    for (let attempt = 1; attempt <= CONFIG.RETRY.attempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < CONFIG.RETRY.attempts) {
                const delay = CONFIG.RETRY.baseDelayMs * attempt;
                console.warn(`  ⚠️  ${label} failed (attempt ${attempt}/${CONFIG.RETRY.attempts}): ${err.message}. Retrying in ${delay}ms…`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

// ── Atomic file write (prevents corruption on partial write) ─────────────────
function writeFileAtomic(filePath, content) {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, filePath);
}

// ── Ensure data directory exists ─────────────────────────────────────────────
function ensureDataDir() {
    if (!fs.existsSync(CONFIG.DATA_DIR)) {
        fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
    }
}

// ── Fetch cash data from NSE API ─────────────────────────────────────────────
async function fetchNSE() {
    return withRetry(async () => {
        const response = await axios.get(CONFIG.NSE_API, { headers: HEADERS, timeout: CONFIG.TIMEOUTS.cash });
        const data = response.data;
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("NSE API returned empty or non-array response");
        }
        return data;
    }, "NSE cash API");
}

// ── Fetch F&O OI CSV with URL fallback ───────────────────────────────────────
async function fetchFaoOi(dateStr) {
    // dateStr format: "16-Mar-2026"
    const MONTHS = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    const day   = parts[0].padStart(2, '0');
    const month = MONTHS[parts[1]];
    const year  = parts[2];
    if (!month) return null;

    const datePart = `${day}${month}${year}`;
    const urls = [
        `${CONFIG.FAO_BASE}/fao_participant_oi_${datePart}.csv`,
        `${CONFIG.FAO_BASE}/fao_participant_oi_${datePart}_b.csv`,
    ];

    for (const url of urls) {
        try {
            const response = await withRetry(
                () => axios.get(url, { headers: HEADERS, timeout: CONFIG.TIMEOUTS.fao }),
                `F&O CSV (${url})`
            );
            if (response.data && response.data.length > 0) {
                return response.data;
            }
        } catch {
            // Try next URL
        }
    }
    console.warn("⚠️  F&O data not available for date:", dateStr);
    return null;
}

// ── Parse F&O CSV ─────────────────────────────────────────────────────────────
function parseFao(csvText) {
    const faoData = {};
    if (!csvText) return faoData;

    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return faoData;

        const records = parse(lines.slice(1).join('\n'), {
            skip_empty_lines: true,
            relax_column_count: true
        });

        const getInt = (val) => {
            if (!val) return 0;
            const n = parseInt(String(val).trim().replace(/,/g, ''), 10);
            return isNaN(n) ? 0 : n;
        };

        for (let i = 1; i < records.length; i++) {
            const row = records[i];
            if (!row || row.length < 9) continue;

            const clientType = (row[0] || "").trim().toUpperCase();
            if (!clientType.includes("FII") && !clientType.includes("DII")) continue;

            const key = clientType.includes("FII") ? "FII" : "DII";
            faoData[key] = {
                idx_fut_long:   getInt(row[1]),
                idx_fut_short:  getInt(row[2]),
                stk_fut_long:   getInt(row[3]),
                stk_fut_short:  getInt(row[4]),
                idx_call_long:  getInt(row[5]),
                idx_call_short: getInt(row[6]),
                idx_put_long:   getInt(row[7]),
                idx_put_short:  getInt(row[8]),
            };
        }
    } catch (e) {
        console.error("Error parsing F&O CSV:", e.message);
    }

    return faoData;
}

// ── Validate parsed data for sanity ──────────────────────────────────────────
function validateData(data) {
    if (!data.date) return false;
    // Cash values must be finite numbers
    for (const field of ['fii_buy','fii_sell','fii_net','dii_buy','dii_sell','dii_net']) {
        if (!isFinite(data[field])) return false;
    }
    // Net must equal buy - sell (within floating-point tolerance)
    if (Math.abs(data.fii_net - (data.fii_buy - data.fii_sell)) > 1) return false;
    if (Math.abs(data.dii_net - (data.dii_buy - data.dii_sell)) > 1) return false;
    return true;
}

// ── Transform raw data into dashboard JSON ────────────────────────────────────
async function transformData(rawCash, rawFaoCsv) {
    const out = {
        date: "",
        fii_buy: 0, fii_sell: 0, fii_net: 0,
        dii_buy: 0, dii_sell: 0, dii_net: 0,
        fii_idx_fut_long: 0, fii_idx_fut_short: 0, fii_idx_fut_net: 0,
        dii_idx_fut_long: 0, dii_idx_fut_short: 0, dii_idx_fut_net: 0,
        fii_stk_fut_long: 0, fii_stk_fut_short: 0, fii_stk_fut_net: 0,
        dii_stk_fut_long: 0, dii_stk_fut_short: 0, dii_stk_fut_net: 0,
        fii_idx_call_long: 0, fii_idx_call_short: 0, fii_idx_call_net: 0,
        fii_idx_put_long: 0, fii_idx_put_short: 0, fii_idx_put_net: 0,
    };

    // 1. Process cash data
    for (const row of rawCash) {
        const cat = (row.category || "").toUpperCase();
        if (cat.includes("FII") || cat.includes("FPI")) {
            out.fii_buy  = parseFloat(row.buyValue  || 0);
            out.fii_sell = parseFloat(row.sellValue || 0);
            out.fii_net  = parseFloat(row.netValue  || 0);
            out.date = row.date || "";
        } else if (cat.includes("DII")) {
            out.dii_buy  = parseFloat(row.buyValue  || 0);
            out.dii_sell = parseFloat(row.sellValue || 0);
            out.dii_net  = parseFloat(row.netValue  || 0);
        }
    }

    // 2. Merge F&O data if available
    if (out.date && rawFaoCsv) {
        const fao = parseFao(rawFaoCsv);

        if (fao["FII"]) {
            const f = fao["FII"];
            out.fii_idx_fut_long   = f.idx_fut_long;
            out.fii_idx_fut_short  = f.idx_fut_short;
            out.fii_idx_fut_net    = f.idx_fut_long  - f.idx_fut_short;
            out.fii_stk_fut_long   = f.stk_fut_long;
            out.fii_stk_fut_short  = f.stk_fut_short;
            out.fii_stk_fut_net    = f.stk_fut_long  - f.stk_fut_short;
            out.fii_idx_call_long  = f.idx_call_long;
            out.fii_idx_call_short = f.idx_call_short;
            out.fii_idx_call_net   = f.idx_call_long - f.idx_call_short;
            out.fii_idx_put_long   = f.idx_put_long;
            out.fii_idx_put_short  = f.idx_put_short;
            out.fii_idx_put_net    = f.idx_put_long  - f.idx_put_short;
        }

        if (fao["DII"]) {
            const d = fao["DII"];
            out.dii_idx_fut_long  = d.idx_fut_long;
            out.dii_idx_fut_short = d.idx_fut_short;
            out.dii_idx_fut_net   = d.idx_fut_long  - d.idx_fut_short;
            out.dii_stk_fut_long  = d.stk_fut_long;
            out.dii_stk_fut_short = d.stk_fut_short;
            out.dii_stk_fut_net   = d.stk_fut_long  - d.stk_fut_short;
        }
    }

    out._updated_at = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata", dateStyle: 'medium', timeStyle: 'short'
    }) + " IST";
    out._source = "fetch-pipeline";

    return out;
}

// ── Update rolling history.json ───────────────────────────────────────────────
function updateHistory(latest) {
    const historyPath = path.join(CONFIG.DATA_DIR, 'history.json');
    let history = [];

    try {
        if (fs.existsSync(historyPath)) {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            if (!Array.isArray(history)) history = [];
        }
    } catch {
        history = [];
    }

    // Deduplicate and prepend today
    history = history.filter(row => row.date !== latest.date);
    history.unshift(latest);
    history = history.slice(0, CONFIG.HISTORY_MAX);

    ensureDataDir();
    writeFileAtomic(historyPath, JSON.stringify(history, null, 2));
    return history;
}

// ── Master pipeline ───────────────────────────────────────────────────────────
async function fetchAndProcessData() {
    console.log(`[${new Date().toISOString()}] Starting FII/DII data pipeline…`);

    const rawCash = await fetchNSE();

    let targetDate = "";
    for (const row of rawCash) {
        const cat = (row.category || "").toUpperCase();
        if (cat.includes("FII") || cat.includes("FPI") || cat.includes("DII")) {
            targetDate = row.date || "";
            break;
        }
    }

    const rawFaoCsv = targetDate ? await fetchFaoOi(targetDate) : null;
    const data = await transformData(rawCash, rawFaoCsv);

    if (!data.date) {
        console.log("ℹ️  No data returned from NSE — market may be closed today.");
        return null;
    }

    if (!validateData(data)) {
        throw new Error(`Data validation failed for date ${data.date}. Aborting to prevent corrupt write.`);
    }

    console.log(`✅ Date: ${data.date}`);
    console.log(`   [CASH] FII Net: ${data.fii_net} | DII Net: ${data.dii_net}`);
    console.log(`   [F&O ] FII Idx Fut Net: ${data.fii_idx_fut_net} | Call Net: ${data.fii_idx_call_net} | Put Net: ${data.fii_idx_put_net}`);
    console.log(`   [STK ] FII Stk Fut Net: ${data.fii_stk_fut_net} | DII Stk Fut Net: ${data.dii_stk_fut_net}`);

    ensureDataDir();
    writeFileAtomic(path.join(CONFIG.DATA_DIR, 'latest.json'), JSON.stringify(data, null, 2));
    updateHistory(data);

    console.log("💾 Data files updated successfully.");
    return data;
}

// Allow CLI execution
if (require.main === module) {
    fetchAndProcessData()
        .then(data => { if (!data) process.exit(0); })
        .catch(err => {
            console.error("❌ Fatal pipeline error:", err.message);
            process.exit(1); // Causes GitHub Actions to mark the step as failed
        });
}

module.exports = { fetchAndProcessData };
