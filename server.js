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

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8000;
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, customer_name TEXT, phone TEXT, date TEXT, time TEXT, status TEXT DEFAULT 'pending')`);
        const hashedPassword = await bcrypt.hash('berberi2026', 10);
        await pool.query(`INSERT INTO users (email, password) VALUES ('info@berberi.com', $1) ON CONFLICT (email) DO NOTHING`, [hashedPassword]);
        console.log("✅ Databaza gati!");
    } catch (err) { console.error("❌ Gabim DB:", err.message); }
}
initDB();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// API per oraret (E RREGULLUAR)
app.get('/api/slots', async (req, res) => {
    const { date } = req.query;
    const allSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    try {
        const booked = await pool.query("SELECT time FROM bookings WHERE date = $1", [date]);
        const bookedTimes = booked.rows.map(r => r.time);
        res.json(allSlots.filter(t => !bookedTimes.includes(t)));
    } catch (err) { res.json(allSlots); }
});

app.post('/api/bookings', async (req, res) => {
    const { customer_name, phone, date, time } = req.body;
    try {
        await pool.query("INSERT INTO bookings (customer_name, phone, date, time) VALUES ($1, $2, $3, $4)", [customer_name, phone, date, time]);
        if(process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail({ from: process.env.EMAIL_USER, to: 'info@berberi.com', subject: 'Rezervim i ri', text: `${customer_name} - ${phone} - ${date} - ${time}` });
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Gabim' }); }
});

app.post('/api/delete-booking', async (req, res) => {
    const { customer_name, phone } = req.body;
    try {
        const result = await pool.query("DELETE FROM bookings WHERE customer_name = $1 AND phone = $2 RETURNING *", [customer_name, phone]);
        if (result.rowCount === 0) return res.status(400).json({ error: 'Nuk u gjet!' });
        if(process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail({ from: process.env.EMAIL_USER, to: 'info@berberi.com', subject: 'ANULIM', text: `Anulim nga ${customer_name}` });
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Gabim' }); }
});

app.get('/api/admin/bookings', async (req, res) => {
    const result = await pool.query("SELECT * FROM bookings WHERE date = $1 ORDER BY time ASC", [req.query.date]);
    res.json(result.rows);
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Serveri ndezur`));
