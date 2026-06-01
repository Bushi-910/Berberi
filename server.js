import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
app.use(express.json());
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// API për oraret (Frontend-i merr këto dhe i shfaq si "Rezervuar")
app.get('/api/slots', async (req, res) => {
    const booked = await pool.query("SELECT time FROM bookings WHERE date = $1", [req.query.date]);
    res.json(booked.rows.map(r => r.time));
});

// API për rezervimin
app.post('/api/bookings', async (req, res) => {
    const { customer_name, phone, date, time } = req.body;
    if (new Date(date).getDay() === 3) return res.status(400).json({ error: 'Pushim' });
    const check = await pool.query("SELECT * FROM bookings WHERE date = $1 AND phone = $2", [date, phone]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Ky numër ka një rezervim sot!' });
    await pool.query("INSERT INTO bookings (customer_name, phone, date, time) VALUES ($1, $2, $3, $4)", [customer_name, phone, date, time]);
    res.json({ success: true });
});

// API për Adminin (Gjithë rezervimet)
app.get('/api/admin/all', async (req, res) => {
    const result = await pool.query("SELECT * FROM bookings ORDER BY date ASC, time ASC");
    res.json(result.rows);
});

app.post('/api/delete-booking', async (req, res) => {
    const result = await pool.query("DELETE FROM bookings WHERE customer_name = $1 AND phone = $2 RETURNING *", [req.body.customer_name, req.body.phone]);
    res.json({ success: result.rowCount > 0 });
});

app.listen(process.env.PORT || 8000);
