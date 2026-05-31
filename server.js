import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Rruga absolute për folderin public
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8000;
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Inicializimi i Databazës
async function initDB() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, customer_name TEXT, phone TEXT, date TEXT, time TEXT, status TEXT DEFAULT 'pending', UNIQUE(date, time))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS available_slots (id SERIAL PRIMARY KEY, time TEXT UNIQUE)`);
    
    const slots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    for (const slot of slots) {
      await pool.query("INSERT INTO available_slots (time) VALUES ($1) ON CONFLICT (time) DO NOTHING", [slot]);
    }
    const hashedPassword = await bcrypt.hash('berberi2026', 10);
    await pool.query(`INSERT INTO users (email, password) VALUES ('info@berberi.com', $1) ON CONFLICT (email) DO NOTHING`, [hashedPassword]);
    console.log("✅ Databaza gati!");
  } catch (err) { console.error("❌ Gabim DB:", err.message); }
}
initDB();

// Konfigurimi i Email-it (Shto "App Password" në .env)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.post('/api/bookings', async (req, res) => {
  const { customer_name, phone, date, time } = req.body;
  try {
    await pool.query("INSERT INTO bookings (customer_name, phone, date, time) VALUES ($1, $2, $3, $4)", [customer_name, phone, date, time]);
    // Dërgimi i email-it pa bllokuar serverin
    if(process.env.EMAIL_USER) {
        transporter.sendMail({ from: process.env.EMAIL_USER, to: 'info@berberi.com', subject: 'Rezervim i ri', text: customer_name }, (err) => {
            if (err) console.log("Email error:", err.message);
        });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Gabim gjatë rezervimit' }); }
});

// Pjesa tjetër e API-ve...
app.get('/api/admin/bookings', async (req, res) => {
  const result = await pool.query("SELECT * FROM bookings WHERE date = $1 ORDER BY time ASC", [req.query.date]);
  res.json(result.rows);
});

app.patch('/api/admin/bookings/:id', async (req, res) => {
  await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [req.body.status, req.params.id]);
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Serveri ndezur në portën: ${PORT}`));
