/* ============================================================
   SETHU — Waitlist Backend Server
   Express + SQLite (better-sqlite3)
   Captures: Name, Email, Timestamp, Source
   ============================================================ */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // serve index.html, styles.css, script.js

// ---------- Database ----------
const db = new Database(path.join(__dirname, 'waitlist.db'));

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'website'
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO waitlist (name, email, timestamp, source) VALUES (?, ?, ?, ?)
`);

const checkEmailStmt = db.prepare(`
  SELECT id FROM waitlist WHERE email = ?
`);

// ---------- Routes ----------

// Waitlist signup
app.post('/api/waitlist', (req, res) => {
  const { name, email, source } = req.body;

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  // Check for duplicate
  const existing = checkEmailStmt.get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'This email is already on the waitlist.' });
  }

  // Insert
  try {
    insertStmt.run(
      name.trim(),
      email.trim().toLowerCase(),
      new Date().toISOString(),
      (source && typeof source === 'string') ? source.trim() : 'website'
    );

    console.log(`[Waitlist] New signup: ${name.trim()} <${email.trim().toLowerCase()}>`);

    return res.status(201).json({ success: true, message: 'Successfully joined the waitlist.' });
  } catch (err) {
    console.error('[Waitlist] Insert error:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------- Fallback: serve index.html for SPA routes ----------
app.get('*', (req, res) => {
  // Serve legal pages if they exist as files
  const requestedFile = path.join(__dirname, req.path);
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`\n  SETHU server running at http://localhost:${PORT}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
