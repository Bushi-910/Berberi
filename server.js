import express from 'express';
import pg from 'pg';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.get('/api/slots', async (req, res) => {
    try {
        const booked = await pool.query("SELECT time FROM bookings WHERE date = $1", [req.query.date]);
        res.json(booked.rows.map(r => r.time));
    } catch (err) { res.json([]); }
});

app.post('/api/bookings', async (req, res) => {
    const { customer_name, phone, date, time } = req.body;
    try {
        await pool.query("INSERT INTO bookings (customer_name, phone, date, time) VALUES ($1, $2, $3, $4)", [customer_name, phone, date, time]);
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'Rezervim i Ri - Salloni i Berberit',
            text: `Klienti: ${customer_name}\nTelefoni: ${phone}\nData: ${date}\nOra: ${time}`
        });
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: 'Gabim' }); }
});

app.post('/api/delete-booking', async (req, res) => {
    const result = await pool.query("DELETE FROM bookings WHERE customer_name = $1 AND phone = $2", [req.body.customer_name, req.body.phone]);
    res.json({ success: result.rowCount > 0 });
});

app.get('/api/admin/all', async (req, res) => {
    const result = await pool.query("SELECT * FROM bookings ORDER BY date ASC, time ASC");
    res.json(result.rows);
});

app.listen(process.env.PORT || 8000);
