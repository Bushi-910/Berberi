import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.get('/api/slots', async (req, res) => {
    const allSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    const booked = await pool.query("SELECT time FROM bookings WHERE date = $1", [req.query.date]);
    res.json(allSlots.filter(t => !booked.rows.map(r => r.time).includes(t)));
});

app.post('/api/bookings', async (req, res) => {
    if (new Date(req.body.date).getDay() === 3) return res.status(400).json({ error: 'Pushim' });
    await pool.query("INSERT INTO bookings (customer_name, phone, date, time) VALUES ($1, $2, $3, $4)", [req.body.customer_name, req.body.phone, req.body.date, req.body.time]);
    res.json({ success: true });
});

app.post('/api/delete-booking', async (req, res) => {
    const result = await pool.query("DELETE FROM bookings WHERE customer_name = $1 AND phone = $2 RETURNING *", [req.body.customer_name, req.body.phone]);
    res.json({ success: result.rowCount > 0 });
});

app.listen(process.env.PORT || 8000);
