import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Kthen vetëm oraret e zëna për datën e caktuar
app.get('/api/slots', async (req, res) => {
    try {
        const booked = await pool.query("SELECT time FROM bookings WHERE date = $1", [req.query.date]);
        res.json(booked.rows.map(r => r.time));
    } catch (err) { res.json([]); }
});

app.post('/api/bookings', async (req, res) => {
    const { customer_name, phone, date, time } = req.body;
    if (new Date(date).getDay() === 3) return res.status(400).json({ error: 'Pushim' });

    // Kontrolli: Një numër telefoni, një rezervim në ditë
    const check = await pool.query("SELECT * FROM bookings WHERE date = $1 AND phone = $2", [date, phone]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Ky numër ka bërë një rezervim për këtë ditë!' });

    await pool.query("INSERT INTO bookings (customer_name, phone, date, time) VALUES ($1, $2, $3, $4)", [customer_name, phone, date, time]);
    res.json({ success: true });
});

app.post('/api/delete-booking', async (req, res) => {
    const result = await pool.query("DELETE FROM bookings WHERE customer_name = $1 AND phone = $2 RETURNING *", [req.body.customer_name, req.body.phone]);
    res.json({ success: result.rowCount > 0 });
});

app.listen(process.env.PORT || 8000);
