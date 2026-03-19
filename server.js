const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// ── Helper: read JSON file ────────────────────────────────────────────────────
function readJson(filePath, res) {
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Data not found. Run the fetch pipeline first.' });
        }
        res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch (err) {
        console.error(`Failed to read ${filePath}:`, err.message);
        res.status(500).json({ error: 'Internal server error reading data file.' });
    }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'fii_dii_india_flows_dashboard.html'));
});

// Latest FII/DII snapshot
app.get('/api/data', (req, res) => {
    readJson(path.join(DATA_DIR, 'latest.json'), res);
});

// Rolling history (last 60 days)
app.get('/api/history', (req, res) => {
    readJson(path.join(DATA_DIR, 'history.json'), res);
});

// Health check — useful for uptime monitoring
app.get('/health', (req, res) => {
    let latestDate = null;
    try {
        const latest = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'latest.json'), 'utf8'));
        latestDate = latest.date || null;
    } catch { /* data may not exist yet */ }

    res.json({ status: 'ok', latestDataDate: latestDate, ts: new Date().toISOString() });
});

// ── Start (local only) ────────────────────────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}/`);
        console.log(`🔌 API:       http://localhost:${PORT}/api/data`);
        console.log(`📅 History:   http://localhost:${PORT}/api/history`);
        console.log(`❤️  Health:    http://localhost:${PORT}/health`);
    });
}

// Export app (useful for testing and process managers)
module.exports = app;
